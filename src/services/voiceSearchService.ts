/**
 * KisanMandi Voice Search Service
 *
 * Supports Urdu (ur-PK) and Sindhi (sd-PK) browser speech recognition.
 * Extracts agricultural commodities and market locations from spoken natural language queries.
 */

export interface ParsedVoiceQuery {
  transcript: string;
  cropId?: string;
  cropName?: string;
  marketId?: string;
  marketName?: string;
  district?: string;
}

// Crop entity synonyms in Urdu, Sindhi, and Roman script
const CROP_DICTIONARY = [
  {
    id: 'crp_wheat',
    name: 'Wheat',
    keywords: [
      'گندم', 'گیہوں', 'گندم کا ریٹ', 'گندم کی قیمت',
      'ڪڻڪ', 'ڪڻڪ جو اگهہ', 'ڪڻڪ جا ريٽ',
      'gandum', 'kanak', 'gehun', 'gehoon', 'wheat'
    ]
  },
  {
    id: 'crp_rice',
    name: 'Rice (Basmati)',
    keywords: [
      'چاول', 'باسمتی', 'چاول کا ریٹ',
      'چانور', 'چانورن جو اگهہ', 'ٻسمتي',
      'chawal', 'chanwar', 'basmati', 'chaonr', 'rice'
    ]
  },
  {
    id: 'crp_cotton',
    name: 'Cotton',
    keywords: [
      'کپاس', 'پھٹی', 'روئی', 'کپاس کا ریٹ',
      'ڦٽيون', 'ڪپھ', 'ڦٽي جو ريٽ',
      'kapas', 'phutti', 'phutiyan', 'cotton'
    ]
  },
  {
    id: 'crp_sugarcane',
    name: 'Sugarcane',
    keywords: [
      'گنا', 'کماد', 'گنے کا ریٹ',
      'ڪمند', 'ڪمند جو اگهہ',
      'ganna', 'kamand', 'sugarcane', 'kamad'
    ]
  },
  {
    id: 'crp_onion',
    name: 'Onion',
    keywords: [
      'پیاز', 'پیاز کا ریٹ',
      'بصر', 'ڳنڍا', 'بصرن جو اگهہ',
      'piaz', 'pyaz', 'basar', 'gandha', 'onion'
    ]
  },
  {
    id: 'crp_tomato',
    name: 'Tomato',
    keywords: [
      'ٹماٹر', 'ٹماٹر کا ریٹ',
      'ٽماٽر', 'ٽماٽا', 'ٽماٽن جو ريٽ',
      'tamatar', 'tomato', 'tamata'
    ]
  },
  {
    id: 'crp_mango',
    name: 'Mango (Sindhri)',
    keywords: [
      'آم', 'سندھڑی', 'آم کا ریٹ',
      'انب', 'سنڌڙي انب', 'انب جو اگهہ',
      'aam', 'mango', 'sindhri', 'anb'
    ]
  },
  {
    id: 'crp_banana',
    name: 'Banana',
    keywords: [
      'کیلا', 'کیلے کا ریٹ',
      'ڪيلو', 'ڪيلا', 'ڪيلن جو اگهہ',
      'kela', 'banana', 'kelo', 'kele'
    ]
  }
];

// Market & District synonyms in Urdu, Sindhi, and Roman script
const MARKET_DICTIONARY = [
  {
    id: 'mkt_hyd',
    name: 'Hyderabad Mandi',
    district: 'Hyderabad',
    keywords: [
      'حیدرآباد', 'حیدر آباد', 'حیدرآباد منڈی',
      'حيدرآباد', 'حيدر آباد', 'حيدرآباد منڊي',
      'hyderabad', 'hyd'
    ]
  },
  {
    id: 'mkt_suk',
    name: 'Sukkur Mandi',
    district: 'Sukkur',
    keywords: [
      'سکھر', 'سکھر منڈی',
      'سکر', 'سکر منڊي',
      'sukkur', 'suk'
    ]
  },
  {
    id: 'mkt_mpk',
    name: 'Mirpur Khas Mandi',
    district: 'Mirpur Khas',
    keywords: [
      'میرپور خاص', 'میرپورخاص', 'میرپورخاص منڈی',
      'ميرپورخاص', 'ميرپور خاص', 'ميرپورخاص منڊي',
      'mirpur khas', 'mirpurkhas', 'mpk'
    ]
  }
];

/**
 * Checks if SpeechRecognition is supported by the user's browser.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

/**
 * Parses spoken phrases into identified crop and market entities.
 */
export function parseSpokenQuery(transcript: string): ParsedVoiceQuery {
  const normalized = transcript.toLowerCase().trim();
  const result: ParsedVoiceQuery = { transcript };

  // Detect crop
  for (const crop of CROP_DICTIONARY) {
    const matched = crop.keywords.some((kw) => normalized.includes(kw.toLowerCase()));
    if (matched) {
      result.cropId = crop.id;
      result.cropName = crop.name;
      break;
    }
  }

  // Detect market / district
  for (const market of MARKET_DICTIONARY) {
    const matched = market.keywords.some((kw) => normalized.includes(kw.toLowerCase()));
    if (matched) {
      result.marketId = market.id;
      result.marketName = market.name;
      result.district = market.district;
      break;
    }
  }

  return result;
}

export type VoiceLanguage = 'ur-PK' | 'sd-PK';

export class VoiceSearchController {
  private recognition: any = null;
  private isListening: boolean = false;

  constructor() {
    if (isSpeechRecognitionSupported()) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
    }
  }

  public isAvailable(): boolean {
    return this.recognition !== null;
  }

  public startListening(
    lang: VoiceLanguage,
    onResult: (parsed: ParsedVoiceQuery) => void,
    onError: (errMessage: string) => void,
    onStatusChange: (status: 'listening' | 'processing' | 'idle') => void
  ) {
    if (!this.recognition) {
      onError('Speech recognition is not supported in this browser. Please use keyboard search.');
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }

    this.recognition.lang = lang;
    this.isListening = true;
    onStatusChange('listening');

    this.recognition.onresult = (event: any) => {
      onStatusChange('processing');
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      const parsed = parseSpokenQuery(transcript);
      this.isListening = false;
      onStatusChange('idle');
      onResult(parsed);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onStatusChange('idle');

      let userMsg = 'Could not understand spoken voice. Please try again or type your query.';
      if (event.error === 'not-allowed') {
        userMsg = 'Microphone permission was denied. Please allow microphone access in your browser.';
      } else if (event.error === 'no-speech') {
        userMsg = 'No voice detected. Please tap the mic and speak clearly.';
      } else if (event.error === 'language-not-supported') {
        if (lang === 'sd-PK') {
          userMsg =
            'Sindhi speech recognition is not supported by your browser engine. Please select Urdu (اردو) or type your search.';
        } else {
          userMsg = 'Selected language is not supported by your browser speech engine.';
        }
      }

      onError(userMsg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onStatusChange('idle');
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      this.isListening = false;
      onStatusChange('idle');
      onError(err.message || 'Failed to start microphone.');
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }
}
