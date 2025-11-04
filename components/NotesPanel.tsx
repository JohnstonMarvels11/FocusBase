

import React, { useState, useMemo, useEffect } from 'react';
import type { View, Toast, Note, AuthUser } from '../types';
import NoteCard from './NoteCard';
import NoteEditorModal from './NoteEditor';
import GoogleDocsPickerModal from './GoogleDocsPickerModal';
import ConfirmationDialog from './ConfirmationDialog';
import ShareModal from './ShareModal'; // New import for sharing
import { processNoteContentStream, NoteAction } from '../services/geminiService';

const stripHtml = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

interface NotesPanelProps {
  user: AuthUser;
  notes: Note[];
  updateNotes: (notes: Note[]) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  googleAccessToken: string | null;
  handleConnectGoogleAccount: () => void;
}

const NotesPanel: React.FC<NotesPanelProps> = ({ user, notes, updateNotes, addToast, googleAccessToken, handleConnectGoogleAccount }) => {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDocsPickerOpen, setIsDocsPickerOpen] = useState(false);
  const [noteToShare, setNoteToShare] = useState<Note | null>(null);

  const filteredNotes = useMemo(() =>
    notes.filter(n => {
      const search = searchTerm.toLowerCase();
      return n.title.toLowerCase().includes(search) ||
        stripHtml(n.content).toLowerCase().includes(search) ||
        n.tags.some(t => t.toLowerCase().includes(search));
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
  , [notes, searchTerm]);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      isPinned: false,
      color: 'default',
    };
    updateNotes([newNote, ...notes]);
    setEditingNote(newNote); // Open new note in editor immediately
  };
  
  const handleUpdateNote = (noteId: number, updates: Partial<Note>) => {
    const updatedNotes = notes.map(n =>
      n.id === noteId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    );
    updateNotes(updatedNotes);
  };

  const handleSaveAndCloseEditor = (noteId: number, updates: Partial<Note>) => {
    handleUpdateNote(noteId, updates);
    setEditingNote(null);
  };

  const confirmDeleteNote = () => {
    if (!noteToDelete) return;
    updateNotes(notes.filter(n => n.id !== noteToDelete.id));
    addToast({ message: "Note deleted.", type: 'info' });
    setNoteToDelete(null);
  };

  const handleImportNoteFromDoc = (doc: {id: string, title: string, content: string}) => {
    const newNote: Note = {
      id: Date.now(),
      title: doc.title,
      content: doc.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['gdoc', 'import'],
      isPinned: false,
      color: 'default',
      isGoogleDoc: true,
      googleDocId: doc.id,
    };
    updateNotes([newNote, ...notes]);
    setEditingNote(newNote); // Open imported note in editor
    addToast({ message: `Imported "${doc.title}"`, type: 'success' });
  };
  
  return (
    <>
      <GoogleDocsPickerModal
        isOpen={isDocsPickerOpen}
        onClose={() => setIsDocsPickerOpen(false)}
        onImport={handleImportNoteFromDoc}
        addToast={addToast}
        googleAccessToken={googleAccessToken}
        handleConnectGoogleAccount={handleConnectGoogleAccount}
      />
      <ShareModal
        isOpen={!!noteToShare}
        onClose={() => setNoteToShare(null)}
        note={noteToShare}
        user={user}
        addToast={addToast}
      />
      <ConfirmationDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message={`Are you sure you want to permanently delete "${noteToDelete?.title}"?`}
        confirmText="Delete"
      />
      {editingNote && (
        <NoteEditorModal
          note={editingNote}
          onSave={handleSaveAndCloseEditor}
          onClose={() => setEditingNote(null)}
          onUpdate={handleUpdateNote}
        />
      )}
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">My Notes</h2>
              <p className="text-sm text-slate-300">
                Capture your thoughts, ideas, and lecture summaries.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button onClick={handleCreateNote} className="flex-1 md:flex-none bg-[var(--primary-500)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--primary-600)] transition-colors button-active flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">add</span> New Note
              </button>
              <button onClick={() => setIsDocsPickerOpen(true)} className="bg-white/10 text-white font-bold w-10 h-10 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0 button-active" title="Import from Google Docs">
                <span className="material-symbols-outlined">folder_managed</span>
              </button>
            </div>
          </div>
          <div className="mt-6">
            <input
              type="search"
              placeholder="Search by title, content, or tag..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-3 rounded-lg border border-white/20 bg-black/30 text-lg focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)] transition"
            />
          </div>
        </header>

        {filteredNotes.length > 0 ? (
          <div className="note-grid max-w-7xl mx-auto">
            {filteredNotes.map((note, index) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={() => setEditingNote(note)}
                onDelete={() => setNoteToDelete(note)}
                onUpdate={(updates) => handleUpdateNote(note.id, updates)}
                onShare={() => setNoteToShare(note)}
                animationDelay={index * 50}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 pt-16">
            <span className="material-symbols-outlined text-5xl mb-4">menu_book</span>
            <h3 className="text-xl font-semibold text-white">No notes found</h3>
            <p>Create your first note or try a different search.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default NotesPanel;