
export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  SUMMARY = 'SUMMARY',
  QUIZ = 'QUIZ',
  ESSAY = 'ESSAY',
  TUTOR = 'TUTOR',
  PROFILE = 'PROFILE',
  NOTES = 'NOTES',
  SETTINGS = 'SETTINGS'
}

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface StudyRequestData {
  subject: string;
  gradeClass: string;
  board: string;
  language: string;
  chapterName: string;
  author?: string;
  questionCount?: number;
  difficulty?: DifficultyLevel;
  includeImages?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  answerKeyExplanation?: string; // Optional field if generated differently
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  type: AppMode;
  title: string;
  subtitle: string;
  timestamp: number;
  content?: any; // string for summary/essay, QuizQuestion[] for quiz
  formData?: StudyRequestData;
  score?: number; // Score achieved if it was a quiz
}

export interface UserProfile {
  displayName: string;
  phoneNumber: string;
  institution: string;
  grade?: string; // Added Grade/Class field
  bio: string;
  photoURL?: string;
  learningGoal?: string;
  learningStyle?: 'Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic';
  credits: number;
  planType?: 'Free' | 'Starter' | 'Scholar' | 'Achiever';
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: number;
  tags: string[];
}

export interface ReminderItem {
  id: string;
  task: string;
  dueTime: string; // ISO string or simple time string
  completed: boolean;
}

export interface TimetableEntry {
  day: string;
  date: string;
  slots: { time: string; activity: string; subject: string }[];
}

// Detailed Settings Interface
export interface AppSettings {
  learning: {
    grade: string;
    board: string;
    language: string;
    difficulty: DifficultyLevel;
    style: 'Standard' | 'Socratic' | 'Analogy-based' | 'Bullet Points';
    speed: 'Slow' | 'Normal' | 'Fast';
  };
  aiTutor: {
    personality: 'Friendly' | 'Strict' | 'Academic' | 'Humorous';
    responseLength: 'Short' | 'Medium' | 'Long';
    explanationStyle: 'Simple' | 'Detailed' | 'Scientific';
    giveHints: boolean;
  };
  study: {
    timerDuration: number; // minutes
    autoPause: boolean;
    subjects: string[];
  };
  appearance: {
    theme: 'Light' | 'Dark';
    fontSize: 'Small' | 'Medium' | 'Large';
  };
  notifications: {
    studyReminders: boolean;
    breakReminders: boolean;
  };
  privacy: {
    saveHistory: boolean;
    analytics: boolean;
  };
}

export const INITIAL_FORM_DATA: StudyRequestData = {
  subject: '',
  gradeClass: '',
  board: '',
  language: 'English',
  chapterName: '',
  author: '',
  questionCount: 5,
  difficulty: 'Medium',
  includeImages: false,
};
