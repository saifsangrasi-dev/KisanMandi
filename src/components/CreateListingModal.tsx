import React, { useState, useEffect } from 'react';
import { X, PlusCircle, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { Crop, User, api } from '../services/api';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  crops: Crop[];
  activeUser: User | null;
  onListingCreated: () => void;
  initialValues?: {
    cropId?: string;
    district?: string;
    askingPrice?: number;
    quantity?: number;
  };
  onOpenPriceAdvisor?: () => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  isOpen,
  onClose,
  crops,
  activeUser,
  onListingCreated,
  initialValues,
  onOpenPriceAdvisor
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const [cropId, setCropId] = useState<string>(initialValues?.cropId || crops[0]?.id || '');
  const [quantity, setQuantity] = useState<string>(initialValues?.quantity ? String(initialValues.quantity) : '1000');
  const [askingPrice, setAskingPrice] = useState<string>(initialValues?.askingPrice ? String(initialValues.askingPrice) : '95');
  const [district, setDistrict] = useState<string>(initialValues?.district || activeUser?.district || 'Hyderabad');
  const [grade, setGrade] = useState<'A' | 'B' | 'C'>('A');
  const [availableFrom, setAvailableFrom] = useState<string>(todayStr);
  const [contactPhone, setContactPhone] = useState<string>(activeUser?.phone || '0300-1122334');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues?.cropId) setCropId(initialValues.cropId);
    if (initialValues?.district) setDistrict(initialValues.district);
    if (initialValues?.askingPrice) setAskingPrice(String(initialValues.askingPrice));
    if (initialValues?.quantity) setQuantity(String(initialValues.quantity));
  }, [initialValues, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activeUser) {
      setError('Please select an active user identity.');
      return;
    }

    if (activeUser.role !== 'Farmer') {
      setError(`Role restriction: User '${activeUser.name}' is a Buyer. Only registered Farmers can create produce listings.`);
      return;
    }

    const qty = Number(quantity);
    const price = Number(askingPrice);

    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (isNaN(price) || price <= 0) {
      setError('Asking price must be greater than zero.');
      return;
    }

    if (availableFrom < todayStr) {
      setError('Available-from date cannot be in the past.');
      return;
    }

    setLoading(true);
    try {
      await api.createListing({
        user_id: activeUser.id,
        crop_id: cropId,
        quantity: qty,
        asking_price: price,
        district,
        grade,
        available_from: availableFrom,
        contact_phone: contactPhone,
        status: 'Active'
      });

      onListingCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Post Produce Lot</h2>
            <p className="text-xs text-stone-500">
              List farm commodities directly to buyers via POST /api/listings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Farmer role safeguard */}
        {activeUser?.role !== 'Farmer' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Buyer Account:</strong> Switch identity in the header to a Farmer (e.g. Rasheed Ahmed) to test listing creation.
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="font-bold text-stone-700 block mb-1">Select Crop</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Quantity (kg)</label>
              <input
                type="number"
                min="1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-stone-700 block">Asking Price (PKR/kg)</label>
                {onOpenPriceAdvisor && (
                  <button
                    type="button"
                    onClick={onOpenPriceAdvisor}
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    <span>Price Advisor</span>
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0.1"
                step="any"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Quality Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as any)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
              >
                <option value="A">Grade A (Export / Premium)</option>
                <option value="B">Grade B (Standard Market)</option>
                <option value="C">Grade C (Processing / Fair)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Available From</label>
              <input
                type="date"
                min={todayStr}
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
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
              disabled={loading || activeUser?.role !== 'Farmer'}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              {loading ? 'Creating...' : 'Publish Produce Lot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
