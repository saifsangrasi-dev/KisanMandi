import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Calendar,
  CheckCircle2,
  Info,
  ShieldAlert
} from 'lucide-react';
import { User, api } from '../services/api';

interface WeatherAlertsViewProps {
  activeUser: User | null;
}

export interface WeatherData {
  district: string;
  current: {
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
  };
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

export const WeatherAlertsView: React.FC<WeatherAlertsViewProps> = ({ activeUser }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    activeUser?.district || 'Hyderabad'
  );
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWeather(selectedDistrict);
      setWeatherData(res.data);
    } catch (err: any) {
      setError(
        err.message ||
          'Weather service currently unavailable. Please verify network connectivity or try again in a few moments.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeUser?.district) {
      setSelectedDistrict(activeUser.district);
    }
  }, [activeUser]);

  useEffect(() => {
    fetchWeather();
  }, [selectedDistrict]);

  const getWeatherIcon = (iconType: string, className = 'w-6 h-6') => {
    if (iconType === 'cloud-rain') return <CloudRain className={`${className} text-sky-500`} />;
    if (iconType === 'sun') return <Sun className={`${className} text-amber-500`} />;
    if (iconType === 'wind') return <Wind className={`${className} text-teal-500`} />;
    return <CloudSun className={`${className} text-amber-500`} />;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <CloudSun className="w-6 h-6 text-emerald-600" />
              <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Mausam Ka Haal Aur Kheti Mashwaray / موسم جو حال
              </h1>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time agricultural weather forecasts and field advisories for Sindh districts
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchWeather}
              className="p-2 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-stone-200 transition-colors"
              title="Refresh weather data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* District Selector */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none"
              >
                <option value="Hyderabad">Hyderabad (حیدرآباد)</option>
                <option value="Sukkur">Sukkur (سکھر)</option>
                <option value="Mirpur Khas">Mirpur Khas (میرپورخاص)</option>
                <option value="Larkana">Larkana (لاڑکانہ)</option>
                <option value="Nawabshah">Nawabshah (نوابشاہ)</option>
                <option value="Badin">Badin (بدین)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location & Update Time Indicator */}
        <div className="pt-3 flex flex-wrap items-center justify-between text-[11px] text-stone-400 gap-2">
          <span>
            Forecast location: <strong>{selectedDistrict} District, Sindh</strong>
          </span>
          {weatherData && (
            <span>
              Updated: {new Date(weatherData.last_updated).toLocaleTimeString()} ({weatherData.current.provider})
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Weather Data Unavailable</p>
            <p className="mt-0.5 text-amber-800">{error}</p>
            <button
              onClick={fetchWeather}
              className="mt-2 font-bold underline hover:no-underline text-amber-950"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Weather Grid */}
      {loading && !weatherData ? (
        <div className="py-20 text-center text-stone-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          Connecting to meteorological forecast provider...
        </div>
      ) : weatherData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Current Conditions Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-xs border border-stone-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Current Conditions
                  </span>
                  <h3 className="text-lg font-black text-stone-900 mt-0.5">
                    {weatherData.district}
                  </h3>
                </div>
                {getWeatherIcon(weatherData.current.condition_icon, 'w-10 h-10')}
              </div>

              {/* Big Temp */}
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-black text-stone-900 tracking-tight">
                  {weatherData.current.temperature}°
                </span>
                <span className="text-xl font-bold text-stone-500">C</span>
                <span className="ml-3 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                  {weatherData.current.condition}
                </span>
              </div>

              {/* Humidity & Wind stats */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center gap-2.5">
                  <Droplets className="w-5 h-5 text-sky-500 shrink-0" />
                  <div>
                    <span className="text-[10px] text-stone-400 block font-medium">Hawa Mein Nami (Humidity)</span>
                    <span className="text-sm font-black text-stone-800">
                      {weatherData.current.humidity}%
                    </span>
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center gap-2.5">
                  <Wind className="w-5 h-5 text-teal-500 shrink-0" />
                  <div>
                    <span className="text-[10px] text-stone-400 block font-medium">Hawa Ki Raftaar (Wind)</span>
                    <span className="text-sm font-black text-stone-800">
                      {weatherData.current.wind_speed_kmh} km/h
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 text-[11px] text-stone-400 flex items-center justify-between">
              <span>Verified coordinates: {weatherData.current.latitude}, {weatherData.current.longitude}</span>
              <span className="font-semibold text-emerald-700">Sindh Agri-Zone</span>
            </div>
          </div>

          {/* Right: Farming Guidance Advisories & 5-Day Outlook */}
          <div className="lg:col-span-7 space-y-4">
            {/* Practical Field Advisories */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>Kisan Mashwaray (Farming Guidance Based on Weather)</span>
              </h3>

              <div className="space-y-2.5">
                {weatherData.advisories.map((adv, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                      adv.severity === 'alert'
                        ? 'bg-rose-50 border-rose-200 text-rose-950'
                        : adv.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}
                  >
                    {adv.severity === 'alert' || adv.severity === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm tracking-tight">{adv.title}</h4>
                      <p className="mt-1 leading-relaxed opacity-90">{adv.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5-Day Forecast Strip */}
            <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>5-Dino Ka Mausam (5-Day Daily Outlook)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {weatherData.forecast.map((day, idx) => {
                  const dayName = new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short'
                  });

                  return (
                    <div
                      key={idx}
                      className="bg-stone-50 border border-stone-100 rounded-xl p-3 text-center flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase block">
                          {idx === 0 ? 'Today' : dayName}
                        </span>
                        <div className="my-2 flex justify-center">
                          {getWeatherIcon(day.condition.icon, 'w-6 h-6')}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-black text-stone-900">
                          {day.max_temp}° / <span className="text-stone-400 font-normal">{day.min_temp}°</span>
                        </div>
                        {day.rain_probability > 0 && (
                          <span
                            className={`text-[10px] font-bold block mt-1 ${
                              day.rain_probability >= 40 ? 'text-sky-700' : 'text-stone-400'
                            }`}
                          >
                            🌧 {day.rain_probability}% rain
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
