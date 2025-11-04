import React, { useEffect, useState } from 'react';
import type { Toast as ToastType } from '../types';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsFadingOut(true);
    setTimeout(() => onRemove(toast.id), 500); // Wait for animation to finish
  };

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  };

  const colors = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    info: 'text-sky-400',
  }

  return (
    <div
      className={`w-full max-w-sm liquid-glass rounded-xl shadow-2xl p-4 flex items-start gap-4 animate-toast-in ${isFadingOut ? 'animate-toast-out' : ''}`}
    >
      <div className={`text-2xl ${colors[toast.type]}`}>
        <span className="material-symbols-outlined">{icons[toast.type]}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">
          {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
        </p>
        <p className="text-sm text-slate-300">{toast.message}</p>
      </div>
      <button onClick={handleClose} className="text-slate-400 hover:text-white">
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
};

export default Toast;