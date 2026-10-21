/**
 * KisanMandi Weather Service
 *
 * Integrates real meteorological forecasts for agricultural districts in Sindh.
 * Generates cautious, farmer-friendly advisories based on actual forecast conditions.
 */

const DISTRICT_COORDINATES = {
  hyderabad: { name: 'Hyderabad', lat: 25.3960, lon: 68.3578 },
  sukkur: { name: 'Sukkur', lat: 27.7052, lon: 68.8574 },
  'mirpur khas': { name: 'Mirpur Khas', lat: 25.5276, lon: 69.0125 },
  larkana: { name: 'Larkana', lat: 27.5590, lon: 68.2120 },
  nawabshah: { name: 'Nawabshah', lat: 26.2483, lon: 68.4096 },
  badin: { name: 'Badin', lat: 24.6558, lon: 68.8384 }
};

// 15-minute in-memory cache to prevent duplicate external calls on rapid page refreshes
const weatherCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function interpretWeatherCode(code) {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return { label: 'Clear sky', icon: 'sun' };
  if (code === 1 || code === 2) return { label: 'Partly cloudy', icon: 'cloud-sun' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud' };
  if ([45, 48].includes(code)) return { label: 'Foggy / Hazy', icon: 'cloud-fog' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: 'Rain / Showers', icon: 'cloud-rain' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: 'cloud-lightning' };
  return { label: 'Moderate', icon: 'cloud' };
}

function generateFarmingAdvisories(current, dailyForecast = []) {
  const advisories = [];

  // Check rain in forecast
  const upcomingRainDay = dailyForecast.find((d) => d.rain_probability >= 40 || d.precipitation_mm >= 2.0);
  if (upcomingRainDay) {
    advisories.push({
      type: 'rain',
      severity: 'warning',
      title: 'Rain Expected / بارش کا امکان',
      message: `Rain probability is ${upcomingRainDay.rain_probability}% on ${upcomingRainDay.date}. Check whether harvesting, crop drying, or pesticide spraying should be delayed.`
    });
  }

  // Check high heat
  const highHeatDay = dailyForecast.find((d) => d.max_temp >= 38);
  if (highHeatDay) {
    advisories.push({
      type: 'heat',
      severity: 'warning',
      title: 'High Heat / شدید گرمی',
      message: `High temperatures expected up to ${highHeatDay.max_temp}°C. Monitor soil moisture closely and avoid irrigating during peak midday sunshine.`
    });
  }

  // Check strong winds
  const windyDay = dailyForecast.find((d) => d.max_wind_kmh >= 25);
  if (windyDay) {
    advisories.push({
      type: 'wind',
      severity: 'alert',
      title: 'Strong Winds Expected / تیز ہواؤں کی پیشگوئی',
      message: `Wind gusts up to ${windyDay.max_wind_kmh} km/h expected. Inspect exposed tall crops, fruit orchards, and nursery sheds.`
    });
  }

  // If no adverse condition
  if (advisories.length === 0) {
    advisories.push({
      type: 'favorable',
      severity: 'info',
      title: 'Favorable Farming Conditions / مناسب موسم',
      message: 'Weather conditions are generally calm and dry. Suitable for regular field inspection, fertilization, and crop transport to the mandi.'
    });
  }

  return advisories;
}

export async function getDistrictWeather(districtName = 'Hyderabad') {
  const normalizedKey = districtName.trim().toLowerCase();
  const districtInfo = DISTRICT_COORDINATES[normalizedKey] || DISTRICT_COORDINATES['hyderabad'];

  const cacheKey = districtInfo.name.toLowerCase();
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const { lat, lon, name } = districtInfo;

  // Real Meteorological API from Open-Meteo
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=Asia%2FKarachi`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Weather service returned HTTP ${res.status}`);
    }

    const raw = await res.json();
    if (!raw.current || !raw.daily) {
      throw new Error('Incomplete meteorological payload from provider');
    }

    const currentCondition = interpretWeatherCode(raw.current.weather_code);

    const dailyForecast = (raw.daily.time || []).slice(0, 5).map((dateStr, idx) => {
      const code = raw.daily.weather_code?.[idx] ?? 0;
      return {
        date: dateStr,
        max_temp: Math.round(raw.daily.temperature_2m_max?.[idx] ?? 0),
        min_temp: Math.round(raw.daily.temperature_2m_min?.[idx] ?? 0),
        rain_probability: Math.round(raw.daily.precipitation_probability_max?.[idx] ?? 0),
        precipitation_mm: Number(raw.daily.precipitation_sum?.[idx] ?? 0),
        max_wind_kmh: Math.round(raw.daily.wind_speed_10m_max?.[idx] ?? 0),
        condition: interpretWeatherCode(code)
      };
    });

    const currentData = {
      district: name,
      latitude: lat,
      longitude: lon,
      temperature: Math.round(raw.current.temperature_2m),
      humidity: Math.round(raw.current.relative_humidity_2m),
      wind_speed_kmh: Math.round(raw.current.wind_speed_10m),
      condition: currentCondition.label,
      condition_icon: currentCondition.icon,
      last_updated: new Date().toISOString(),
      provider: 'Open-Meteo Meteorological Service'
    };

    const advisories = generateFarmingAdvisories(currentData, dailyForecast);

    const result = {
      district: name,
      current: currentData,
      forecast: dailyForecast,
      advisories,
      last_updated: currentData.last_updated
    };

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`Weather service unavailable: ${err.message}`);
  }
}

export function getSupportedDistricts() {
  return Object.values(DISTRICT_COORDINATES).map((d) => d.name);
}
