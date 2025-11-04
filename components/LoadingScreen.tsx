import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      <div className="flex items-center justify-center w-24 h-24 rounded-full bg-[var(--sidebar-bg)] loading-logo">
        <span className="material-symbols-outlined text-5xl text-[var(--primary-400)]">my_location</span>
      </div>
      <h1 className="text-3xl font-bold mt-6 text-white">FocusBase</h1>
      <p className="mt-2 text-slate-300">Loading your workspace...</p>
    </div>
  );
};

export default LoadingScreen;