import React, { useState } from 'react';
import { X, Bell, AlertCircle } from 'lucide-react';
import { Crop, Market, User, api } from '../services/api';

interface CreateAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  crops: Crop[];
  markets: Market[];
  activeUser: User | null;
  onAlertCreated: () => void;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  isOpen,
  onClose,
  crops,
  markets,
  activeUser,
  onAlertCreated
}) => {
  if (!isOpen) return null;

  const [cropId, setCropId] = useState<string>(crops[0]?.id || '');
  const [marketId, setMarketId] = useState<string>(markets[0]?.id || '');
  const [condition, setCondition] = useState<'Above' | 'Below'>('Above');
  const [targetPrice, setTargetPrice] = useState<string>('100');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activeUser) {
      setError('Please select an active demo user.');
      return;
    }

    const price = Number(targetPrice);
    if (isNaN(price) || price <= 0) {
      setError('Target price must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      await api.createAlert({
        user_id: activeUser.id,
        crop_id: cropId,
        market_id: marketId,
        condition,
        target_price: price,
        active_status: true
      });

      onAlertCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create price alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Set Mandi Price Trigger</h2>
            <p className="text-xs text-stone-500">
              Receive automated notifications when rates cross your target
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
            <label className="font-bold text-stone-700 block mb-1">Target Commodity</label>
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
              <label className="font-bold text-stone-700 block mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
              >
                <option value="Above">Price Above (&gt;=)</option>
                <option value="Below">Price Below (&lt;=)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Target Price (PKR/kg)</label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-stone-600 text-[11px]">
            Alert will trigger for <strong>{activeUser?.name}</strong> whenever the latest daily rate for this commodity at the selected mandi meets this condition.
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
              <Bell className="w-4 h-4" />
              {loading ? 'Setting Alert...' : 'Create Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
