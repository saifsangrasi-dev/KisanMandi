import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Crop, Market, api } from '../services/api';

interface RecordPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  crops: Crop[];
  markets: Market[];
  onPriceRecorded: () => void;
}

export const RecordPriceModal: React.FC<RecordPriceModalProps> = ({
  isOpen,
  onClose,
  crops,
  markets,
  onPriceRecorded
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const [cropId, setCropId] = useState<string>(crops[0]?.id || '');
  const [marketId, setMarketId] = useState<string>(markets[0]?.id || '');
  const [date, setDate] = useState<string>(todayStr);
  const [price, setPrice] = useState<string>('95');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceVal = Number(price);
    if (isNaN(priceVal) || priceVal <= 0) {
      setError('Price must be a positive number greater than zero.');
      return;
    }

    setLoading(true);
    try {
      await api.createPrice({
        crop_id: cropId,
        market_id: marketId,
        date,
        price: priceVal
      });

      onPriceRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record mandi price');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Record Mandi Price</h2>
            <p className="text-xs text-stone-500">
              Submit daily observation to POST /api/prices (auto-evaluates active price alerts)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="font-bold text-stone-700 block mb-1">Commodity / Crop</label>
            <select
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
              required
            >
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">Mandi / Market</label>
            <select
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
              required
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Observation Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Rate (PKR/kg)</label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-stone-500 text-[11px] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>The backend automatically rejects duplicate records for the same crop, market, and date (HTTP 409).</span>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Record Rate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
