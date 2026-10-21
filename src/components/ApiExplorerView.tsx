import React, { useState } from 'react';
import {
  Terminal,
  Send,
  Copy,
  Check,
  Database,
  Layers,
  Cpu,
  FileCode,
  ShieldCheck,
  Code
} from 'lucide-react';
import { api, HealthStatus } from '../services/api';

interface ApiExplorerViewProps {
  health: HealthStatus | null;
}

interface EndpointDef {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  category: string;
  description: string;
  sampleBody?: any;
}

const ENDPOINTS: EndpointDef[] = [
  { method: 'GET', path: '/api/health', category: 'Health', description: 'Server and JSON file persistence health status' },
  { method: 'GET', path: '/api/users', category: 'Users', description: 'List all demo farmers and buyers' },
  { method: 'GET', path: '/api/crops', category: 'Crops', description: 'List agricultural commodities across 4 categories' },
  { method: 'GET', path: '/api/markets', category: 'Markets', description: 'List mandis (Hyderabad, Sukkur, Mirpur Khas)' },
  { method: 'GET', path: '/api/prices/summary?crop_id=crp_wheat&market_id=mkt_hyd', category: 'Prices', description: '14-day stats & daily price delta calculations' },
  { method: 'GET', path: '/api/prices/comparison?crop_id=crp_cotton', category: 'Prices', description: 'Cross-mandi price arbitrage sorted highest to lowest' },
  { method: 'GET', path: '/api/listings?status=Active', category: 'Listings', description: 'Produce lots with dynamic market benchmark labeling' },
  { method: 'GET', path: '/api/alerts', category: 'Alerts', description: 'Configured price threshold alerts' },
  { method: 'POST', path: '/api/alerts/evaluate', category: 'Alerts', description: 'Evaluate active alerts against current prices' }
];

export const ApiExplorerView: React.FC<ApiExplorerViewProps> = ({ health }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<string>('');
  const [responseBody, setResponseBody] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const baseUrl = api.getBaseUrl();

  const handleExecute = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseBody('');
    const startTime = performance.now();

    try {
      const fullUrl = `${baseUrl}${selectedEndpoint.path.replace('/api', '')}`;
      const res = await fetch(fullUrl, {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'usr_farmer_1'
        },
        body: selectedEndpoint.sampleBody ? JSON.stringify(selectedEndpoint.sampleBody) : undefined
      });

      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTime(elapsed);
      setResponseStatus(res.status);

      const json = await res.json();
      setResponseBody(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setResponseStatus(500);
      setResponseBody(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const getCurlSnippet = () => {
    const fullUrl = `http://localhost:4000${selectedEndpoint.path}`;
    if (selectedEndpoint.method === 'GET') {
      return `curl -X GET "${fullUrl}" \\\n  -H "Accept: application/json"`;
    }
    return `curl -X ${selectedEndpoint.method} "${fullUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-user-id: usr_farmer_1"`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(getCurlSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-stone-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-400 uppercase">Storage</span>
            <p className="text-sm font-extrabold text-stone-900">
              backend/data/db.json
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-stone-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-400 uppercase">Collections</span>
            <p className="text-sm font-extrabold text-stone-900">
              6 Core Schemas
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-stone-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-400 uppercase">Role Safeguards</span>
            <p className="text-sm font-extrabold text-stone-900">
              Farmer vs Buyer Rules
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-xs border border-stone-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-800">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-stone-400 uppercase">Test Suite</span>
            <p className="text-sm font-extrabold text-stone-900">
              14/14 Automated Tests
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive REST Explorer Console */}
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200 overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-base font-extrabold text-stone-900">
                Live REST API Endpoint Inspector
              </h2>
              <p className="text-xs text-stone-500">
                Execute live requests against the backend server and inspect response payloads
              </p>
            </div>
          </div>

          <button
            onClick={handleExecute}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Sending Request...' : 'Send Request'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">
          {/* Endpoint List Sidebar */}
          <div className="lg:col-span-4 p-4 space-y-1.5 max-h-[500px] overflow-y-auto">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 px-2">
              Available REST Endpoints
            </p>
            {ENDPOINTS.map((ep, idx) => {
              const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedEndpoint(ep);
                    setResponseBody('');
                    setResponseStatus(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2 ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                      ep.method === 'GET'
                        ? 'bg-sky-100 text-sky-800'
                        : ep.method === 'POST'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] truncate font-semibold">
                      {ep.path}
                    </p>
                    <p
                      className={`text-[10px] truncate ${
                        isSelected ? 'text-stone-300' : 'text-stone-400'
                      }`}
                    >
                      {ep.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Request / Response Pane */}
          <div className="lg:col-span-8 p-5 space-y-4">
            {/* Request Address Bar */}
            <div className="flex items-center gap-2 p-2 rounded-xl bg-stone-50 border border-stone-200 font-mono text-xs">
              <span className="font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-100">
                {selectedEndpoint.method}
              </span>
              <span className="text-stone-700 font-semibold truncate flex-1">
                {baseUrl}{selectedEndpoint.path.replace('/api', '')}
              </span>
            </div>

            {/* Curl Snippet Box */}
            <div className="relative bg-stone-900 text-stone-100 rounded-xl p-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-stone-800 text-[10px] text-stone-400">
                <span>cURL CLI Command</span>
                <button
                  onClick={copyCurl}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="overflow-x-auto text-[11px] text-emerald-300 whitespace-pre-wrap">
                {getCurlSnippet()}
              </pre>
            </div>

            {/* Live Response Panel */}
            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-stone-100 px-4 py-2 flex items-center justify-between text-xs border-b border-stone-200">
                <span className="font-bold text-stone-700">HTTP Response</span>
                <div className="flex items-center gap-3">
                  {responseStatus && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        responseStatus >= 200 && responseStatus < 300
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-red-200 text-red-900'
                      }`}
                    >
                      Status: {responseStatus}
                    </span>
                  )}
                  {executionTime !== null && (
                    <span className="text-[10px] font-mono text-stone-500">
                      {executionTime} ms
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-stone-950 font-mono text-[11px] text-stone-100 min-h-[220px] max-h-[350px] overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-48 text-stone-400">
                    Executing request against {baseUrl}...
                  </div>
                ) : responseBody ? (
                  <pre>{responseBody}</pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-stone-500">
                    <Code className="w-6 h-6 mb-2 opacity-50" />
                    <span>Click "Send Request" to test this endpoint.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
