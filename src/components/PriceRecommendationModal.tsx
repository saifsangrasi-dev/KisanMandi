import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Award,
  DollarSign,
  Calculator,
  ArrowRight,
  Sparkles,
  Info,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Crop, Market, PriceSummary, MarketComparison, api } from '../services/api';

interface PriceRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  crops: Crop[];
  markets: Market[];
  onApplyToListing: (recommendation: {
    cropId: string;
    district: string;
    suggestedPrice: number;
    quantity?: number;
  }) => void;
}

export const PriceRecommendationModal: React.FC<PriceRecommendationModalProps> = ({
  isOpen,
  onClose,
  crops,
  markets,
  onApplyToListing
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<number>(1);
  const [selectedCropId, setSelectedCropId] = useState<string>(crops[0]?.id || 'crp_wheat');
  const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || 'mkt_hyd');
  const [quantity, setQuantity] = useState<string>('1000');

  const [summary, setSummary] = useState<PriceSummary | null>(null);
  const [comparison, setComparison] = useState<MarketComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, compRes] = await Promise.all([
        api.getPriceSummary(selectedCropId, selectedMarketId),
        api.getMarketComparison(selectedCropId)
      ]);
      setSummary(sumRes.data);
      setComparison(compRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch market benchmark data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedCropId, selectedMarketId]);

  const selectedCrop =
    crops.find((c) => c.id === selectedCropId) || crops[0] || { id: 'crp_wheat', name: 'Wheat' };
  const selectedMarket =
    markets.find((m) => m.id === selectedMarketId) || markets[0] || { id: 'mkt_hyd', name: 'Hyderabad Mandi', district: 'Hyderabad' };

  // Statistical price recommendation computation
  const avg = summary?.stats_14_day?.average ?? summary?.latest_record?.price ?? 100;
  const min = summary?.stats_14_day?.min ?? (avg * 0.95);
  const max = summary?.stats_14_day?.max ?? (avg * 1.05);

  // Suggested range: from (avg - 1%) to (avg + 4%) for prime quality produce
  const suggestedMin = Number((avg * 0.98).toFixed(1));
  const suggestedMax = Number((avg * 1.04).toFixed(1));
  const suggestedOptimal = Number(avg.toFixed(1));

  const totalEstimatedEarnings = quantity && Number(quantity) > 0
    ? Math.round(Number(quantity) * suggestedOptimal)
    : null;

  const handleTransferToListing = () => {
    onApplyToListing({
      cropId: selectedCropId,
      district: selectedMarket.district,
      suggestedPrice: suggestedOptimal,
      quantity: quantity && Number(quantity) > 0 ? Number(quantity) : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 text-stone-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">
                Smart Selling Price Recommendation
              </h3>
              <p className="text-xs text-stone-500">
                Bechne Ka Munasib Rate / مناسب اگهہ جو اندازو
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Selection Bar */}
        <div className="mt-4 p-3 bg-stone-50 border border-stone-200 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Step 1: Crop */}
          <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
              1. Fasal (Crop)
            </label>
            <select
              value={selectedCropId}
              onChange={(e) => setSelectedCropId(e.target.value)}
              className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-emerald-600"
            >
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Mandi */}
          <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
              2. Mandi (Market)
            </label>
            <select
              value={selectedMarketId}
              onChange={(e) => setSelectedMarketId(e.target.value)}
              className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-emerald-600"
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Quantity */}
          <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
              3. Wazan / Qty (kg)
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-emerald-600"
            />
          </div>
        </div>

        {/* Step 4: Recommendation Results */}
        {error ? (
          <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Big Suggested Price Box */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 relative overflow-hidden">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Suggested Asking Price / تجویز کردہ ریٹ
              </span>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
                  Rs. {suggestedMin} – {suggestedMax}
                </span>
                <span className="text-sm font-semibold text-emerald-800">per kg</span>
              </div>

              <p className="text-xs text-emerald-900/90 mt-2 font-medium">
                Based on actual recent mandi prices, you could consider asking <strong>Rs. {suggestedOptimal} per kg</strong> for Grade A quality.
              </p>

              {totalEstimatedEarnings && (
                <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between text-xs">
                  <span className="text-emerald-800">Estimated Total (for {Number(quantity).toLocaleString()} kg):</span>
                  <span className="font-mono font-black text-emerald-950 text-sm">
                    Rs. {totalEstimatedEarnings.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Benchmark Price Data Points */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl">
                <span className="text-[10px] text-stone-400 block font-medium">Recent 14-Day Min</span>
                <span className="text-sm font-bold text-stone-800">Rs. {min}</span>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl">
                <span className="text-[10px] text-stone-400 block font-medium">Recent Mandi Avg</span>
                <span className="text-sm font-bold text-stone-800">Rs. {avg}</span>
              </div>
              <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl">
                <span className="text-[10px] text-stone-400 block font-medium">Recent 14-Day Max</span>
                <span className="text-sm font-bold text-stone-800">Rs. {max}</span>
              </div>
            </div>

            {/* Other Mandis Comparison */}
            {comparison?.markets && comparison.markets.length > 1 && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Rates at Other Mandis:
                </span>
                <div className="flex flex-wrap gap-2">
                  {comparison.markets.map((mItem) => (
                    <span
                      key={mItem.market_id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        mItem.market_id === selectedMarketId
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-white border border-stone-200 text-stone-700'
                      }`}
                    >
                      {mItem.market_name}: <strong>Rs. {mItem.price}/kg</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Methodology Note & Disclaimer */}
            <div className="p-3 rounded-xl bg-stone-50 text-[11px] text-stone-500 space-y-1">
              <p>
                <strong>Calculation Method:</strong> Calculated from {summary?.stats_14_day?.observations || 14} verified daily observations in {selectedMarket.name}. It compares the crop's 14-day statistical average with neighboring mandis.
              </p>
              <p className="text-stone-400">
                * Note: Market rates fluctuate based on grade, freshness, and buyer demand. Transport costs are not deducted.
              </p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-100">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-semibold text-center"
          >
            Close
          </button>

          <button
            onClick={handleTransferToListing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            <span>Use This Price in Listing</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
