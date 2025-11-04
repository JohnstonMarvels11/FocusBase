import React from 'react';
import type { Note } from '../types';

const noteColors: Record<string, { border: string; bg: string }> = {
  default: { border: 'border-slate-500/50', bg: 'bg-slate-500/5' },
  rose: { border: 'border-rose-500/50', bg: 'bg-rose-500/5' },
  amber: { border: 'border-amber-500/50', bg: 'bg-amber-500/5' },
  emerald: { border: 'border-emerald-500/50', bg: 'bg-emerald-500/5' },
  cyan: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/5' },
  violet: { border: 'border-violet-500/50', bg: 'bg-violet-500/5' },
};

interface NoteCardProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Note>) => void;
  onShare?: () => void;
  animationDelay: number;
  isActive?: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete, onUpdate, onShare, animationDelay, isActive }) => {
  const colorScheme = noteColors[note.color] || noteColors.default;

  return (
    <div
      className={`note-card liquid-glass-light glow-on-hover p-4 rounded-lg group relative cursor-pointer animate-grid-item-in border-l-4 ${colorScheme.border} ${note.isPinned ? 'aurora-border' : ''} ${isActive ? 'bg-white/10' : ''}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={onEdit}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-white pr-12 break-words">{note.title}</h4>
        {note.isPinned && <span className="material-symbols-outlined text-amber-400 absolute top-4 right-4 text-lg" title="Pinned">push_pin</span>}
      </div>
      
      <div 
        className="text-sm text-slate-300 max-h-48 overflow-hidden note-card-content"
        dangerouslySetInnerHTML={{ __html: note.content }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {note.tags.map(tag => (
          <span key={tag} className="text-xs bg-black/30 text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>
        ))}
         {note.isGoogleDoc && <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">folder_managed</span> Doc</span>}
      </div>

      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onShare && (
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="w-7 h-7 bg-black/40 rounded-full hover:bg-black/60 text-sky-400 button-active flex items-center justify-center"
            title="Share Note"
          >
            <span className="material-symbols-outlined text-base">share</span>
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onUpdate({ isPinned: !note.isPinned }); }}
          className="w-7 h-7 bg-black/40 rounded-full hover:bg-black/60 text-amber-400 button-active flex items-center justify-center"
          title={note.isPinned ? "Unpin" : "Pin"}
        >
          <span className="material-symbols-outlined text-base">push_pin</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-7 h-7 bg-black/40 rounded-full hover:bg-black/60 text-red-400 button-active flex items-center justify-center"
          title="Delete Note"
        >
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    </div>
  );
};

export default NoteCard;