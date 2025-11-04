import React, { useState, useEffect, useMemo } from 'react';
import BackToSuiteHeader from './BackToSuiteHeader';
import ConfirmationDialog from './ConfirmationDialog';
import type { View, CalEvent, EventColor, Toast } from '../types';
import { LoadingIcon } from './icons/LoadingIcon';

interface CalendarPanelProps {
  events: CalEvent[];
  updateEvents: (events: CalEvent[]) => void;
  setView: (view: View) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  googleAccessToken: string | null;
  handleConnectGoogleAccount: () => void;
}

const EventModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalEvent, 'id' | 'date'>) => void;
  selectedDate: Date;
}> = ({ isOpen, onClose, onSave, selectedDate }) => {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('12:00');
  const [color, setColor] = useState<EventColor>('cyan');
  
  const eventColors: { id: EventColor, hex: string }[] = [
      { id: 'rose', hex: '#f43f5e' },
      { id: 'amber', hex: '#f59e0b' },
      { id: 'emerald', hex: '#10b981' },
      { id: 'cyan', hex: '#06b6d4' },
      { id: 'violet', hex: '#8b5cf6' },
      { id: 'slate', hex: '#64748b' },
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave({ title, time, color });
      setTitle('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="liquid-glass rounded-xl shadow-2xl p-6 w-full max-w-md m-4 animate-pop-in">
        <h2 className="text-xl font-bold text-white mb-2">Add Event</h2>
        <p className="text-sm text-slate-300 mb-6">For {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event Title"
              className="w-full p-3 rounded-lg border border-white/20 bg-black/30 text-slate-200 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)]"
              required
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-3 rounded-lg border border-white/20 bg-black/30 text-slate-200 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)]"
            />
            <div className="flex justify-around items-center pt-2">
                {eventColors.map(c => (
                    <button type="button" key={c.id} onClick={() => setColor(c.id)} className={`color-picker-btn ${color === c.id ? 'selected' : ''}`} style={{backgroundColor: c.hex}}></button>
                ))}
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--primary-500)] text-white hover:bg-[var(--primary-600)] font-semibold">Save Event</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const CalendarPanel: React.FC<CalendarPanelProps> = ({ events, updateEvents, setView, addToast, googleAccessToken, handleConnectGoogleAccount }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalEvent | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const { year, month } = { year: currentDate.getFullYear(), month: currentDate.getMonth() };
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const eventsByDate = useMemo(() => {
    return events.reduce((acc, event) => {
      (acc[event.date] = acc[event.date] || []).push(event);
      return acc;
    }, {} as Record<string, CalEvent[]>);
  }, [events]);

  const handleSaveEvent = (eventData: Omit<CalEvent, 'id' | 'date'>) => {
    const newEvent: CalEvent = {
      ...eventData,
      id: Date.now(),
      date: selectedDate.toISOString().split('T')[0],
    };
    updateEvents([...events, newEvent].sort((a,b) => a.time.localeCompare(b.time)));
    addToast({ message: 'Event added!', type: 'success' });
    setIsModalOpen(false);
  };
  
  const confirmDeleteEvent = () => {
    if (eventToDelete) {
      updateEvents(events.filter(e => e.id !== eventToDelete.id));
      setEventToDelete(null);
      addToast({ message: 'Event deleted', type: 'info' });
    }
  };

  const fetchGoogleCalendarEvents = async (accessToken: string) => {
    setIsSyncing(true);
    try {
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30); // fetch last 30 days
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 90); // and next 90 days

        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) {
          if(response.status === 401) {
            addToast({ message: 'Google Calendar connection expired. Please reconnect.', type: 'error' });
          } else {
            throw new Error(`Google Calendar API error: ${response.statusText}`);
          }
          return;
        }

        const data = await response.json();
        const googleEvents: CalEvent[] = (data.items || []).map((item: any) => ({
            id: `gcal-${item.id}`,
            gcalId: item.id,
            title: item.summary,
            date: item.start.date || item.start.dateTime.split('T')[0],
            time: item.start.dateTime ? item.start.dateTime.split('T')[1].substring(0, 5) : '00:00',
            isGoogleEvent: true,
            color: 'slate' as EventColor,
        }));
        
        // Merge events, removing old Google events
        const localEvents = events.filter(e => !e.isGoogleEvent);
        updateEvents([...localEvents, ...googleEvents]);
        addToast({ message: `Synced ${googleEvents.length} events from Google Calendar.`, type: 'success' });

    } catch (error) {
        console.error('Failed to fetch Google Calendar events:', error);
        addToast({ message: 'Failed to sync Google Calendar.', type: 'error' });
    } finally {
        setIsSyncing(false);
    }
  }

  const handleSyncNow = () => {
    if(googleAccessToken) {
        fetchGoogleCalendarEvents(googleAccessToken);
    } else {
        addToast({ message: 'Not connected to Google Calendar.', type: 'info' });
    }
  }
  
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedDayEvents = (eventsByDate[selectedDateStr] || []).sort((a,b) => a.time.localeCompare(b.time));

  return (
    <>
      <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEvent} selectedDate={selectedDate} />
      <ConfirmationDialog isOpen={!!eventToDelete} onClose={() => setEventToDelete(null)} onConfirm={confirmDeleteEvent} title="Delete Event" message={`Delete "${eventToDelete?.title}"?`}/>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-7xl mx-auto">
          <BackToSuiteHeader setView={setView} title="Calendar" description="Plan your month and keep track of important dates." />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 liquid-glass p-4 md:p-6 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-white/10" aria-label="Previous month"><span className="material-symbols-outlined">chevron_left</span></button>
                <h3 className="text-xl font-bold text-white text-center">{monthNames[month]} {year}</h3>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-white/10" aria-label="Next month"><span className="material-symbols-outlined">chevron_right</span></button>
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-2 text-center">
                {daysOfWeek.map(day => <div key={day} className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{day}</div>)}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const dateStr = date.toISOString().split('T')[0];
                  const today = new Date();
                  const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                  const isSelected = dateStr === selectedDateStr;
                  const dayEvents = eventsByDate[dateStr] || [];

                  return (
                    <div key={day} onClick={() => setSelectedDate(date)} className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}>
                      <span>{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="event-dots">
                          {dayEvents.slice(0, 3).map(event => <div key={event.id} className={`event-dot ${event.isGoogleEvent ? 'bg-slate-500' : `bg-${event.color}-500`}`}></div>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-1 liquid-glass p-4 md:p-6 rounded-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Agenda for {selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="w-8 h-8 rounded-full bg-[var(--primary-500)] text-white hover:bg-[var(--primary-600)] flex items-center justify-center flex-shrink-0" aria-label="Add event">
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto -mr-2 pr-2 min-h-[200px]">
                {selectedDayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayEvents.map((event, index) => (
                      <div 
                        key={event.id} 
                        className="flex items-center gap-3 p-3 bg-black/30 rounded-lg group animate-list-item"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <div className={`w-1.5 h-10 rounded-full ${event.isGoogleEvent ? 'bg-slate-500' : `bg-${event.color}-500`}`}></div>
                        <div className="flex-1">
                          <p className="font-semibold text-white flex items-center gap-2">
                            {event.isGoogleEvent && <span className="material-symbols-outlined text-slate-400 text-xs">google</span>}
                            {event.title}
                          </p>
                          <p className="text-sm text-slate-300">{event.time}</p>
                        </div>
                        {!event.isGoogleEvent && (
                          <button onClick={() => setEventToDelete(event)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-xl">delete</span></button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                    <span className="material-symbols-outlined text-5xl mb-3">event_available</span>
                    <p>No events for this day.</p>
                  </div>
                )}
              </div>
              <div className="border-t border-[var(--glass-border)] mt-4 pt-4">
                {!googleAccessToken ? (
                    <button onClick={handleConnectGoogleAccount} disabled={isSyncing} className="w-full bg-white/10 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 button-active">
                         {isSyncing ? <LoadingIcon /> : <><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path><path d="M1 1h22v22H1z" fill="none"></path></svg> Connect Google Calendar</>}
                    </button>
                ) : (
                    <div className="text-center">
                        <p className="text-xs text-emerald-300 mb-2 flex items-center justify-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span> Google Calendar Connected</p>
                        <button onClick={handleSyncNow} disabled={isSyncing} className="text-xs text-slate-400 hover:text-white underline">
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CalendarPanel;