import type { Task } from '../types';

export interface GoogleTaskList {
    id: string;
    title: string;
}

const API_BASE = 'https://www.googleapis.com/tasks/v1';

// Maps a task from the Google API format to our internal Task format
export const mapGoogleTaskToAppTask = (gTask: any, taskListId: string): Task => ({
    id: `gtask-${gTask.id}`,
    gtaskId: gTask.id,
    gtaskListId: taskListId,
    isGoogleTask: true,
    text: gTask.title || '',
    completed: gTask.status === 'completed',
    dueDate: gTask.due ? gTask.due.split('T')[0] : null,
    priority: 'medium', // Google Tasks doesn't have priority, so we use a default
    subtasks: [], // Subtasks are handled differently in GTasks, so we'll keep it simple
    createdAt: new Date(gTask.updated).getTime(),
});

// Fetches all of the user's task lists
export const fetchTaskLists = async (accessToken: string): Promise<GoogleTaskList[]> => {
    const response = await fetch(`${API_BASE}/users/@me/lists`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Failed to fetch Google Task lists.');
    const data = await response.json();
    return data.items || [];
};

// Fetches all tasks from a specific task list
export const fetchTasks = async (accessToken: string, taskListId: string): Promise<Task[]> => {
    const response = await fetch(`${API_BASE}/lists/${taskListId}/tasks`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error('Failed to fetch Google Tasks.');
    const data = await response.json();
    return (data.items || []).map((gTask: any) => mapGoogleTaskToAppTask(gTask, taskListId));
};

// Creates a new task in a specific task list
export const createTask = async (accessToken: string, taskListId: string, taskData: { title: string; due?: string }): Promise<any> => {
    const response = await fetch(`${API_BASE}/lists/${taskListId}/tasks`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
    });
    if (!response.ok) throw new Error('Failed to create Google Task.');
    return response.json();
};

// Updates an existing task
export const updateTask = async (accessToken: string, taskListId: string, taskId: string, updates: Partial<Task>): Promise<any> => {
    const gtaskUpdates: any = {};
    if (updates.text) gtaskUpdates.title = updates.text;
    if (updates.completed !== undefined) gtaskUpdates.status = updates.completed ? 'completed' : 'needsAction';
    if (updates.dueDate) gtaskUpdates.due = new Date(updates.dueDate).toISOString();

    const response = await fetch(`${API_BASE}/lists/${taskListId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(gtaskUpdates)
    });
    if (!response.ok) throw new Error('Failed to update Google Task.');
    return response.json();
};

// Deletes a task
export const deleteTask = async (accessToken: string, taskListId: string, taskId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/lists/${taskListId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    // A 204 No Content response is a success for DELETE
    if (response.status !== 204) throw new Error('Failed to delete Google Task.');
};