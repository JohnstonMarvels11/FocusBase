
import React, { useState } from 'react';

interface WelcomeGuideModalProps {
  onClose: () => void;
}

const steps = [
  {
    icon: 'rocket_launch',
    title: 'Welcome to FocusBase!',
    content: "Let's take a quick tour to get you started on your journey to peak productivity and smarter studying.",
  },
  {
    icon: 'dashboard',
    title: 'Your Dashboard',
    content: 'This is your mission control. See your tasks, recent notes, and get a snapshot of your day at a glance.',
  },
  {
    icon: 'task_alt',
    title: 'The Task Matrix',
    content: 'Add, organize, and prioritize your tasks. Use the AI Breakdown feature for complex projects!',
  },
  {
    icon: 'lightbulb',
    title: 'The Notes Grid',
    content: 'Capture your ideas in our powerful notes editor. You can format text, add tags, and import from Google Docs.',
  },
  {
    icon: 'auto_awesome',
    title: 'Focus.AI Tools',
    content: 'Explore a suite of AI-powered tools like the Text Summarizer and Flashcard Generator. Keep an eye on your daily usage limits in the Settings panel!',
  },
  {
    icon: 'my_location',
    title: 'Ready to Go!',
    content: "That's the basics. Explore the sidebar to discover all the tools. Now, go be productive!",
  },
];

const WelcomeGuideModal: React.FC<WelcomeGuideModalProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in" onClick={onClose}>
      <div className="liquid-glass-advanced w-full max-w-md p-8 rounded-2xl animate-pop-in text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-[var(--primary-500)]/80 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-3xl text-white">{step.icon}</span>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
        <p className="text-slate-300 mb-8">{step.content}</p>

        <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, index) => (
                <div key={index} className={`w-2 h-2 rounded-full transition-all ${index === currentStep ? 'bg-white w-4' : 'bg-white/20'}`}></div>
            ))}
        </div>

        <div className="flex justify-between items-center">
            {currentStep > 0 ? (
                <button onClick={handlePrev} className="text-sm text-slate-400 hover:text-white transition-colors">
                    Previous
                </button>
            ) : <div />}
            <button onClick={handleNext} className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] button-active">
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeGuideModal;