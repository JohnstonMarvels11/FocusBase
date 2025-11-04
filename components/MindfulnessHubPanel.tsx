import React, { useState, useEffect, useRef } from 'react';
import BackToSuiteHeader from './BackToSuiteHeader';
import type { View } from '../types';

// Helper to format time
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

// --- Sub-components for the Hub ---

const BreathworkGuide: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [phase, setPhase] = useState<'in' | 'hold1' | 'out' | 'hold2'>('in');
    const [phaseText, setPhaseText] = useState('Get Ready');
    const timerRef = useRef<number | null>(null);

    const phases: { name: 'in' | 'hold1' | 'out' | 'hold2', text: string, duration: number }[] = [
        { name: 'in', text: 'Breathe In', duration: 4000 },
        { name: 'hold1', text: 'Hold', duration: 4000 },
        { name: 'out', text: 'Breathe Out', duration: 4000 },
        { name: 'hold2', text: 'Hold', duration: 4000 },
    ];

    useEffect(() => {
        if (isActive) {
            let currentPhaseIndex = 0;
            const runCycle = () => {
                const currentPhase = phases[currentPhaseIndex];
                setPhase(currentPhase.name);
                setPhaseText(currentPhase.text);
                timerRef.current = window.setTimeout(() => {
                    currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
                    runCycle();
                }, currentPhase.duration);
            };
            runCycle();
        } else {
             if (timerRef.current) clearTimeout(timerRef.current);
             setPhase('in');
             setPhaseText('Get Ready');
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current) };
    }, [isActive]);
    
    const getCircleClass = () => {
        if (!isActive) return 'scale-90 opacity-90';
        // These classes should correspond to animations defined in CSS
        switch (phase) {
            case 'in': return 'scale-110';
            case 'out': return 'scale-75';
            default: return 'scale-100';
        }
    }

    return (
        <div className="liquid-glass-advanced glow-on-hover p-6 rounded-xl flex flex-col items-center justify-between text-center h-full">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Guided Breathwork</h3>
              <p className="text-sm text-slate-300">A simple 4-4-4-4 box breathing exercise to calm your mind.</p>
            </div>
            <div className="relative w-48 h-48 flex items-center justify-center my-4">
                <div className="absolute inset-0 bg-[var(--primary-500)]/20 rounded-full animate-pulse"></div>
                <div className={`w-3/4 h-3/4 bg-[var(--primary-500)] rounded-full transition-transform duration-[4000ms] ease-in-out ${getCircleClass()}`}></div>
                <p className="absolute text-2xl font-bold text-white z-10">{phaseText}</p>
            </div>
            <button onClick={() => setIsActive(!isActive)} className="w-32 bg-[var(--primary-500)] text-white font-bold py-3 px-6 rounded-lg hover:bg-[var(--primary-600)] transition-colors button-active text-lg">
                {isActive ? 'Stop' : 'Start'}
            </button>
        </div>
    );
};

const MeditationPlayer: React.FC = () => {
    const [selected, setSelected] = useState<{title: string, duration: number, url: string} | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const intervalRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    const meditations = [
        { title: "5-Minute Mindful Break", duration: 5 * 60, url: "https://cdn.pixabay.com/audio/2022/11/18/audio_8b28f11413.mp3" },
        { title: "10-Minute Stress Relief", duration: 10 * 60, url: "https://cdn.pixabay.com/audio/2023/10/05/audio_a1a814a2c5.mp3" },
    ];

    useEffect(() => {
        if (isPlaying && time > 0) {
            intervalRef.current = window.setInterval(() => setTime(t => t - 1), 1000);
            audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            audioRef.current?.pause();
            if (time === 0 && isPlaying) {
                 setIsPlaying(false);
                 setSelected(null);
            }
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPlaying, time]);

    useEffect(() => {
      // Cleanup audio on component unmount
      return () => {
        audioRef.current?.pause();
        audioRef.current = null;
      }
    }, [])

    const handleSelect = (meditation: {title: string, duration: number, url: string}) => {
        if(audioRef.current) audioRef.current.pause();
        setSelected(meditation);
        setTime(meditation.duration);
        setIsPlaying(false);
        audioRef.current = new Audio(meditation.url);
        audioRef.current.onended = () => {
            setIsPlaying(false);
            setSelected(null);
        };
    };
    
    const progress = selected ? ((selected.duration - time) / selected.duration) * 100 : 0;
    
    return (
        <div className="liquid-glass-advanced glow-on-hover p-6 rounded-xl h-full flex flex-col">
             <h3 className="text-xl font-bold text-white mb-4">Simple Meditation</h3>
             {!selected ? (
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                    {meditations.map(m => (
                        <button key={m.title} onClick={() => handleSelect(m)} className="w-full text-left p-4 liquid-glass-light rounded-lg hover:bg-white/10 transition-colors button-active">
                            <p className="font-semibold text-white">{m.title}</p>
                            <p className="text-sm text-slate-300">{m.duration / 60} minutes</p>
                        </button>
                    ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-lg font-semibold text-white mb-4">{selected.title}</p>
                    <p className="text-5xl font-bold text-white tracking-widest tabular-nums mb-6">{formatTime(time)}</p>
                    <div className="w-full bg-black/30 rounded-full h-2 mb-6"><div className="bg-[var(--primary-500)] h-2 rounded-full transition-all duration-1000 linear" style={{ width: `${progress}%` }}></div></div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsPlaying(!isPlaying)} className="w-16 h-16 rounded-full bg-[var(--primary-500)] text-white text-2xl flex items-center justify-center shadow-lg hover:bg-[var(--primary-600)] transition-colors button-active"><span className="material-symbols-outlined text-4xl">{isPlaying ? 'pause' : 'play_arrow'}</span></button>
                        <button onClick={() => { setIsPlaying(false); setSelected(null); audioRef.current?.pause(); }} className="text-sm text-slate-400 hover:text-white hover:underline">Change</button>
                    </div>
                </div>
             )}
        </div>
    );
}

const Equalizer: React.FC = () => (
    <div className="flex items-center gap-0.5 h-4">
        <div className="w-1 h-full bg-current equalizer-bar"></div>
        <div className="w-1 h-full bg-current equalizer-bar"></div>
        <div className="w-1 h-full bg-current equalizer-bar"></div>
    </div>
)

const FocusMusicPlayer: React.FC = () => {
    const [selectedTrack, setSelectedTrack] = useState<{title: string, url: string} | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    const tracks = [
        { title: "Lofi Beats", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1818a09b4a.mp3" }, 
        { title: "Ambient Nature", url: "https://cdn.pixabay.com/audio/2022/08/04/audio_2dde62aea9.mp3" }, 
        { title: "Calm Piano", url: "https://cdn.pixabay.com/audio/2022/05/20/audio_a1599a8c12.mp3" }
    ];

    useEffect(() => {
        // Cleanup audio on component unmount
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    const handleSelect = (track: {title: string, url: string}) => {
        if (selectedTrack?.url === track.url) {
            // Toggle play/pause for the current track
            if (isPlaying) {
                audioRef.current?.pause();
                setIsPlaying(false);
            } else {
                audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
                setIsPlaying(true);
            }
        } else {
            // Switch to a new track
            audioRef.current?.pause();
            setSelectedTrack(track);
            audioRef.current = new Audio(track.url);
            audioRef.current.loop = true;
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            setIsPlaying(true);
        }
    };

    return (
        <div className="liquid-glass-advanced glow-on-hover p-6 rounded-xl h-full">
            <h3 className="text-xl font-bold text-white mb-4">Focus Music</h3>
            <div className="space-y-3">
                {tracks.map(track => {
                    const isActive = selectedTrack?.url === track.url && isPlaying;
                    return (
                        <button key={track.title} onClick={() => handleSelect(track)} className={`w-full text-left p-4 liquid-glass-light rounded-lg hover:bg-white/10 transition-all duration-300 flex justify-between items-center button-active border ${isActive ? 'border-[var(--primary-400)] shadow-lg' : 'border-transparent'}`}>
                            <p className="font-semibold text-white">{track.title}</p>
                            {isActive && <div className="text-[var(--primary-400)]"><Equalizer /></div>}
                        </button>
                    )
                })}
            </div>
             {selectedTrack && (
                <div className="mt-6 text-center border-t border-white/10 pt-4">
                    <p className="text-sm text-slate-300">Now Playing</p>
                    <p className="font-bold text-white">{selectedTrack.title}</p>
                </div>
             )}
        </div>
    );
};


// --- Main Panel ---

interface MindfulnessHubPanelProps {
  setView: (view: View) => void;
}

const MindfulnessHubPanel: React.FC<MindfulnessHubPanelProps> = ({ setView }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <BackToSuiteHeader
          setView={setView}
          title="Mindfulness & Focus Hub"
          description="Tools to calm your mind and prepare for deep work."
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 h-[450px] md:h-[500px]">
                <BreathworkGuide />
            </div>
            <div className="lg:col-span-2 space-y-8 lg:space-y-0 lg:grid lg:grid-rows-2 lg:gap-8 lg:h-[500px]">
                <div className="h-[350px] md:h-auto"><MeditationPlayer /></div>
                <div className="h-[350px] md:h-auto"><FocusMusicPlayer /></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MindfulnessHubPanel;