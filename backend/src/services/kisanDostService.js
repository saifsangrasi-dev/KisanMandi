/**
 * AI Kisan Dost Service
 *
 * Full-stack agricultural advisor grounded in real KisanMandi mandi rates,
 * cross-market comparisons, 14-day trends, weather advisories, and profit calculations.
 *
 * Uses Gemini API (gemini-3.8-flash) when configured server-side, with a robust,
 * transparent rule-based fallback if the API key is not present or an error occurs.
 */

import { GoogleGenAI } from '@google/genai';
import { storage } from './storage.js';
import {
  getLatestPrice,
  getDailyPriceChange,
  getFourteenDayStats,
  getMarketComparison
} from './marketPriceService.js';
import { getDistrictWeather } from './weatherService.js';

let geminiClient = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

// Entity mapping for Urdu, Sindhi, and Roman keywords
const CROPS_MAP = [
  { id: 'crp_wheat', name: 'Wheat', urdu: 'گندم', sindhi: 'ڪڻڪ', keywords: ['gandum', 'gehun', 'kanak', 'wheat', 'گندم', 'ڪڻڪ'] },
  { id: 'crp_rice', name: 'Rice (Basmati)', urdu: 'چاول', sindhi: 'چانور', keywords: ['chawal', 'rice', 'basmati', 'chanwar', 'چاول', 'چانور', 'ٻسمتي'] },
  { id: 'crp_cotton', name: 'Cotton', urdu: 'کپاس', sindhi: 'ڦٽيون', keywords: ['kapas', 'cotton', 'phutti', 'phutiyan', 'کپاس', 'ڦٽيون', 'ڪپھ'] },
  { id: 'crp_sugarcane', name: 'Sugarcane', urdu: 'گنا', sindhi: 'ڪمند', keywords: ['ganna', 'sugarcane', 'kamand', 'kamad', 'گنا', 'ڪمند'] },
  { id: 'crp_onion', name: 'Onion', urdu: 'پیاز', sindhi: 'بصر', keywords: ['onion', 'piaz', 'pyaz', 'basar', 'gandha', 'پیاز', 'بصر'] },
  { id: 'crp_tomato', name: 'Tomato', urdu: 'ٹماٹر', sindhi: 'ٽماٽر', keywords: ['tomato', 'tamatar', 'tamata', 'ٹماٹر', 'ٽماٽر', 'ٽماٽا'] },
  { id: 'crp_mango', name: 'Mango (Sindhri)', urdu: 'آم', sindhi: 'انب', keywords: ['mango', 'aam', 'sindhri', 'anb', 'آم', 'انب'] },
  { id: 'crp_banana', name: 'Banana', urdu: 'کیلا', sindhi: 'ڪيلو', keywords: ['banana', 'kela', 'kele', 'kelo', 'کیلا', 'ڪيلو', 'ڪيلا'] }
];

const MARKETS_MAP = [
  { id: 'mkt_hyd', name: 'Hyderabad Mandi', district: 'Hyderabad', urdu: 'حیدرآباد', sindhi: 'حيدرآباد', keywords: ['hyderabad', 'hyd', 'حیدرآباد', 'حيدرآباد'] },
  { id: 'mkt_suk', name: 'Sukkur Mandi', district: 'Sukkur', urdu: 'سکھر', sindhi: 'سکر', keywords: ['sukkur', 'suk', 'سکھر', 'سکر'] },
  { id: 'mkt_mpk', name: 'Mirpur Khas Mandi', district: 'Mirpur Khas', urdu: 'میرپورخاص', sindhi: 'ميرپورخاص', keywords: ['mirpur khas', 'mirpurkhas', 'mpk', 'میرپور خاص', 'میرپورخاص', 'ميرپورخاص'] }
];

export function detectCropAndMarket(text = '') {
  const normalized = text.toLowerCase();
  let matchedCrop = null;
  let matchedMarket = null;

  for (const crop of CROPS_MAP) {
    if (crop.keywords.some(kw => normalized.includes(kw.toLowerCase()))) {
      matchedCrop = crop;
      break;
    }
  }

  for (const market of MARKETS_MAP) {
    if (market.keywords.some(kw => normalized.includes(kw.toLowerCase()))) {
      matchedMarket = market;
      break;
    }
  }

  return { matchedCrop, matchedMarket };
}

export function detectLanguage(text = '') {
  // Simple script & keyword heuristic
  const arabicRegex = /[\u0600-\u06FF]/;
  const sindhiCharsRegex = /[ڪڳڱٻڏڊڌڙٿڦڄڃ]/;

  if (sindhiCharsRegex.test(text)) return 'sd';
  if (arabicRegex.test(text)) return 'ur';

  const lower = text.toLowerCase();
  if (lower.includes('kya') || lower.includes('hai') || lower.includes('mein') || lower.includes('batao') || lower.includes('munafa') || lower.includes('rate')) {
    return 'ur-roman';
  }
  if (lower.includes('ahe') || lower.includes('agah') || lower.includes('budhayo') || lower.includes('chha')) {
    return 'sd-roman';
  }

  return 'en';
}

/**
 * Gathers verified real context from KisanMandi storage and weather services.
 */
export async function gatherKisanMandiContext(userDistrict = 'Hyderabad') {
  const db = await storage.read();
  const prices = db.prices || [];
  const markets = db.markets || [];
  const crops = db.crops || [];
  const listings = db.listings || [];

  // Latest rates overview for all crops across markets
  const commodityOverview = crops.map(crop => {
    const comparison = getMarketComparison(crop.id, markets, prices);
    return {
      crop_id: crop.id,
      name: crop.name,
      category: crop.category,
      average_price: comparison.averagePrice,
      highest_market: comparison.highestMarket
        ? {
            market_name: comparison.highestMarket.market_name,
            price: comparison.highestMarket.price,
            district: comparison.highestMarket.district,
            date: comparison.highestMarket.date
          }
        : null,
      markets_data: comparison.markets.map(m => ({
        market_name: m.market_name,
        price: m.price,
        date: m.date
      }))
    };
  });

  // Weather data for user's district
  let weatherData = null;
  try {
    weatherData = await getDistrictWeather(userDistrict);
  } catch {
    weatherData = null;
  }

  return {
    commodityOverview,
    weatherData,
    activeListingsCount: listings.filter(l => l.status === 'Active').length,
    marketsList: markets.map(m => `${m.name} (${m.district})`),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Deterministic rule-based assistant responses for guaranteed fallback
 */
export function generateRuleBasedResponse({ query, lang, crop, market, context, quantity = 1000 }) {
  const normalized = query.toLowerCase();
  const matchedCrop = crop || CROPS_MAP[0]; // fallback to wheat
  const matchedCropData = context.commodityOverview.find(c => c.crop_id === matchedCrop.id) || context.commodityOverview[0];

  // 1. Weather Intent
  if (normalized.includes('mausam') || normalized.includes('weather') || normalized.includes('barish') || normalized.includes('موسم') || normalized.includes('برسات')) {
    if (context.weatherData) {
      const cur = context.weatherData.current;
      const adv = context.weatherData.advisories?.[0];
      if (lang === 'sd' || lang === 'sd-roman') {
        return {
          mode: 'rule_based',
          message: `**${cur.district} ۾ اڄ جو موسم:**\n- گرمي پد: ${cur.temperature}°C (${cur.condition})\n- هوا جي رفتار: ${cur.wind_speed_kmh} km/h | گهم: ${cur.humidity}%\n- **ڪسان مشورو:** ${adv ? adv.message : 'موسم فصل لاءِ مناسب آهي.'}\n\n*نوٽ: برائوزر ذريعي تصديق ٿيل کليل موسمياتي ڊيٽا.*`,
          cardType: 'weather',
          cardData: context.weatherData
        };
      }
      return {
        mode: 'rule_based',
        message: `**${cur.district} کا آج کا موسم:**\n- درجہ حرارت: ${cur.temperature}°C (${cur.condition})\n- ہوا کی رفتار: ${cur.wind_speed_kmh} km/h | نمی: ${cur.humidity}%\n- **کسان مشورہ:** ${adv ? adv.message : 'موسم فصل اور آبپاشی کے لیے سازگار ہے۔'}\n\n*نوٹ: مصدقہ محکمہ موسمیات سندھ زون کی معلومات۔*`,
        cardType: 'weather',
        cardData: context.weatherData
      };
    }
    return {
      mode: 'rule_based',
      message: 'معذرت، اس وقت موسم کا ڈیٹا دستیاب نہیں ہے۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں۔',
      cardType: 'info'
    };
  }

  // 2. Best Mandi Intent
  if (normalized.includes('kis mandi') || normalized.includes('best mandi') || normalized.includes('kahan') || normalized.includes('ڪٿي') || normalized.includes('ڪهڙي منڊي') || normalized.includes('market')) {
    const high = matchedCropData.highest_market;
    const avg = matchedCropData.average_price;
    const marketsInfo = matchedCropData.markets_data || [];

    if (lang === 'sd' || lang === 'sd-roman') {
      return {
        mode: 'rule_based',
        message: `**${matchedCrop.name} وڪڻڻ لاءِ بهترين منڊي:**\n- **سڀ کان وڌيڪ اگهہ:** ${high ? high.market_name : 'حيدرآباد'} ۾ **${high ? high.price : avg} PKR/kg** آهي.\n- سنڌ جي منڊين جو سراسري اگهہ: **${avg} PKR/kg**.\n- ٽرانسپورٽ خرچ ڪاٽڻ کان پوءِ ويجهي منڊي کي ترجيح ڏيو.\n\n*اڄ جي منڊي ڊيٽا جي بنياد تي.*`,
        cardType: 'market_comparison',
        cardData: matchedCropData
      };
    }

    return {
      mode: 'rule_based',
      message: `**${matchedCrop.name} بیچنے کے لیے بہترین منڈی:**\n- **سب سے زیادہ ریٹ:** ${high ? high.market_name : 'حیدرآباد منڈی'} میں **${high ? high.price : avg} روپے فی کلو** ہے۔\n- دیگر منڈیوں کا اوسط ریٹ: **${avg} روپے فی کلو** ہے۔\n- اگر آپ حیدرآباد کے قریب ہیں تو وہاں بیچنا سب سے زیادہ منافع بخش ہے۔\n\n*نوٹ: یہ موازنہ کسان منڈی کے تصدیق شدہ نرخوں پر مبنی ہے۔*`,
      cardType: 'market_comparison',
      cardData: matchedCropData
    };
  }

  // 3. Profit / Munafa Intent
  if (normalized.includes('munafa') || normalized.includes('profit') || normalized.includes('kitna') || normalized.includes('منافع') || normalized.includes('فائدو')) {
    const rate = matchedCropData.average_price || 95;
    const qty = quantity || 1000;
    const revenue = Math.round(qty * rate);
    const estimatedCost = Math.round(revenue * 0.55); // estimated 55% production + seed + fertilizer costs
    const estimatedProfit = revenue - estimatedCost;

    if (lang === 'sd' || lang === 'sd-roman') {
      return {
        mode: 'rule_based',
        message: `**${qty} kg ${matchedCrop.name} تي اندازي موجب منافعو:**\n- متوقع ڪل آمدني: **${revenue.toLocaleString()} PKR** (@ ${rate} PKR/kg)\n- پيداواري ۽ ٽرانسپورٽ خرچ (اندازاً 55%): **${estimatedCost.toLocaleString()} PKR**\n- **صاف منافعو (Net Profit):** **${estimatedProfit.toLocaleString()} PKR**\n\n*نوٽ: اصل منافعو ڀاڻ، پاڻي، ۽ ٽرانسپورٽ خرچن تي منحصر آهي.*`,
        cardType: 'profit',
        cardData: { revenue, estimatedCost, estimatedProfit, rate, qty }
      };
    }

    return {
      mode: 'rule_based',
      message: `**${qty} کلو ${matchedCrop.name} پر متوقع منافع کا حساب:**\n- متوقع کل آمدنی: **${revenue.toLocaleString()} روپے** (@ ${rate} روپے فی کلو)\n- پیداواری اور بیج و کھاد کے اخراجات (تخمینہ 55%): **${estimatedCost.toLocaleString()} روپے**\n- **خالص متوقع منافع (Net Profit):** **${estimatedProfit.toLocaleString()} روپے**\n\n*نوٹ: یہ عام فارمنگ لاگت کا تخمینہ ہے۔ اپنے اصل اخراجات مدنظر رکھیں۔*`,
      cardType: 'profit',
      cardData: { revenue, estimatedCost, estimatedProfit, rate, qty }
    };
  }

  // 4. Selling Price / Rate Intent (Default)
  const avg = matchedCropData.average_price || 95;
  const gradeA = (avg * 1.04).toFixed(1);
  const gradeB = avg.toFixed(1);
  const gradeC = (avg * 0.95).toFixed(1);

  if (lang === 'sd' || lang === 'sd-roman') {
    return {
      mode: 'rule_based',
      message: `**${matchedCrop.name} جو اڄ جو منڊي ريٽ ۽ تجويز ڪيل قيمت:**\n- سراسري منڊي ريٽ: **${avg} PKR فی کلو**\n- **گريڊ A (بهترين معيار):** ${gradeA} PKR\n- **گريڊ B (معياري):** ${gradeB} PKR\n- **گريڊ C (عام):** ${gradeC} PKR\n\n*مشورو: خريدارن کي منڊي اوسط اگهہ تي لاٽ پيش ڪري سٺو اگهہ حاصل ڪري سگهجي ٿو.*`,
      cardType: 'price',
      cardData: matchedCropData
    };
  }

  return {
    mode: 'rule_based',
    message: `**${matchedCrop.name} کا آج کا منڈی ریٹ اور مناسب قیمت:**\n- موجودہ اوسط منڈی ریٹ: **${avg} روپے فی کلو**\n- **گریڈ A (اعلیٰ معیاری فصل):** ${gradeA} روپے\n- **گریڈ B (معیاری):** ${gradeB} روپے\n- **گریڈ C (عام):** ${gradeC} روپے\n\n*مشورہ: اگر آپ کی فصل خشک اور صاف ہے تو گریڈ A کی قیمت مقرر کر کے فوری خریدار تلاش کریں۔*`,
    cardType: 'price',
    cardData: matchedCropData
  };
}

/**
 * Main Assistant entrypoint.
 * Evaluates verified data context, uses Gemini API if available, or seamlessly
 * falls back to the deterministic rule-based assistant.
 */
export async function askKisanDost({ message, district = 'Hyderabad', language }) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Message is required');
  }

  const query = message.trim();
  const detectedLang = language || detectLanguage(query);
  const { matchedCrop, matchedMarket } = detectCropAndMarket(query);

  // Extract quantity if mentioned (e.g. "1000 kg" or "500")
  let quantity = 1000;
  const qtyMatch = query.match(/(\d+)\s*(kg|kilo|کلو|من|mound)?/i);
  if (qtyMatch && Number(qtyMatch[1]) > 0) {
    quantity = Number(qtyMatch[1]);
    if (qtyMatch[2] === 'من' || qtyMatch[2]?.toLowerCase() === 'mound') {
      quantity = quantity * 40; // 1 mound = 40 kg in Sindh
    }
  }

  const context = await gatherKisanMandiContext(matchedMarket?.district || district);
  const ai = getGeminiClient();

  if (ai) {
    try {
      const systemInstruction = `You are "AI Kisan Dost" (اے آئی کسان دوست / اي آءِ ڪسان دوست), a polite, farmer-friendly, empathetic agricultural advisor for farmers in Sindh, Pakistan.
You work inside the KisanMandi web platform.

CORE PRINCIPLES:
1. Ground your answers 100% in the provided verified KisanMandi data below. DO NOT invent prices, dates, weather data, or markets.
2. If data for a specific crop or market is unavailable, clearly and politely tell the farmer that data is not currently recorded.
3. Keep your answers SHORT, PRACTICAL, and SCANNABLE. Farmers reading on mobile phones need quick facts, not long academic essays.
4. Language Rules:
   - If user asks in Urdu or Roman Urdu: reply in simple, respectful, conversational Urdu (or Roman Urdu if they used Roman English letters).
   - If user asks in Sindhi: reply in polite, warm, simple Sindhi (سنڌي).
   - If user asks in English: reply in simple, clear English.
5. Formatting:
   - Use bold bullet points for numbers (Price in PKR, Market name, Quantity, Estimated profit).
   - Include a brief practical tip (e.g. weather warning, transport cost tip, quality grade advice).
   - Offer an action button/suggestion like "منڈی میں لسٹنگ بنائیں" or "موسم کا الرٹ چیک کریں".
6. Safety & Integrity:
   - Never guarantee a sale or price.
   - Do not prescribe chemical pesticides or hazardous chemicals without verified agronomist prescription.

VERIFIED KISANMANDI DATA CONTEXT:
${JSON.stringify({
  date: new Date().toISOString().split('T')[0],
  user_district: district,
  commodities: context.commodityOverview,
  weather: context.weatherData ? {
    district: context.weatherData.current?.district,
    temperature: context.weatherData.current?.temperature,
    condition: context.weatherData.current?.condition,
    humidity: context.weatherData.current?.humidity,
    wind_kmh: context.weatherData.current?.wind_speed_kmh,
    advisories: context.weatherData.advisories
  } : 'Weather service offline',
  active_listings_count: context.activeListingsCount
}, null, 2)}`;

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.2, // low temperature for high factual accuracy grounded in mandi data
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI model timeout after 4s')), 4000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const responseText = response.text?.trim();

      if (responseText) {
        return {
          success: true,
          mode: 'ai',
          message: responseText,
          detected_crop: matchedCrop?.name,
          detected_market: matchedMarket?.name,
          language: detectedLang
        };
      }
    } catch (err) {
      console.warn('[AI Kisan Dost] Gemini API call degraded, falling back to rule-based engine:', err.message);
    }
  }

  // Fallback to deterministic rule-based Kisan Dost engine
  const fallbackResult = generateRuleBasedResponse({
    query,
    lang: detectedLang,
    crop: matchedCrop,
    market: matchedMarket,
    context,
    quantity
  });

  return {
    success: true,
    mode: fallbackResult.mode,
    message: fallbackResult.message,
    cardType: fallbackResult.cardType,
    cardData: fallbackResult.cardData,
    detected_crop: matchedCrop?.name,
    detected_market: matchedMarket?.name,
    language: detectedLang
  };
}
