import React, { useState, useEffect } from 'react';
import type { CustomTheme } from '../types';

interface ThemeCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (theme: CustomTheme) => void;
    existingTheme: CustomTheme | null;
}

const MiniUIPreview: React.FC<{ colors: CustomTheme['colors'] }> = ({ colors }) => (
    <div className="mini-ui-preview rounded-md shadow-inner" style={{ background: `linear-gradient(160deg, ${colors.bgGradientStart}, ${colors.bgGradientEnd})` }}>
        <div className="mini-sidebar" style={{ backgroundColor: colors.sidebarBg }}>
            <div className="w-full h-2 rounded-sm" style={{ backgroundColor: colors.primary, opacity: 0.8 }}></div>
            <div className="w-3/4 h-1.5 rounded-sm mt-2" style={{ backgroundColor: '#fff', opacity: 0.3 }}></div>
            <div className="w-1/2 h-1.5 rounded-sm mt-1" style={{ backgroundColor: '#fff', opacity: 0.3 }}></div>
        </div>
        <div className="mini-main">
            <div className="w-1/2 h-3 rounded-sm" style={{ backgroundColor: colors.primary }}></div>
            <div className="w-full h-8 rounded-sm mt-2" style={{ backgroundColor: '#fff', opacity: 0.1 }}></div>
        </div>
    </div>
);

const ColorInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, value, onChange }) => (
    <div>
        <label className="text-sm text-slate-300 block mb-2">{label}</label>
        <div className="flex items-center gap-3 p-2 liquid-glass-inset rounded-lg">
            <div className="color-input-wrapper">
                 <input type="color" value={value} onChange={onChange} />
            </div>
            <input type="text" value={value} onChange={onChange} className="w-full bg-transparent text-white font-mono text-sm focus:outline-none" />
        </div>
    </div>
);

const ThemeCreatorModal: React.FC<ThemeCreatorModalProps> = ({ isOpen, onClose, onSave, existingTheme }) => {
    const [name, setName] = useState('');
    const [colors, setColors] = useState({
        primary: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.7)',
        sidebarBg: '#0f172a',
        bgGradientStart: '#020617',
        bgGradientEnd: '#1e3a8a',
    });

    useEffect(() => {
        if (existingTheme) {
            setName(existingTheme.name);
            setColors(existingTheme.colors);
        } else {
            // Reset to default when opening for a new theme
            setName('');
            setColors({
                primary: '#3b82f6',
                glow: 'rgba(59, 130, 246, 0.7)',
                sidebarBg: '#0f172a',
                bgGradientStart: '#020617',
                bgGradientEnd: '#1e3a8a',
            });
        }
    }, [existingTheme, isOpen]);

    const handleColorChange = (key: keyof typeof colors) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setColors(prev => ({ ...prev, [key]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
            id: existingTheme?.id || `custom_${Date.now()}`,
            name,
            colors,
        });
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <div className="theme-picker-modal animate-fade-in" onClick={onClose}>
            <div className="liquid-glass-advanced w-full max-w-4xl p-6 rounded-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-center text-white mb-6">{existingTheme ? 'Edit Theme' : 'Create a New Theme'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left side: Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-300 block mb-2">Theme Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="My Awesome Theme" required className="w-full p-3 rounded-lg liquid-glass-inset focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition" />
                        </div>
                        <ColorInput label="Primary Color" value={colors.primary} onChange={handleColorChange('primary')} />
                        <ColorInput label="Glow Color" value={colors.glow} onChange={handleColorChange('glow')} />
                        <ColorInput label="Sidebar Background" value={colors.sidebarBg} onChange={handleColorChange('sidebarBg')} />
                        <ColorInput label="Main Background Start" value={colors.bgGradientStart} onChange={handleColorChange('bgGradientStart')} />
                        <ColorInput label="Main Background End" value={colors.bgGradientEnd} onChange={handleColorChange('bgGradientEnd')} />
                    </div>

                    {/* Right side: Preview */}
                    <div>
                        <h3 className="text-lg font-semibold text-center text-white mb-4">Live Preview</h3>
                        <div className="p-4 liquid-glass-inset rounded-lg">
                            <MiniUIPreview colors={colors} />
                        </div>
                         <div className="flex justify-end gap-4 mt-8">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 button-active">Cancel</button>
                            <button type="submit" className="px-5 py-2.5 rounded-lg bg-[var(--primary-500)] text-white hover:bg-[var(--primary-600)] font-semibold button-active">Save Theme</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ThemeCreatorModal;