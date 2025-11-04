import React, { useState, useEffect } from 'react';
import BackToSuiteHeader from './BackToSuiteHeader';
import type { View, Goal, Milestone, Toast } from '../types';
import ConfirmationDialog from './ConfirmationDialog';

interface GoalTrackerPanelProps {
  goals: Goal[];
  updateGoals: (goals: Goal[]) => void;
  setView: (view: View) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const GoalTrackerPanel: React.FC<GoalTrackerPanelProps> = ({ goals, updateGoals, setView, addToast }) => {
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newMilestoneText, setNewMilestoneText] = useState<Record<number, string>>({});
    const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
    const [goalError, setGoalError] = useState<string | null>(null);
    
    // Clear validation error when user starts typing
    useEffect(() => {
        if(newGoalTitle.trim() && goalError) {
            setGoalError(null);
        }
    }, [newGoalTitle, goalError]);

    const handleAddGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newGoalTitle.trim()) {
            setGoalError('Goal title cannot be empty.');
            return;
        }
        const newGoal: Goal = { id: Date.now(), title: newGoalTitle.trim(), milestones: [] };
        updateGoals([newGoal, ...goals]);
        setNewGoalTitle('');
        setGoalError(null);
        addToast({ message: 'New goal added!', type: 'success' });
    };

    const handleAddMilestone = (goalId: number) => {
        const text = newMilestoneText[goalId];
        if(!text || !text.trim()) return;
        
        const newMilestone: Milestone = { id: Date.now(), text: text, completed: false };
        const newGoals = goals.map(g => g.id === goalId ? { ...g, milestones: [...g.milestones, newMilestone] } : g);
        updateGoals(newGoals);
        setNewMilestoneText({ ...newMilestoneText, [goalId]: '' });
        addToast({ message: 'Milestone added!', type: 'success' });
    };

    const toggleMilestone = (goalId: number, milestoneId: number) => {
        const newGoals = goals.map(g => g.id === goalId 
            ? { ...g, milestones: g.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m) } 
            : g
        );
        updateGoals(newGoals);
    };

    const calculateProgress = (goal: Goal) => {
        if (goal.milestones.length === 0) return 0;
        const completedCount = goal.milestones.filter(m => m.completed).length;
        return Math.round((completedCount / goal.milestones.length) * 100);
    };
    
    const confirmDeleteGoal = () => {
        if(goalToDelete) {
            updateGoals(goals.filter(g => g.id !== goalToDelete.id));
            setGoalToDelete(null);
            addToast({ message: 'Goal deleted.', type: 'info' });
        }
    };

    return (
        <>
        <ConfirmationDialog
            isOpen={!!goalToDelete}
            onClose={() => setGoalToDelete(null)}
            onConfirm={confirmDeleteGoal}
            title="Delete Goal"
            message={`Are you sure you want to permanently delete the goal "${goalToDelete?.title}" and all its milestones?`}
        />
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <BackToSuiteHeader
                    setView={setView}
                    title="Goal Tracker"
                    description="Define your ambitions and track your progress one milestone at a time."
                />

                <div className="liquid-glass p-6 rounded-xl mb-8">
                    <form onSubmit={handleAddGoal}>
                        <div className="flex gap-3">
                            <input 
                                type="text" 
                                value={newGoalTitle} 
                                onChange={e => setNewGoalTitle(e.target.value)} 
                                placeholder="Add a new long-term goal..." 
                                className={`flex-1 p-3 rounded-lg border bg-black/30 text-slate-200 focus:ring-2 focus:border-transparent transition placeholder:text-slate-400 ${goalError ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-[var(--primary-500)]'}`}
                                aria-invalid={!!goalError}
                                aria-describedby="goal-error"
                             />
                            <button type="submit" className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] transition-colors button-active" disabled={!newGoalTitle.trim()}>Add Goal</button>
                        </div>
                        {goalError && <p id="goal-error" className="text-red-500 text-sm mt-2 ml-1">{goalError}</p>}
                    </form>
                </div>

                <div className="space-y-6">
                    {goals.map((goal, index) => (
                        <div 
                          key={goal.id} 
                          className="liquid-glass p-6 rounded-xl animate-list-item" 
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-white">{goal.title}</h3>
                                <button onClick={() => setGoalToDelete(goal)} className="text-slate-400 hover:text-red-500 button-active"><span className="material-symbols-outlined">delete</span></button>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-full bg-black/30 rounded-full h-2.5">
                                    <div className="bg-[var(--primary-500)] h-2.5 rounded-full transition-all duration-500" style={{ width: `${calculateProgress(goal)}%` }}></div>
                                </div>
                                <span className="text-sm font-semibold text-white">{calculateProgress(goal)}%</span>
                            </div>

                            <div className="space-y-3 mb-4">
                                {goal.milestones.map(milestone => (
                                    <div key={milestone.id} className="flex items-center p-2 bg-black/30 rounded-md">
                                        <input type="checkbox" checked={milestone.completed} onChange={() => toggleMilestone(goal.id, milestone.id)} className="w-5 h-5 rounded text-[var(--primary-500)] bg-transparent border-slate-400 focus:ring-[var(--primary-500)] cursor-pointer" />
                                        <span className={`flex-1 mx-3 ${milestone.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{milestone.text}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input type="text" value={newMilestoneText[goal.id] || ''} onChange={e => setNewMilestoneText({ ...newMilestoneText, [goal.id]: e.target.value })} placeholder="Add a milestone..." className="flex-1 p-2 rounded-md border border-white/20 bg-black/30 text-sm focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)]" />
                                <button onClick={() => handleAddMilestone(goal.id)} className="bg-white/10 text-xs px-3 rounded-md hover:bg-white/20 button-active" disabled={!newMilestoneText[goal.id] || !newMilestoneText[goal.id].trim()}>Add</button>
                            </div>
                        </div>
                    ))}
                     {goals.length === 0 && (
                        <div className="text-center py-10">
                            <span className="material-symbols-outlined text-5xl text-slate-500 mb-4">flag</span>
                            <p className="text-slate-400">No goals yet. Add a new goal to start your journey!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};

export default GoalTrackerPanel;