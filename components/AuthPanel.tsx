

import React, { useState, useEffect, useRef } from 'react';
import { signInWithGoogle, signUpWithEmail, signInWithEmail } from '../services/firebase';
import { LoadingIcon } from './icons/LoadingIcon';
import type { Toast } from '../types';

interface AuthPanelProps {
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const showcaseItems = [
    { icon: 'checklist_rtl', title: 'Task Matrix' },
    { icon: 'target', title: 'Focus.AI Study Sets' },
    { icon: 'lightbulb', title: 'Note Insights' },
    { icon: 'language', title: 'Google Integration' },
    { icon: 'account_tree', title: 'Knowledge Graphs' },
    { icon: 'my_location', title: 'Focus.AI Assistant' },
];

const FeatureShowcase: React.FC = () => {
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = grid.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            grid.style.setProperty('--glow-x', `${x}px`);
            grid.style.setProperty('--glow-y', `${y}px`);
        };

        grid.addEventListener('mousemove', handleMouseMove);
        return () => grid.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
             <div id="particle-container" className="absolute inset-0"></div>
             <div className="z-10">
                <div className="flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-[var(--primary-400)] text-glow">my_location</span>
                    <h1 className="text-4xl font-bold ml-4 text-white">FocusBase</h1>
                </div>
                 <p className="text-lg text-slate-300 mt-2 mb-8">The AI-Powered Study & Productivity Suite</p>
            </div>
            
            <div ref={gridRef} className="z-10 grid grid-cols-3 gap-4 w-full max-w-sm auth-showcase-grid">
                {showcaseItems.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg text-center auth-showcase-card">
                        <span className="material-symbols-outlined text-3xl text-[var(--primary-300)] mb-2">{item.icon}</span>
                        <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};


const AuthPanel: React.FC<AuthPanelProps> = ({ addToast }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const container = document.getElementById('particle-container');
    if (!container) return;
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        const size = Math.random() * 3 + 1;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.bottom = `0%`;
        const duration = Math.random() * 10 + 10;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        container.appendChild(particle);
    }
  }, []);

  const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please sign in.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters long.';
        case 'auth/operation-not-allowed':
            return 'Email/Password sign-in is not enabled.';
        default:
            return 'An unexpected authentication error occurred.';
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.additionalUserInfo?.isNewUser) {
        addToast({ message: 'Account created! Welcome to FocusBase.', type: 'success' });
      } else {
        addToast({ message: 'Successfully signed in!', type: 'success' });
      }
    } catch (e: any) {
      addToast({ message: getFirebaseErrorMessage(e.code), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailLoading(true);
    try {
        if (isSignUp) {
            await signUpWithEmail(email, password);
            addToast({ message: 'Account created successfully! Welcome!', type: 'success' });
        } else {
            await signInWithEmail(email, password);
            addToast({ message: 'Welcome back!', type: 'success' });
        }
    } catch (e: any) {
        addToast({ message: getFirebaseErrorMessage(e.code), type: 'error' });
    } finally {
        setIsEmailLoading(false);
    }
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center p-4 auth-bg-aurora">
      <div className="w-full max-w-4xl h-full max-h-[650px] grid md:grid-cols-2 rounded-3xl overflow-hidden liquid-glass-advanced glow-on-hover shadow-2xl z-10 animate-pop-in">
        <div className="hidden md:flex flex-col justify-center bg-black/20 relative">
            <FeatureShowcase />
        </div>
        
        <div className="flex flex-col justify-center p-8 md:p-10 bg-black/10">
            <div className="flex items-center justify-center mb-4 md:hidden">
                <span className="material-symbols-outlined text-4xl text-[var(--primary-400)] text-glow">my_location</span>
                <h1 className="text-2xl font-bold ml-3 text-white">FocusBase</h1>
            </div>
            <h2 className="text-3xl font-bold text-center text-white mb-2">
                {isSignUp ? 'Create an Account' : 'Welcome Back'}
            </h2>
            <p className="text-center text-slate-300 mb-8">{isSignUp ? 'Get started on your productivity journey.' : 'Sign in to continue.'}</p>
            
            <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="relative auth-form-input rounded-lg">
                    <span className="material-symbols-outlined auth-form-input-icon">mail</span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required />
                </div>
                <div className="relative auth-form-input rounded-lg">
                    <span className="material-symbols-outlined auth-form-input-icon">lock</span>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required />
                </div>
                <button type="submit" disabled={isEmailLoading} className="w-full text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center button-active auth-submit-btn">
                     {isEmailLoading ? <LoadingIcon /> : (isSignUp ? 'Create Account' : 'Sign In')}
                </button>
            </form>
            
            <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-white/10"></div>
                <p className="px-4 text-sm text-slate-400">OR</p>
                <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white/10 text-white font-bold py-3 px-6 rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center justify-center button-active auth-google-btn"
            >
                <div className="shine-effect"></div>
                {isLoading ? <LoadingIcon /> : (
                    <>
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                        Continue with Google
                    </>
                )}
            </button>
            
             <p className="text-center text-sm text-slate-400 mt-6">
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-[var(--primary-400)] hover:underline">
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPanel;