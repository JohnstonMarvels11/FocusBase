import React, { useState } from 'react';
import { getGoogleSearchResponse } from '../services/geminiService';
import { LoadingIcon } from './icons/LoadingIcon';
import type { View, GroundingChunk } from '../types';

interface FocusSearchPanelProps {
  setView: (view: View) => void;
}

const SuggestionChip: React.FC<{ text: string, onClick: () => void, delay: number }> = ({ text, onClick, delay }) => (
    <button
        onClick={onClick}
        className="px-4 py-2 rounded-full liquid-glass-light hover:bg-[var(--primary-translucent-hover)] hover:border-[var(--glass-border)] border border-transparent transition-all duration-300 text-sm text-slate-200 animate-slide-in button-active"
        style={{ animationDelay: `${delay}ms` }}
    >
        {text}
    </button>
);

const FocusSearchPanel: React.FC<FocusSearchPanelProps> = ({ setView }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ text: string; groundingChunks?: GroundingChunk[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent, suggestedQuery?: string) => {
    if (e) e.preventDefault();
    const currentQuery = suggestedQuery || query;

    if (!currentQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);
    if (!suggestedQuery) {
      setQuery(currentQuery);
    }

    try {
      const response = await getGoogleSearchResponse(currentQuery);
      setResult(response);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const suggestions = [
      "Latest AI breakthroughs",
      "Who won the Nobel Prize in Physics 2023?",
      "Current world population",
      "Benefits of spaced repetition",
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-white text-glow animate-text-reveal">Focus Search</h2>
          <p className="text-md text-slate-300 mt-2 animate-text-reveal" style={{ animationDelay: '150ms' }}>
            Harnessing the power of Google Search and Gemini for up-to-date, grounded answers.
          </p>
        </header>

        <form onSubmit={handleSearch} className="relative mb-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything..."
            className="w-full p-4 pl-12 rounded-full liquid-glass-inset text-lg focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent transition"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <button type="submit" disabled={isLoading || !query.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-[var(--primary-500)] text-white font-bold w-10 h-10 rounded-full hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] transition-colors flex items-center justify-center button-active">
            {isLoading ? <LoadingIcon className="w-5 h-5" /> : <span className="material-symbols-outlined">arrow_forward</span>}
          </button>
        </form>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        
        {result && (
          <div className="liquid-glass p-6 rounded-xl animate-fade-in">
            <p className="text-lg text-white mb-4">{result.text}</p>
            {result.groundingChunks && result.groundingChunks.length > 0 && (
              <div className="mt-4 border-t border-[var(--glass-border)] pt-4">
                <h4 className="text-sm font-bold text-slate-400 mb-2">Sources from the web:</h4>
                <div className="space-y-2">
                  {result.groundingChunks.map((chunk, i) => chunk.web && (
                    <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="block p-2 rounded-md liquid-glass-light hover:bg-white/10 transition-colors text-xs text-slate-300 truncate">
                      <span className="material-symbols-outlined text-sm mr-2 text-slate-400 align-middle">public</span>
                      {chunk.web.title || chunk.web.uri}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !isLoading && (
            <div className="text-center pt-8">
                <h4 className="text-lg font-semibold text-white mb-4">Or try one of these suggestions:</h4>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {suggestions.map((s, i) => (
                         <SuggestionChip key={i} text={s} onClick={() => { setQuery(s); handleSearch(undefined, s); }} delay={i * 100} />
                    ))}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default FocusSearchPanel;
