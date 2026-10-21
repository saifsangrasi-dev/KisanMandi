import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  PlusCircle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { Alert, Crop, Market, User, api } from '../services/api';

interface AlertsViewProps {
  crops: Crop[];
  markets: Market[];
  activeUser: User | null;
  onOpenCreateAlertModal: () => void;
  onAlertsChanged: () => void;
}

const INITIAL_ALERTS: Alert[] = [
  {
    id: 'alt_001',
    user_id: 'usr_farmer_1',
    crop_id: 'crp_wheat',
    market_id: 'mkt_hyd',
    condition: 'Above',
    target_price: 98.0,
    active_status: true,
    triggered_status: true,
    last_triggered_at: new Date().toISOString(),
    crop_name: 'Wheat',
    market_name: 'Hyderabad Mandi',
    market_district: 'Hyderabad',
    user_name: 'Rasheed Ahmed Brohi',
    current_price: 100.8
  },
  {
    id: 'alt_002',
    user_id: 'usr_farmer_2',
    crop_id: 'crp_cotton',
    market_id: 'mkt_suk',
    condition: 'Above',
    target_price: 225.0,
    active_status: true,
    triggered_status: true,
    last_triggered_at: new Date().toISOString(),
    crop_name: 'Cotton',
    market_name: 'Sukkur Mandi',
    market_district: 'Sukkur',
    user_name: 'Ghulam Mustafa Soomro',
    current_price: 234.51
  }
];

export const AlertsView: React.FC<AlertsViewProps> = ({
  crops,
  markets,
  activeUser,
  onOpenCreateAlertModal,
  onAlertsChanged
}) => {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [filterMineOnly, setFilterMineOnly] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts({
        user_id: filterMineOnly && activeUser ? activeUser.id : undefined
      });
      if (res.data?.length) {
        setAlerts(res.data);
      }
    } catch (err: any) {
      console.warn('Alerts fetch warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filterMineOnly, activeUser]);

  const handleEvaluateNow = async () => {
    setEvaluating(true);
    setFeedback(null);
    try {
      const res = await api.evaluateAlerts();
      setFeedback(
        `Evaluation complete: ${res.evaluated_count} active alert(s) evaluated against current mandi prices. ${res.newly_triggered_count} newly triggered.`
      );
      await fetchAlerts();
      onAlertsChanged();
    } catch (err: any) {
      setFeedback(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleToggleActive = async (alertItem: Alert) => {
    try {
      await api.updateAlert(alertItem.id, { active_status: !alertItem.active_status });
      await fetchAlerts();
      onAlertsChanged();
    } catch (err: any) {
      setFeedback(`Failed to update alert: ${err.message}`);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await api.deleteAlert(alertId);
      await fetchAlerts();
      onAlertsChanged();
      setFeedback('Price alert deleted successfully.');
    } catch (err: any) {
      setFeedback(`Failed to delete alert: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
              Automated Price Alert Engine
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Configurable threshold triggers (Above / Below) evaluated in real-time against incoming mandi prices
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEvaluateNow}
              disabled={evaluating}
              className="flex items-center gap-2 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
              {evaluating ? 'Evaluating...' : 'Evaluate Alerts Now'}
            </button>

            <button
              onClick={onOpenCreateAlertModal}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Alert
            </button>
          </div>
        </div>

        {/* Feedback Bar */}
        {feedback && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-emerald-900 font-bold ml-2">
              &times;
            </button>
          </div>
        )}

        {/* Scope Toggle */}
        <div className="pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMineOnly(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !filterMineOnly
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              All Community Alerts
            </button>
            <button
              onClick={() => setFilterMineOnly(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMineOnly
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              My Alerts Only ({activeUser?.name})
            </button>
          </div>

          <span className="text-[11px] font-mono text-stone-400">
            {alerts.length} total alerts configured
          </span>
        </div>
      </div>

      {/* Alerts Grid */}
      {loading ? (
        <div className="py-20 text-center text-stone-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          Loading alerts from backend...
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200">
          <Bell className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-stone-700">No alerts found.</p>
          <p className="text-xs text-stone-400 mt-1">
            Create a price trigger to receive real-time notifications when prices hit your threshold.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alerts.map((alert) => {
            const isOwner = alert.user_id === activeUser?.id;
            const isTriggered = alert.triggered_status;

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-2xl p-5 shadow-xs border transition-all flex flex-col justify-between ${
                  isTriggered
                    ? 'border-amber-400 ring-2 ring-amber-300/40 bg-amber-50/20'
                    : alert.active_status
                    ? 'border-stone-200'
                    : 'border-stone-200 bg-stone-50/50 opacity-60'
                }`}
              >
                <div>
                  {/* Top Status */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-1.5">
                      {isTriggered ? (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 animate-pulse">
                          <BellRing className="w-3 h-3" />
                          Triggered!
                        </span>
                      ) : alert.active_status ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Active Monitoring
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                          Paused
                        </span>
                      )}
                      {isOwner && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800">
                          You
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleActive(alert)}
                      className="text-stone-400 hover:text-stone-700 transition-colors"
                      title={alert.active_status ? 'Pause Alert' : 'Activate Alert'}
                    >
                      {alert.active_status ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-stone-300" />
                      )}
                    </button>
                  </div>

                  {/* Crop & Mandi Information */}
                  <div className="mt-3">
                    <h3 className="text-base font-extrabold text-stone-900">
                      {alert.crop_name}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Target Mandi: <strong>{alert.market_name}</strong> ({alert.market_district})
                    </p>
                  </div>

                  {/* Condition Box */}
                  <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-500">Threshold:</span>
                      <span className="flex items-center gap-1 text-xs font-bold text-stone-900">
                        {alert.condition === 'Above' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        Price {alert.condition} {alert.target_price} PKR/kg
                      </span>
                    </div>

                    {alert.current_price !== undefined && (
                      <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                        <span className="text-stone-500">Current Rate:</span>
                        <span className="font-mono font-bold text-stone-800">
                          {alert.current_price} PKR/kg
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Trigger Metadata */}
                  <div className="mt-3 text-[11px] text-stone-500 space-y-1">
                    <p>Owner: <strong>{alert.user_name}</strong></p>
                    {alert.last_triggered_at && (
                      <p className="font-mono text-amber-800">
                        Triggered at: {new Date(alert.last_triggered_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Delete */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-400">ID: {alert.id}</span>
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
