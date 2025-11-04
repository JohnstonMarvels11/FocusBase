import React, { useState, useRef, useEffect } from 'react';
import { getChatResponseStream } from '../services/geminiService';
import type { ChatMessage, Toast, GroundingChunk, UserUsage, AuthUser } from '../types';
import { LoadingIcon } from './icons/LoadingIcon';
import ConfirmationDialog from './ConfirmationDialog';
import { STANDARD_USAGE_LIMIT } from './constants';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  user: AuthUser;
  usage: UserUsage;
  updateUsage: (category: 'standard' | 'advanced' | 'assistant') => void;
}

const initialMessage: ChatMessage = {
    role: 'model',
    parts: [{ text: "Hello! I'm Focus.Ai. How can I help you be more productive today?" }],
};

const SuggestionChip: React.FC<{ text: string, onClick: () => void, delay: number }> = ({ text, onClick, delay }) => (
    <button
        onClick={onClick}
        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm text-slate-200 animate-slide-in button-active"
        style={{ animationDelay: `${delay}ms` }}
    >
        {text}
    </button>
);

const ChatPanel: React.FC<ChatPanelProps> = ({ isOpen, onClose, addToast, user, usage, updateUsage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [useGrounding, setUseGrounding] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (messageText: string = input) => {
    if (messageText.trim() === '' || isLoading) return;

    if (user.email !== 'kulkarniarnav734@gmail.com') {
      const assistantUsesLeft = STANDARD_USAGE_LIMIT - (usage.assistant?.count || 0);
      if (assistantUsesLeft <= 0) {
          addToast({ message: 'Daily limit for Focus.Ai Assistant reached.', type: 'error'});
          return;
      }
    }

    const currentHistory = [...messages];
    const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: messageText }] };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      setMessages((prev) => [...prev, { role: 'model', parts: [{ text: '' }], groundingChunks: [] }]);

      const stream = getChatResponseStream(currentHistory, messageText, useGrounding);
      
      let fullResponse = "";
      let allGroundingChunks: GroundingChunk[] = [];

      for await (const chunk of stream) {
          if (chunk.text) {
              fullResponse += chunk.text;
          }
           if (chunk.groundingChunks) {
              allGroundingChunks.push(...chunk.groundingChunks);
          }

          setMessages((prev) => {
              const updatedMessages = [...prev];
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              if (lastMessage && lastMessage.role === 'model') {
                  lastMessage.parts[0].text = fullResponse;
                  
                  // Deduplicate grounding chunks based on URI
                  const uniqueUris = new Set<string>();
                  lastMessage.groundingChunks = allGroundingChunks.filter(c => {
                      if (!c.web?.uri || uniqueUris.has(c.web.uri)) {
                          return false;
                      }
                      uniqueUris.add(c.web.uri);
                      return true;
                  });
              }
              return updatedMessages;
          });
      }
      updateUsage('assistant');
    } catch (e: any) {
        const errorMessageText = e.message || 'An unexpected error occurred.';
        setError(errorMessageText);
        setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'model' && lastMessage.parts[0].text === '') {
                const updatedMessages = [...prev];
                updatedMessages[updatedMessages.length - 1].parts[0].text = "Sorry, I encountered an error. Please try again.";
                return updatedMessages;
            }
            return [...prev, { role: 'model', parts: [{ text: "Sorry, I encountered an error. Please try again." }] }];
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSend(suggestion);
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleClearChat = () => {
    setMessages([initialMessage]);
    setError(null);
    setShowSuggestions(true);
    setIsClearConfirmOpen(false);
    addToast({ message: 'Conversation cleared', type: 'info' });
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ message: 'Copied to clipboard!', type: 'success' });
  }

  const suggestions = [
      "Explain quantum computing simply",
      "Summarize the plot of Hamlet",
      "Give me 5 tips for staying focused",
      "Draft an email to my professor"
  ];

  if (!isOpen) return null;

  return (
    <>
      <ConfirmationDialog 
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleClearChat}
        title="Clear Conversation"
        message="Are you sure you want to delete this entire conversation?"
      />
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-40 animate-fade-in" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl h-[85vh] max-h-[700px] z-50 animate-scale-up chat-panel-container">
        <div className="w-full h-full liquid-glass-advanced chat-panel-glass-bg rounded-3xl flex flex-col p-4 md:p-6 shadow-2xl chat-panel-content">
            <header className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--primary-translucent)] flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-white text-lg">my_location</span>
                </div>
                <h2 className="text-xl font-bold text-white">Focus.Ai</h2>
                 <button onClick={() => setIsClearConfirmOpen(true)} className="text-xs text-slate-400 hover:text-white hover:underline transition-colors ml-2 button-active flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">delete_sweep</span> Clear
                 </button>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors button-active">
                <span className="material-symbols-outlined text-slate-300">close</span>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 md:pr-4 md:-mr-4 space-y-4">
            {messages.map((msg, index) => (
              <React.Fragment key={index}>
                <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''} animate-slide-in`}>
                  {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-[var(--primary-translucent)] flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-white text-lg">my_location</span></div>}
                  <div className={`max-w-xl p-4 rounded-2xl shadow-sm group relative ${msg.role === 'user' ? 'bg-[var(--primary-500)] text-white rounded-br-none' : 'liquid-glass-light rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
                    {msg.role === 'model' && index > 0 && (
                      <button onClick={() => handleCopyToClipboard(msg.parts[0].text)} className="absolute -top-2 -right-2 w-7 h-7 bg-black/40 rounded-full flex items-center justify-center text-slate-300 hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity button-active" aria-label="Copy text">
                          <span className="material-symbols-outlined text-base">content_copy</span>
                      </button>
                    )}
                  </div>
                </div>
                {msg.groundingChunks && msg.groundingChunks.length > 0 && msg.role === 'model' && (
                    <div className="ml-11 mt-2 space-y-2 max-w-xl animate-slide-in">
                        <h4 className="text-xs font-bold text-slate-400">Sources from the web:</h4>
                        {msg.groundingChunks.map((chunk, chunkIndex) => chunk.web && (
                            <a 
                                key={chunkIndex}
                                href={chunk.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block liquid-glass-light p-2 rounded-lg hover:bg-white/10 text-xs text-slate-300 truncate transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm mr-2 text-slate-400">public</span>{chunk.web.title || chunk.web.uri}
                            </a>
                        ))}
                    </div>
                )}
              </React.Fragment>
            ))}
            {isLoading && messages[messages.length-1]?.parts[0].text === '' && (
                <div className="flex items-start gap-3 animate-slide-in">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary-translucent)] flex items-center justify-center flex-shrink-0 thinking-indicator"><span className="material-symbols-outlined text-white text-lg">my_location</span></div>
                    <div className="max-w-xl p-4 rounded-2xl shadow-sm liquid-glass-light flex items-center">
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-pulse delay-0"></span>
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-pulse delay-200 mx-1.5"></span>
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-pulse delay-400"></span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          {showSuggestions && (
            <div className="pt-4 mt-auto flex-shrink-0">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {suggestions.map((s, i) => (
                         <SuggestionChip key={i} text={s} onClick={() => handleSuggestionClick(s)} delay={i * 100} />
                    ))}
                </div>
            </div>
          )}

          <div className="mt-6 flex-shrink-0">
            {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}
            <div className="flex items-center liquid-glass-light rounded-xl shadow-md p-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-2 text-slate-200 placeholder-slate-400"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="ml-2 w-10 h-10 rounded-full bg-[var(--primary-500)] text-white flex items-center justify-center hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] disabled:cursor-not-allowed transition-colors button-active"
              >
                {isLoading ? <LoadingIcon /> : <span className="material-symbols-outlined">send</span>}
              </button>
            </div>
             <div className="flex items-center gap-2 mt-2.5 px-2">
                <input 
                    type="checkbox" 
                    id="web-search-toggle" 
                    checked={useGrounding} 
                    onChange={(e) => setUseGrounding(e.target.checked)} 
                    className="w-4 h-4 rounded text-[var(--primary-500)] bg-transparent border-slate-500 focus:ring-[var(--primary-500)] focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="web-search-toggle" className="text-xs text-slate-400 cursor-pointer select-none">
                    Search the web for up-to-date info
                </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatPanel;