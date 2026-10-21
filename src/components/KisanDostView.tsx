import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  TrendingUp,
  CloudSun,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Store,
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { User, api, AssistantResponse, AssistantStatus } from '../services/api';
import {
  VoiceSearchController,
  VoiceLanguage,
  isSpeechRecognitionSupported
} from '../services/voiceSearchService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  mode?: 'ai' | 'rule_based';
  cardType?: 'weather' | 'market_comparison' | 'profit' | 'price' | 'info';
  cardData?: any;
}

interface KisanDostViewProps {
  activeUser: User | null;
  onNavigateToTab?: (tab: 'prices' | 'marketplace' | 'weather' | 'alerts') => void;
}

const SUGGESTED_QUESTIONS = [
  {
    text: 'Aaj gandum ka rate kya hai?',
    urdu: 'آج گندم کا ریٹ کیا ہے؟',
    sindhi: 'اڄ ڪڻڪ جو ڇا ريٽ آهي؟',
    category: 'rate'
  },
  {
    text: 'Meri fasal kis mandi mein bechni chahiye?',
    urdu: 'میری فصل کس منڈی میں بیچنی چاہیے؟',
    sindhi: 'منهنجو فصل ڪهڙي منڊي ۾ وڪڻڻ گهرجي؟',
    category: 'market'
  },
  {
    text: 'Aaj mausam kaisa rahega?',
    urdu: 'آج موسم کیسا رہے گا؟',
    sindhi: 'اڄ موسم ڪيئن رهندو؟',
    category: 'weather'
  },
  {
    text: 'Mujhe kitna munafa hoga?',
    urdu: 'مجھے 1000 کلو پر کتنا منافع ہوگا؟',
    sindhi: 'مون کي فصل مان ڪيترو فائدو ٿيندو؟',
    category: 'profit'
  },
  {
    text: 'Meri fasal ka munasib rate kya hai?',
    urdu: 'میری فصل کا مناسب ریٹ کیا ہے؟',
    sindhi: 'منهنجي فصل جو مناسب اگهہ ڇا آهي؟',
    category: 'price'
  }
];

export const KisanDostView: React.FC<KisanDostViewProps> = ({
  activeUser,
  onNavigateToTab
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: 'اسلام علیکم! میں آپ کا **AI کسان دوست** ہوں۔ آپ مجھ سے کسی بھی فصل کا آج کا منڈی ریٹ، بہترین مارکیٹ، موسم کا حال، مناسب قیمت، یا منافع کا تخمینہ معلوم کر سکتے ہیں۔ نیچے دیے گئے سوالات پر ٹیپ کریں یا مائیک کا بٹن دبا کر بولیں۔',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'ai'
    }
  ]);

  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus | null>(null);

  // Voice Input State
  const [selectedLanguage, setSelectedLanguage] = useState<VoiceLanguage>('ur-PK');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const voiceControllerRef = useRef<VoiceSearchController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    voiceControllerRef.current = new VoiceSearchController();
    fetchStatus();

    return () => {
      voiceControllerRef.current?.stopListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const fetchStatus = async () => {
    try {
      const res = await api.getAssistantStatus();
      setAssistantStatus(res.data);
    } catch {
      // Non-blocking
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsgId = 'usr_' + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setVoiceNotice(null);
    setLoading(true);

    try {
      const response = await api.askKisanDost({
        message: text,
        district: activeUser?.district || 'Hyderabad',
        language: selectedLanguage === 'sd-PK' ? 'sd' : 'ur'
      });

      const assistantMsg: ChatMessage = {
        id: 'ast_' + Date.now(),
        sender: 'assistant',
        text: response.data?.message || 'جواب موصول نہیں ہو سکا۔ برائے مہربانی دوبارہ کوشش کریں۔',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: response.data?.mode,
        cardType: response.data?.cardType,
        cardData: response.data?.cardData
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        sender: 'assistant',
        text: `معذرت! رابطہ قائم نہیں ہو سکا: ${err.message || 'Error communicating with assistant'}۔ برائے مہربانی اپنے انٹرنیٹ یا سرور کی جانچ کریں۔`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: 'rule_based'
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Voice Input Handler
  const toggleVoiceInput = () => {
    setVoiceNotice(null);

    if (isListening) {
      voiceControllerRef.current?.stopListening();
      setIsListening(false);
      return;
    }

    if (!voiceControllerRef.current?.isAvailable()) {
      setVoiceNotice('اس براؤزر میں آواز کی شناخت کی سہولت موجود نہیں ہے۔ آپ ٹائپ کر کے سوال پوچھ سکتے ہیں۔');
      return;
    }

    voiceControllerRef.current.startListening(
      selectedLanguage,
      (parsed) => {
        setIsListening(false);
        if (parsed.transcript) {
          setInputText(parsed.transcript);
          setVoiceNotice(`آواز مل گئی: "${parsed.transcript}"`);
        }
      },
      (errMessage) => {
        setIsListening(false);
        setVoiceNotice(errMessage);
      },
      (status) => {
        setIsListening(status === 'listening');
      }
    );
  };

  // Text-To-Speech (Speech Output) Handler
  const handleSpeakText = (messageId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown characters for pleasant speech output
    const cleanText = text.replace(/[*_#`[\]()]/g, ' ').replace(/-/g, ' ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = selectedLanguage === 'sd-PK' ? 'ur-PK' : 'ur-PK'; // Urdu fallback is best supported in Web Speech engines
    utterance.rate = 0.9;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  const browserSupportsSpeech = isSpeechRecognitionSupported();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-stone-900 tracking-tight">
                  AI Kisan Dost (کسان دوست)
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  {assistantStatus?.provider || 'Grounded Assistant'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                مصدقہ کسان منڈی ریٹس، بہترین مارکیٹ کے مشورے، اور موسمی رہنمائی
              </p>
            </div>
          </div>

          {/* Voice Language Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-stone-50 p-1 rounded-2xl border border-stone-200">
            <span className="text-[11px] font-bold text-stone-400 pl-2 pr-1 uppercase">زبان:</span>
            <button
              onClick={() => setSelectedLanguage('ur-PK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedLanguage === 'ur-PK'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              اردو (Urdu)
            </button>
            <button
              onClick={() => setSelectedLanguage('sd-PK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedLanguage === 'sd-PK'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              سنڌي (Sindhi)
            </button>
          </div>
        </div>

        {/* Suggested Questions Grid */}
        <div className="pt-4">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>فوری سوالات (Tap to Ask):</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.text)}
                disabled={loading}
                className="text-left text-xs font-bold px-3.5 py-2 rounded-2xl bg-stone-50 hover:bg-emerald-50 hover:text-emerald-900 border border-stone-200 hover:border-emerald-300 text-stone-700 transition-all active:scale-98 shadow-2xs"
              >
                <span>{q.text}</span>
                <span className="block text-[10px] font-normal text-stone-400 mt-0.5">
                  {selectedLanguage === 'sd-PK' ? q.sindhi : q.urdu}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xs border border-stone-200 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4 mb-4 overflow-y-auto max-h-[500px] pr-1">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-emerald-800 text-white rounded-tr-none shadow-xs'
                      : 'bg-stone-50 text-stone-900 border border-stone-200 rounded-tl-none shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-line font-normal">{msg.text}</div>

                  {/* Structured Card: Weather */}
                  {msg.cardType === 'weather' && msg.cardData && (
                    <div className="mt-3 p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-xs">
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <CloudSun className="w-4 h-4 text-sky-600" />
                          {msg.cardData.district} Weather Forecast
                        </span>
                        <span className="text-sm font-black">{msg.cardData.current?.temperature}°C</span>
                      </div>
                      <p className="text-[11px] text-sky-800">
                        {msg.cardData.current?.condition} • Humidity: {msg.cardData.current?.humidity}% • Wind: {msg.cardData.current?.wind_speed_kmh} km/h
                      </p>
                      {onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('weather')}
                          className="mt-2 text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 underline"
                        >
                          View 5-Day Sindh Weather Dashboard <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Structured Card: Market Comparison */}
                  {msg.cardType === 'market_comparison' && msg.cardData && (
                    <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-emerald-700" />
                          Best Mandi: {msg.cardData.highest_market?.market_name}
                        </span>
                        <span className="text-sm font-black text-emerald-800">
                          {msg.cardData.highest_market?.price} PKR/kg
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        All-mandi average: {msg.cardData.average_price} PKR/kg
                      </p>
                      {onNavigateToTab && (
                        <button
                          onClick={() => onNavigateToTab('prices')}
                          className="mt-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 underline"
                        >
                          Open Mandi Prices & 14-Day Charts <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Structured Card: Profit */}
                  {msg.cardType === 'profit' && msg.cardData && (
                    <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-amber-700" />
                          Estimated Net Profit
                        </span>
                        <span className="text-sm font-black text-emerald-700">
                          +{msg.cardData.estimatedProfit?.toLocaleString()} PKR
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-amber-900">
                        <div>Revenue: Rs. {msg.cardData.revenue?.toLocaleString()}</div>
                        <div>Est. Costs: Rs. {msg.cardData.estimatedCost?.toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Text-to-Speech Button */}
                  <div className="mt-2.5 pt-1.5 border-t border-black/5 flex items-center justify-between text-[10px] opacity-80">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleSpeakText(msg.id, msg.text)}
                        className="flex items-center gap-1 text-[10px] font-bold hover:underline"
                        title="Read aloud in Urdu/Sindhi"
                      >
                        {speakingMessageId === msg.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-600" />
                            <span>Stop voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-emerald-700" />
                            <span>Awaaz se sunain (بولیں)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl w-fit animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>کسان دوست سوچ رہا ہے... (Kisan Dost is analyzing real mandi data...)</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice Feedback Banner */}
        {voiceNotice && (
          <div className="mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <span>{voiceNotice}</span>
            <button
              onClick={() => setVoiceNotice(null)}
              className="text-stone-400 hover:text-stone-600 font-bold ml-2 text-sm leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* Input & Microphone Bar */}
        <div className="pt-2 border-t border-stone-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Microphone Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-3.5 rounded-2xl transition-all shadow-xs flex items-center justify-center shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
              title="Awaaz se bolein (Urdu & Sindhi voice input)"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='فصل، ریٹ، منڈی، یا موسم کے بارے میں پوچھیں... (e.g. "Aaj gandum ka rate kya hai?")'
              disabled={loading}
              className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm text-stone-900 focus:outline-emerald-600 focus:bg-white transition-all"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="px-5 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <span>بھیجیں</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-stone-400 text-center mt-2">
            AI کسان دوست کسان منڈی کے اصل تصدیق شدہ نرخوں پر مبنی مشورے دیتا ہے۔ حتمی فیصلہ کسان کا اپنا ہوگا۔
          </p>
        </div>
      </div>
    </div>
  );
};
