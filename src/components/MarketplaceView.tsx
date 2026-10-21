import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  Phone,
  Calendar,
  MapPin,
  Tag,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Mic,
  Sparkles,
  Volume2
} from 'lucide-react';
import { Listing, Crop, User, api } from '../services/api';
import { VoiceSearchModal } from './VoiceSearchModal';
import { ParsedVoiceQuery } from '../services/voiceSearchService';

interface MarketplaceViewProps {
  crops: Crop[];
  activeUser: User | null;
  onOpenCreateModal: () => void;
  onOpenPriceAdvisor?: () => void;
  onOpenAssistant?: () => void;
}

const DEFAULT_LISTINGS: Listing[] = [
  {
    id: 'lst_001',
    user_id: 'usr_farmer_1',
    crop_id: 'crp_wheat',
    quantity: 1200,
    asking_price: 95.0,
    district: 'Hyderabad',
    grade: 'A',
    available_from: '2026-10-21',
    status: 'Active',
    contact_phone: '0300-1122334',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    crop_name: 'Wheat',
    crop_category: 'Grains',
    farmer_name: 'Rasheed Ahmed Brohi',
    market_label: 'At market',
    market_difference_pct: -3.75,
    market_average_price: 98.7
  },
  {
    id: 'lst_002',
    user_id: 'usr_farmer_1',
    crop_id: 'crp_onion',
    quantity: 850,
    asking_price: 80.0,
    district: 'Hyderabad',
    grade: 'B',
    available_from: '2026-10-21',
    status: 'Active',
    contact_phone: '0300-1122334',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    crop_name: 'Onion',
    crop_category: 'Vegetables',
    farmer_name: 'Rasheed Ahmed Brohi',
    market_label: 'Below market',
    market_difference_pct: -7.08,
    market_average_price: 86.1
  },
  {
    id: 'lst_003',
    user_id: 'usr_farmer_2',
    crop_id: 'crp_rice',
    quantity: 3500,
    asking_price: 158.0,
    district: 'Sukkur',
    grade: 'A',
    available_from: '2026-10-22',
    status: 'Active',
    contact_phone: '0301-2233445',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    crop_name: 'Rice (Basmati)',
    crop_category: 'Grains',
    farmer_name: 'Ghulam Mustafa Soomro',
    market_label: 'At market',
    market_difference_pct: 4.46,
    market_average_price: 151.25
  },
  {
    id: 'lst_004',
    user_id: 'usr_farmer_2',
    crop_id: 'crp_cotton',
    quantity: 2200,
    asking_price: 225.0,
    district: 'Sukkur',
    grade: 'A',
    available_from: '2026-10-21',
    status: 'Active',
    contact_phone: '0301-2233445',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    crop_name: 'Cotton',
    crop_category: 'Cash Crops',
    farmer_name: 'Ghulam Mustafa Soomro',
    market_label: 'At market',
    market_difference_pct: -1.02,
    market_average_price: 227.31
  }
];

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  crops,
  activeUser,
  onOpenCreateModal,
  onOpenPriceAdvisor,
  onOpenAssistant
}) => {
  const [listings, setListings] = useState<Listing[]>(DEFAULT_LISTINGS);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc'>('newest');

  // Voice Search
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<{ text: string; details: string } | null>(null);

  const handleVoiceQueryResult = (query: ParsedVoiceQuery) => {
    let matchedDetails: string[] = [];

    if (query.cropId) {
      setSelectedCrop(query.cropId);
      const c = crops.find((crop) => crop.id === query.cropId);
      if (c) matchedDetails.push(c.name);
    }
    if (query.district) {
      setSelectedDistrict(query.district);
      matchedDetails.push(query.district);
    }
    if (query.transcript) {
      setSearchQuery(query.transcript);
    }

    setVoiceNotice({
      text: query.transcript,
      details: matchedDetails.join(' • ') || query.transcript
    });
  };

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getListings({
        crop_id: selectedCrop || undefined,
        district: selectedDistrict || undefined,
        grade: selectedGrade || undefined,
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
        sort: sortBy
      });
      if (res.data?.length) {
        setListings(res.data);
      }
    } catch (err: any) {
      console.warn('Listings fetch warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedCrop, selectedDistrict, selectedGrade, selectedStatus, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const handleMarkSold = async (listing: Listing) => {
    try {
      setFeedbackMsg(null);
      await api.updateListing(listing.id, { status: 'Sold' });
      setFeedbackMsg({ text: `Lot for ${listing.crop_name} marked as Sold`, type: 'success' });
      fetchListings();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      setFeedbackMsg(null);
      await api.deleteListing(listingId);
      setFeedbackMsg({ text: 'Listing removed successfully from database', type: 'success' });
      fetchListings();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    }
  };

  const getMarketLabelBadge = (label?: string, diff?: number | null) => {
    if (!label) return null;
    if (label === 'Below market') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <TrendingDown className="w-3 h-3 text-emerald-600" />
          Below Mandi ({diff}% discount)
        </span>
      );
    }
    if (label === 'At market') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
          At Market Rate ({diff !== null && diff !== undefined && diff > 0 ? `+${diff}%` : `${diff}%`})
        </span>
      );
    }
    if (label === 'Above market') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          <TrendingUp className="w-3 h-3 text-amber-600" />
          Above Mandi (+{diff}%)
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
        Mandi Comparison Unavailable
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
              Direct Farmer-to-Buyer Marketplace
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Verified crop lots direct from farms with automated mandi price benchmark labeling
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenAssistant && (
              <button
                onClick={onOpenAssistant}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black rounded-xl transition-all shadow-sm ring-1 ring-amber-500"
                title="AI Kisan Dost se sawal poochain"
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-900 animate-pulse" />
                <span>🌾 Ask Kisan Dost</span>
              </button>
            )}

            {onOpenPriceAdvisor && (
              <button
                onClick={onOpenPriceAdvisor}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition-all shadow-xs"
                title="Smart Selling Price Recommendation / قیمت کا مشورہ"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Price Advisor</span>
              </button>
            )}

            <button
              onClick={fetchListings}
              className="p-2 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-stone-200 transition-colors"
              title="Refresh listings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Post Listing Button */}
            <button
              onClick={onOpenCreateModal}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-sm ${
                activeUser?.role === 'Farmer'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700 cursor-pointer'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              Post Produce Lot
              {activeUser?.role !== 'Farmer' && (
                <span className="text-[9px] bg-stone-300 text-stone-800 px-1 rounded ml-1">
                  Farmer Only
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Voice Search Notice */}
        {voiceNotice && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Awaaz se search: <strong>"{voiceNotice.text}"</strong> → Filter: <span className="font-bold underline">{voiceNotice.details}</span>
              </span>
            </div>
            <button
              onClick={() => setVoiceNotice(null)}
              className="text-stone-400 hover:text-stone-600 font-bold ml-2 text-sm leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* Role Safeguard Notice for Buyers */}
        {activeUser?.role === 'Buyer' && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Active Role: Buyer ({activeUser.name})</strong> — You have full browsing and purchasing permissions. Listing creation and modification are restricted to registered Farmers by the REST API backend.
            </span>
          </div>
        )}

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs flex items-center justify-between border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="font-bold ml-2 text-sm leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* Search and Filters Bar */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input with Microphone Button */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search crop, farmer, or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-emerald-600 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-lg transition-colors"
              title="Awaaz se search karein / بول کر تلاش کریں (Urdu & Sindhi)"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Crop Filter */}
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-emerald-600"
          >
            <option value="">All Commodities</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* District Filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-emerald-600"
          >
            <option value="">All Districts</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Sukkur">Sukkur</option>
            <option value="Mirpur Khas">Mirpur Khas</option>
          </select>

          {/* Grade Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-emerald-600"
          >
            <option value="">All Grades</option>
            <option value="A">Grade A (Premium)</option>
            <option value="B">Grade B (Standard)</option>
            <option value="C">Grade C (Fair)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 focus:outline-emerald-600"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="price_asc">Sort: Price (Low to High)</option>
          </select>
        </div>

        {/* Status Pills */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
            Status:
          </span>
          {['Active', 'Sold', ''].map((st) => (
            <button
              key={st || 'all'}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedStatus === st
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {st || 'All Listings'}
            </button>
          ))}
        </div>
      </div>

      {/* Listing Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-stone-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          Loading produce lots from REST API...
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
          <p className="text-sm font-bold text-stone-700">No produce lots match your filters.</p>
          <p className="text-xs text-stone-400 mt-1">Try clearing filters or post a new produce lot.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((item) => {
            const isOwner = item.user_id === activeUser?.id;
            const isSold = item.status === 'Sold';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-5 shadow-xs border transition-all hover:shadow-md flex flex-col justify-between ${
                  isSold
                    ? 'border-stone-200 opacity-75 bg-stone-50/50'
                    : isOwner
                    ? 'border-emerald-300 ring-1 ring-emerald-400/30'
                    : 'border-stone-200'
                }`}
              >
                <div>
                  {/* Top Bar: Grade Badge & Dynamic Market Benchmark */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          item.grade === 'A'
                            ? 'bg-emerald-600 text-white'
                            : item.grade === 'B'
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-600 text-white'
                        }`}
                      >
                        Grade {item.grade}
                      </span>
                      {isSold && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                          Sold
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Your Lot
                        </span>
                      )}
                    </div>

                    {getMarketLabelBadge(item.market_label, item.market_difference_pct)}
                  </div>

                  {/* Crop Title & Quantity */}
                  <div className="mt-3">
                    <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
                      {item.crop_name}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                      Category: {item.crop_category}
                    </p>
                  </div>

                  {/* Price & Quantity Stats */}
                  <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-400 uppercase block">
                        Asking Rate
                      </span>
                      <span className="text-lg font-black text-stone-900">
                        {item.asking_price} <span className="text-xs font-semibold text-stone-500">PKR/kg</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase block">
                        Lot Volume
                      </span>
                      <span className="text-sm font-bold text-stone-800">
                        {item.quantity.toLocaleString()} kg
                      </span>
                    </div>
                  </div>

                  {/* Mandi Benchmark Context */}
                  {item.market_average_price && (
                    <p className="text-[11px] text-stone-500 mt-2 px-1">
                      Mandi benchmark average: <span className="font-semibold text-stone-700">{item.market_average_price} PKR/kg</span>
                    </p>
                  )}

                  {/* Location & Harvest Metadata */}
                  <div className="mt-4 space-y-1.5 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      <span>{item.district} District</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>Available: {item.available_from}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-stone-400" />
                      <span>Farmer: <strong>{item.farmer_name}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${item.contact_phone}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{item.contact_phone}</span>
                  </a>

                  {/* Farmer Owner Controls */}
                  {isOwner && (
                    <div className="flex items-center gap-1">
                      {!isSold && (
                        <button
                          onClick={() => handleMarkSold(item)}
                          className="p-2 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-stone-200 transition-colors"
                          title="Mark as Sold"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteListing(item.id)}
                        className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-xl border border-stone-200 transition-colors"
                        title="Delete listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Voice Search Modal */}
      <VoiceSearchModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onApplyQuery={handleVoiceQueryResult}
      />
    </div>
  );
};
