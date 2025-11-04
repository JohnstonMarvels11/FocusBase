import React, { useState, useEffect } from 'react';
import { getSharedItem } from '../services/firebase';
import type { SharedNote, Note, Toast } from '../types';
import { LoadingIcon } from './icons/LoadingIcon';

interface SharedItemViewerProps {
    shareId: string;
    onClose: () => void;
    onAddToNotes: (noteData: Omit<Note, 'id'>) => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
}

const SharedItemViewer: React.FC<SharedItemViewerProps> = ({ shareId, onClose, onAddToNotes, addToast }) => {
    const [item, setItem] = useState<SharedNote | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchItem = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const sharedItem = await getSharedItem(shareId);
                if (!sharedItem) {
                    throw new Error("This shared item could not be found or may have been deleted.");
                }
                setItem(sharedItem);
            } catch (e: any) {
                setError(e.message);
                addToast({ message: e.message, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchItem();
    }, [shareId, addToast]);

    const handleAddToNotes = () => {
        if (item?.type === 'note') {
            // FIX: Reconstruct the full note object (Omit<Note, 'id'>) by adding the missing isPinned property.
            onAddToNotes({ ...item.noteData, isPinned: false });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in" onClick={onClose}>
            <div className="liquid-glass-advanced w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl m-4 flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <LoadingIcon />
                        <p className="mt-2 text-slate-300">Loading shared item...</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                         <span className="material-symbols-outlined text-5xl text-red-400 mb-4">warning</span>
                        <h2 className="text-xl font-bold text-white mb-2">Error Loading Item</h2>
                        <p className="text-red-300">{error}</p>
                         <button onClick={onClose} className="mt-6 bg-white/10 text-white font-bold py-2 px-6 rounded-lg hover:bg-white/20 button-active">
                            Close
                        </button>
                    </div>
                ) : item?.type === 'note' ? (
                    <>
                        <header className="p-4 flex justify-between items-start border-b border-[var(--glass-border)] flex-shrink-0">
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-white truncate">{item.noteData.title}</h2>
                                <p className="text-xs text-slate-400">Shared by {item.ownerEmail}</p>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors button-active flex-shrink-0 ml-4">
                                <span className="material-symbols-outlined text-slate-300">close</span>
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.noteData.content }} />
                        </div>
                        <footer className="p-4 flex items-center justify-end gap-3 border-t border-[var(--glass-border)] flex-shrink-0">
                             <button onClick={handleAddToNotes} className="text-sm bg-[var(--primary-500)] text-white font-semibold px-4 py-1.5 rounded-md hover:bg-[var(--primary-600)] transition-colors button-active">
                                <span className="material-symbols-outlined text-base mr-2">add</span>Add to My Notes
                            </button>
                        </footer>
                    </>
                ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                        <h2 className="text-xl font-bold text-white">Unsupported Item</h2>
                        <p className="text-slate-300">This type of shared item is not recognized.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SharedItemViewer;