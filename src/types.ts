import type { User } from 'firebase/auth';

export type View = 'dashboard' | 'tasks' | 'focusSuite' | 'calendar' | 'reminders' | 'timer' | 'notes' | 'settings' | 'focusSearch' | 'whiteboard' | 'goalTracker' | 'focusStudio' | 'studyRoutineGenerator' | 'knowledgeGraph' | 'mindfulnessHub' | 'focusMeet';

export interface AuthUser {
  readonly uid: string;
  readonly email: string | null;
  readonly displayName: string | null;
  readonly photoURL: string | null;
  readonly emailVerified: boolean;
  readonly isAnonymous: boolean;
  readonly metadata: {
    readonly creationTime?: string;
    readonly lastSignInTime?: string;
  };
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  groundingChunks?: GroundingChunk[];
}

export type TaskPriority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: number;
  text: string;
  completed: boolean;
}

export interface Task {
  id: number | string; // Can be number for local, string for Google
  text: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate: string | null;
  subtasks: SubTask[];
  createdAt: number;
  isGoogleTask?: boolean;
  gtaskId?: string;
  gtaskListId?: string;
}


export interface Reminder {
  id: number;
  text: string;
}

export interface Milestone {
  id: number;
  text: string;
  completed: boolean;
}

export interface Goal {
  id: number;
  title: string;
  milestones: Milestone[];
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Flashcard {
    question: string;
    answer: string;
}

export interface Note {
  id: number;
  title: string;
  content: string; 
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isPinned: boolean;
  color: string; 
  isGoogleDoc?: boolean;
  googleDocId?: string;
}

export type EventColor = 'rose' | 'amber' | 'emerald' | 'cyan' | 'violet' | 'slate';

export interface CalEvent {
  id: number | string;
  date: string; 
  title: string;
  time: string;
  color: EventColor;
  isGoogleEvent?: boolean;
  gcalId?: string;
  meetLink?: string;
}

export interface Email {
    id: string;
    from: string;
    subject: string;
    snippet: string;
    body: string;
    date: string;
    threadId: string;
}

export interface StudyBlock {
    day: string;
    time: string;
    subject: string;
    activity: string;
    duration: number;
}

export interface ScheduledStudyBlock {
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    subject: string;
    activity: string;
    duration: number; // in minutes
}

export interface GraphNode {
    id: string;
    label: string;
    group: number;
}

export interface GraphEdge {
    from: string;
    to: string;
}

export interface WeatherCondition {
    icon: string;
    description: string;
}

export interface WeatherHourly {
    dt: number;
    temp: number;
    weather: WeatherCondition[];
    pop: number;
}

export interface WeatherDaily {
    dt: number;
    temp_min: number;
    temp_max: number;
    weather: WeatherCondition[];
    humidity: number;
    wind_speed: number;
    pop: number;
}

export interface WeatherData {
    city: string;
    state: string;
    country: string;
    lastUpdated: number;
    description: string;
    temp_max: number;
    temp_min: number;
    icon: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    wind_deg: number;
    pressure: number;
    visibility: number | null;
    sunrise: number;
    sunset: number;
    hourly: WeatherHourly[];
    daily: WeatherDaily[];
}

export interface CustomTheme {
    id: string;
    name: string;
    colors: {
        primary: string;
        glow: string;
        sidebarBg: string;
        bgGradientStart: string;
        bgGradientEnd: string;
    }
}

export interface DailyUsage {
    count: number;
    lastReset: string; 
}

export interface UserUsage {
    advanced: DailyUsage; 
    standard: DailyUsage; 
    assistant: DailyUsage; 
}

export interface Whiteboard {
  id: number;
  name: string;
  data: string | null;
  updatedAt: string;
}

export interface UserData {
    tasks: Task[];
    notes: Note[];
    goals: Goal[];
    events: CalEvent[];
    reminders: Reminder[];
    whiteboards: Whiteboard[];
    usage: UserUsage;
    customThemes?: CustomTheme[];
    studySets?: StudySet[];
}

export interface SharedNote {
  type: 'note';
  ownerEmail: string;
  sharedAt: string;
  noteData: Omit<Note, 'id' | 'isPinned'>; 
}

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer';

export interface BaseQuestion {
    question: string;
    type: QuestionType;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
    type: 'multiple-choice';
    options: string[];
    answer: string;
}

export interface TrueFalseQuestion extends BaseQuestion {
    type: 'true-false';
    answer: boolean;
}

export interface ShortAnswerQuestion extends BaseQuestion {
    type: 'short-answer';
    answer: string;
}

export type QuizQuestion = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion;


// --- FOCUS STUDIO TYPES ---
export interface Material {
  id: number;
  name: string;
  storagePath: string; // Path in Firebase Storage
}

export interface Explainer {
  id: number;
  materialId: number;
  materialName: string;
  title: string;
  content: string;
}

export interface EssayGrade {
    id: number;
    materialId: number;
    essayTitle: string;
    essayText: string;
    score: number;
    feedback: string;
    suggestions: string[];
}

export interface GeneratedQuiz {
    id: number; 
    materialId: number; 
    materialName: string; 
    name: string; 
    questions: QuizQuestion[];
}

export interface StudySet {
  id: number;
  name: string;
  materials: Material[];
  flashcards: { id: number; materialId: number; materialName: string; cards: Flashcard[] }[];
  quizzes: GeneratedQuiz[];
  explainers: Explainer[];
  essayGrades: EssayGrade[];
  tutorHistory: ChatMessage[];
}