import React, { useState, useEffect, useMemo } from 'react';
import type { View, AuthUser, Task, Goal, CalEvent } from '../types';
import type { Mode } from '../App';

// --- SIDEBAR COMPONENTS ---

interface SidebarProps {
  user: AuthUser;
  activeView: View;
  setView: (view: View) => void;
  toggleChat: () => void;
  isMobileOpen: boolean;
  closeMobileSidebar: () => void;
  handleSignOut: () => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  tasks: Task[];
  goals: Goal[];
  events: CalEvent[];
}

const NavItem: React.FC<{
  icon: string;
  label: string;
  viewName?: View;
  activeView?: View;
  setView?: (view: View) => void;
  onItemClick: () => void;
  isButton?: boolean;
}> = ({ icon, label, viewName, activeView, setView, onItemClick, isButton = false }) => {
  const isActive = activeView === viewName;

  const handleClick = () => {
    if (viewName && setView) {
      setView(viewName);
    }
    onItemClick();
  };

  return (
    <button
      onClick={handleClick}
      data-view={viewName}
      className={`flex items-center w-full px-4 py-3 text-sm font-semibold transition-all duration-300 ease-in-out group rounded-lg button-active nav-item-button ${
        isActive && !isButton
          ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text-active)] shadow-lg'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text-active)] hover:translate-x-1'
      } ${isButton ? 'text-rose-300 hover:bg-rose-500/20 hover:text-rose-200' : ''}`}
    >
      <span className={`material-symbols-outlined mr-3 text-xl ${isActive ? 'text-[var(--sidebar-text-active)]' : 'text-[var(--sidebar-text)]'} group-hover:text-[var(--sidebar-text-active)]`}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
};

const focusSuiteViews: View[] = ['focusSuite', 'calendar', 'reminders', 'timer', 'notes', 'whiteboard', 'goalTracker', 'mindfulnessHub', 'focusMeet'];
const aiToolsViews: View[] = ['focusStudio'];
const aiAdvancedViews: View[] = ['studyRoutineGenerator', 'knowledgeGraph'];

const SidebarWidgets: React.FC<{ 
    setView: (v: View) => void, 
    onAction: () => void,
    tasks: Task[],
}> = ({ setView, onAction, tasks }) => {
    
    const tasksDueToday = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        return tasks.filter(t => !t.completed && t.dueDate && t.dueDate.startsWith(todayStr)).length;
    }, [tasks]);
    

    return (
        <div className="sidebar-widget-container space-y-2">
            <div className="sidebar-widget">
                <h4 className="sidebar-widget-header">Today's Snapshot</h4>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-primary)]">Tasks Due Today</span>
                    <span className="text-base font-bold text-[var(--primary-contrast-text)] bg-[var(--primary-translucent)] rounded-full w-7 h-7 flex items-center justify-center">{tasksDueToday}</span>
                </div>
            </div>

            <div className="sidebar-widget">
                 <h4 className="sidebar-widget-header">Quick Actions</h4>
                 <div className="flex gap-2">
                     <button className="quick-add-btn button-active" onClick={() => { setView('tasks'); onAction(); }}><span className="material-symbols-outlined text-sm mr-1">checklist</span> Task</button>
                     <button className="quick-add-btn button-active" onClick={() => { setView('notes'); onAction(); }}><span className="material-symbols-outlined text-sm mr-1">add</span> Note</button>
                     <button className="quick-add-btn button-active" onClick={() => { setView('timer'); onAction(); }}><span className="material-symbols-outlined text-sm mr-1">timer</span> Timer</button>
                 </div>
            </div>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ user, activeView, setView, toggleChat, isMobileOpen, closeMobileSidebar, handleSignOut, mode, setMode, tasks, goals, events }) => {
  const [isFocusSuiteOpen, setIsFocusSuiteOpen] = useState(false);
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(false);
  const [isAiAdvancedOpen, setIsAiAdvancedOpen] = useState(false);

  useEffect(() => {
    if (focusSuiteViews.includes(activeView)) setIsFocusSuiteOpen(true);
    if (aiToolsViews.includes(activeView)) setIsAiToolsOpen(true);
    if (aiAdvancedViews.includes(activeView)) setIsAiAdvancedOpen(true);
  }, [activeView]);

  const isFocusSuiteActive = focusSuiteViews.includes(activeView);
  const isAiToolsActive = aiToolsViews.includes(activeView);
  const isAiAdvancedActive = aiAdvancedViews.includes(activeView);

  const handleNavItemClick = () => {
    closeMobileSidebar();
  }
  
  const handleToggleChat = () => {
    toggleChat();
    closeMobileSidebar();
  }
  
  const handleSignOutClick = () => {
    handleSignOut();
    closeMobileSidebar();
  }

  return (
    <>
    <div 
      className={`fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={closeMobileSidebar}
    ></div>

    <aside className={`w-64 flex-shrink-0 liquid-glass p-4 flex flex-col rounded-r-3xl
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out 
        md:relative md:transform-none md:rounded-r-3xl md:animate-slide-in-left
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{backgroundColor: 'var(--sidebar-bg)'}}
    >
      <button data-tour-id="chat-toggle" onClick={handleToggleChat} className="flex-shrink-0 flex items-center mb-8 px-2 group transition-transform duration-300 ease-out hover:scale-105">
        <span className="material-symbols-outlined text-3xl text-[var(--primary-400)] text-glow transition-transform duration-300 group-hover:rotate-12">my_location</span>
        <h1 className="text-2xl font-bold ml-3 text-[var(--text-primary)]">FocusBase</h1>
      </button>

      <div className="flex-1 min-h-0 overflow-y-auto -mr-4 pr-4">
        <nav className="flex flex-col space-y-2">
          <NavItem icon="home" label="Dashboard" viewName="dashboard" activeView={activeView} setView={setView} onItemClick={handleNavItemClick}/>
          <NavItem icon="task_alt" label="Tasks" viewName="tasks" activeView={activeView} setView={setView} onItemClick={handleNavItemClick}/>
          <NavItem icon="travel_explore" label="Focus Search" viewName="focusSearch" activeView={activeView} setView={setView} onItemClick={handleNavItemClick}/>

          <div className="border-t border-[var(--glass-border)] my-3"></div>
           
          {/* AI Advanced Tools */}
          <div>
            <button onClick={() => setIsAiAdvancedOpen(!isAiAdvancedOpen)} className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold transition-all duration-300 ease-in-out group rounded-lg button-active nav-item-button ${isAiAdvancedActive ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text-active)] shadow-lg' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text-active)]'}`}>
              <div className="flex items-center">
                <span className="material-symbols-outlined mr-3 text-xl">stars</span>
                <span className="truncate">Focus.Ai Advanced</span>
              </div>
              <span className={`material-symbols-outlined transition-transform duration-300 ${isAiAdvancedOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            <div className="accordion-content" style={{ maxHeight: isAiAdvancedOpen ? '10rem' : '0' }}>
              <div className="py-2 pl-4 border-l-2 border-[var(--sidebar-text)]/20 space-y-2 mt-2">
                <NavItem icon="date_range" label="Study Routine AI" viewName="studyRoutineGenerator" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
                <NavItem icon="account_tree" label="Knowledge Graph" viewName="knowledgeGraph" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
              </div>
            </div>
          </div>

          {/* AI Tools */}
          <div>
            <button data-tour-id="ai-tools-accordion" onClick={() => setIsAiToolsOpen(!isAiToolsOpen)} className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold transition-all duration-300 ease-in-out group rounded-lg button-active nav-item-button ${isAiToolsActive ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text-active)] shadow-lg' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text-active)]'}`}>
              <div className="flex items-center">
                <span className="material-symbols-outlined mr-3 text-xl">auto_awesome</span>
                <span className="truncate">Focus.AI Tools</span>
              </div>
              <span className={`material-symbols-outlined transition-transform duration-300 ${isAiToolsOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            <div className="accordion-content" style={{ maxHeight: isAiToolsOpen ? '10rem' : '0' }}>
              <div className="py-2 pl-4 border-l-2 border-[var(--sidebar-text)]/20 space-y-2 mt-2">
                <NavItem icon="menu_book" label="Focus Studio" viewName="focusStudio" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
              </div>
            </div>
          </div>
          
          <div className="border-t border-[var(--glass-border)] my-3"></div>

          {/* Focus Suite */}
          <div>
            <button onClick={() => setIsFocusSuiteOpen(!isFocusSuiteOpen)} className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold transition-all duration-300 ease-in-out group rounded-lg button-active nav-item-button ${isFocusSuiteActive ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text-active)] shadow-lg' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text-active)]'}`}>
              <div className="flex items-center"> <span className="material-symbols-outlined mr-3 text-xl">school</span> <span className="truncate">Focus Suite</span> </div>
              <span className={`material-symbols-outlined transition-transform duration-300 ${isFocusSuiteOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            <div className="accordion-content" style={{ maxHeight: isFocusSuiteOpen ? '24rem' : '0' }}>
              <div className="py-2 pl-4 border-l-2 border-[var(--sidebar-text)]/20 space-y-2 mt-2">
                <NavItem icon="calendar_month" label="Calendar" viewName="calendar" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
                <NavItem icon="notifications" label="Reminders" viewName="reminders" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
                <NavItem icon="timer" label="Study Timer" viewName="timer" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
                <NavItem icon="note_stack" label="Notes" viewName="notes" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
                <NavItem icon="draw" label="Whiteboard" viewName="whiteboard" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
                <NavItem icon="flag" label="Goal Tracker" viewName="goalTracker" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
                <NavItem icon="videocam" label="FocusMeet" viewName="focusMeet" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
                <NavItem icon="self_improvement" label="Mindfulness Hub" viewName="mindfulnessHub" activeView={activeView} setView={setView} onItemClick={handleNavItemClick} />
              </div>
            </div>
          </div>
        </nav>
      </div>
      
      <div className="flex-shrink-0 mt-3">
        <SidebarWidgets 
          setView={setView} 
          onAction={handleNavItemClick} 
          tasks={tasks} 
        />
        <div className="flex flex-col space-y-2 mt-3">
          <div className="text-center text-xs text-[var(--text-secondary)] p-1 border-t border-[var(--glass-border)]">
            <p className="truncate">{user.email}</p>
          </div>
          <NavItem icon="logout" label="Sign Out" onItemClick={handleSignOutClick} isButton={true} />
          <NavItem icon="settings" label="Settings" viewName="settings" activeView={activeView} setView={setView} onItemClick={handleNavItemClick}/>
        </div>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;