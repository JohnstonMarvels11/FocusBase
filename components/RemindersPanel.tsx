import React, { useState, useEffect } from 'react';
import type { Reminder, View, Toast } from '../types';
import ConfirmationDialog from './ConfirmationDialog';
import BackToSuiteHeader from './BackToSuiteHeader';

interface RemindersPanelProps {
  reminders: Reminder[];
  updateReminders: (reminders: Reminder[]) => void;
  setView: (view: View) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const RemindersPanel: React.FC<RemindersPanelProps> = ({ reminders, updateReminders, setView, addToast }) => {
  const [newReminderText, setNewReminderText] = useState('');
  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);
  
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReminderText.trim() === '') return;

    const newReminder: Reminder = {
      id: Date.now(),
      text: newReminderText,
    };
    updateReminders([newReminder, ...reminders]);
    setNewReminderText('');
    addToast({ message: 'Reminder added!', type: 'success' });
  };

  const confirmDeleteReminder = () => {
    if (reminderToDelete) {
      updateReminders(reminders.filter(r => r.id !== reminderToDelete.id));
      setReminderToDelete(null);
      addToast({ message: 'Reminder deleted', type: 'info' });
    }
  };

  return (
    <>
      <ConfirmationDialog
        isOpen={!!reminderToDelete}
        onClose={() => setReminderToDelete(null)}
        onConfirm={confirmDeleteReminder}
        title="Delete Reminder"
        message={`Are you sure you want to permanently delete this reminder: "${reminderToDelete?.text}"?`}
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-2xl mx-auto">
          <BackToSuiteHeader
            setView={setView}
            title="Reminders"
            description="Set reminders to stay on top of your schedule."
          />

          <div className="liquid-glass p-6 rounded-xl">
            <form onSubmit={handleAddReminder} className="flex gap-3 mb-6">
              <input
                type="text"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="Add a new reminder..."
                className="flex-1 p-3 rounded-lg border border-white/20 bg-black/30 text-slate-200 focus:ring-[var(--primary-500)] focus:border-[var(--primary-500)] transition placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="bg-[var(--primary-500)] text-white font-bold py-2 px-6 rounded-lg hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] transition-colors button-active"
                disabled={!newReminderText.trim()}
              >
                Add
              </button>
            </form>

            <div className="space-y-3">
              {reminders.map((reminder, index) => (
                <div
                  key={reminder.id}
                  className="flex items-center p-3 bg-black/30 rounded-lg group animate-list-item"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="material-symbols-outlined text-[var(--primary-400)] mr-4">notifications</span>
                  <span className="flex-1 text-slate-200">{reminder.text}</span>
                  <button 
                    onClick={() => setReminderToDelete(reminder)}
                    className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity button-active"
                    aria-label={`Delete reminder: ${reminder.text}`}
                  >
                    <span className="material-symbols-outlined text-xl">delete</span>
                  </button>
                </div>
              ))}
              {reminders.length === 0 && (
                  <div className="text-center py-8">
                      <p className="text-slate-400">No reminders set. Add one to get started!</p>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RemindersPanel;