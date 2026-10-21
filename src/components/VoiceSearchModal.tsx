import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Volume2,
  CheckCircle,
  AlertCircle,
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  VoiceSearchController,
  VoiceLanguage,
  ParsedVoiceQuery,
  isSpeechRecognitionSupported
} from '../services/voiceSearchService';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuery: (query: ParsedVoiceQuery) => void;
}

export const VoiceSearchModal: React.FC<VoiceSearchModalProps> = ({
  isOpen,
  onClose,
  onApplyQuery
}) => {
  if (!isOpen) return null;

  const [language, setLanguage] = useState<VoiceLanguage>('ur-PK');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<ParsedVoiceQuery | null>(null);

  const controllerRef = useRef<VoiceSearchController | null>(null);

  useEffect(() => {
    controllerRef.current = new VoiceSearchController();
    return () => {
      controllerRef.current?.stopListening();
    };
  }, []);

  const handleStartListening = () => {
    setErrorMsg(null);
    setRecognizedText('');
    setParsedResult(null);

    if (!controllerRef.current?.isAvailable()) {
      setErrorMsg(
        'Speech recognition is not supported in this browser. You can type your query in the search bar.'
      );
      return;
    }

    controllerRef.current.startListening(
      language,
      (parsed) => {
        setRecognizedText(parsed.transcript);
        setParsedResult(parsed);
      },
      (err) => {
        setErrorMsg(err);
      },
      (s) => {
        setStatus(s);
      }
    );
  };

  const handleStopListening = () => {
    controllerRef.current?.stopListening();
    setStatus('idle');
  };

  const handleApply = () => {
    if (parsedResult) {
      onApplyQuery(parsedResult);
      onClose();
    } else if (recognizedText.trim()) {
      onApplyQuery({ transcript: recognizedText.trim() });
      onClose();
    }
  };

  const browserSupportsSpeech = isSpeechRecognitionSupported();

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-stone-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-stone-900 text-base">
              Awaaz Se Search / آواز سے تلاش
            </h3>
          </div>
          <button
            onClick={() => {
              handleStopListening();
              onClose();
            }}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selection */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => {
              setLanguage('ur-PK');
              setErrorMsg(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              language === 'ur-PK'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
            }`}
          >
            اردو (Urdu)
          </button>
          <button
            onClick={() => {
              setLanguage('sd-PK');
              setErrorMsg(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              language === 'sd-PK'
                ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
            }`}
          >
            سنڌي (Sindhi)
          </button>
        </div>

        {language === 'sd-PK' && (
          <p className="text-[11px] text-stone-500 text-center mt-2 px-2">
            * نوٽ: سنڌي آواز جي سڃاڻپ براؤزر تي منحصر آهي. جيڪڏهن برائوزر سپورٽ نه ڪري ته اردو چونڊيو يا ٽائيپ ڪريو.
          </p>
        )}

        {/* Big Central Mic Button */}
        <div className="my-6 flex flex-col items-center justify-center text-center">
          <button
            onClick={status === 'listening' ? handleStopListening : handleStartListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 relative ${
              status === 'listening'
                ? 'bg-red-500 text-white ring-8 ring-red-200 animate-pulse'
                : status === 'processing'
                ? 'bg-amber-500 text-white ring-8 ring-amber-100'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-xl'
            }`}
            title="Tap to speak"
          >
            {status === 'listening' ? (
              <MicOff className="w-10 h-10" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </button>

          {/* Simple state instruction */}
          <div className="mt-4">
            {status === 'listening' ? (
              <div>
                <p className="text-sm font-black text-red-600 animate-pulse">
                  Sun rahe hain... Bolna shuru karein
                </p>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  سنو پيا... ڳالھايو / Bol kar fasal ka naam batayein
                </p>
              </div>
            ) : status === 'processing' ? (
              <p className="text-sm font-bold text-amber-600">
                Awaaz samajh rahe hain... / آواز جي چڪاس...
              </p>
            ) : (
              <div>
                <p className="text-sm font-bold text-stone-800">
                  Bol kar fasal ka naam batayein
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Tap microphone to search by voice
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Browser limitation banner if unsupported */}
        {!browserSupportsSpeech && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Voice recognition is not supported in this browser. Please use Chrome/Edge on mobile/desktop, or type below.
            </span>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMsg}</p>
              <p className="text-[11px] text-red-600 mt-1">
                Tip: Try saying "Hyderabad mein gandum ka rate" or "Sukkur mein chawal".
              </p>
            </div>
          </div>
        )}

        {/* Recognized Transcript Display & Manual Editor */}
        <div className="space-y-3">
          <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            Pehchane gaye alfaaz / Recognized Speech
          </label>
          <div className="relative">
            <input
              type="text"
              value={recognizedText}
              onChange={(e) => setRecognizedText(e.target.value)}
              placeholder='e.g. "Hyderabad mein gandum ka rate kya hai?"'
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-emerald-600 focus:bg-white"
            />
          </div>

          {/* Identified Entities Badges */}
          {parsedResult && (parsedResult.cropName || parsedResult.marketName) && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex flex-wrap items-center gap-2">
              <span className="font-bold text-emerald-900 text-[11px]">Milne wali fasaal:</span>
              {parsedResult.cropName && (
                <span className="px-2 py-0.5 bg-emerald-700 text-white font-bold rounded-md text-[11px]">
                  {parsedResult.cropName}
                </span>
              )}
              {parsedResult.marketName && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[11px]">
                  {parsedResult.marketName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            onClick={() => {
              handleStopListening();
              onClose();
            }}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!recognizedText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Now / تلاش ڪريو</span>
          </button>
        </div>
      </div>
    </div>
  );
};
