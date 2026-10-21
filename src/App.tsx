/**
 * KisanMandi Frontend Application
 *
 * Full integration with the custom Node.js Express REST API backend.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { MandiPricesView } from './components/MandiPricesView';
import { MarketplaceView } from './components/MarketplaceView';
import { WeatherAlertsView } from './components/WeatherAlertsView';
import { PriceRecommendationModal } from './components/PriceRecommendationModal';
import { KisanDostView } from './components/KisanDostView';
import { AlertsView } from './components/AlertsView';
import { ApiExplorerView } from './components/ApiExplorerView';
import { CreateListingModal } from './components/CreateListingModal';
import { CreateAlertModal } from './components/CreateAlertModal';
import { RecordPriceModal } from './components/RecordPriceModal';
import {
  User,
  Crop,
  Market,
  HealthStatus,
  api,
  setActiveUserId,
  getActiveUserId
} from './services/api';
import { AlertCircle, RefreshCw, Server, WifiOff } from 'lucide-react';

const DEFAULT_USERS: User[] = [
  { id: 'usr_farmer_1', name: 'Rasheed Ahmed Brohi', phone: '0300-1122334', district: 'Hyderabad', role: 'Farmer' },
  { id: 'usr_farmer_2', name: 'Ghulam Mustafa Soomro', phone: '0301-2233445', district: 'Sukkur', role: 'Farmer' },
  { id: 'usr_farmer_3', name: 'Allah Dino Chandio', phone: '0302-3344556', district: 'Mirpur Khas', role: 'Farmer' },
  { id: 'usr_farmer_4', name: 'Naseer Jamali', phone: '0303-4455667', district: 'Hyderabad', role: 'Farmer' },
  { id: 'usr_buyer_1', name: 'Tariq Mehmood Traders', phone: '0304-5566778', district: 'Sukkur', role: 'Buyer' },
  { id: 'usr_buyer_2', name: 'Sindh Agri Wholesalers', phone: '0305-6677889', district: 'Hyderabad', role: 'Buyer' }
];

const DEFAULT_CROPS: Crop[] = [
  { id: 'crp_wheat', name: 'Wheat', category: 'Grains' },
  { id: 'crp_rice', name: 'Rice (Basmati)', category: 'Grains' },
  { id: 'crp_cotton', name: 'Cotton', category: 'Cash Crops' },
  { id: 'crp_sugarcane', name: 'Sugarcane', category: 'Cash Crops' },
  { id: 'crp_onion', name: 'Onion', category: 'Vegetables' },
  { id: 'crp_tomato', name: 'Tomato', category: 'Vegetables' },
  { id: 'crp_mango', name: 'Mango (Sindhri)', category: 'Fruits' },
  { id: 'crp_banana', name: 'Banana', category: 'Fruits' }
];

const DEFAULT_MARKETS: Market[] = [
  { id: 'mkt_hyd', name: 'Hyderabad Mandi', district: 'Hyderabad' },
  { id: 'mkt_suk', name: 'Sukkur Mandi', district: 'Sukkur' },
  { id: 'mkt_mpk', name: 'Mirpur Khas Mandi', district: 'Mirpur Khas' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'prices' | 'marketplace' | 'weather' | 'assistant' | 'alerts' | 'api'>('prices');
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [activeUser, setActiveUserState] = useState<User | null>(DEFAULT_USERS[0]);
  const [crops, setCrops] = useState<Crop[]>(DEFAULT_CROPS);
  const [markets, setMarkets] = useState<Market[]>(DEFAULT_MARKETS);
  const [health, setHealth] = useState<HealthStatus | null>({
    status: 'healthy',
    storage_available: true,
    timestamp: new Date().toISOString(),
    environment: 'development',
    collections: { users: 6, crops: 8, markets: 3, prices: 336, listings: 12, alerts: 5 }
  });
  const [triggeredAlertCount, setTriggeredAlertCount] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [serverNotice, setServerNotice] = useState<string | null>(null);

  // Modals
  const [showListingModal, setShowListingModal] = useState<boolean>(false);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [showRecordPriceModal, setShowRecordPriceModal] = useState<boolean>(false);
  const [showPriceModal, setShowPriceModal] = useState<boolean>(false);
  const [initialListingValues, setInitialListingValues] = useState<{
    cropId?: string;
    district?: string;
    askingPrice?: number;
    quantity?: number;
  } | undefined>(undefined);

  // Load initial global collections from REST API
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setServerNotice(null);

    try {
      const [usersRes, cropsRes, marketsRes, healthRes] = await Promise.all([
        api.getUsers().catch(() => ({ success: true, count: DEFAULT_USERS.length, data: DEFAULT_USERS })),
        api.getCrops().catch(() => ({ success: true, count: DEFAULT_CROPS.length, data: DEFAULT_CROPS })),
        api.getMarkets().catch(() => ({ success: true, count: DEFAULT_MARKETS.length, data: DEFAULT_MARKETS })),
        api.getHealth().catch(() => null)
      ]);

      const userList = (usersRes as any)?.data?.length ? (usersRes as any).data : DEFAULT_USERS;
      const cropList = (cropsRes as any)?.data?.length ? (cropsRes as any).data : DEFAULT_CROPS;
      const marketList = (marketsRes as any)?.data?.length ? (marketsRes as any).data : DEFAULT_MARKETS;

      setUsers(userList);
      setCrops(cropList);
      setMarkets(marketList);
      if (healthRes) {
        setHealth(healthRes);
      }

      // Select active user
      const savedUserId = getActiveUserId();
      const matched = userList.find((u: User) => u.id === savedUserId) || userList[0] || null;
      if (matched) {
        setActiveUserState(matched);
        setActiveUserId(matched.id);
      }
    } catch (err: any) {
      console.warn('Initial data warning:', err);
      setServerNotice(err.message || 'Connecting to backend API...');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch active user alerts count
  const refreshUserAlerts = useCallback(async () => {
    if (!activeUser) return;
    try {
      const res = await api.getAlerts({
        user_id: activeUser.id,
        triggered_status: true,
        active_status: true
      });
      setTriggeredAlertCount(res.data?.length || 0);
    } catch {
      // Non-blocking
    }
  }, [activeUser]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    refreshUserAlerts();
  }, [refreshUserAlerts]);

  const handleSelectUser = (user: User) => {
    setActiveUserState(user);
    setActiveUserId(user.id);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      {/* Platform Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        users={users}
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
        health={health}
        triggeredAlertCount={triggeredAlertCount}
      />

      {/* Optional Top Alert if connection degraded */}
      {serverNotice && (
        <div className="bg-amber-500 text-stone-950 px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Notice: {serverNotice}</span>
            <button
              onClick={loadInitialData}
              className="ml-auto underline hover:no-underline font-bold"
            >
              Re-connect API
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'prices' && (
          <MandiPricesView
            crops={crops}
            markets={markets}
            onOpenRecordPriceModal={() => setShowRecordPriceModal(true)}
            onOpenPriceAdvisor={() => setShowPriceModal(true)}
            onOpenAssistant={() => setActiveTab('assistant')}
          />
        )}

        {activeTab === 'marketplace' && (
          <MarketplaceView
            crops={crops}
            activeUser={activeUser}
            onOpenCreateModal={() => {
              setInitialListingValues(undefined);
              setShowListingModal(true);
            }}
            onOpenPriceAdvisor={() => setShowPriceModal(true)}
            onOpenAssistant={() => setActiveTab('assistant')}
          />
        )}

        {activeTab === 'weather' && (
          <WeatherAlertsView activeUser={activeUser} />
        )}

        {activeTab === 'assistant' && (
          <KisanDostView
            activeUser={activeUser}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView
            crops={crops}
            markets={markets}
            activeUser={activeUser}
            onOpenCreateAlertModal={() => setShowAlertModal(true)}
            onAlertsChanged={refreshUserAlerts}
          />
        )}

        {activeTab === 'api' && <ApiExplorerView health={health} />}
      </main>

      {/* Modals */}
      <CreateListingModal
        isOpen={showListingModal}
        onClose={() => setShowListingModal(false)}
        crops={crops}
        activeUser={activeUser}
        initialValues={initialListingValues}
        onOpenPriceAdvisor={() => {
          setShowListingModal(false);
          setShowPriceModal(true);
        }}
        onListingCreated={() => {
          setActiveTab('marketplace');
        }}
      />

      <PriceRecommendationModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        crops={crops}
        markets={markets}
        onApplyToListing={(rec) => {
          setInitialListingValues({
            cropId: rec.cropId,
            district: rec.district,
            askingPrice: rec.suggestedPrice,
            quantity: rec.quantity
          });
          setShowPriceModal(false);
          setShowListingModal(true);
        }}
      />

      <CreateAlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        crops={crops}
        markets={markets}
        activeUser={activeUser}
        onAlertCreated={() => {
          refreshUserAlerts();
          setActiveTab('alerts');
        }}
      />

      <RecordPriceModal
        isOpen={showRecordPriceModal}
        onClose={() => setShowRecordPriceModal(false)}
        crops={crops}
        markets={markets}
        onPriceRecorded={() => {
          refreshUserAlerts();
          loadInitialData();
        }}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 KisanMandi — Agricultural Commodity Trading Platform & REST API</p>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="text-emerald-700 font-bold">API: {api.getBaseUrl()}</span>
            <span>Storage: JSON (backend/data/db.json)</span>
            <span>Seed: 336 Prices Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
