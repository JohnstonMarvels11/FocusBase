import React, { useState, useEffect, useRef } from 'react';
import type { Note } from '../types';

const noteColors = [
  { id: 'default', bg: 'bg-slate-500' },
  { id: 'rose', bg: 'bg-rose-500' },
  { id: 'amber', bg: 'bg-amber-500' },
  { id: 'emerald', bg: 'bg-emerald-500' },
  { id: 'cyan', bg: 'bg-cyan-500' },
  { id: 'violet', bg: 'bg-violet-500' },
];

interface NoteEditorModalProps {
    note: Note;
    onSave: (noteId: number, updates: Partial<Note>) => void;
    onClose: () => void;
    onUpdate: (noteId: number, updates: Partial<Note>) => void; // For instant updates like color
}

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({ note, onSave, onClose, onUpdate }) => {
    const [localTitle, setLocalTitle] = useState(note.title);
    const [localContent, setLocalContent] = useState(note.content);
    const [localColor, setLocalColor] = useState(note.color);
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // This effect ensures the content is set correctly when the modal opens
        if (editorRef.current) {
            editorRef.current.innerHTML = localContent;
        }
    }, [note.id]); // Only run when the note itself changes

    const handleSaveAndClose = () => {
        onSave(note.id, { title: localTitle, content: localContent, color: localColor });
    };

    const handleColorChange = (colorId: string) => {
        setLocalColor(colorId);
        // Instantly update the color on the main state so the grid reflects it
        onUpdate(note.id, { color: colorId });
    };
    
    return (
        <div className="note-editor-modal-overlay animate-fade-in" onClick={handleSaveAndClose}>
            <div
                className="liquid-glass-advanced w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl m-4 flex flex-col animate-pop-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-white/10">
                    <input
                        type="text"
                        value={localTitle}
                        onChange={(e) => setLocalTitle(e.target.value)}
                        placeholder="Note Title"
                        className="font-bold text-2xl bg-transparent w-full focus:outline-none text-white"
                        disabled={note.isGoogleDoc}
                    />
                </div>
                
                {note.isGoogleDoc && (
                    <div className="bg-sky-500/10 text-sky-300 text-sm p-3 mx-6 mt-4 rounded-md flex items-center gap-3">
                        <span className="material-symbols-outlined text-base">folder_managed</span>
                        This is a read-only note imported from Google Docs.
                        <a href={`https://docs.google.com/document/d/${note.googleDocId}`} target="_blank" rel="noopener noreferrer" className="ml-auto font-semibold hover:underline">Open in Docs</a>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6">
                    <div
                        ref={editorRef}
                        className="note-editor-content"
                        contentEditable={!note.isGoogleDoc}
                        suppressContentEditableWarning
                        onInput={(e) => setLocalContent(e.currentTarget.innerHTML)}
                    />
                </div>
                
                <div className="p-4 flex items-center justify-between border-t border-white/10">
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-slate-400">Color:</p>
                        {noteColors.map(color => (
                            <button
                                key={color.id}
                                onClick={() => handleColorChange(color.id)}
                                className={`w-6 h-6 rounded-full ${color.bg} hover:scale-110 transition-transform border-2 ${localColor === color.id ? 'border-white' : 'border-transparent'}`}
                                disabled={note.isGoogleDoc}
                            ></button>
                        ))}
                    </div>
                    <button
                        onClick={handleSaveAndClose}
                        className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] transition-colors button-active"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoteEditorModal;