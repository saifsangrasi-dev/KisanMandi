/**
 * KisanMandi Centralized API Client
 *
 * Connects to the KisanMandi REST API backend via VITE_API_BASE_URL (defaults to /api).
 * Automatically injects the active demo user's ID via `x-user-id` header for ownership authorization.
 */

export interface User {
  id: string;
  name: string;
  phone: string;
  district: string;
  role: 'Farmer' | 'Buyer';
}

export interface Crop {
  id: string;
  name: string;
  category: string;
}

export interface Market {
  id: string;
  name: string;
  district: string;
}

export interface PriceRecord {
  id: string;
  crop_id: string;
  market_id: string;
  date: string;
  price: number;
}

export interface Listing {
  id: string;
  user_id: string;
  crop_id: string;
  quantity: number;
  asking_price: number;
  district: string;
  grade: 'A' | 'B' | 'C';
  available_from: string;
  status: 'Active' | 'Sold';
  contact_phone: string;
  created_at: string;
  updated_at: string;
  crop_name?: string;
  crop_category?: string;
  farmer_name?: string;
  market_label?: string;
  market_difference_pct?: number | null;
  market_average_price?: number | null;
}

export interface Alert {
  id: string;
  user_id: string;
  crop_id: string;
  market_id: string;
  condition: 'Above' | 'Below';
  target_price: number;
  active_status: boolean;
  triggered_status: boolean;
  last_triggered_at: string | null;
  crop_name?: string;
  market_name?: string;
  market_district?: string;
  user_name?: string;
  current_price?: number;
}

export interface HealthStatus {
  status: string;
  storage_available: boolean;
  timestamp: string;
  environment: string;
  collections: {
    users: number;
    crops: number;
    markets: number;
    prices: number;
    listings: number;
    alerts: number;
  };
}

export interface DailyChange {
  latestPrice: number | null;
  previousPrice: number | null;
  change: number;
  percentageChange: number;
  status: string;
}

export interface FourteenDayStats {
  points: { date: string; price: number }[];
  min: number | null;
  max: number | null;
  average: number | null;
  observations: number;
  available: boolean;
}

export interface PriceSummary {
  crop_id: string;
  market_id: string;
  latest_record: PriceRecord | null;
  daily_change: DailyChange;
  stats_14_day: FourteenDayStats;
}

export interface MarketComparisonItem {
  market_id: string;
  market_name: string;
  district: string;
  date: string;
  price: number;
  change: number;
  percentage_change: number;
}

export interface MarketComparison {
  available: boolean;
  averagePrice: number | null;
  marketCount: number;
  highestMarket: MarketComparisonItem | null;
  markets: MarketComparisonItem[];
  message?: string;
}

export interface AlertEvaluationResult {
  success: boolean;
  evaluated_count: number;
  newly_triggered_count: number;
  alerts: Alert[];
}

export interface CurrentWeather {
  district: string;
  latitude?: number;
  longitude?: number;
  temperature: number;
  humidity: number;
  wind_speed_kmh: number;
  condition: string;
  condition_icon: string;
  last_updated: string;
  provider: string;
}

export interface WeatherData {
  district: string;
  current: CurrentWeather;
  forecast: {
    date: string;
    max_temp: number;
    min_temp: number;
    rain_probability: number;
    precipitation_mm: number;
    max_wind_kmh: number;
    condition: { label: string; icon: string };
  }[];
  advisories: {
    type: 'rain' | 'heat' | 'wind' | 'favorable';
    severity: 'warning' | 'alert' | 'info';
    title: string;
    message: string;
  }[];
  last_updated: string;
}

export interface AssistantResponse {
  success: boolean;
  mode: 'ai' | 'rule_based';
  message: string;
  detected_crop?: string;
  detected_market?: string;
  language?: string;
  cardType?: 'weather' | 'market_comparison' | 'profit' | 'price' | 'info';
  cardData?: any;
}

export interface AssistantStatus {
  name: string;
  provider: string;
  ai_enabled: boolean;
  supported_languages: string[];
  suggested_questions: string[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

// Module-level active user state
let activeUserId: string = 'usr_farmer_1';

export function setActiveUserId(userId: string) {
  activeUserId = userId;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('kisanmandi_active_user', userId);
    }
  } catch {
    // Ignore iframe storage access restrictions
  }
}

export function getActiveUserId(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('kisanmandi_active_user');
      if (saved) activeUserId = saved;
    }
  } catch {
    // Ignore iframe storage access restrictions
  }
  return activeUserId;
}

function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const currentUserId = getActiveUserId();
  if (currentUserId && !headers.has('x-user-id')) {
    headers.set('x-user-id', currentUserId);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Server returned non-JSON response (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const errorMsg = json?.error?.message || json?.message || `HTTP ${response.status}: Request failed`;
    const errorCode = json?.error?.code || 'API_ERROR';
    const err = new Error(errorMsg);
    (err as any).code = errorCode;
    (err as any).status = response.status;
    throw err;
  }

  return json;
}

export const api = {
  // Base config
  getBaseUrl: () => API_BASE_URL,

  // Health
  getHealth: () => request<HealthStatus>('/health'),

  // Users
  getUsers: (params?: { role?: string; district?: string }) => {
    const query = buildQueryString(params);
    return request<{ success: boolean; count: number; data: User[] }>(`/users${query}`);
  },
  getUser: (id: string) => request<{ success: boolean; data: User }>(`/users/${id}`),
  createUser: (data: Omit<User, 'id'>) =>
    request<{ success: boolean; data: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Crops
  getCrops: (category?: string) => {
    const query = buildQueryString({ category });
    return request<{ success: boolean; count: number; data: Crop[] }>(`/crops${query}`);
  },

  // Markets
  getMarkets: (district?: string) => {
    const query = buildQueryString({ district });
    return request<{ success: boolean; count: number; data: Market[] }>(`/markets${query}`);
  },

  // Prices
  getPrices: (filters?: { crop_id?: string; market_id?: string; date?: string; start_date?: string; end_date?: string }) => {
    const query = buildQueryString(filters);
    return request<{ success: boolean; count: number; data: PriceRecord[] }>(`/prices${query}`);
  },
  getPriceSummary: (crop_id: string, market_id: string) =>
    request<{ success: boolean; data: PriceSummary }>(`/prices/summary?crop_id=${crop_id}&market_id=${market_id}`),
  getMarketComparison: (crop_id: string) =>
    request<{ success: boolean; data: MarketComparison }>(`/prices/comparison?crop_id=${crop_id}`),
  createPrice: (data: { crop_id: string; market_id: string; date: string; price: number }) =>
    request<{ success: boolean; data: PriceRecord }>('/prices', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Listings
  getListings: (filters?: {
    crop_id?: string;
    district?: string;
    grade?: string;
    status?: string;
    user_id?: string;
    search?: string;
    sort?: 'newest' | 'price_asc';
  }) => {
    const query = buildQueryString(filters);
    return request<{ success: boolean; count: number; data: Listing[] }>(`/listings${query}`);
  },
  getListing: (id: string) => request<{ success: boolean; data: Listing }>(`/listings/${id}`),
  createListing: (data: {
    user_id: string;
    crop_id: string;
    quantity: number;
    asking_price: number;
    district: string;
    grade: 'A' | 'B' | 'C';
    available_from: string;
    contact_phone: string;
    status?: 'Active' | 'Sold';
  }) =>
    request<{ success: boolean; data: Listing }>('/listings', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateListing: (id: string, updates: Partial<Listing>) =>
    request<{ success: boolean; data: Listing }>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
  deleteListing: (id: string) =>
    request<{ success: boolean; message: string }>(`/listings/${id}`, {
      method: 'DELETE'
    }),

  // Alerts
  getAlerts: (filters?: { user_id?: string; active_status?: boolean; triggered_status?: boolean }) => {
    const query = buildQueryString(filters);
    return request<{ success: boolean; count: number; data: Alert[] }>(`/alerts${query}`);
  },
  createAlert: (data: {
    user_id: string;
    crop_id: string;
    market_id: string;
    condition: 'Above' | 'Below';
    target_price: number;
    active_status?: boolean;
  }) =>
    request<{ success: boolean; data: Alert }>('/alerts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateAlert: (id: string, updates: Partial<Alert>) =>
    request<{ success: boolean; data: Alert }>(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
  deleteAlert: (id: string) =>
    request<{ success: boolean; message: string }>(`/alerts/${id}`, {
      method: 'DELETE'
    }),
  evaluateAlerts: () => request<AlertEvaluationResult>('/alerts/evaluate', { method: 'POST' }),

  // Weather & Farming Advisories
  getWeather: (district?: string) => {
    const query = buildQueryString({ district });
    return request<{ success: boolean; data: WeatherData }>(`/weather${query}`);
  },
  getWeatherDistricts: () =>
    request<{ success: boolean; data: string[] }>('/weather/districts'),

  // AI Kisan Dost Assistant
  askKisanDost: (payload: { message: string; district?: string; language?: string }) =>
    request<{ success: boolean; data: AssistantResponse }>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getAssistantStatus: () =>
    request<{ success: boolean; data: AssistantStatus }>('/assistant/status')
};
