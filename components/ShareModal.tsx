

import React, { useState, useEffect } from 'react';
import { LoadingIcon } from './icons/LoadingIcon';
import type { Note, AuthUser, SharedNote, Toast } from '../types';
import { createSharedItem } from '../services/firebase';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    note: Note | null;
    user: AuthUser;
    addToast: (toast: Omit<Toast, 'id'>) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, note, user, addToast }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    useEffect(() => {
        // Reset state when modal is closed or note changes
        if (!isOpen) {
            setIsLoading(false);
            setShareUrl(null);
        }
    }, [isOpen]);

    if (!isOpen || !note) return null;

    const generateLink = async () => {
        setIsLoading(true);
        try {
            const { id, isPinned, ...noteData } = note;
            const sharedItem: SharedNote = {
                type: 'note',
                ownerEmail: user.email || 'A user',
                sharedAt: new Date().toISOString(),
                noteData: noteData,
            };
            const shareId = await createSharedItem(sharedItem);
            const url = `${window.location.origin}${window.location.pathname}?shareId=${shareId}`;
            setShareUrl(url);
            addToast({ message: 'Shareable link generated!', type: 'success' });
        } catch (e: any) {
            addToast({ message: `Failed to create share link: ${e.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!shareUrl) return;
        navigator.clipboard.writeText(shareUrl);
        addToast({ message: 'Link copied to clipboard!', type: 'success' });
    };

    const shareViaEmail = () => {
        if (!shareUrl) return;
        const subject = `Check out this note from FocusBase: "${note.title}"`;
        const body = `I wanted to share this note with you. You can view it using the link below:\n\n${shareUrl}`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="liquid-glass rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 animate-pop-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-2">Share Note</h2>
                <p className="text-slate-300 mb-6 truncate">Sharing a snapshot of: <span className="font-semibold text-white">{note.title}</span></p>

                {!shareUrl && (
                    <div className="text-center">
                        <p className="text-sm text-slate-400 mb-4">Generate a public link to share a read-only copy of this note. This snapshot will not be updated if you make further changes.</p>
                        <button onClick={generateLink} disabled={isLoading} className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] transition-colors button-active w-48 text-center">
                            {isLoading ? <LoadingIcon className="w-5 h-5 mx-auto" /> : 'Generate Link'}
                        </button>
                    </div>
                )}

                {shareUrl && (
                    <div className="space-y-4 animate-fade-in">
                        <p className="text-sm text-slate-400">Anyone with this link can view a copy of your note.</p>
                        <div className="flex items-center gap-2">
                            <input type="text" readOnly value={shareUrl} className="flex-1 p-2 rounded-lg liquid-glass-inset focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent font-mono text-xs"/>
                            <button onClick={copyToClipboard} className="bg-white/10 text-white font-bold w-10 h-10 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0 button-active" title="Copy Link">
                                <span className="material-symbols-outlined">content_copy</span>
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={shareViaEmail} className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors button-active">
                                <span className="material-symbols-outlined text-base mr-2">mail</span>Share via Email
                            </button>
                             <button onClick={onClose} className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors button-active">
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareModal;