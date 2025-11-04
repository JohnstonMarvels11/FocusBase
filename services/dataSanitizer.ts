import type { UserData, Task, Note, Goal, CalEvent, Reminder, CustomTheme, UserUsage, StudySet, Whiteboard } from '../types';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const defaultUsage: UserUsage = {
    advanced: { count: 0, lastReset: getTodayDateString() },
    standard: { count: 0, lastReset: getTodayDateString() },
    assistant: { count: 0, lastReset: getTodayDateString() },
};

const defaultUserData: UserData = {
    tasks: [],
    notes: [],
    goals: [],
    events: [],
    reminders: [],
    whiteboards: [],
    usage: defaultUsage,
    customThemes: [],
    studySets: [],
};

// Type guards to check the structure of individual items
const isTask = (item: any): item is Task => 
    typeof item === 'object' && item !== null &&
    'id' in item && 'text' in item && 'completed' in item;

const isNote = (item: any): item is Note =>
    typeof item === 'object' && item !== null &&
    'id' in item && 'title' in item && 'content' in item && 'updatedAt' in item;

const isGoal = (item: any): item is Goal =>
    typeof item === 'object' && item !== null &&
    'id' in item && 'title' in item && Array.isArray(item.milestones);

const isCalEvent = (item: any): item is CalEvent =>
    typeof item === 'object' && item !== null &&
    'id' in item && 'date' in item && 'title' in item;
    
const isReminder = (item: any): item is Reminder =>
    typeof item === 'object' && item !== null &&
    'id' in item && 'text' in item;
    
const isWhiteboard = (item: any): item is Whiteboard =>
    typeof item === 'object' && item !== null &&
    'id' in item && 'name' in item && 'updatedAt' in item;

const isCustomTheme = (item: any): item is CustomTheme =>
    typeof item === 'object' && item !== null &&
    'id' in item && 'name' in item && typeof item.colors === 'object';

const isStudySet = (item: any): item is StudySet =>
    typeof item === 'object' && item !== null &&
    'id' in item && 'name' in item && Array.isArray(item.materials);

const isUserUsage = (item: any): item is UserUsage =>
    typeof item === 'object' && item !== null &&
    item.advanced?.count !== undefined && item.advanced?.lastReset &&
    item.standard?.count !== undefined && item.standard?.lastReset &&
    item.assistant?.count !== undefined && item.assistant?.lastReset;


// Helper to sanitize an array of items
const sanitizeArray = <T>(data: any, validator: (item: any) => item is T): T[] => {
    if (Array.isArray(data)) {
        // Filter out any items that don't match the expected structure
        return data.filter(validator);
    }
    return []; // Return an empty array if the data is not an array
};

/**
 * Sanitizes user data fetched from Firestore to ensure it matches the current app's data structure.
 * This prevents crashes from old or malformed data formats.
 * @param data The raw data object from Firestore.
 * @returns A sanitized UserData object.
 */
export const sanitizeUserData = (data: any): UserData => {
    if (typeof data !== 'object' || data === null) {
        return defaultUserData;
    }

    const sanitized: UserData = {
        tasks: sanitizeArray(data.tasks, isTask),
        notes: sanitizeArray(data.notes, isNote),
        goals: sanitizeArray(data.goals, isGoal),
        events: sanitizeArray(data.events, isCalEvent),
        reminders: sanitizeArray(data.reminders, isReminder),
        whiteboards: sanitizeArray(data.whiteboards, isWhiteboard),
        usage: isUserUsage(data.usage) ? data.usage : defaultUsage,
        customThemes: sanitizeArray(data.customThemes, isCustomTheme),
        studySets: sanitizeArray(data.studySets, isStudySet),
    };
    
    // Legacy migration for old usage structure
    if (data.usage && (data.usage.studyRoutine !== undefined || data.usage.knowledgeGraph !== undefined)) {
        sanitized.usage = defaultUsage; // Reset to new structure if old one is found
    }
    
    // Ensure assistant usage exists
    if (sanitized.usage && !sanitized.usage.assistant) {
        sanitized.usage.assistant = { count: 0, lastReset: getTodayDateString() };
    }

    // Legacy migration from single whiteboard to multiple
    if (data.whiteboard && !data.whiteboards) {
        sanitized.whiteboards = [{
            id: Date.now(),
            name: 'My Whiteboard',
            data: data.whiteboard,
            updatedAt: new Date().toISOString(),
        }];
    }

    return sanitized;
};