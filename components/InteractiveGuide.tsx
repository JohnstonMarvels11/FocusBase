

import React, { useState, useLayoutEffect } from 'react';

interface GuideStep {
  selector?: string;
  title: string;
  content: string;
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
  icon?: string;
}

const steps: GuideStep[] = [
  {
    icon: 'star',
    title: 'Welcome to FocusUI',
    content: "We've rebuilt the FocusBase experience from the ground up. Let's take a quick interactive tour of the new interface and features.",
    position: 'center',
  },
  {
    selector: '.focus-agenda-title',
    title: 'Your Dashboard',
    content: 'This is your mission control. See your tasks, recent notes, and get a snapshot of your day at a glance.',
    position: 'bottom',
  },
  {
    selector: '[data-view="tasks"]',
    title: 'The Task Matrix',
    content: 'Add, organize, and prioritize your tasks here. Use the AI Breakdown feature for complex projects!',
    position: 'right',
  },
  {
    selector: '[data-tour-id="ai-tools-accordion"]',
    title: 'Focus.AI Tools',
    content: 'Explore a suite of AI-powered tools like the Text Summarizer and Flashcard Generator. Keep an eye on your daily usage limits in Settings!',
    position: 'right',
  },
  {
    selector: '[data-tour-id="chat-toggle"]',
    title: 'Focus.AI Assistant',
    content: 'Click here anytime to chat with your AI assistant. Get answers, brainstorm ideas, or just get some help staying focused.',
    position: 'right',
  },
  {
    selector: '[data-view="settings"]',
    title: 'Personalize Your Space',
    content: "Customize themes, manage your data, and check your AI usage limits in the Settings panel.",
    position: 'top',
  },
  {
    title: 'Ready to Go!',
    content: "That's the basics. Explore the sidebar to discover all the tools. Now, go be productive!",
    position: 'center',
    icon: 'rocket_launch'
  },
];

interface InteractiveGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const InteractiveGuide: React.FC<InteractiveGuideProps> = ({ isOpen, onClose }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({ opacity: 0 });
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ opacity: 0 });
    
    const currentStep = steps[stepIndex];

    useLayoutEffect(() => {
        if (!isOpen) return;

        // Reset styles for transition
        setHighlightStyle(prev => ({ ...prev, opacity: 0 }));
        setTooltipStyle({ opacity: 0, transform: 'translate(-50%, -50%) scale(0.95)', top: '50%', left: '50%' });

        const targetSelector = currentStep.selector;

        // Delay to allow DOM to settle and for transitions
        setTimeout(() => {
            // Always center the tooltip modal
            setTooltipStyle({
                opacity: 1,
                transform: 'translate(-50%, -50%) scale(1)',
                top: '50%',
                left: '50%',
            });

            if (targetSelector) {
                const element = document.querySelector<HTMLElement>(targetSelector);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

                    // Wait for scroll to finish
                    setTimeout(() => {
                        const rect = element.getBoundingClientRect();
                        const padding = 10;
                        const elementStyle = window.getComputedStyle(element);
                        
                        setHighlightStyle({
                            width: `${rect.width + padding}px`,
                            height: `${rect.height + padding}px`,
                            top: `${rect.top - padding / 2}px`,
                            left: `${rect.left - padding / 2}px`,
                            opacity: 1,
                            borderRadius: elementStyle.borderRadius, // Match border radius
                        });
                    }, 300); 

                } else {
                    // Element not found, just show dark overlay
                    setHighlightStyle({ opacity: 1, width: 0, height: 0, top: '50%', left: '50%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)' });
                }
            } else {
                // No selector (center step), just show dark overlay
                setHighlightStyle({ opacity: 1, width: 0, height: 0, top: '50%', left: '50%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)' });
            }
        }, 150); 

    }, [stepIndex, isOpen, currentStep.selector]);


    if (!isOpen) return null;
    
    const handleNext = () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex(s => s + 1);
        } else {
            onClose();
        }
    };
    
    const handlePrev = () => {
        if (stepIndex > 0) {
            setStepIndex(s => s - 1);
        }
    };

    return (
        <>
            <div
                className="fixed z-[100] pointer-events-none interactive-guide-highlight"
                style={highlightStyle}
            />
            {/* Overlay and modal container. This handles centering. */}
            <div 
                className="fixed inset-0 z-[101] flex items-center justify-center"
            >
                <div 
                    className="w-full max-w-sm p-8 liquid-glass-advanced rounded-xl transition-all duration-300 ease-out"
                    style={tooltipStyle}
                >
                     <div className="text-center">
                        {currentStep.icon && (
                            <div className="w-16 h-16 rounded-full bg-[var(--primary-500)]/80 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--primary-shadow-lg)]">
                                <span className="material-symbols-outlined text-3xl text-white">{currentStep.icon}</span>
                            </div>
                        )}
                        <h3 className="text-2xl font-bold text-white mb-3">{currentStep.title}</h3>
                        <p className="text-slate-300 mb-8 min-h-[40px]">{currentStep.content}</p>

                        <div className="flex items-center justify-center gap-2 mb-8">
                            {steps.map((_, index) => (
                                <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${index === stepIndex ? 'bg-white w-6' : 'bg-white/30 w-3'}`}></div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center">
                             <button onClick={onClose} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors button-active px-4 py-2">
                                Skip Tour
                            </button>
                            <div className="flex gap-2">
                                {stepIndex > 0 && (
                                    <button onClick={handlePrev} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 button-active">
                                        Previous
                                    </button>
                                )}
                                <button onClick={handleNext} className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] button-active">
                                    {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default InteractiveGuide;