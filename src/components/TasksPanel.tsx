import React, { useState, useEffect, useMemo } from 'react';
import type { Task, SubTask, TaskPriority, Toast, AuthUser, UserUsage } from '../types';
import { breakdownTask } from '../services/geminiService';
import * as gtasks from '../services/googleTasksApiService';
import ConfirmationDialog from './ConfirmationDialog';
import { LoadingIcon } from './icons/LoadingIcon';
import { ADVANCED_USAGE_LIMIT } from './constants';

interface TasksPanelProps {
  tasks: Task[];
  updateTasks: (tasks: Task[]) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  googleAccessToken: string | null;
  handleConnectGoogleAccount: () => void;
  user: AuthUser;
  usage: UserUsage;
  updateUsage: (category: 'advanced') => void;
}

const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

const isTomorrow = (date: Date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
};

const isThisWeek = (date: Date) => {
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return date >= weekStart && date <= weekEnd;
};

const groupTasksByDate = (tasks: Task[]) => {
    const groups: Record<string, Task[]> = {
        overdue: [],
        today: [],
        tomorrow: [],
        thisWeek: [],
        upcoming: [],
        noDate: [],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tasks.forEach(task => {
        if (!task.dueDate) {
            groups.noDate.push(task);
            return;
        }
        const dueDate = new Date(task.dueDate);
        if (dueDate < today) {
            groups.overdue.push(task);
        } else if (isToday(dueDate)) {
            groups.today.push(task);
        } else if (isTomorrow(dueDate)) {
            groups.tomorrow.push(task);
        } else if (isThisWeek(dueDate)) {
            groups.thisWeek.push(task);
        } else {
            groups.upcoming.push(task);
        }
    });
    return groups;
};


const TasksPanel: React.FC<TasksPanelProps> = ({ tasks, updateTasks, addToast, googleAccessToken, handleConnectGoogleAccount, user, usage, updateUsage }) => {
  const [newTask, setNewTask] = useState({ text: '', priority: 'medium' as TaskPriority, dueDate: '' });
  const [aiTaskText, setAiTaskText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'manual' | 'ai'>('manual');
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt' | 'priority'>('dueDate');

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Google Tasks State
  const [isSyncing, setIsSyncing] = useState(false);
  const [taskLists, setTaskLists] = useState<gtasks.GoogleTaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string | null>(null);
  
  const localTasks = useMemo(() => tasks.filter(t => !t.isGoogleTask), [tasks]);
  
  // Fetch Task Lists on connect
  useEffect(() => {
    const fetchLists = async () => {
        if (googleAccessToken) {
            setIsSyncing(true);
            try {
                const lists = await gtasks.fetchTaskLists(googleAccessToken);
                setTaskLists(lists);
                if (lists.length > 0 && !selectedTaskListId) {
                    setSelectedTaskListId(lists[0].id);
                }
            } catch (e: any) {
                addToast({ message: e.message, type: 'error' });
            } finally {
                setIsSyncing(false);
            }
        } else {
            setTaskLists([]);
            setSelectedTaskListId(null);
        }
    };
    fetchLists();
  }, [googleAccessToken, addToast]);

  const handleSyncTasks = async () => {
    if (!googleAccessToken || !selectedTaskListId) return;
    setIsSyncing(true);
    try {
        const googleTasks = await gtasks.fetchTasks(googleAccessToken, selectedTaskListId);
        updateTasks([...localTasks, ...googleTasks]);
        addToast({ message: `Synced ${googleTasks.length} tasks.`, type: 'success' });
    } catch (e: any) {
        addToast({ message: e.message, type: 'error' });
    } finally {
        setIsSyncing(false);
    }
  }
  
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.text.trim() === '') return;

    // If a Google Task list is selected, create it there
    if (!!googleAccessToken && selectedTaskListId) {
        try {
            const createdGTask = await gtasks.createTask(googleAccessToken!, selectedTaskListId, {
                title: newTask.text,
                due: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
            });
            const mappedTask = gtasks.mapGoogleTaskToAppTask(createdGTask, selectedTaskListId);
            updateTasks([mappedTask, ...tasks]);
            addToast({ message: 'Task added to Google!', type: 'success' });
        } catch (e: any) {
             addToast({ message: `Failed to add Google Task: ${e.message}`, type: 'error' });
             return;
        }
    } else { // Create a local task
        const task: Task = {
          id: Date.now(), text: newTask.text, completed: false,
          priority: newTask.priority, dueDate: newTask.dueDate || null,
          subtasks: [], createdAt: Date.now(),
        };
        updateTasks([task, ...tasks]);
        addToast({ message: 'Task added!', type: 'success' });
    }
    setNewTask({ text: '', priority: 'medium', dueDate: '' });
  };

  const handleAiBreakdown = async () => {
    if (aiTaskText.trim() === '') return;

    const usesLeft = ADVANCED_USAGE_LIMIT - usage.advanced.count;
    if (user.email !== 'kulkarniarnav734@gmail.com' && usesLeft <= 0) {
        addToast({ message: 'Daily limit for Advanced AI tools reached.', type: 'error' });
        return;
    }

    setIsAiLoading(true);
    try {
        const subtaskTexts = await breakdownTask(aiTaskText);
        const newSubtasks: SubTask[] = subtaskTexts.map(text => ({ id: Date.now() + Math.random(), text, completed: false }));
        const task: Task = {
            id: Date.now(), text: aiTaskText, completed: false,
            priority: 'high', dueDate: null, subtasks: newSubtasks, createdAt: Date.now(),
        };
        updateTasks([task, ...tasks]);
        updateUsage('advanced');
        setAiTaskText('');
        addToast({ message: 'AI generated a new task with subtasks!', type: 'success'});
    } catch (e: any) {
        addToast({ message: e.message || 'Failed to breakdown task.', type: 'error' });
    } finally {
        setIsAiLoading(false);
    }
  }

  const updateTaskField = async (id: number | string, updates: Partial<Task>) => {
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return;
    
    // API call for Google Task
    if (taskToUpdate.isGoogleTask && googleAccessToken) {
        try {
            await gtasks.updateTask(googleAccessToken, taskToUpdate.gtaskListId!, taskToUpdate.gtaskId!, updates);
        } catch(e: any) {
            addToast({ message: `Failed to update Google Task: ${e.message}`, type: 'error' });
            return; // Don't update UI if API fails
        }
    }
    updateTasks(tasks.map(task => task.id === id ? { ...task, ...updates } : task));
  }
  
  const handleStartEditing = (task: Task) => {
      setEditingTaskId(task.id);
      setEditingText(task.text);
  }

  const handleFinishEditing = () => {
      if (editingTaskId) {
          updateTaskField(editingTaskId, { text: editingText });
      }
      setEditingTaskId(null);
      setEditingText('');
  }

  const handleEditingKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleFinishEditing();
      } else if (e.key === 'Escape') {
          setEditingTaskId(null);
          setEditingText('');
      }
  }

  const toggleSubtask = (taskId: number | string, subtaskId: number) => {
    const newTasks = tasks.map(task => {
        if (task.id === taskId) {
            const newSubtasks = task.subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
            const allCompleted = newSubtasks.every(st => st.completed);
            return { ...task, subtasks: newSubtasks, completed: newSubtasks.length > 0 ? allCompleted : task.completed };
        }
        return task;
    });
    updateTasks(newTasks);
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    if (taskToDelete.isGoogleTask && googleAccessToken) {
        try {
            await gtasks.deleteTask(googleAccessToken, taskToDelete.gtaskListId!, taskToDelete.gtaskId!);
        } catch (e: any) {
            addToast({ message: `Failed to delete Google Task: ${e.message}`, type: 'error' });
            setTaskToDelete(null);
            return;
        }
    }
    
    updateTasks(tasks.filter(task => task.id !== taskToDelete.id));
    setTaskToDelete(null);
    addToast({ message: 'Task deleted', type: 'info' });
  };
  
  const priorityOrder = { high: 3, medium: 2, low: 1 };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
        if (filter === 'all') return true;
        return filter === 'completed' ? task.completed : !task.completed;
    });

    if (sortBy !== 'dueDate') {
      return filtered.sort((a, b) => {
        switch (sortBy) {
          case 'priority':
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          case 'createdAt':
          default:
            return b.createdAt - b.createdAt;
        }
      });
    }
    return filtered; // Grouping will handle date sorting
  }, [tasks, filter, sortBy]);

  const taskGroups = useMemo(() => {
      if (sortBy === 'dueDate') {
          return groupTasksByDate(filteredAndSortedTasks);
      }
      return null;
  }, [filteredAndSortedTasks, sortBy]);

  const getDueDateClass = (dueDate: string | null) => {
      if (!dueDate) return '';
      const today = new Date();
      today.setHours(0,0,0,0);
      const due = new Date(dueDate);
      if (due < today) return 'due-date-overdue';
      if (due.getTime() === today.getTime()) return 'due-date-today';
      return '';
  }

  const subtaskProgress = (task: Task) => {
    if (task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(st => st.completed).length;
    return (completed / task.subtasks.length) * 100;
  }
  
  const groupTitles: Record<string, string> = {
    overdue: 'Overdue',
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    upcoming: 'Upcoming',
    noDate: 'No Due Date',
  };

  return (
    <>
      <ConfirmationDialog isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={confirmDeleteTask} title="Delete Task" message={`Delete "${taskToDelete?.text}"? This will also delete it from Google Tasks if synced.`} confirmText="Delete" />
      <div className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Task Matrix</h2>
            <p className="text-md text-[var(--text-secondary)]">Organize, prioritize, and conquer your goals.</p>
          </header>
          
          <div className="liquid-glass-advanced glow-on-hover p-6 mb-8">
            <div className="flex mb-4 border-b border-[var(--glass-border)]">
              <button onClick={() => setInputMode('manual')} className={`flex-1 p-3 font-semibold text-sm transition-colors ${inputMode === 'manual' ? 'text-[var(--primary-400)] border-b-2 border-[var(--primary-400)]' : 'text-[var(--text-secondary)]'}`}>
                Add Manually
              </button>
              <button onClick={() => setInputMode('ai')} className={`flex-1 p-3 font-semibold text-sm transition-colors ${inputMode === 'ai' ? 'text-[var(--primary-400)] border-b-2 border-[var(--primary-400)]' : 'text-[var(--text-secondary)]'} flex items-center justify-center gap-2`}>
                <span className="material-symbols-outlined text-base">auto_awesome</span> AI Breakdown
              </button>
            </div>
            
            {inputMode === 'manual' ? (
              <form onSubmit={handleAddTask} className="space-y-4 animate-fade-in">
                <input type="text" value={newTask.text} onChange={(e) => setNewTask({...newTask, text: e.target.value})} placeholder="Add a new task..." className="w-full task-input-field" />
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Priority</label>
                    <select value={newTask.priority} onChange={(e) => setNewTask({...newTask, priority: e.target.value as TaskPriority})} className="w-full task-input-field">
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Due Date</label>
                    <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})} className="w-full task-input-field" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-[var(--primary-600)] text-white font-bold py-3 rounded-lg hover:bg-[var(--primary-500)] disabled:bg-[var(--primary-300)] transition-colors button-active" disabled={!newTask.text.trim()}>Add Task</button>
              </form>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-[var(--text-secondary)] text-center">Describe a complex task, and AI will break it down into manageable subtasks for you.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input type="text" value={aiTaskText} onChange={(e) => setAiTaskText(e.target.value)} placeholder="e.g., Write research paper on renewable energy" className="flex-1 task-input-field" />
                    <button onClick={handleAiBreakdown} disabled={isAiLoading || !aiTaskText.trim()} className="bg-[var(--primary-500)] text-white font-bold py-2.5 px-5 rounded-lg hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] transition-colors flex items-center justify-center sm:w-36 button-active">
                        {isAiLoading ? <><span className="material-symbols-outlined mr-2 animate-thinking">psychology</span> Thinking...</> : 'Generate'}
                    </button>
                </div>
              </div>
            )}
          </div>
          
           {/* Google Tasks Integration UI */}
          <div className="liquid-glass-advanced glow-on-hover p-4 mb-6">
            {!googleAccessToken ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">Connect to Google to sync your tasks.</p>
                    <button onClick={handleConnectGoogleAccount} disabled={isSyncing} className="bg-white/10 text-white font-bold py-2 px-4 rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 button-active">
                        {isSyncing ? <LoadingIcon /> : <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path><path d="M1 1h22v22H1z" fill="none"></path></svg> Connect</>}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                     <div className="w-full sm:w-auto flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400">check_circle</span>
                        <p className="text-xs text-green-300 flex-shrink-0">Google Connected</p>
                     </div>
                    <select 
                        value={selectedTaskListId || ''} 
                        onChange={(e) => setSelectedTaskListId(e.target.value)} 
                        className="flex-1 task-input-field text-sm"
                        disabled={isSyncing || taskLists.length === 0}
                    >
                        {taskLists.length === 0 && <option>No task lists found</option>}
                        {taskLists.map(list => <option key={list.id} value={list.id}>{list.title}</option>)}
                    </select>
                    <button onClick={handleSyncTasks} disabled={isSyncing || !selectedTaskListId} className="w-full sm:w-auto bg-[var(--primary-500)] text-white font-bold py-2.5 px-5 rounded-lg hover:bg-[var(--primary-600)] disabled:bg-[var(--primary-300)] transition-colors flex items-center justify-center button-active">
                         {isSyncing ? <LoadingIcon /> : <><span className="material-symbols-outlined text-sm mr-2">sync</span> Sync Now</>}
                    </button>
                </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button onClick={() => setFilter('all')} className={`task-filter-btn ${filter === 'all' ? 'active' : ''}`}>All Tasks</button>
            <button onClick={() => setFilter('pending')} className={`task-filter-btn ${filter === 'pending' ? 'active' : ''}`}>Pending</button>
            <button onClick={() => setFilter('completed')} className={`task-filter-btn ${filter === 'completed' ? 'active' : ''}`}>Completed</button>
            <div className="w-px h-6 bg-[var(--glass-border)] mx-2 hidden sm:block"></div>
            <button onClick={() => setSortBy('dueDate')} className={`task-filter-btn ${sortBy === 'dueDate' ? 'active' : ''}`}>Sort by Due Date</button>
            <button onClick={() => setSortBy('createdAt')} className={`task-filter-btn ${sortBy === 'createdAt' ? 'active' : ''}`}>Sort by Newest</button>
            <button onClick={() => setSortBy('priority')} className={`task-filter-btn ${sortBy === 'priority' ? 'active' : ''}`}>Sort by Priority</button>
          </div>

          <div className="space-y-4">
            {taskGroups ? (
                 Object.keys(taskGroups).map(groupKey => (
                    taskGroups[groupKey].length > 0 && (
                        <div key={groupKey}>
                            <h4 className="task-group-header">{groupTitles[groupKey]}</h4>
                            <div className="space-y-3">
                                {taskGroups[groupKey].map((task, index) => <TaskItem key={String(task.id)} task={task} index={index} {...{updateTask: updateTaskField, toggleSubtask, setTaskToDelete, handleStartEditing, editingTaskId, editingText, setEditingText, handleEditingKeyDown, handleFinishEditing, getDueDateClass, subtaskProgress}} />)}
                            </div>
                        </div>
                    )
                ))
            ) : (
                filteredAndSortedTasks.map((task, index) => <TaskItem key={String(task.id)} task={task} index={index} {...{updateTask: updateTaskField, toggleSubtask, setTaskToDelete, handleStartEditing, editingTaskId, editingText, setEditingText, handleEditingKeyDown, handleFinishEditing, getDueDateClass, subtaskProgress}} />)
            )}
            {filteredAndSortedTasks.length === 0 && <div className="text-center py-10 text-[var(--text-tertiary)]">No tasks match your criteria.</div>}
          </div>
        </div>
      </div>
    </>
  );
};

// Task Item subcomponent for better readability
interface TaskItemProps {
  task: Task;
  index: number;
  updateTask: (id: number | string, updates: Partial<Task>) => void;
  toggleSubtask: (taskId: number | string, subtaskId: number) => void;
  setTaskToDelete: React.Dispatch<React.SetStateAction<Task | null>>;
  handleStartEditing: (task: Task) => void;
  editingTaskId: number | string | null;
  editingText: string;
  setEditingText: React.Dispatch<React.SetStateAction<string>>;
  handleEditingKeyDown: (e: React.KeyboardEvent) => void;
  handleFinishEditing: () => void;
  getDueDateClass: (dueDate: string | null) => string;
  subtaskProgress: (task: Task) => number;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, index, updateTask, toggleSubtask, setTaskToDelete, handleStartEditing, editingTaskId, editingText, setEditingText, handleEditingKeyDown, handleFinishEditing, getDueDateClass, subtaskProgress }) => (
    <div 
      className={`liquid-glass-light aurora-border glow-on-hover p-4 rounded-lg group transition-all duration-300 animate-list-item ${task.completed ? 'opacity-60' : 'liquid-glass-interactive'}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={task.completed} onChange={() => updateTask(task.id, { completed: !task.completed })} className="w-5 h-5 rounded mt-1 text-[var(--primary-500)] bg-transparent border-slate-400 focus:ring-[var(--primary-500)] cursor-pointer" />
        <div className="flex-1" onDoubleClick={() => !task.completed && handleStartEditing(task)}>
          {editingTaskId === task.id ? (
            <input 
                type="text"
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onBlur={handleFinishEditing}
                onKeyDown={handleEditingKeyDown}
                className="w-full bg-transparent border-b border-[var(--primary-400)] focus:outline-none"
                autoFocus
            />
          ) : (
            <p className={`${task.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'} flex items-center gap-2`}>
                {task.isGoogleTask && <span className="material-symbols-outlined text-blue-400 text-xs" title="Google Task">google</span>}
                {task.text}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs mt-1 text-[var(--text-secondary)]">
              {!task.isGoogleTask && (
                <span className={`flex items-center gap-1.5 priority-${task.priority}`}>
                    <div className="w-2 h-2 rounded-full bg-[var(--priority-color)]"></div>
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </span>
              )}
              {task.dueDate && <span className={`flex items-center gap-1.5 ${getDueDateClass(task.dueDate)}`}><span className="material-symbols-outlined text-sm">calendar_month</span>{new Date(task.dueDate).toLocaleDateString()}</span>}
          </div>
        </div>
        <button onClick={() => setTaskToDelete(task)} className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity button-active"><span className="material-symbols-outlined text-xl">delete</span></button>
      </div>
      {task.subtasks.length > 0 && !task.isGoogleTask && (
          <div className="mt-3 pl-8">
             <div className="w-full bg-black/20 rounded-full h-1.5 mb-2"><div className="bg-[var(--primary-500)] h-1.5 rounded-full" style={{width: `${subtaskProgress(task)}%`}}></div></div>
             <div className="space-y-2">
                 {task.subtasks.map(st => (
                     <div key={st.id} className="flex items-center gap-3 text-sm">
                         <input type="checkbox" checked={st.completed} onChange={() => toggleSubtask(task.id, st.id)} className="w-4 h-4 rounded text-[var(--primary-500)] bg-transparent border-slate-500 focus:ring-[var(--primary-500)] cursor-pointer" />
                         <span className={`${st.completed ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'}`}>{st.text}</span>
                     </div>
                 ))}
             </div>
          </div>
      )}
    </div>
);


export default TasksPanel;