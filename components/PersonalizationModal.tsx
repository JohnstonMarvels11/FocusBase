import React, { useState } from 'react';
import type { AuthUser } from '../types';
import { LoadingIcon } from './icons/LoadingIcon';

interface PersonalizationModalProps {
  isOpen: boolean;
  onSave: (name: string) => Promise<void>;
  user: AuthUser;
}

const PersonalizationModal: React.FC<PersonalizationModalProps> = ({ isOpen, onSave, user }) => {
  const [name, setName] = useState(user.displayName || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;
    setIsLoading(true);
    await onSave(name.trim());
    setIsLoading(false);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[101] animate-fade-in">
      <div className="liquid-glass-advanced w-full max-w-md p-8 rounded-2xl animate-pop-in text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--primary-500)]/80 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-white">person_edit</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">One last step!</h2>
        <p className="text-slate-300 mb-8">Let's personalize your experience. What should we call you?</p>
        
        <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full p-4 rounded-lg text-lg text-center auth-form-input focus:outline-none"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full mt-6 bg-[var(--primary-500)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--primary-600)] button-active disabled:bg-[var(--primary-300)]"
            >
              {isLoading ? <LoadingIcon className="mx-auto"/> : "Let's Go!"}
            </button>
        </form>
      </div>
    </div>
  );
};

export default PersonalizationModal;