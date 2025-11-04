import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import ChatPanel from './components/ChatPanel';
import TasksPanel from './components/TasksPanel';
import SettingsPanel from './components/SettingsPanel';
import FocusSuitePanel from './components/FocusSuitePanel';
import CalendarPanel from './components/CalendarPanel';
import RemindersPanel from './components/RemindersPanel';
import TimerPanel from './components/TimerPanel';
import NotesPanel from './components/NotesPanel';
import FocusSearchPanel from './components/GoogleSearchPanel';
import WhiteboardPanel from './components/WhiteboardPanel';
import GoalTrackerPanel from './components/GoalTrackerPanel';
import MobileHeader from './components/MobileHeader';
import FocusStudioPanel from './components/StudyStudioPanel';
import StudyRoutinePanel from './components/StudyRoutinePanel';
import KnowledgeGraphPanel from './components/KnowledgeGraphPanel';
import MindfulnessHubPanel from './components/MindfulnessHubPanel';
import FocusMeetPanel from './components/FocusMeetPanel';
import ToastContainer from './components/ToastContainer';
import AuthPanel from './components/AuthPanel';
import LoadingScreen from './components/LoadingScreen';
import SharedItemViewer from './components/SharedItemViewer';
import InteractiveGuide from './components/InteractiveGuide';
import PersonalizationModal from './components/PersonalizationModal'; // Import the new component
import { signOutUser, getUserData, updateUserData, resetUserData, onAuthStateChangedListener, signInWithGoogle, updateUserProfile, GoogleAuthProvider } from './services/firebase';
import type { View, Toast as ToastType, AuthUser, Task, Goal, CalEvent, Note, Reminder, UserData, CustomTheme, UserUsage, StudySet, Whiteboard } from './types';
import { sanitizeUserData } from './services/dataSanitizer';
import { initDB } from './services/fileCache';


export type Theme = 'slate' | 'violet' | 'rose' | 'emerald' | 'solaris-gold' | 'sakura' | 'crimson-flare' | 'cyberpunk-neon' | 'terran-earth';
export type Mode = 'light' | 'dark';

const getTodayDateString = () => new Date().toISOString().split('T')[0];
const CREATOR_EMAIL = 'kulkarniarnav734@gmail.com';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [view, setView] = useState<View>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [showInteractiveGuide, setShowInteractiveGuide] = useState(false);
  const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
  
  const [theme, setTheme] = useState<string>(() => {
      try { return localStorage.getItem('focusbase_theme') || 'slate'; } 
      catch { return 'slate'; }
  });
  
  const [mode, setMode] = useState<Mode>(() => {
      try { return (localStorage.getItem('focusbase_mode') as Mode) || 'dark'; }
      catch { return 'dark'; }
  });

  // Centralized state for all user data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [usage, setUsage] = useState<UserUsage>({ 
    advanced: { count: 0, lastReset: getTodayDateString() }, 
    standard: { count: 0, lastReset: getTodayDateString() },
    assistant: { count: 0, lastReset: getTodayDateString() } 
  });
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  
  // State for viewing shared items
  const [sharedItemId, setSharedItemId] = useState<string | null>(null);

  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    try { return localStorage.getItem('google_access_token'); } catch { return null; }
  });

  const addToast = useCallback((toast: Omit<ToastType, 'id'>) => {
    setToasts(prev => [...prev, { ...toast, id: Date.now() }]);
  }, []);

  useEffect(() => {
    // Initialize IndexedDB on app load
    initDB().catch(err => {
        console.error("Failed to initialize file cache DB", err);
        addToast({ message: err.message || "Offline material storage failed to initialize.", type: 'error' });
    });

    // Check for a shared item ID in the URL on initial load
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('shareId');
    if (shareId) {
        setSharedItemId(shareId);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [addToast]);

  const checkAndResetUsage = useCallback(async (loadedUsage: UserUsage, userId: string): Promise<UserUsage> => {
    const today = getTodayDateString();
    let needsUpdate = false;
    const newUsage = JSON.parse(JSON.stringify(loadedUsage)); 

    if (newUsage.advanced.lastReset !== today) {
        newUsage.advanced.count = 0;
        newUsage.advanced.lastReset = today;
        needsUpdate = true;
    }
    if (newUsage.standard.lastReset !== today) {
        newUsage.standard.count = 0;
        newUsage.standard.lastReset = today;
        needsUpdate = true;
    }
    if (newUsage.assistant.lastReset !== today) {
        newUsage.assistant.count = 0;
        newUsage.assistant.lastReset = today;
        needsUpdate = true;
    }

    if (needsUpdate) {
        await updateUserData(userId, { usage: newUsage });
        addToast({ message: 'Your daily AI usage limits have been reset.', type: 'info' });
    }
    return newUsage;
  }, [addToast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const tourCompleted = localStorage.getItem('focusbase_tour_v1_completed');
        if (!tourCompleted) {
          // If the tour hasn't been completed, check if they need to set a name first.
          if (!currentUser.displayName) {
            setShowPersonalizationModal(true);
          } else {
            setShowInteractiveGuide(true);
          }
        }

        setDataLoading(true);
        try {
            const rawData = await getUserData(currentUser.uid);
            const data = sanitizeUserData(rawData);
            
            const finalUsage = await checkAndResetUsage(data.usage, currentUser.uid);

            setTasks(data.tasks);
            setGoals(data.goals);
            setEvents(data.events);
            setNotes(data.notes);
            setReminders(data.reminders);
            setWhiteboards(data.whiteboards);
            setUsage(finalUsage);
            setCustomThemes(data.customThemes || []);
            setStudySets(data.studySets || []);
        } catch (e) {
            console.error("Failed to load user data", e);
            addToast({ message: 'Could not load your data from the cloud.', type: 'error' });
        } finally {
            setDataLoading(false);
        }
      } else {
        setTasks([]); setGoals([]); setEvents([]); setNotes([]); setReminders([]); setWhiteboards([]);
        setUsage({ advanced: { count: 0, lastReset: getTodayDateString() }, standard: { count: 0, lastReset: getTodayDateString() }, assistant: { count: 0, lastReset: getTodayDateString() } });
        setCustomThemes([]);
        setStudySets([]);
        localStorage.removeItem('google_access_token');
        setGoogleAccessToken(null);
        setDataLoading(false);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, [checkAndResetUsage, addToast]);

  useEffect(() => {
    const root = document.documentElement;
    const isPresetTheme = (themeName: string): themeName is Theme => {
        return ['slate', 'violet', 'rose', 'emerald', 'solaris-gold', 'sakura', 'crimson-flare', 'cyberpunk-neon', 'terran-earth'].includes(themeName);
    }
    
    root.className = '';
    root.style.cssText = ''; 

    root.classList.add(`mode-${mode}`);
    root.style.colorScheme = mode;

    if (isPresetTheme(theme)) {
        root.classList.add(`theme-${theme}`);
    } else {
        const customTheme = customThemes.find(t => t.id === theme);
        if (customTheme) {
            const { colors } = customTheme;
            root.style.setProperty('--primary-500', colors.primary);
            root.style.setProperty('--glow-color', colors.glow);
            root.style.setProperty('--sidebar-bg', colors.sidebarBg);
            root.style.setProperty('--bg-gradient-start', colors.bgGradientStart);
            root.style.setProperty('--bg-gradient-end', colors.bgGradientEnd);
        } else {
            root.classList.add('theme-slate'); 
        }
    }

    try {
        localStorage.setItem('focusbase_theme', theme);
        localStorage.setItem('focusbase_mode', mode);
    } catch (e) {
        console.error("Failed to save theme/mode to localStorage", e);
    }
  }, [theme, mode, customThemes]);
  
  const updateFirebaseData = useCallback(async (data: Partial<UserData>) => {
    if (!user) return;
    try {
        await updateUserData(user.uid, data);
    } catch (e) {
        console.error("Failed to save data", e);
        addToast({ message: "Failed to save changes to the cloud.", type: 'error'});
    }
  }, [user, addToast]);

  const handleUpdateTasks = (newTasks: Task[]) => { setTasks(newTasks); updateFirebaseData({ tasks: newTasks }); };
  const handleUpdateGoals = (newGoals: Goal[]) => { setGoals(newGoals); updateFirebaseData({ goals: newGoals }); };
  const handleUpdateEvents = (newEvents: CalEvent[]) => { setEvents(newEvents); updateFirebaseData({ events: newEvents }); };
  const handleUpdateNotes = (newNotes: Note[]) => { setNotes(newNotes); updateFirebaseData({ notes: newNotes }); };
  const handleUpdateReminders = (newReminders: Reminder[]) => { setReminders(newReminders); updateFirebaseData({ reminders: newReminders }); };
  const handleUpdateWhiteboards = (newWhiteboards: Whiteboard[]) => { setWhiteboards(newWhiteboards); updateFirebaseData({ whiteboards: newWhiteboards }); };
  const handleUpdateCustomThemes = (themes: CustomTheme[]) => { setCustomThemes(themes); updateFirebaseData({ customThemes: themes }); };
  const handleUpdateStudySets = (sets: StudySet[]) => { setStudySets(sets); updateFirebaseData({ studySets: sets }); };
  
  const handleUpdateUsage = useCallback((category: 'standard' | 'advanced' | 'assistant') => {
      if (user?.email === CREATOR_EMAIL) {
          addToast({ message: 'Creator account: Unlimited AI usage.', type: 'info' });
          return; // Bypass limit for the creator
      }
      const newUsage = JSON.parse(JSON.stringify(usage));
      newUsage[category].count += 1;
      setUsage(newUsage);
      updateFirebaseData({ usage: newUsage });
  }, [user, usage, addToast]);
  
  const handleAddSharedNote = (noteData: Omit<Note, 'id'>) => {
    const newNote: Note = {
      ...noteData,
      id: Date.now(),
    };
    handleUpdateNotes([newNote, ...notes]);
    addToast({ message: 'Note added to your collection!', type: 'success' });
    setView('notes');
  };


  const handleClearData = async () => {
    if (!user) return;
    setTasks([]); setGoals([]); setEvents([]); setNotes([]); setReminders([]); setWhiteboards([]); setStudySets([]);
    setUsage({ advanced: { count: 0, lastReset: getTodayDateString() }, standard: { count: 0, lastReset: getTodayDateString() }, assistant: { count: 0, lastReset: getTodayDateString() } });
    setCustomThemes([]);
    await resetUserData(user.uid);
    addToast({ message: 'All cloud data has been cleared.', type: 'info' });
  };

  const handleConnectGoogleAccount = async () => {
    try {
        const result = await signInWithGoogle();
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        if (token) {
            localStorage.setItem('google_access_token', token);
            setGoogleAccessToken(token);
            addToast({ message: 'Google Account connected!', type: 'success' });
        } else {
            throw new Error("Could not get access token.");
        }
    } catch (e: any) {
        localStorage.removeItem('google_access_token');
        setGoogleAccessToken(null);
        addToast({ message: `Connection failed: ${e.message}`, type: 'error' });
    }
  };

  const handleDisconnectGoogleAccount = () => {
    localStorage.removeItem('google_access_token');
    setGoogleAccessToken(null);
    addToast({ message: 'Google Account has been disconnected.', type: 'info' });
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      addToast({ message: "You've been signed out.", type: 'info' });
    } catch (error) {
      addToast({ message: "Failed to sign out.", type: 'error' });
    }
  };

  const handleSaveName = async (name: string) => {
    if (!user) return;
    try {
        await updateUserProfile({ displayName: name });
        setUser(prev => prev ? { ...prev, displayName: name } : null);
        addToast({ message: `Welcome, ${name}!`, type: 'success' });
        setShowPersonalizationModal(false);
        // Now that the name is saved, show the tour if it hasn't been completed.
        const tourCompleted = localStorage.getItem('focusbase_tour_v1_completed');
        if (!tourCompleted) {
          setShowInteractiveGuide(true);
        }
    } catch (e: any) {
        addToast({ message: 'Could not save your name.', type: 'error' });
    }
  };


  const renderView = useCallback(() => {
    const commonGoogleProps = { googleAccessToken, handleConnectGoogleAccount };
    const commonUsageProps = { user, usage, updateUsage: handleUpdateUsage };

    switch (view) {
      case 'dashboard':
        return <Dashboard user={user!} setView={setView} tasks={tasks} updateTasks={handleUpdateTasks} addToast={addToast} goals={goals} events={events} notes={notes} {...commonGoogleProps} />;
      case 'tasks':
        return <TasksPanel tasks={tasks} updateTasks={handleUpdateTasks} addToast={addToast} {...commonGoogleProps} {...commonUsageProps} />;
      case 'focusSuite':
        return <FocusSuitePanel setView={setView} />;
      case 'calendar':
        return <CalendarPanel events={events} updateEvents={handleUpdateEvents} addToast={addToast} setView={setView} {...commonGoogleProps} />;
      case 'reminders':
        return <RemindersPanel reminders={reminders} updateReminders={handleUpdateReminders} setView={setView} addToast={addToast} />;
      case 'timer':
        return <TimerPanel setView={setView} />;
      case 'notes':
        return <NotesPanel notes={notes} updateNotes={handleUpdateNotes} addToast={addToast} user={user!} {...commonGoogleProps} />;
      case 'whiteboard':
        return <WhiteboardPanel whiteboards={whiteboards} updateWhiteboards={handleUpdateWhiteboards} setView={setView} addToast={addToast} />;
      case 'goalTracker':
        return <GoalTrackerPanel goals={goals} updateGoals={handleUpdateGoals} setView={setView} addToast={addToast} />;
      case 'focusStudio':
        return <FocusStudioPanel setView={setView} addToast={addToast} {...commonUsageProps} studySets={studySets} updateStudySets={handleUpdateStudySets} events={events} updateEvents={handleUpdateEvents} user={user!} />;
      case 'studyRoutineGenerator':
        return <StudyRoutinePanel setView={setView} addToast={addToast} {...commonUsageProps} />;
      case 'knowledgeGraph':
        return <KnowledgeGraphPanel notes={notes} setView={setView} addToast={addToast} {...commonUsageProps} />;
      case 'mindfulnessHub':
        return <MindfulnessHubPanel setView={setView} />;
      case 'focusMeet':
        return <FocusMeetPanel setView={setView} addToast={addToast} {...commonGoogleProps} />;
      case 'settings':
        return <SettingsPanel theme={theme} setTheme={setTheme} mode={mode} setMode={setMode} handleClearData={handleClearData} customThemes={customThemes} updateCustomThemes={handleUpdateCustomThemes} usage={usage} googleAccessToken={googleAccessToken} handleConnectGoogleAccount={handleConnectGoogleAccount} handleDisconnectGoogleAccount={handleDisconnectGoogleAccount} />;
      case 'focusSearch':
        return <FocusSearchPanel setView={setView} />;
      default:
        return <Dashboard user={user!} setView={setView} tasks={tasks} updateTasks={handleUpdateTasks} addToast={addToast} goals={goals} events={events} notes={notes} {...commonGoogleProps} />;
    }
  }, [view, theme, mode, tasks, goals, events, notes, reminders, whiteboards, usage, customThemes, studySets, user, googleAccessToken, addToast, handleConnectGoogleAccount, handleDisconnectGoogleAccount, handleUpdateCustomThemes, handleUpdateEvents, handleUpdateGoals, handleUpdateNotes, handleUpdateReminders, handleUpdateStudySets, handleUpdateTasks, handleUpdateUsage, handleUpdateWhiteboards]);

  if (authLoading || dataLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
       <>
         <ToastContainer toasts={toasts} setToasts={setToasts} />
         {sharedItemId && (
            <SharedItemViewer 
                shareId={sharedItemId} 
                onClose={() => setSharedItemId(null)}
                addToast={addToast}
                onAddToNotes={() => addToast({ message: 'Please sign in to add this note to your collection.', type: 'info' })}
            />
         )}
         <AuthPanel addToast={addToast} />
       </>
    );
  }

  return (
    <div className="flex h-screen">
      <ToastContainer toasts={toasts} setToasts={setToasts} />
      {showPersonalizationModal && user && (
        <PersonalizationModal
            isOpen={showPersonalizationModal}
            onSave={handleSaveName}
            user={user}
        />
      )}
      {showInteractiveGuide && (
        <InteractiveGuide 
            isOpen={showInteractiveGuide} 
            onClose={() => {
                setShowInteractiveGuide(false);
                try {
                    localStorage.setItem('focusbase_tour_v1_completed', 'true');
                } catch (e) {
                    console.error("Failed to save tour completion status to localStorage", e);
                }
            }} 
        />
      )}
      {sharedItemId && (
        <SharedItemViewer 
            shareId={sharedItemId} 
            onClose={() => setSharedItemId(null)}
            addToast={addToast}
            onAddToNotes={handleAddSharedNote}
        />
      )}
      <Sidebar 
        user={user}
        activeView={view} 
        setView={setView} 
        toggleChat={() => setIsChatOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        closeMobileSidebar={() => setIsMobileSidebarOpen(false)} 
        handleSignOut={handleSignOut}
        mode={mode}
        setMode={setMode}
        tasks={tasks}
        goals={goals}
        events={events}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader 
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          currentView={view}
        />
        <main key={view} className="flex-1 flex flex-col overflow-y-auto animate-main-content-enter">
            {renderView()}
        </main>
      </div>
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} addToast={addToast} user={user} usage={usage} updateUsage={handleUpdateUsage} />
    </div>
  );
};

export default App;