import React, { useState, useEffect } from 'react';
import type { Theme, Mode } from '../App';
import type { CustomTheme, UserUsage } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import ThemeCreatorModal from './ThemeCreatorModal';
import { ADVANCED_USAGE_LIMIT, STANDARD_USAGE_LIMIT } from './constants';


interface SettingsPanelProps {
  theme: string;
  setTheme: (theme: string) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  handleClearData: () => void;
  customThemes: CustomTheme[];
  updateCustomThemes: (themes: CustomTheme[]) => void;
  usage: UserUsage;
  googleAccessToken: string | null;
  handleConnectGoogleAccount: () => void;
  handleDisconnectGoogleAccount: () => void;
}

const presetThemes: { 
    name: Theme; 
    title: string;
}[] = [
    { name: 'slate', title: 'Deep Ocean' },
    { name: 'violet', title: 'Cosmic Dusk' },
    { name: 'rose', title: 'Sunset Glow' },
    { name: 'emerald', title: 'Enchanted Forest' },
    { name: 'solaris-gold', title: 'Molten Gold' },
    { name: 'sakura', title: 'Sakura Blossom' },
    { name: 'crimson-flare', title: 'Crimson Flare'},
    { name: 'cyberpunk-neon', title: 'Cyberpunk Neon'},
    { name: 'terran-earth', title: 'Terran Earth'},
];


const SettingsPanel: React.FC<SettingsPanelProps> = ({ theme, setTheme, mode, setMode, handleClearData, customThemes, updateCustomThemes, usage, googleAccessToken, handleConnectGoogleAccount, handleDisconnectGoogleAccount }) => {
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);
  const [themeToDelete, setThemeToDelete] = useState<CustomTheme | null>(null);
  const [isGoogleDisconnectConfirmOpen, setIsGoogleDisconnectConfirmOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState<PermissionState>('prompt');

  useEffect(() => {
    // Location API is not available in this environment.
    // We'll keep the UI but disable the functionality.
    setLocationStatus('prompt');
  }, []);

  const handleRequestLocation = () => {
      // Geolocation is not supported in this environment.
      // navigator.geolocation.getCurrentPosition(
      //   () => { /* Success state is handled by the permission status listener */ },
      //   () => { /* Error state is handled by the permission status listener */ }
      // );
  };

  const confirmGoogleDisconnect = () => {
      handleDisconnectGoogleAccount();
      setIsGoogleDisconnectConfirmOpen(false);
  }

  const advancedUsesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;
  const standardUsesLeft = STANDARD_USAGE_LIMIT - usage.standard.count;
  const assistantUsesLeft = STANDARD_USAGE_LIMIT - (usage.assistant?.count || 0);

  const handleSaveTheme = (newTheme: CustomTheme) => {
    const existingIndex = customThemes.findIndex(t => t.id === newTheme.id);
    if (existingIndex > -1) {
        const updated = [...customThemes];
        updated[existingIndex] = newTheme;
        updateCustomThemes(updated);
    } else {
        updateCustomThemes([...customThemes, newTheme]);
    }
    setTheme(newTheme.id); // select the new theme
  };
  
  const handleOpenThemeCreator = (themeToEdit: CustomTheme | null = null) => {
    setEditingTheme(themeToEdit);
    setIsThemeModalOpen(true);
  }

  const handleDeleteTheme = () => {
    if (!themeToDelete) return;
    updateCustomThemes(customThemes.filter(t => t.id !== themeToDelete.id));
    if (theme === themeToDelete.id) {
        setTheme('slate'); // Fallback to default theme
    }
    setThemeToDelete(null);
  }

  const handleClearCloudData = () => {
    handleClearData();
    setIsClearConfirmOpen(false);
  };
  const handleFactoryReset = () => {
    localStorage.clear();
    handleClearData();
    setIsResetConfirmOpen(false);
    window.location.reload();
  };

  return (
    <>
        <ThemeCreatorModal 
            isOpen={isThemeModalOpen}
            onClose={() => setIsThemeModalOpen(false)}
            onSave={handleSaveTheme}
            existingTheme={editingTheme}
        />
        <ConfirmationDialog
            isOpen={!!themeToDelete}
            onClose={() => setThemeToDelete(null)}
            onConfirm={handleDeleteTheme}
            title="Delete Theme"
            message={`Are you sure you want to permanently delete the theme "${themeToDelete?.name}"?`}
            confirmText="Delete"
        />
        <ConfirmationDialog
            isOpen={isClearConfirmOpen}
            onClose={() => setIsClearConfirmOpen(false)}
            onConfirm={handleClearCloudData}
            title="Clear All Cloud Data"
            message="Are you sure? This will permanently delete all your tasks, reminders, notes, goals, and custom themes from your account. This action cannot be undone."
            confirmText="Clear Data"
        />
        <ConfirmationDialog
            isOpen={isResetConfirmOpen}
            onClose={() => setIsResetConfirmOpen(false)}
            onConfirm={handleFactoryReset}
            title="Factory Reset"
            message="Are you sure? This will delete ALL application data from your account and device, and restore initial settings. This action is irreversible."
            confirmText="Reset"
        />
         <ConfirmationDialog
            isOpen={isGoogleDisconnectConfirmOpen}
            onClose={() => setIsGoogleDisconnectConfirmOpen(false)}
            onConfirm={confirmGoogleDisconnect}
            title="Disconnect Google Account"
            message="Are you sure? This will disable syncing with Google services. You can reconnect at any time."
            confirmText="Disconnect"
        />

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-4xl mx-auto">
            <header className="mb-8">
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h2>
              <p className="text-sm text-[var(--text-secondary)]">FocusUI 1.0</p>
            </header>

            <div className="liquid-glass-advanced glow-on-hover p-6">
                {/* --- Appearance Section --- */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Appearance</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Personalize the look and feel of your workspace.
                        </p>
                    </div>
                    <div className="flex items-center p-1 rounded-full liquid-glass-inset">
                        <button onClick={() => setMode('light')} className={`px-3 py-1 text-sm rounded-full transition-colors flex items-center gap-1 ${mode === 'light' ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text-active)]' : 'text-[var(--text-secondary)]'}`}>
                           <span className="material-symbols-outlined text-base">light_mode</span> Light
                        </button>
                        <button onClick={() => setMode('dark')} className={`px-3 py-1 text-sm rounded-full transition-colors flex items-center gap-1 ${mode === 'dark' ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text-active)]' : 'text-[var(--text-secondary)]'}`}>
                           <span className="material-symbols-outlined text-base">dark_mode</span> Dark
                        </button>
                    </div>
                </div>

                {/* --- Preset Themes --- */}
                <h4 className="font-semibold text-white mb-3">Preset Themes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {presetThemes.map(t => (
                         <div 
                          key={t.name} 
                          onClick={() => setTheme(t.name)} 
                          className={`theme-preview-card liquid-glass-light glow-on-hover p-3 rounded-xl cursor-pointer transition-all duration-300 ${theme === t.name ? 'active' : ''}`}
                        >
                          <h4 className="font-bold text-[var(--text-primary)] mb-3 text-center text-md">{t.title}</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Light Mode Preview */}
                            <div>
                              <p className="text-xs text-center font-semibold text-slate-300 mb-1.5">Light</p>
                              <div className={`theme-${t.name} mode-light`}>
                                <div className="mini-ui-preview rounded-md shadow-inner">
                                    <div className="mini-sidebar">
                                        <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: 'var(--primary-500)', opacity: 0.8 }}></div>
                                        <div className="w-3/4 h-1 rounded-sm mt-1.5" style={{ backgroundColor: 'var(--sidebar-text)', opacity: 0.3 }}></div>
                                        <div className="w-1/2 h-1 rounded-sm mt-1" style={{ backgroundColor: 'var(--sidebar-text)', opacity: 0.3 }}></div>
                                    </div>
                                    <div className="mini-main">
                                        <div className="w-1/2 h-2 rounded-sm" style={{ backgroundColor: 'var(--primary-500)' }}></div>
                                        <div className="w-full h-6 rounded-sm mt-1.5" style={{ backgroundColor: 'var(--text-primary)', opacity: 0.08 }}></div>
                                    </div>
                                </div>
                              </div>
                            </div>
                            {/* Dark Mode Preview */}
                            <div>
                              <p className="text-xs text-center font-semibold text-slate-300 mb-1.5">Dark</p>
                              <div className={`theme-${t.name} mode-dark`}>
                                <div className="mini-ui-preview rounded-md shadow-inner">
                                    <div className="mini-sidebar">
                                        <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: 'var(--primary-500)', opacity: 0.8 }}></div>
                                        <div className="w-3/4 h-1 rounded-sm mt-1.5" style={{ backgroundColor: 'var(--sidebar-text)', opacity: 0.3 }}></div>
                                        <div className="w-1/2 h-1 rounded-sm mt-1" style={{ backgroundColor: 'var(--sidebar-text)', opacity: 0.3 }}></div>
                                    </div>
                                    <div className="mini-main">
                                        <div className="w-1/2 h-2 rounded-sm" style={{ backgroundColor: 'var(--primary-500)' }}></div>
                                        <div className="w-full h-6 rounded-sm mt-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                                    </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    ))}
                </div>

                 {/* --- Custom Themes --- */}
                 <h4 className="font-semibold text-white mb-3 mt-8">Your Themes</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customThemes.map(t => (
                        <div 
                          key={t.id} 
                          onClick={() => setTheme(t.id)} 
                          className={`theme-preview-card liquid-glass-light glow-on-hover p-3 rounded-xl cursor-pointer transition-all duration-300 group relative ${theme === t.id ? 'active' : ''}`}
                        >
                          <h4 className="font-bold text-[var(--text-primary)] mb-3 text-center text-md">{t.name}</h4>
                           <div className="grid grid-cols-2 gap-3">
                            {/* Light Mode Preview */}
                            <div>
                              <p className="text-xs text-center font-semibold text-slate-300 mb-1.5">Light</p>
                              <div className="mode-light" style={{ '--primary-500': t.colors.primary } as React.CSSProperties}>
                                <div className="mini-ui-preview rounded-md shadow-inner">
                                    <div className="mini-sidebar">
                                        <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: 'var(--primary-500)', opacity: 0.8 }}></div>
                                        <div className="w-3/4 h-1 rounded-sm mt-1.5" style={{ backgroundColor: 'var(--sidebar-text)', opacity: 0.3 }}></div>
                                        <div className="w-1/2 h-1 rounded-sm mt-1" style={{ backgroundColor: 'var(--sidebar-text)', opacity: 0.3 }}></div>
                                    </div>
                                    <div className="mini-main">
                                        <div className="w-1/2 h-2 rounded-sm" style={{ backgroundColor: 'var(--primary-500)' }}></div>
                                        <div className="w-full h-6 rounded-sm mt-1.5" style={{ backgroundColor: 'var(--text-primary)', opacity: 0.08 }}></div>
                                    </div>
                                </div>
                              </div>
                            </div>
                            {/* Dark Mode Preview */}
                            <div>
                              <p className="text-xs text-center font-semibold text-slate-300 mb-1.5">Dark</p>
                              <div className="mode-dark" style={{
                                  '--primary-500': t.colors.primary,
                                  '--glow-color': t.colors.glow,
                                  '--sidebar-bg': t.colors.sidebarBg,
                                  '--bg-gradient-start': t.colors.bgGradientStart,
                                  '--bg-gradient-end': t.colors.bgGradientEnd,
                              } as React.CSSProperties}>
                                <div className="mini-ui-preview rounded-md shadow-inner">
                                    <div className="mini-sidebar">
                                        <div className="w-full h-1.5 rounded-sm" style={{ backgroundColor: 'var(--primary-500)', opacity: 0.8 }}></div>
                                        <div className="w-3/4 h-1 rounded-sm mt-1.5" style={{ backgroundColor: 'var(--sidebar-text)', opacity: 0.3 }}></div>
                                        <div className="w-1/2 h-1 rounded-sm mt-1" style={{ backgroundColor: 'var(--sidebar-text)', opacity: 0.3 }}></div>
                                    </div>
                                    <div className="mini-main">
                                        <div className="w-1/2 h-2 rounded-sm" style={{ backgroundColor: 'var(--primary-500)' }}></div>
                                        <div className="w-full h-6 rounded-sm mt-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                                    </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleOpenThemeCreator(t); }} className="w-7 h-7 bg-black/30 rounded-full hover:bg-black/50 flex items-center justify-center"><span className="material-symbols-outlined text-sm">edit</span></button>
                            <button onClick={(e) => { e.stopPropagation(); setThemeToDelete(t); }} className="w-7 h-7 bg-black/30 rounded-full hover:bg-black/50 text-red-400 flex items-center justify-center"><span className="material-symbols-outlined text-sm">delete</span></button>
                          </div>
                        </div>
                    ))}
                    <div onClick={() => handleOpenThemeCreator()} className="liquid-glass-light p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 border-dashed border-slate-600 hover:border-[var(--primary-400)] hover:text-[var(--primary-400)] flex flex-col items-center justify-center text-center text-slate-400 min-h-[160px]">
                        <span className="material-symbols-outlined text-3xl mb-2">add</span>
                        <h4 className="font-bold">Create New Theme</h4>
                    </div>
                </div>

                {/* --- Integrations & Permissions Section --- */}
                <div className="mt-8 border-t border-[var(--glass-border)] pt-6">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Integrations & Permissions</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Connect services and manage permissions for app features.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="liquid-glass-light p-4 rounded-lg">
                           <div className="flex items-center gap-3 mb-3">
                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path><path d="M1 1h22v22H1z" fill="none"></path></svg>
                                <h4 className="font-semibold text-white">Google Account</h4>
                            </div>
                            <p className="text-xs text-slate-300 mb-4 min-h-[32px]">
                                {googleAccessToken 
                                    ? 'Connected. Syncing with Calendar, Tasks, and Drive.' 
                                    : 'Connect to sync your tasks, calendar events, and import from Google Docs.'}
                            </p>
                            {googleAccessToken ? (
                                <button onClick={() => setIsGoogleDisconnectConfirmOpen(true)} className="text-sm bg-red-600/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-600/40 hover:text-red-300 transition-colors button-active w-full">
                                    Disconnect
                                </button>
                            ) : (
                                <button onClick={handleConnectGoogleAccount} className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors button-active w-full flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path><path d="M1 1h22v22H1z" fill="none"></path></svg>
                                    Connect
                                </button>
                            )}
                        </div>
                        <div className="liquid-glass-light p-4 rounded-lg">
                             <div className="flex items-center gap-3 mb-3">
                                <span className="material-symbols-outlined text-2xl text-cyan-400">location_on</span>
                                <h4 className="font-semibold text-white">Location Services</h4>
                            </div>
                            <p className="text-xs text-slate-300 mb-4 min-h-[32px]">
                                Used for the weather widget on the dashboard.
                                Current status: <span className={`font-semibold capitalize ${
                                    locationStatus === 'granted' ? 'text-green-400' :
                                    locationStatus === 'denied' ? 'text-red-400' : 'text-amber-400'
                                }`}>{locationStatus}</span>
                            </p>
                             <button 
                                onClick={handleRequestLocation} 
                                disabled={locationStatus === 'granted'}
                                className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors button-active w-full disabled:opacity-50 disabled:cursor-not-allowed">
                                {locationStatus === 'granted' ? 'Enabled' : 'Allow Location Access'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- AI Usage Section --- */}
                <div className="mt-8 border-t border-[var(--glass-border)] pt-6">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">AI Usage</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Your daily usage limits for Gemini-powered features. Limits reset automatically.
                    </p>
                    <div className="liquid-glass-light p-4 rounded-lg space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-semibold text-white">Focus.AI Advanced (Pro)</span>
                                <span className="text-sm text-slate-300">{advancedUsesLeft} / {ADVANCED_USAGE_LIMIT} uses left</span>
                            </div>
                            <div className="w-full bg-black/30 rounded-full h-2">
                                <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full" style={{ width: `${(advancedUsesLeft / ADVANCED_USAGE_LIMIT) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-semibold text-white">Focus.AI Tools (Flash)</span>
                                <span className="text-sm text-slate-300">{standardUsesLeft} / {STANDARD_USAGE_LIMIT} uses left</span>
                            </div>
                            <div className="w-full bg-black/30 rounded-full h-2">
                                <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full" style={{ width: `${(standardUsesLeft / STANDARD_USAGE_LIMIT) * 100}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-semibold text-white">Focus.AI Assistant</span>
                                <span className="text-sm text-slate-300">{assistantUsesLeft} / {STANDARD_USAGE_LIMIT} uses left</span>
                            </div>
                            <div className="w-full bg-black/30 rounded-full h-2">
                                <div className="bg-gradient-to-r from-cyan-500 to-blue-400 h-2 rounded-full" style={{ width: `${(assistantUsesLeft / STANDARD_USAGE_LIMIT) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* --- Data Management --- */}
                 <div className="mt-8 border-t border-[var(--glass-border)] pt-6">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">Data Management</h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Manage your storage or reset the application here.
                    </p>
                    <div className="liquid-glass-light p-4 rounded-lg">
                         <div className="flex items-center justify-end gap-3">
                             <button 
                                onClick={() => setIsClearConfirmOpen(true)}
                                className="text-sm bg-amber-600/20 text-amber-400 px-3 py-1.5 rounded-md hover:bg-amber-600/40 hover:text-amber-300 transition-colors button-active"
                            >
                                Clear Cloud Data
                            </button>
                             <button 
                                onClick={() => setIsResetConfirmOpen(true)}
                                className="text-sm bg-red-600/20 text-red-400 px-3 py-1.5 rounded-md hover:bg-red-600/40 hover:text-red-300 transition-colors button-active"
                            >
                                Factory Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default SettingsPanel;