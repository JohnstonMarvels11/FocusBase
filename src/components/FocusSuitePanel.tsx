import React from 'react';
import type { View } from '../types';

interface FocusSuitePanelProps {
    setView: (view: View) => void;
}

const ToolCard: React.FC<{
    icon: string;
    title: string;
    description: string;
    view: View;
    setView: (view: View) => void;
}> = ({ icon, title, description, view, setView }) => {
    return (
        <div 
            className="liquid-glass-light rounded-xl shadow-lg hover:shadow-[var(--primary-shadow)] hover:-translate-y-1 transition-all duration-300 cursor-pointer p-6 button-active"
            onClick={() => setView(view)}
        >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--primary-500)]/80 mb-4">
                <span className="material-symbols-outlined text-2xl text-white">{icon}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-300">{description}</p>
        </div>
    );
}

const FocusSuitePanel: React.FC<FocusSuitePanelProps> = ({ setView }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-5xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">
                    Focus <span className="text-[var(--primary-400)]">Suite</span>
                </h1>
                <p className="text-lg text-slate-300">
                    A collection of powerful tools to help you stay organized and focused.
                </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                <ToolCard 
                    icon="calendar_month"
                    title="Calendar"
                    description="Visualize your schedule, plan your weeks, and never miss an important date."
                    view="calendar"
                    setView={setView}
                />
                <ToolCard 
                    icon="notifications"
                    title="Reminders"
                    description="Set reminders for assignments, deadlines, or study sessions to stay on track."
                    view="reminders"
                    setView={setView}
                />
                 <ToolCard 
                    icon="timer"
                    title="Study Timer"
                    description="Use the Pomodoro technique to enhance focus and manage your study intervals."
                    view="timer"
                    setView={setView}
                />
                <ToolCard 
                    icon="note_stack"
                    title="Notes"
                    description="Jot down thoughts, summarize lectures, and keep your ideas organized in one place."
                    view="notes"
                    setView={setView}
                />
                 <ToolCard 
                    icon="draw"
                    title="Whiteboard"
                    description="A blank canvas for brainstorming, mind-mapping, and visual note-taking."
                    view="whiteboard"
                    setView={setView}
                />
                <ToolCard 
                    icon="flag"
                    title="Goal Tracker"
                    description="Define long-term goals and track your progress with actionable milestones."
                    view="goalTracker"
                    setView={setView}
                />
                <ToolCard 
                    icon="videocam"
                    title="FocusMeet"
                    description="Host and schedule secure video meetings directly within your workspace."
                    view="focusMeet"
                    setView={setView}
                />
                <ToolCard 
                    icon="self_improvement"
                    title="Mindfulness Hub"
                    description="Tools to calm your mind, from guided breathing to focus music."
                    view="mindfulnessHub"
                    setView={setView}
                />
            </div>
        </div>
    </div>
  );
};

export default FocusSuitePanel;