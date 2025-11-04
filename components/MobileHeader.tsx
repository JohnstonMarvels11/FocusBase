import React from 'react';
import type { View } from '../types';

interface MobileHeaderProps {
  onMenuClick: () => void;
  currentView: View;
}

const viewTitles: Record<View, string> = {
  dashboard: 'Dashboard',
  tasks: 'Task Manager',
  focusSearch: 'Focus Search',
  focusSuite: 'Focus Suite',
  calendar: 'Calendar',
  reminders: 'Reminders',
  timer: 'Study Timer',
  notes: 'Notes',
  whiteboard: 'Whiteboard',
  goalTracker: 'Goal Tracker',
  focusStudio: 'Focus Studio',
  studyRoutineGenerator: 'Study Routine AI',
  knowledgeGraph: 'Knowledge Graph',
  mindfulnessHub: 'Mindfulness Hub',
  focusMeet: 'FocusMeet',
  settings: 'Settings',
};

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick, currentView }) => {
  return (
    <header className="md:hidden flex items-center justify-between p-4 flex-shrink-0 bg-[var(--sidebar-bg)]/50 backdrop-blur-sm border-b border-white/10">
      <button onClick={onMenuClick} className="text-2xl p-2 button-active" aria-label="Open menu">
        <span className="material-symbols-outlined">menu</span>
      </button>
      <h1 className="text-lg font-bold text-[var(--text-primary)]">{viewTitles[currentView] || 'FocusBase'}</h1>
      <div className="w-8"></div> {/* Spacer to balance the header */}
    </header>
  );
};

export default MobileHeader;