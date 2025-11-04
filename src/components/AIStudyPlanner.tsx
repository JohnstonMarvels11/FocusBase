import React, { useState, useMemo } from 'react';
import { LoadingIcon } from './icons/LoadingIcon';
import * as gemini from '../services/geminiService';
import { ADVANCED_USAGE_LIMIT } from './constants';
import type { StudySet, CalEvent, Toast, UserUsage, ScheduledStudyBlock } from '../types';

interface AIStudyPlannerProps {
    studySets: StudySet[];
    events: CalEvent[];
    updateEvents: (events: CalEvent[]) => void;
    onBack: () => void;
    usage: UserUsage;
    updateUsage: (category: 'standard' | 'advanced' | 'assistant') => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
}

const AIStudyPlanner: React.FC<AIStudyPlannerProps> = ({ studySets, events, updateEvents, onBack, usage, updateUsage, addToast }) => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // --- STATE ---
    const [goal, setGoal] = useState('');
    const [selectedSetId, setSelectedSetId] = useState<number | null>(studySets[0]?.id || null);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(nextWeekStr);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<ScheduledStudyBlock[] | null>(null);

    const advancedUsesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;
    const canGenerate = goal && selectedSetId && startDate && endDate && advancedUsesLeft > 0 && !isLoading;

    const selectedSetMaterials = useMemo(() => {
        return studySets.find(s => s.id === selectedSetId)?.materials.map(m => m.name) || [];
    }, [selectedSetId, studySets]);

    // --- HANDLERS ---
    const handleGenerate = async () => {
        if (!canGenerate) return;
        setIsLoading(true);
        setError(null);
        setPlan(null);
        try {
            const generatedPlan = await gemini.generatePersonalizedStudyPlan(goal, selectedSetMaterials, startDate, endDate, events);
            setPlan(generatedPlan);
            updateUsage('advanced');
            addToast({ message: `Generated a plan with ${generatedPlan.length} study blocks!`, type: 'success' });
        } catch (e: any) {
            setError(e.message);
            addToast({ message: e.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConfirmPlan = () => {
        if (!plan) return;
        const newEvents: CalEvent[] = plan.map(block => ({
            id: `study-${Date.now()}-${Math.random()}`,
            title: `${block.subject}: ${block.activity}`,
            date: block.date,
            time: block.time,
            color: 'emerald',
            isGoogleEvent: false,
        }));
        updateEvents([...events, ...newEvents]);
        addToast({ message: 'Study plan added to your calendar!', type: 'success' });
        onBack();
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                     <button onClick={onBack} className="text-sm text-[var(--primary-400)] hover:underline mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined">arrow_back</span> Back to Studio
                    </button>
                    <h3 className="text-xl font-bold text-white">AI Study Planner</h3>
                </div>
            </div>
            
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                {/* Inputs */}
                <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
                    <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-1">Study Goal</label>
                        <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g., Ace midterm exams" className="w-full p-2 rounded-md liquid-glass-inset"/>
                    </div>
                     <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-1">Study Set</label>
                        <select value={selectedSetId || ''} onChange={e => setSelectedSetId(Number(e.target.value))} className="w-full p-2 rounded-md liquid-glass-inset">
                             {studySets.length === 0 ? <option>No study sets available</option> : studySets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-semibold text-slate-300 block mb-1">Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 rounded-md liquid-glass-inset"/>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-300 block mb-1">End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 rounded-md liquid-glass-inset"/>
                        </div>
                     </div>
                     <div className="flex-1" />
                     <div className="border-t border-[var(--glass-border)] pt-4 space-y-3">
                        <div className="text-sm text-slate-400 text-center">
                            {advancedUsesLeft > 0 ? `${advancedUsesLeft} / ${ADVANCED_USAGE_LIMIT} advanced uses left` : <span className="text-red-400">Advanced usage limit reached</span>}
                        </div>
                        <button onClick={handleGenerate} disabled={!canGenerate} className="w-full bg-[var(--primary-500)] text-white font-bold py-3 px-4 rounded-lg button-active disabled:opacity-50 flex items-center justify-center gap-2">
                           {isLoading ? <LoadingIcon /> : <><span className="material-symbols-outlined text-base">auto_awesome</span>Generate Plan</>}
                        </button>
                         {plan && (
                             <button onClick={handleConfirmPlan} className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg button-active flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-base">check</span>Confirm & Add to Calendar
                            </button>
                         )}
                     </div>
                </div>

                {/* Calendar Preview */}
                <div className="lg:col-span-2 overflow-y-auto">
                    <h4 className="text-lg font-bold text-white mb-3">Plan Preview</h4>
                    <div className="liquid-glass-inset p-4 rounded-lg h-full">
                        {isLoading && <div className="h-full flex flex-col items-center justify-center text-center"><LoadingIcon /><p className="mt-2 text-slate-300">Focus.AI is analyzing your schedule...</p></div>}
                        {error && <div className="h-full flex items-center justify-center text-red-400">{error}</div>}
                        {!isLoading && !error && !plan && <div className="h-full flex flex-col items-center justify-center text-center text-slate-400"><span className="material-symbols-outlined text-4xl mb-3">calendar_month</span><p>Your AI-generated study plan will appear here for review.</p></div>}
                        {plan && <PlanCalendarView startDate={startDate} endDate={endDate} events={events} plan={plan} />}
                    </div>
                </div>
            </div>
        </div>
    );
};


const PlanCalendarView: React.FC<{startDate: string, endDate: string, events: CalEvent[], plan: ScheduledStudyBlock[]}> = ({startDate, endDate, events, plan}) => {
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date(startDate));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calendarDays = useMemo(() => {
        const daysArray = [];
        const start = new Date(currentWeekStart);
        start.setDate(start.getDate() - start.getDay()); // Start from Sunday
        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            daysArray.push(date);
        }
        return daysArray;
    }, [currentWeekStart]);
    
    const goToPrevWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
    };

    const goToNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
    };

    const monthName = currentWeekStart.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <button onClick={goToPrevWeek} className="p-2 rounded-full hover:bg-white/10 button-active"><span className="material-symbols-outlined">chevron_left</span></button>
                <h5 className="font-bold text-white">{monthName}</h5>
                <button onClick={goToNextWeek} className="p-2 rounded-full hover:bg-white/10 button-active"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
            <div className="planner-calendar-grid">
                {days.map(d => <div key={d} className="text-center text-xs font-bold text-slate-400 pb-2">{d}</div>)}
                {calendarDays.map(day => {
                    const dateStr = day.toISOString().split('T')[0];
                    const dayEvents = events.filter(e => e.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
                    const dayPlan = plan.filter(p => p.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
                    const isOutsideRange = dateStr < startDate || dateStr > endDate;

                    return (
                        <div key={dateStr} className={`planner-day-cell ${isOutsideRange ? 'other-month' : ''}`}>
                             <p className="font-semibold text-white text-sm mb-2">{day.getDate()}</p>
                             <div className="overflow-y-auto space-y-1 text-xs">
                                {dayEvents.map(e => <div key={e.id} className="planner-event planner-event-existing" title={e.title}>{e.title}</div>)}
                                {dayPlan.map((p, i) => <div key={i} className="planner-event planner-event-ai" title={`${p.subject}: ${p.activity}`}>{p.activity}</div>)}
                             </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};


export default AIStudyPlanner;