import React, { useState, useEffect, useCallback, useMemo } from 'react';
import BackToSuiteHeader from './BackToSuiteHeader';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import { LoadingIcon } from './icons/LoadingIcon';
import * as MeetService from '../services/googleMeetApiService';
import type { View, Toast, CalEvent } from '../types';

interface FocusMeetPanelProps {
    setView: (view: View) => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
    googleAccessToken: string | null;
    handleConnectGoogleAccount: () => void;
}

// Custom hook for countdown logic
const useCountdown = (targetDate: Date) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isStartingSoon, setIsStartingSoon] = useState(false);

    useEffect(() => {
        const calculate = () => {
            const difference = +targetDate - +new Date();
            if (difference <= 0) {
                setTimeLeft('Starting now');
                setIsStartingSoon(true);
                return;
            }
            if (difference < 5 * 60 * 1000) { // 5 minutes
                setIsStartingSoon(true);
            } else {
                setIsStartingSoon(false);
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            if (days > 0) setTimeLeft(`${days}d ${hours}h`);
            else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`);
            else if (minutes > 0) setTimeLeft(`${minutes}m ${seconds}s`);
            else setTimeLeft(`${seconds}s`);
        };

        const timer = setInterval(calculate, 1000);
        calculate();
        return () => clearInterval(timer);
    }, [targetDate]);

    return { timeLeft, isStartingSoon };
};

const NextMeetingCard: React.FC<{ meeting: CalEvent }> = ({ meeting }) => {
    const targetDate = useMemo(() => new Date(`${meeting.date}T${meeting.time}`), [meeting]);
    const { timeLeft, isStartingSoon } = useCountdown(targetDate);
    
    return (
        <div className="liquid-glass-advanced p-6 rounded-xl focus-highlight-card">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--primary-400)]">Next Meeting</p>
            <h3 className="text-2xl font-bold text-white mt-2 mb-4 truncate">{meeting.title}</h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                    <p className="text-4xl font-bold text-white">{timeLeft}</p>
                    <p className="text-slate-300">{targetDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" 
                   className={`w-full md:w-auto text-center font-bold py-3 px-8 rounded-lg transition-all duration-300 button-active flex items-center justify-center gap-2 ${isStartingSoon ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30' : 'bg-white/10 text-slate-300 pointer-events-none'}`}>
                    <span className="material-symbols-outlined">videocam</span>{isStartingSoon ? 'Join Now' : 'Join'}
                </a>
            </div>
        </div>
    );
};

const FocusMeetPanel: React.FC<FocusMeetPanelProps> = ({ setView, addToast, googleAccessToken, handleConnectGoogleAccount }) => {
    const [meetings, setMeetings] = useState<CalEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    const fetchMeetings = useCallback(async () => {
        if (!googleAccessToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const upcomingMeetings = await MeetService.fetchUpcomingMeetings(googleAccessToken);
            setMeetings(upcomingMeetings);
        } catch (e: any) {
            setError(e.message);
            addToast({ message: e.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [googleAccessToken, addToast]);

    useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    const upcomingMeetings = useMemo(() => {
        const now = new Date();
        return meetings
            .filter(m => new Date(`${m.date}T${m.time}`) >= now)
            .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    }, [meetings]);

    const nextMeeting = useMemo(() => upcomingMeetings[0] || null, [upcomingMeetings]);
    const otherMeetings = useMemo(() => upcomingMeetings.slice(1), [upcomingMeetings]);


    const handleInstantMeeting = async () => {
        if (!googleAccessToken) return;
        setIsCreating(true);
        try {
            const now = new Date();
            const end = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins from now
            const details: MeetService.MeetingDetails = {
                title: "Instant FocusMeet",
                startDateTime: now.toISOString(),
                endDateTime: end.toISOString()
            };
            const event = await MeetService.createMeeting(googleAccessToken, details);
            if (event.hangoutLink) {
                window.open(event.hangoutLink, '_blank');
                addToast({ message: 'Instant meeting created and opened!', type: 'success' });
                fetchMeetings(); // Refresh list
            } else {
                throw new Error('Could not retrieve meeting link.');
            }
        } catch (e: any) {
            addToast({ message: e.message, type: 'error' });
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleScheduleMeeting = async (details: MeetService.MeetingDetails) => {
         if (!googleAccessToken) return;
        try {
            await MeetService.createMeeting(googleAccessToken, details);
            addToast({ message: `Meeting "${details.title}" scheduled!`, type: 'success' });
            setIsScheduleModalOpen(false);
            fetchMeetings();
        } catch(e: any) {
            addToast({ message: e.message, type: 'error' });
        }
    }

    return (
        <>
            <ScheduleMeetingModal 
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSchedule={handleScheduleMeeting}
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-10">
                <div className="max-w-5xl mx-auto">
                    <BackToSuiteHeader
                        setView={setView}
                        title="FocusMeet"
                        description="Host and schedule secure video meetings powered by Google Meet."
                    />

                    {!googleAccessToken ? (
                        <div className="liquid-glass p-8 rounded-xl text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-500 mb-4">videocam_off</span>
                            <h3 className="text-xl font-bold text-white mb-2">Connect to Google Calendar</h3>
                            <p className="text-slate-300 mb-6">To use FocusMeet, you need to connect your Google Account.</p>
                            <button onClick={handleConnectGoogleAccount} className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] button-active flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path><path d="M1 1h22v22H1z" fill="none"></path></svg>
                                Connect Google Account
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {isLoading ? (
                                <div className="liquid-glass-advanced p-6 rounded-xl text-center h-48 flex items-center justify-center"><LoadingIcon /></div>
                            ) : error ? (
                                <div className="liquid-glass-advanced p-6 rounded-xl text-center text-red-400">{error}</div>
                            ) : nextMeeting ? (
                                <NextMeetingCard meeting={nextMeeting} />
                            ) : null}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <button disabled={isCreating} onClick={handleInstantMeeting} className="liquid-glass-interactive aurora-border glow-on-hover p-6 rounded-xl text-left flex flex-col justify-between h-48">
                                    <div>
                                        <span className="material-symbols-outlined text-3xl text-amber-400 mb-3">bolt</span>
                                        <h3 className="text-xl font-bold text-white">Instant Meeting</h3>
                                        <p className="text-sm text-slate-300">Start a new meeting right now.</p>
                                    </div>
                                    <div className={`text-right font-semibold flex items-center justify-end gap-2 ${isCreating ? 'text-slate-400' : 'text-[var(--primary-400)]'}`}>
                                        {isCreating ? 'Creating...' : 'Launch Now'} <span className="material-symbols-outlined">arrow_forward</span>
                                    </div>
                                </button>
                                <button onClick={() => setIsScheduleModalOpen(true)} className="liquid-glass-interactive aurora-border glow-on-hover p-6 rounded-xl text-left flex flex-col justify-between h-48">
                                    <div>
                                        <span className="material-symbols-outlined text-3xl text-cyan-400 mb-3">event_add</span>
                                        <h3 className="text-xl font-bold text-white">Schedule Meeting</h3>
                                        <p className="text-sm text-slate-300">Plan a meeting for a future date and time.</p>
                                    </div>
                                    <p className="text-right font-semibold text-[var(--primary-400)] flex items-center justify-end gap-2">
                                        Schedule <span className="material-symbols-outlined">arrow_forward</span>
                                    </p>
                                </button>
                            </div>
                            
                            {(otherMeetings.length > 0 || (!nextMeeting && !isLoading)) && (
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-4">{nextMeeting ? 'Other Upcoming Meetings' : 'Upcoming Meetings'}</h3>
                                    <div className="liquid-glass p-4 rounded-xl">
                                        {otherMeetings.length === 0 && !nextMeeting && !isLoading && (
                                             <div className="text-center py-10 text-slate-400">
                                                <span className="material-symbols-outlined text-4xl mb-3">event_available</span>
                                                <p>No upcoming meetings found.</p>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            {otherMeetings.map((meeting, index) => (
                                                <div key={meeting.id} className="liquid-glass-light p-3 rounded-lg flex items-center justify-between gap-4 animate-list-item" style={{ animationDelay: `${index * 50}ms`}}>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-white truncate">{meeting.title}</p>
                                                        <p className="text-sm text-slate-300">{new Date(`${meeting.date}T${meeting.time}`).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                    </div>
                                                    <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" className="bg-white/10 text-white font-bold py-2 px-4 rounded-lg hover:bg-white/20 transition-colors button-active flex-shrink-0 text-sm flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-base">videocam</span>Join
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default FocusMeetPanel;