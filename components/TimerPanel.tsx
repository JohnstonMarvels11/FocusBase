import React, { useState, useEffect, useRef } from 'react';
import BackToSuiteHeader from './BackToSuiteHeader';
import type { View } from '../types';

interface TimerPanelProps {
  setView: (view: View) => void;
}

const TimerPanel: React.FC<TimerPanelProps> = ({ setView }) => {
  const [time, setTime] = useState(25 * 60); // default to 25 minutes
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && time > 0) {
      timerRef.current = window.setInterval(() => {
        setTime(t => t - 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
      // Optional: Add a sound or notification
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, time]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTime(25 * 60);
  };

  const setTimerDuration = (minutes: number) => {
    setIsActive(false);
    setTime(minutes * 60);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10">
      <div className="max-w-md mx-auto">
        <BackToSuiteHeader
          setView={setView}
          title="Study Timer"
          description="Use the Pomodoro technique to boost your productivity."
        />

        <div className="liquid-glass p-8 rounded-full aspect-square flex flex-col items-center justify-center">
            <p className="text-7xl font-bold text-white tracking-widest tabular-nums">
                {formatTime(time)}
            </p>
             <div className="flex items-center gap-6 mt-8">
                <button onClick={toggleTimer} className="w-20 h-20 rounded-full bg-[var(--primary-500)] text-white text-2xl flex items-center justify-center shadow-lg hover:bg-[var(--primary-600)] transition-colors">
                    <span className="material-symbols-outlined text-4xl">{isActive ? 'pause' : 'play_arrow'}</span>
                </button>
                 <button onClick={resetTimer} className="w-16 h-16 rounded-full bg-white/10 text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors">
                    <span className="material-symbols-outlined text-3xl">replay</span>
                </button>
            </div>
        </div>
        
        <div className="mt-8 flex justify-center gap-4">
            <button onClick={() => setTimerDuration(25)} className="py-2 px-5 rounded-full liquid-glass-light hover:bg-[var(--primary-translucent-hover)] transition-colors">
                Focus (25m)
            </button>
             <button onClick={() => setTimerDuration(5)} className="py-2 px-5 rounded-full liquid-glass-light hover:bg-[var(--primary-translucent-hover)] transition-colors">
                Break (5m)
            </button>
             <button onClick={() => setTimerDuration(15)} className="py-2 px-5 rounded-full liquid-glass-light hover:bg-[var(--primary-translucent-hover)] transition-colors">
                Long Break (15m)
            </button>
        </div>
      </div>
    </div>
  );
};

export default TimerPanel;