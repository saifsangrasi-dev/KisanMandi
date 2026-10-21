import React, { useState } from 'react';
import {
  TrendingUp,
  Store,
  Bell,
  Terminal,
  Activity,
  CheckCircle2,
  ChevronDown,
  User as UserIcon,
  ShieldAlert,
  Sparkles,
  CloudSun
} from 'lucide-react';
import { User, HealthStatus } from '../services/api';

interface HeaderProps {
  activeTab: 'prices' | 'marketplace' | 'weather' | 'alerts' | 'assistant' | 'api';
  setActiveTab: (tab: 'prices' | 'marketplace' | 'weather' | 'alerts' | 'assistant' | 'api') => void;
  users: User[];
  activeUser: User | null;
  onSelectUser: (user: User) => void;
  health: HealthStatus | null;
  triggeredAlertCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  users,
  activeUser,
  onSelectUser,
  health,
  triggeredAlertCount
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  return (
    <>
      <header className="bg-emerald-900 text-white border-b border-emerald-800 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Platform Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-white">KisanMandi</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-700/80 text-emerald-200 border border-emerald-600/50">
                    REST API
                  </span>
                </div>
                <p className="text-xs text-emerald-300/80 hidden sm:block">
                  Direct Mandi Pricing & Commodity Trading
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-emerald-950/60 p-1 rounded-xl border border-emerald-800/80">
              <button
                onClick={() => setActiveTab('prices')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'prices'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Mandi Prices
              </button>
              <button
                onClick={() => setActiveTab('marketplace')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'marketplace'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Marketplace
              </button>
              <button
                onClick={() => setActiveTab('weather')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'weather'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                Weather Alerts
              </button>
              <button
                onClick={() => setActiveTab('assistant')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'assistant'
                    ? 'bg-amber-400 text-stone-950 shadow-sm font-extrabold ring-1 ring-amber-300'
                    : 'text-amber-300 hover:text-white hover:bg-emerald-800/50'
                }`}
                title="AI Kisan Dost Assistant"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>🌾 Ask Kisan Dost</span>
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                  activeTab === 'alerts'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                Price Alerts
                {triggeredAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-emerald-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {triggeredAlertCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'api'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                API Diagnostics
              </button>
            </nav>

            {/* Right: Health Badge & User Switcher */}
            <div className="flex items-center gap-3">
              {/* Server Health Status Pill */}
              <button
                onClick={() => setShowHealthModal(true)}
                className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 hover:border-emerald-500 text-xs text-emerald-200 transition-colors"
                title="Click to view backend health"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono text-[11px]">Backend API Live</span>
              </button>

              {/* Demo User Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2.5 bg-emerald-800/90 hover:bg-emerald-700/90 border border-emerald-600/60 rounded-xl px-3 py-1.5 text-xs transition-all shadow-sm"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-700 flex items-center justify-center text-emerald-200">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white max-w-[110px] truncate">
                        {activeUser?.name || 'Select User'}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-1 rounded ${
                          activeUser?.role === 'Farmer'
                            ? 'bg-amber-400 text-stone-900'
                            : 'bg-sky-400 text-stone-900'
                        }`}
                      >
                        {activeUser?.role || 'User'}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-300/80 block -mt-0.5">
                      {activeUser?.district} ({activeUser?.id})
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
                </button>

                {showUserDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-72 rounded-xl bg-white text-stone-900 shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <div className="px-3 py-1.5 border-b border-stone-100">
                      <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        Switch Demo Identity
                      </p>
                      <p className="text-[11px] text-stone-400">
                        Tests backend ownership and role safeguards
                      </p>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-stone-50 py-1">
                      {users.map((u) => {
                        const isSelected = u.id === activeUser?.id;
                        return (
                          <button
                            key={u.id}
                            onClick={() => onSelectUser(u)}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-50 transition-colors ${
                              isSelected ? 'bg-emerald-50/80' : ''
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-stone-900">{u.name}</span>
                                <span
                                  className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${
                                    u.role === 'Farmer'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-sky-100 text-sky-800'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </div>
                              <p className="text-[10px] text-stone-500 font-mono">
                                {u.district} • {u.phone}
                              </p>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-emerald-800/60 bg-emerald-950/80 py-2 px-2 text-xs">
          <button
            onClick={() => setActiveTab('prices')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'prices' ? 'text-white font-bold' : 'text-emerald-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Prices</span>
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'marketplace' ? 'text-white font-bold' : 'text-emerald-300'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Market</span>
          </button>
          <button
            onClick={() => setActiveTab('weather')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'weather' ? 'text-white font-bold' : 'text-emerald-300'
            }`}
          >
            <CloudSun className="w-4 h-4 text-amber-400" />
            <span>Weather</span>
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'assistant' ? 'text-amber-300 font-extrabold' : 'text-amber-400'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Kisan Dost</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex flex-col items-center gap-1 relative ${
              activeTab === 'alerts' ? 'text-white font-bold' : 'text-emerald-300'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
            {triggeredAlertCount > 0 && (
              <span className="absolute -top-1 right-2 bg-amber-400 text-stone-900 font-bold text-[9px] px-1 rounded-full">
                {triggeredAlertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex flex-col items-center gap-1 ${
              activeTab === 'api' ? 'text-white font-bold' : 'text-emerald-300'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>API</span>
          </button>
        </div>
      </header>

      {/* Health Modal */}
      {showHealthModal && health && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
          onClick={() => setShowHealthModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-stone-900 text-base">Backend Health & Storage</h3>
              </div>
              <button
                onClick={() => setShowHealthModal(false)}
                className="text-stone-400 hover:text-stone-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs font-medium text-emerald-900">HTTP Status</span>
                <span className="text-xs font-bold text-emerald-700 uppercase bg-emerald-200/60 px-2 py-0.5 rounded">
                  {health.status}
                </span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                <span className="text-xs font-medium text-stone-700">Storage Engine</span>
                <span className="text-xs font-mono font-semibold text-stone-800">
                  {health.storage_available ? 'JSON File (backend/data/db.json)' : 'Unavailable'}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Persisted Database Collections
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex justify-between">
                    <span className="text-stone-600">Prices:</span>
                    <span className="font-mono font-bold text-emerald-700">{health.collections.prices}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex justify-between">
                    <span className="text-stone-600">Listings:</span>
                    <span className="font-mono font-bold text-emerald-700">{health.collections.listings}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex justify-between">
                    <span className="text-stone-600">Users:</span>
                    <span className="font-mono font-bold text-emerald-700">{health.collections.users}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex justify-between">
                    <span className="text-stone-600">Crops:</span>
                    <span className="font-mono font-bold text-emerald-700">{health.collections.crops}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex justify-between">
                    <span className="text-stone-600">Markets:</span>
                    <span className="font-mono font-bold text-emerald-700">{health.collections.markets}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex justify-between">
                    <span className="text-stone-600">Alerts:</span>
                    <span className="font-mono font-bold text-emerald-700">{health.collections.alerts}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setShowHealthModal(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Close Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
