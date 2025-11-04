import React from 'react';
import type { View } from '../types';

interface BackToSuiteHeaderProps {
  title: string;
  description: string;
  setView: (view: View) => void;
}

const BackToSuiteHeader: React.FC<BackToSuiteHeaderProps> = ({ title, description, setView }) => {
  return (
    <header className="mb-8">
      <button 
        onClick={() => setView('focusSuite')} 
        className="text-sm text-[var(--primary-400)] hover:underline mb-2 flex items-center gap-2 transition-colors hover:text-[var(--primary-300)]"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Focus Suite
      </button>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="text-sm text-slate-300">{description}</p>
    </header>
  );
};

export default BackToSuiteHeader;