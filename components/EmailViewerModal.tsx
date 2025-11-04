import React, { useState } from 'react';
import type { Email, Toast } from '../types';
import { LoadingIcon } from './icons/LoadingIcon';

interface EmailViewerModalProps {
  email: Email | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => Promise<void>;
  onCreateTask: (title: string) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const EmailViewerModal: React.FC<EmailViewerModalProps> = ({ email, isOpen, onClose, onMarkAsRead, onCreateTask, addToast }) => {
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  
  if (!isOpen || !email) return null;

  const handleCreateTask = () => {
    onCreateTask(email.subject);
    addToast({ message: 'Task created from email!', type: 'success' });
    onClose();
  };

  const handleMarkRead = async () => {
    setIsMarkingRead(true);
    await onMarkAsRead(email.id);
    setIsMarkingRead(false);
    onClose();
  };

  const openInGmail = () => {
    // Note: Gmail's URL structure uses the threadId in hex. This is a simplified approach.
    // A more robust method would require converting the decimal threadId to hex.
    window.open(`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="liquid-glass-advanced w-full max-w-3xl h-[85vh] rounded-2xl shadow-2xl m-4 flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
        <header className="p-4 flex justify-between items-start border-b border-[var(--glass-border)] flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{email.subject}</h2>
            <p className="text-sm text-slate-300 truncate">From: {email.from}</p>
            <p className="text-xs text-slate-400">{new Date(email.date).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors button-active flex-shrink-0 ml-4">
            <span className="material-symbols-outlined text-slate-300">close</span>
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: email.body }} />
        </div>

        <footer className="p-4 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--glass-border)] flex-shrink-0">
            <button onClick={handleCreateTask} className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors button-active flex items-center gap-2">
                <span className="material-symbols-outlined text-base">add</span>Create Task
            </button>
            <button onClick={openInGmail} className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors button-active flex items-center gap-2">
                <span className="material-symbols-outlined text-base">open_in_new</span>Open in Gmail
            </button>
            <button onClick={handleMarkRead} disabled={isMarkingRead} className="text-sm bg-[var(--primary-500)] text-white font-semibold px-4 py-1.5 rounded-md hover:bg-[var(--primary-600)] transition-colors button-active disabled:bg-[var(--primary-300)] w-36 text-center">
                {isMarkingRead ? <LoadingIcon className="w-4 h-4 mx-auto" /> : <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined text-base">check</span>Mark as Read</span>}
            </button>
        </footer>
      </div>
    </div>
  );
};

export default EmailViewerModal;