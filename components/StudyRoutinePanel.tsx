import React, { useState, useEffect } from 'react';
import { generateStudyRoutine } from '../services/geminiService';
import { LoadingIcon } from './icons/LoadingIcon';
import type { View, Toast, StudyBlock, UserUsage } from '../types';
import { ADVANCED_USAGE_LIMIT } from './constants';

interface StudyRoutinePanelProps {
  setView: (view: View) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  usage: UserUsage;
  updateUsage: (category: 'standard' | 'advanced') => void;
}

const StudyRoutinePanel: React.FC<StudyRoutinePanelProps> = ({ setView, addToast, usage, updateUsage }) => {
    const [subjects, setSubjects] = useState('');
    const [timeSlots, setTimeSlots] = useState('');
    const [goals, setGoals] = useState('');
    const [routine, setRoutine] = useState<StudyBlock[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const usesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (usesLeft <= 0) {
            addToast({ message: 'Daily limit for Advanced AI tools reached.', type: 'error' });
            return;
        }

        setIsLoading(true);
        setError(null);
        setRoutine(null);

        try {
            const generatedRoutine = await generateStudyRoutine(subjects, timeSlots, goals);
            setRoutine(generatedRoutine);
            updateUsage('advanced');
            addToast({ message: 'Study routine generated successfully!', type: 'success' });
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
            addToast({ message: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const groupedRoutine = routine?.reduce((acc, block) => {
        (acc[block.day] = acc[block.day] || []).push(block);
        return acc;
    }, {} as Record<string, StudyBlock[]>);

    const canGenerate = !isLoading && subjects && timeSlots && goals && usesLeft > 0;

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">AI Study Routine Generator</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Let Focus.AI create a personalized study plan to help you achieve your goals.
                    </p>
                </header>

                <div className="liquid-glass-advanced p-6">
                    <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label htmlFor="subjects" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Subjects</label>
                            <textarea id="subjects" rows={3} value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="e.g., Calculus II, Modern Physics, History 101" className="w-full p-3 rounded-lg liquid-glass-inset focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition" required />
                        </div>
                        <div className="md:col-span-1">
                            <label htmlFor="timeSlots" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Available Times</label>
                            <textarea id="timeSlots" rows={3} value={timeSlots} onChange={e => setTimeSlots(e.target.value)} placeholder="e.g., Weekdays 4pm-8pm, Weekends all day" className="w-full p-3 rounded-lg liquid-glass-inset focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition" required />
                        </div>
                         <div className="md:col-span-1">
                            <label htmlFor="goals" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Goals</label>
                            <textarea id="goals" rows={3} value={goals} onChange={e => setGoals(e.target.value)} placeholder="e.g., Ace my midterms, Finish project proposal" className="w-full p-3 rounded-lg liquid-glass-inset focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition" required />
                        </div>
                         <div className="md:col-span-3 flex justify-end items-center gap-4">
                            <div className="text-sm text-slate-400">
                                {usesLeft > 0 ? (
                                    <span><span className="font-semibold text-white">{usesLeft}</span> / {ADVANCED_USAGE_LIMIT} uses left today</span>
                                ) : (
                                    <span className="font-semibold text-red-400">Daily limit reached. Resets tomorrow.</span>
                                )}
                            </div>
                            <button type="submit" disabled={!canGenerate} className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] disabled:cursor-not-allowed transition-colors flex items-center justify-center ml-auto button-active">
                                {isLoading ? <><i className="fas fa-brain mr-2 animate-thinking text-white"></i> Thinking...</> : <><i className="fas fa-wand-magic-sparkles mr-2"></i>Generate Routine</>}
                            </button>
                        </div>
                    </form>
                </div>
                
                 <div className="mt-8">
                    {isLoading && (
                        <div className="text-center py-10">
                            <LoadingIcon />
                            <p className="text-sm text-[var(--text-secondary)] mt-2">AI is crafting your personalized study plan...</p>
                        </div>
                    )}
                    {error && <p className="text-red-500 text-center">{error}</p>}
                    
                    {groupedRoutine && (
                        <div className="space-y-6 animate-fade-in">
                            {daysOrder.map(day => groupedRoutine[day] && (
                                <div key={day}>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{day}</h3>
                                    <div className="liquid-glass-advanced p-4 space-y-3">
                                        {groupedRoutine[day].sort((a,b) => a.time.localeCompare(b.time)).map((block, index) => (
                                            <div key={index} className="liquid-glass-light p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                                                <div className="w-full sm:w-24 text-left sm:text-center flex-shrink-0">
                                                    <p className="font-bold text-[var(--text-primary)]">{block.time}</p>
                                                    <p className="text-xs text-[var(--text-secondary)]">{block.duration} mins</p>
                                                </div>
                                                <div className="w-full sm:w-px sm:h-10 bg-[var(--glass-border)] h-px mt-2 sm:mt-0"></div>
                                                <div>
                                                    <p className="font-semibold text-[var(--text-primary)]">{block.subject}</p>
                                                    <p className="text-sm text-[var(--text-secondary)]">{block.activity}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default StudyRoutinePanel;