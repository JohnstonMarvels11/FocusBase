import React, { useMemo, useState, useEffect, useCallback } from 'react';
import type { View, Task, Goal, CalEvent, AuthUser, Note, WeatherData, Email, Toast } from '../types';
import { LoadingIcon } from './icons/LoadingIcon';
import WeatherModal from './WeatherModal';
import EmailViewerModal from './EmailViewerModal';
import { fetchUnreadEmails, markEmailAsRead } from '../services/googleApiService';


interface DashboardProps {
    user: AuthUser;
    setView: (view: View) => void;
    tasks: Task[];
    updateTasks: (tasks: Task[]) => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
    goals: Goal[];
    events: CalEvent[];
    notes: Note[];
    googleAccessToken: string | null;
    handleConnectGoogleAccount: () => void;
}

// --- SUB-COMPONENTS ---
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

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

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

const QuickActionsCard: React.FC<{ setView: (v: View) => void }> = ({ setView }) => (
    <div className="liquid-glass-advanced glow-on-hover p-4 rounded-xl flex flex-col h-full">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-amber-400">bolt</span>Quick Actions</h3>
        <div className="flex-1 grid grid-cols-3 gap-3">
            <button onClick={() => setView('tasks')} className="quick-access-card liquid-glass-light rounded-lg flex flex-col items-center justify-center text-center p-2">
                <div className="quick-access-icon-container w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mb-2 border border-cyan-500/30">
                     <span className="material-symbols-outlined text-cyan-300 text-2xl">add</span>
                </div>
                <p className="text-xs font-semibold text-white">New Task</p>
                <div className="shine-effect"></div>
            </button>
             <button onClick={() => setView('notes')} className="quick-access-card liquid-glass-light rounded-lg flex flex-col items-center justify-center text-center p-2">
                <div className="quick-access-icon-container w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-2 border border-amber-500/30">
                    <span className="material-symbols-outlined text-amber-300 text-2xl">lightbulb</span>
                </div>
                <p className="text-xs font-semibold text-white">New Note</p>
                <div className="shine-effect"></div>
            </button>
             <button onClick={() => setView('timer')} className="quick-access-card liquid-glass-light rounded-lg flex flex-col items-center justify-center text-center p-2">
                <div className="quick-access-icon-container w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-2 border border-rose-500/30">
                    <span className="material-symbols-outlined text-rose-300 text-2xl">timer</span>
                </div>
                <p className="text-xs font-semibold text-white">Start Timer</p>
                <div className="shine-effect"></div>
            </button>
        </div>
    </div>
);


const WeatherCard: React.FC<{
    data: WeatherData | null;
    error: string | null;
    isLoading: boolean;
    onOpen: () => void;
    onSetLocation: (city: string) => void;
    onClearLocation: () => void;
}> = ({ data, error, isLoading, onOpen, onSetLocation, onClearLocation }) => {
    const [locationInput, setLocationInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSetLocation(locationInput);
    };

    return (
        <div
            onClick={data && !error ? onOpen : undefined}
            className={`liquid-glass-advanced glow-on-hover p-4 rounded-xl flex flex-col aurora-border h-full ${data && !error ? 'cursor-pointer' : ''}`}
        >
            {isLoading && <div className="m-auto flex items-center justify-center w-full"><LoadingIcon /></div>}
            
            {!isLoading && !data && (
                 <div className="m-auto text-center w-full">
                    <h3 className="text-base font-bold text-white mb-2">Set Your Location</h3>
                    <p className="text-sm text-slate-400 mb-4">Enter a city to get weather updates.</p>
                    {error && <p className="text-sm text-amber-300 mb-3">{error}</p>}
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            placeholder="City, State, Country"
                            className="flex-1 p-2 rounded-md bg-black/30 border border-slate-500 text-sm text-white focus:ring-2 focus:ring-[var(--primary-400)] focus:border-transparent"
                            autoFocus
                        />
                        <button type="submit" className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors button-active">
                            Set
                        </button>
                    </form>
                </div>
            )}
            
            {data && !isLoading && (
                <>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="font-bold text-white text-lg">{data.city}</p>
                            <p className="text-sm text-slate-300 capitalize">{data.description}</p>
                             <button onClick={(e) => { e.stopPropagation(); onClearLocation(); }} className="text-xs text-slate-400 hover:text-white mt-1">Change Location</button>
                        </div>
                        <div className="w-16 h-16 flex items-center justify-center -mt-2 -mr-2">
                            <span className="material-symbols-outlined text-6xl text-white opacity-90">{getWeatherIcon(data.icon)}</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center my-2">
                        <p className="text-7xl font-bold text-white">{data.temperature}°</p>
                    </div>
                    <div className="flex items-end justify-between text-sm">
                        <div className="text-center">
                            <p className="font-bold text-white">{data.wind_speed} <span className="text-xs font-normal text-slate-400">mph</span></p>
                            <p className="text-xs text-slate-400">Wind</p>
                        </div>
                        <div className="wind-compass">
                            <span className="compass-label label-n">N</span><span className="compass-label label-s">S</span>
                            <span className="compass-label label-e">E</span><span className="compass-label label-w">W</span>
                            <span className="material-symbols-outlined wind-arrow" style={{ transform: `rotate(${data.wind_deg}deg)` }}>navigation</span>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-white">{data.humidity}<span className="text-xs font-normal text-slate-400">%</span></p>
                            <p className="text-xs text-slate-400">Humidity</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const GmailCard: React.FC<{ emails: Email[]; isLoading: boolean; error: string | null; onConnect: () => void; onSelectEmail: (email: Email) => void; isConnected: boolean; }> = ({ emails, isLoading, error, onConnect, onSelectEmail, isConnected }) => (
    <div className="liquid-glass-advanced glow-on-hover p-4 rounded-xl flex flex-col h-full">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-rose-400">mail</span>Gmail Inbox</h3>
        <div className="flex-1 flex flex-col">
            {isLoading && <div className="m-auto"><LoadingIcon /></div>}
            {error && !isLoading && (
                 <div className="m-auto text-center">
                    <p className="text-sm text-slate-400 mb-3">{error}</p>
                    {!isConnected && <button onClick={onConnect} className="text-sm bg-white/10 text-white px-4 py-2 rounded-md hover:bg-white/20 transition-colors button-active flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path><path d="M1 1h22v22H1z" fill="none"></path></svg>
                        Connect
                    </button>}
                </div>
            )}
            {!isLoading && !error && emails.length === 0 && (
                <div className="m-auto text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">inbox</span>
                    <p className="text-sm text-slate-400">All caught up!</p>
                </div>
            )}
             {!isLoading && !error && emails.length > 0 && (
                 <div className="space-y-2 overflow-y-auto">
                    {emails.map(email => (
                        <div key={email.id} onClick={() => onSelectEmail(email)} className="liquid-glass-light p-2.5 rounded-md cursor-pointer hover:bg-white/10 transition-colors aurora-border">
                            <p className="text-sm font-semibold text-white truncate">{email.from}</p>
                            <p className="text-xs text-slate-300 truncate">{email.subject}</p>
                        </div>
                    ))}
                 </div>
             )}
        </div>
    </div>
);

const NotesCard: React.FC<{ notes: Note[]; setView: (v: View) => void }> = ({ notes, setView }) => (
    <div className="liquid-glass-advanced glow-on-hover p-4 rounded-xl flex flex-col h-full">
         <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-amber-400">note_stack</span>Recent Notes</h3>
         <div className="flex-1 space-y-2 overflow-y-auto">
            {notes.slice(0, 3).map(note => (
                 <div key={note.id} onClick={() => setView('notes')} className="liquid-glass-light p-2.5 rounded-md cursor-pointer hover:bg-white/10 transition-colors aurora-border">
                    <p className="text-sm font-semibold text-white truncate">{note.title}</p>
                    <p className="text-xs text-slate-300 truncate">{stripHtml(note.content)}</p>
                </div>
            ))}
             {notes.length === 0 && <div className="h-full flex items-center justify-center text-sm text-slate-400">No recent notes.</div>}
         </div>
    </div>
);

const TasksCard: React.FC<{ tasks: Task[]; setView: (v: View) => void }> = ({ tasks, setView }) => {
    const pendingTasks = useMemo(() => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return tasks.filter(t => !t.completed).sort((a,b) => priorityOrder[b.priority] - priorityOrder[a.priority]).slice(0,4);
    }, [tasks]);
    return (
        <div className="liquid-glass-advanced glow-on-hover p-4 rounded-xl flex flex-col h-full">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-cyan-400">task_alt</span>Pending Tasks</h3>
            <div className="flex-1 space-y-2 overflow-y-auto">
                {pendingTasks.map(task => (
                    <div key={task.id} onClick={() => setView('tasks')} className="liquid-glass-light p-2.5 rounded-md cursor-pointer hover:bg-white/10 transition-colors aurora-border flex items-center gap-3">
                         <span className="material-symbols-outlined text-slate-400">radio_button_unchecked</span>
                         <p className="text-sm font-semibold text-white truncate">{task.text}</p>
                    </div>
                ))}
                {pendingTasks.length === 0 && <div className="h-full flex items-center justify-center text-sm text-slate-400">No pending tasks!</div>}
            </div>
        </div>
    );
};

const UpcomingEventsCard: React.FC<{ events: CalEvent[]; setView: (v: View) => void }> = ({ events, setView }) => {
    const upcomingEvents = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return events
            .filter(e => e.date >= todayStr)
            .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
            .slice(0, 3);
    }, [events]);

    return (
        <div className="liquid-glass-advanced glow-on-hover p-4 rounded-xl flex flex-col h-full">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-rose-400">event</span>Upcoming Events</h3>
            <div className="flex-1 space-y-2 overflow-y-auto">
                {upcomingEvents.map(event => (
                    <div key={event.id} onClick={() => setView('calendar')} className="liquid-glass-light p-2.5 rounded-md cursor-pointer hover:bg-white/10 transition-colors aurora-border">
                        <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                        <p className="text-xs text-slate-300">{new Date(`${event.date}T${event.time}`).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                ))}
                {upcomingEvents.length === 0 && <div className="h-full flex items-center justify-center text-sm text-slate-400">No upcoming events.</div>}
            </div>
        </div>
    );
}

// --- MAIN DASHBOARD COMPONENT ---
export const Dashboard: React.FC<DashboardProps> = ({ user, setView, tasks, updateTasks, addToast, goals, events, notes, googleAccessToken, handleConnectGoogleAccount }) => {
    
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [weatherError, setWeatherError] = useState<string | null>(null);
    const [isWeatherLoading, setIsWeatherLoading] = useState(true);
    const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);

    const [emails, setEmails] = useState<Email[]>([]);
    const [isGmailLoading, setIsGmailLoading] = useState(true);
    const [gmailError, setGmailError] = useState<string | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    
    const OPENWEATHER_API_KEY = '357a8a7e1e8609f67a2b0c67405be0b7';

    const fetchGmailData = async (token: string) => {
        setIsGmailLoading(true);
        setGmailError(null);
        try {
            const unreadEmails = await fetchUnreadEmails(token);
            setEmails(unreadEmails);
        } catch (error: any) {
            setGmailError(error.message || 'Failed to fetch emails.');
            if (error.message.includes('denied')) {
                // The parent component will handle clearing the token
            }
        } finally {
            setIsGmailLoading(false);
        }
    };

    useEffect(() => {
        if (googleAccessToken) {
            fetchGmailData(googleAccessToken);
        } else {
            setIsGmailLoading(false);
        }
    }, [googleAccessToken]);
    
    const handleCreateTaskFromEmail = (title: string) => {
        const newTask: Task = {
          id: Date.now(), text: `From Email: ${title}`, completed: false,
          priority: 'medium', dueDate: null, subtasks: [], createdAt: Date.now(),
        };
        updateTasks([newTask, ...tasks]);
    };
    
    const handleMarkAsRead = async (id: string) => {
        if (!googleAccessToken) return;
        try {
            await markEmailAsRead(googleAccessToken, id);
            setEmails(emails.filter(e => e.id !== id));
            addToast({ message: 'Email marked as read.', type: 'success' });
        } catch(e: any) {
            addToast({ message: e.message, type: 'error' });
        }
    };
    
    const fetchWeather = useCallback(async (lat: number, lon: number) => {
        setIsWeatherLoading(true);
        setWeatherError(null);
        if (!OPENWEATHER_API_KEY) {
            setWeatherError("Weather API key not configured.");
            setIsWeatherLoading(false);
            return;
        }
        try {
            // Fetch current weather, forecast, and location name using free-tier endpoints
            const [weatherRes, forecastRes, geoRes] = await Promise.all([
                fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_API_KEY}`),
                fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${OPENWEATHER_API_KEY}`),
                fetch(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`)
            ]);

            if (!weatherRes.ok || !forecastRes.ok || !geoRes.ok) {
                console.error('Weather response status:', weatherRes.status, 'Forecast:', forecastRes.status, 'Geo:', geoRes.status);
                throw new Error('Failed to fetch weather data from service.');
            }
            
            const current = await weatherRes.json();
            const forecast = await forecastRes.json();
            const geo = await geoRes.json();

            // Process daily forecast from the 3-hour forecast list
            const dailyData: Record<string, { dt: number, temps: number[], weather: any[], daytimeWeather: any[], humidity: number[], wind_speed: number[], pop: number[] }> = forecast.list.reduce((acc: any, reading: any) => {
                const readingDate = new Date(reading.dt * 1000);
                const dateKey = readingDate.toLocaleDateString('en-CA');
                const hour = readingDate.getHours();

                if (!acc[dateKey]) {
                    const startOfDay = new Date(readingDate);
                    startOfDay.setHours(0, 0, 0, 0);
                    acc[dateKey] = { dt: startOfDay.getTime() / 1000, temps: [], weather: [], daytimeWeather: [], humidity: [], wind_speed: [], pop: [] };
                }
                acc[dateKey].temps.push(reading.main.temp);
                acc[dateKey].weather.push(reading.weather[0]);
                acc[dateKey].humidity.push(reading.main.humidity);
                acc[dateKey].wind_speed.push(reading.wind.speed);
                acc[dateKey].pop.push(reading.pop);
                if (hour >= 7 && hour < 19) acc[dateKey].daytimeWeather.push(reading.weather[0]);
                return acc;
            }, {} as Record<string, number>);

            const daily = Object.values(dailyData).slice(0, 6).map((day: any) => {
                const weatherToAnalyze = day.daytimeWeather.length > 0 ? day.daytimeWeather : day.weather;
                let representativeWeather = day.weather[0]; 
                if (weatherToAnalyze.length > 0) {
                    const weatherMode = weatherToAnalyze.reduce((acc: any, curr: any) => ({ ...acc, [curr.id]: (acc[curr.id] || 0) + 1 }), {} as Record<string, number>);
                    const mostFrequentWeatherId = Object.keys(weatherMode).reduce((a, b) => weatherMode[a] > weatherMode[b] ? a : b);
                    representativeWeather = weatherToAnalyze.find((w: any) => String(w.id) === mostFrequentWeatherId) || representativeWeather;
                }
                
                return {
                    dt: day.dt, temp_min: Math.round(Math.min(...day.temps)), temp_max: Math.round(Math.max(...day.temps)),
                    weather: [representativeWeather], humidity: Math.round(day.humidity.reduce((a: number, b: number) => a + b) / day.humidity.length),
                    wind_speed: Math.round(day.wind_speed.reduce((a: number, b: number) => a + b) / day.wind_speed.length), pop: Math.max(...day.pop),
                };
            });
            
            // FIX: Override today's forecast with more accurate daily data from the /weather endpoint.
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            if (daily.length > 0) {
                const firstDayDate = new Date(daily[0].dt * 1000);
                if (firstDayDate.getTime() === todayStart.getTime()) {
                    daily[0].temp_min = Math.round(current.main.temp_min);
                    daily[0].temp_max = Math.round(current.main.temp_max);
                }
            }
            
            const processedData: WeatherData = {
                city: geo[0]?.name || 'Unknown', state: geo[0]?.state || '', country: geo[0]?.country || '', lastUpdated: Date.now(),
                description: current.weather[0].description, icon: current.weather[0].icon, temperature: Math.round(current.main.temp),
                feels_like: Math.round(current.main.feels_like), humidity: current.main.humidity, wind_speed: Math.round(current.wind.speed),
                wind_deg: current.wind.deg, pressure: current.main.pressure, visibility: current.visibility ? Math.round(current.visibility / 1609) : null,
                sunrise: current.sys.sunrise, sunset: current.sys.sunset, temp_max: daily[0]?.temp_max ?? Math.round(current.main.temp_max),
                temp_min: daily[0]?.temp_min ?? Math.round(current.main.temp_min), hourly: forecast.list.slice(0, 12).map((h: any) => ({ dt: h.dt, temp: Math.round(h.main.temp), weather: h.weather, pop: h.pop })), daily: daily,
            };
            setWeatherData(processedData);
        } catch (error) {
            console.error("Weather fetch error:", error);
            setWeatherError("Could not load weather data.");
        } finally {
            setIsWeatherLoading(false);
        }
    }, []);

    const getWeatherForCity = useCallback(async (city: string) => {
        if (!city.trim()) return;
        setIsWeatherLoading(true);
        setWeatherError(null);
        setWeatherData(null);
        if (!OPENWEATHER_API_KEY) { 
            setWeatherError("Weather API key not configured."); 
            setIsWeatherLoading(false); 
            return; 
        }
        
        try {
            const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${OPENWEATHER_API_KEY}`);
            if (!geoResponse.ok) throw new Error("Could not find location.");
            const geoData = await geoResponse.json();
            if (geoData.length === 0) throw new Error(`Could not find location for "${city}".`);
            const { lat, lon } = geoData[0];
            localStorage.setItem('focusbase_manual_location', JSON.stringify({ lat, lon, name: city }));
            await fetchWeather(lat, lon);
        } catch (e: any) { 
            setWeatherError(e.message); 
            setIsWeatherLoading(false);
        }
    }, [fetchWeather]);

    const handleClearLocation = useCallback(() => {
        try {
            localStorage.removeItem('focusbase_manual_location');
        } catch (e) { console.error("Could not remove manual location", e); }
        setWeatherData(null);
        setWeatherError(null);
        addToast({ message: 'Location cleared. Please enter a new one.', type: 'info' });
    }, [addToast]);
    
    useEffect(() => {
        let isMounted = true;
        const loadInitialWeather = async () => {
            setIsWeatherLoading(true);
            try {
                const savedLocation = localStorage.getItem('focusbase_manual_location');
                if (savedLocation) {
                    const { lat, lon } = JSON.parse(savedLocation);
                    await fetchWeather(lat, lon);
                } else {
                    if (isMounted) setIsWeatherLoading(false);
                }
            } catch (e) {
                console.error("Could not read or fetch saved location", e);
                if (isMounted) setIsWeatherLoading(false);
            }
        };

        loadInitialWeather();

        return () => { isMounted = false; };
    }, [fetchWeather]);

    const recentNotes = useMemo(() => {
        return [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [notes]);
    
    const handleSelectEmail = (email: Email) => {
        setSelectedEmail(email);
        setIsEmailModalOpen(true);
    };

  return (
    <>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 text-center md:text-left">
                    <h2 className="text-2xl md:text-3xl text-[var(--text-secondary)] animate-text-reveal" style={{ animationDelay: '100ms'}}>
                        {getGreeting()}, {user.displayName?.split(' ')[0] || user.email}
                    </h2>
                    <h1 className="focus-agenda-title animate-text-reveal text-5xl md:text-6xl lg:text-7xl" style={{ animationDelay: '200ms'}}>
                        Focus <span className="animated-text-gradient">Agenda</span>
                    </h1>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="md:col-span-1 lg:col-span-1 min-h-[250px] animate-grid-item-in" style={{ animationDelay: '300ms' }}>
                        <WeatherCard 
                            data={weatherData} 
                            error={weatherError} 
                            isLoading={isWeatherLoading}
                            onOpen={() => setIsWeatherModalOpen(true)}
                            onSetLocation={getWeatherForCity}
                            onClearLocation={handleClearLocation}
                         />
                    </div>
                    <div className="md:col-span-1 lg:col-span-1 min-h-[250px] animate-grid-item-in" style={{ animationDelay: '400ms' }}>
                         <QuickActionsCard setView={setView} />
                    </div>
                     <div className="md:col-span-2 lg:col-span-2 min-h-[250px] animate-grid-item-in" style={{ animationDelay: '500ms' }}>
                        <UpcomingEventsCard events={events} setView={setView} />
                    </div>
                    <div className="md:col-span-1 lg:col-span-2 min-h-[250px] animate-grid-item-in" style={{ animationDelay: '600ms' }}>
                         <TasksCard tasks={tasks} setView={setView} />
                    </div>
                     <div className="md:col-span-1 lg:col-span-1 min-h-[250px] animate-grid-item-in" style={{ animationDelay: '700ms' }}>
                        <GmailCard 
                            emails={emails} 
                            isLoading={isGmailLoading} 
                            error={gmailError}
                            onConnect={handleConnectGoogleAccount}
                            onSelectEmail={handleSelectEmail}
                            isConnected={!!googleAccessToken}
                        />
                    </div>
                    <div className="md:col-span-2 lg:col-span-1 min-h-[250px] animate-grid-item-in" style={{ animationDelay: '800ms' }}>
                        <NotesCard notes={recentNotes} setView={setView} />
                    </div>
                </div>
            </div>
        </div>
        {isWeatherModalOpen && weatherData && (
            <WeatherModal weatherData={weatherData} onClose={() => setIsWeatherModalOpen(false)} />
        )}
        <EmailViewerModal
            email={selectedEmail}
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            onMarkAsRead={handleMarkAsRead}
            onCreateTask={handleCreateTaskFromEmail}
            addToast={addToast}
        />
    </>
  );
};