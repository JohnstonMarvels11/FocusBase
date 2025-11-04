import React, { useState } from 'react';
import type { WeatherData } from '../types';

interface WeatherModalProps {
  weatherData: WeatherData;
  onClose: () => void;
}

const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

const getWeatherIcon = (iconCode: string): string => {
    switch (iconCode) {
        case '01d': return 'sunny';
        case '01n': return 'clear_night';
        case '02d': return 'partly_cloudy_day';
        case '02n': return 'partly_cloudy_night';
        case '03d':
        case '03n':
        case '04d':
        case '04n':
            return 'cloud';
        case '09d':
        case '09n':
        case '10d':
        case '10n':
            return 'rainy';
        case '11d':
        case '11n':
            return 'thunderstorm';
        case '13d':
        case '13n':
            return 'weather_snowy';
        case '50d':
        case '50n':
            return 'foggy';
        default:
            return 'thermostat'; // A fallback icon
    }
};

const DetailItem: React.FC<{ icon: string; label: string; value: string | number; unit?: string }> = ({ icon, label, value, unit }) => (
    <div className="flex items-center gap-3 liquid-glass-light p-3 rounded-lg">
        <span className="material-symbols-outlined text-xl text-[var(--primary-400)] w-6 text-center">{icon}</span>
        <div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="font-bold text-white">{value}{unit}</p>
        </div>
    </div>
);

const DailyDetailItem: React.FC<{ icon: string, value: string, label: string }> = ({ icon, value, label }) => (
    <div className="text-center">
        <span className="material-symbols-outlined text-cyan-400 mb-1">{icon}</span>
        <p className="font-semibold text-white">{value}</p>
        <p className="text-slate-400">{label}</p>
    </div>
);

const WeatherModal: React.FC<WeatherModalProps> = ({ weatherData, onClose }) => {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const minTempOverall = Math.min(...weatherData.daily.map(day => day.temp_min));
  const maxTempOverall = Math.max(...weatherData.daily.map(day => day.temp_max));
  const tempRangeOverall = maxTempOverall - minTempOverall;
  const locationString = [weatherData.city, weatherData.state, weatherData.country].filter(Boolean).join(', ');
  const todayDateString = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="liquid-glass-advanced w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl m-4 flex flex-col animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 flex justify-between items-center border-b border-[var(--glass-border)] flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Weather Details</h2>
            <p className="text-xs text-slate-400">Last updated: {new Date(weatherData.lastUpdated).toLocaleTimeString()}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors button-active">
            <span className="material-symbols-outlined text-slate-300">close</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Primary Display */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                <div className="flex-1">
                    <h3 className="text-3xl font-bold text-white">{locationString}</h3>
                    <p className="text-lg text-slate-300 capitalize">{weatherData.description}</p>
                     <p className="text-sm text-slate-400 mt-2">
                        High: {weatherData.temp_max}°F / Low: {weatherData.temp_min}°F
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-28 h-28 flex items-center justify-center">
                        <span className="material-symbols-outlined text-9xl text-white" style={{ textShadow: '0 0 25px rgba(255,255,255,0.3)'}}>{getWeatherIcon(weatherData.icon)}</span>
                    </div>
                    <div className="flex items-start">
                        <p className="text-8xl font-extrabold text-white tracking-tighter">{weatherData.temperature}</p>
                        <span className="text-4xl font-bold text-white mt-2">°F</span>
                    </div>
                </div>
            </div>

            {/* Secondary Details */}
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DetailItem icon="thermostat" label="Feels Like" value={weatherData.feels_like} unit="°F" />
                <DetailItem icon="humidity_percentage" label="Humidity" value={weatherData.humidity} unit="%" />
                <DetailItem icon="air" label="Wind" value={weatherData.wind_speed} unit=" mph" />
                <DetailItem icon="compress" label="Pressure" value={weatherData.pressure} unit=" hPa" />
                {weatherData.visibility != null && <DetailItem icon="visibility" label="Visibility" value={weatherData.visibility} unit=" mi" />}
                <div className="liquid-glass-light p-3 rounded-lg flex items-center justify-around gap-4 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl text-amber-400 w-6 text-center">wb_sunny</span>
                        <div>
                            <p className="text-xs text-slate-400">Sunrise</p>
                            <p className="font-bold text-white">{formatTime(weatherData.sunrise)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl text-orange-400 w-6 text-center">wb_twilight</span>
                        <div>
                            <p className="text-xs text-slate-400">Sunset</p>
                            <p className="font-bold text-white">{formatTime(weatherData.sunset)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hourly Forecast */}
            <div>
                <h4 className="text-lg font-bold text-white mb-3">Hourly Forecast</h4>
                <div className="flex overflow-x-auto gap-3 p-2 -m-2">
                    {weatherData.hourly.slice(0, 12).map((hour) => (
                        <div key={hour.dt} className="flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-lg liquid-glass-light w-24 text-center">
                            <p className="text-sm font-semibold text-white">{formatTime(hour.dt)}</p>
                             <div className="w-12 h-12 my-1 flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-white opacity-90">{getWeatherIcon(hour.weather[0].icon)}</span>
                             </div>
                            <p className="text-lg font-bold text-white">{Math.round(hour.temp)}°F</p>
                            {hour.pop > 0 ? (
                                <p className="text-xs text-cyan-300 mt-1">{Math.round(hour.pop * 100)}%</p>
                            ) : (
                                <div className="h-4 mt-1" /> /* Spacer for alignment */
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 5-Day Forecast */}
            <div>
                 <h4 className="text-lg font-bold text-white mb-3">5-Day Forecast</h4>
                 <div className="liquid-glass-light p-2 rounded-xl space-y-1">
                    {weatherData.daily.map((day) => {
                        const barWidth = tempRangeOverall > 0 ? ((day.temp_max - day.temp_min) / tempRangeOverall) * 100 : 0;
                        const barLeftOffset = tempRangeOverall > 0 ? ((day.temp_min - minTempOverall) / tempRangeOverall) * 100 : 0;
                        const isExpanded = expandedDay === day.dt;

                        const dayDate = new Date(day.dt * 1000);
                        const dayDateString = dayDate.toISOString().split('T')[0];
                        const dayLabel = dayDateString === todayDateString
                            ? 'Today'
                            : dayDate.toLocaleDateString([], { weekday: 'long' });

                        return (
                           <div key={day.dt} className="transition-all duration-300">
                                <button
                                    onClick={() => setExpandedDay(isExpanded ? null : day.dt)}
                                    className="w-full flex items-center gap-2 sm:gap-4 text-sm font-medium p-2 rounded-lg hover:bg-white/10"
                                >
                                    <p className="w-20 sm:w-24 text-white truncate text-left">{dayLabel}</p>
                                    <div className="flex items-center justify-center w-10 h-10">
                                        <span className="material-symbols-outlined text-3xl text-white opacity-90">{getWeatherIcon(day.weather[0].icon)}</span>
                                    </div>
                                    <p className="w-8 text-right text-slate-300">{day.temp_min}°</p>
                                    <div className="flex-1 h-1.5 bg-black/20 rounded-full relative">
                                        <div 
                                            className="absolute h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-green-400"
                                            style={{ left: `${barLeftOffset}%`, width: `${barWidth}%` }}
                                        ></div>
                                    </div>
                                    <p className="w-8 text-left text-white font-semibold">{day.temp_max}°</p>
                                    <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                </button>
                                <div className={`accordion-content ${isExpanded ? 'max-h-40' : 'max-h-0'}`}>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 bg-black/20 rounded-b-lg mx-2 mb-1">
                                        <DailyDetailItem icon="rainy" value={`${Math.round(day.pop * 100)}%`} label="Precip." />
                                        <DailyDetailItem icon="humidity_percentage" value={`${day.humidity}%`} label="Humidity" />
                                        <DailyDetailItem icon="air" value={`${day.wind_speed} mph`} label="Wind" />
                                    </div>
                                </div>
                           </div>
                        );
                    })}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherModal;