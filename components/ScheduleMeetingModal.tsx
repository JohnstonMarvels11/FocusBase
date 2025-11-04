import React, { useState } from 'react';
import type { MeetingDetails } from '../services/googleMeetApiService';
import { LoadingIcon } from './icons/LoadingIcon';

interface ScheduleMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (details: MeetingDetails) => Promise<void>;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({ isOpen, onClose, onSchedule }) => {
    const today = new Date().toISOString().split('T')[0];
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(today);
    const [startTime, setStartTime] = useState('12:00');
    const [endTime, setEndTime] = useState('13:00');
    const [attendees, setAttendees] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsLoading(true);
        const startDateTime = new Date(`${date}T${startTime}`).toISOString();
        const endDateTime = new Date(`${date}T${endTime}`).toISOString();
        const attendeeEmails = attendees.split(',').map(e => e.trim()).filter(e => e);

        await onSchedule({
            title,
            startDateTime,
            endDateTime,
            attendees: attendeeEmails,
        });
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="liquid-glass rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 animate-pop-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-6">Schedule a Meeting</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Meeting Title"
                        className="w-full p-3 rounded-lg border border-white/20 bg-black/30 text-slate-200 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)]"
                        required
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <input
                            type="date"
                            value={date}
                            min={today}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-3 rounded-lg border border-white/20 bg-black/30 text-slate-200 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)]"
                        />
                         <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full p-3 rounded-lg border border-white/20 bg-black/30 text-slate-200 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)]"
                        />
                         <input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full p-3 rounded-lg border border-white/20 bg-black/30 text-slate-200 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)]"
                        />
                    </div>
                     <input
                        type="text"
                        value={attendees}
                        onChange={(e) => setAttendees(e.target.value)}
                        placeholder="Attendees (comma-separated emails)"
                        className="w-full p-3 rounded-lg border border-white/20 bg-black/30 text-slate-200 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)]"
                    />
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 button-active">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg bg-[var(--primary-500)] text-white hover:bg-[var(--primary-600)] font-semibold button-active w-36 text-center">
                           {isLoading ? <LoadingIcon className="w-5 h-5 mx-auto"/> : 'Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleMeetingModal;
