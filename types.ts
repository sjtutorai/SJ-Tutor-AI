
export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  SUMMARY = 'SUMMARY',
  QUIZ = 'QUIZ',
  ESSAY = 'ESSAY',
  TUTOR = 'TUTOR',
  PROFILE = 'PROFILE',
  NOTES = 'NOTES',
  SETTINGS = 'SETTINGS',
  ABOUT = 'ABOUT'
}

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type SummaryType = 'Detailed' | 'Paragraph' | 'Brief';

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
  summaryType?: SummaryType;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  answerKeyExplanation?: string;
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
  content?: any;
  formData?: StudyRequestData;
  score?: number;
}

export interface UserProfile {
  displayName: string;
  phoneNumber: string;
  institution: string;
  grade?: string;
  bio: string;
  photoURL?: string;
  learningGoal?: string;
  learningStyle?: 'Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic';
  credits: number;
  planType?: 'Free' | 'Starter' | 'Scholar' | 'Achiever';
}

export interface UserSettings {
  learning: {
    preferredSubject: string;
    grade: string;
    difficulty: DifficultyLevel;
    language: string;
    dailyGoalMins: number;
  };
  aiTutor: {
    personality: 'Friendly' | 'Professional' | 'Strict';
    explanationStyle: 'Short & Simple' | 'Detailed' | 'Step-by-step';
    answerFormat: 'Text Only' | 'Text + Examples' | 'Text + Code';
    followUp: boolean;
    memory: boolean;
  };
  chat: {
    autoSave: boolean;
    fontSize: 'Small' | 'Medium' | 'Large';
    voiceOutput: boolean;
    typingIndicator: boolean;
  };
  notifications: {
    studyReminders: boolean;
    examAlerts: boolean;
    aiTips: boolean;
    push: boolean;
  };
  appearance: {
    theme: 'Light' | 'Dark' | 'System';
    animations: boolean;
    primaryColor: 'Gold' | 'Blue' | 'Emerald' | 'Violet' | 'Rose';
    fontFamily: 'Inter' | 'Roboto' | 'Open Sans';
  };
  privacy: {
    twoFactor: boolean;
    appLock: boolean;
  };
}

export type NoteStatus = 'New' | 'Revised' | 'Mastered';
export type NoteTemplate = 'Theory' | 'Formula' | 'Q&A' | 'Revision' | 'Blank';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  subject: string;
  chapter: string;
  template: NoteTemplate;
  status: NoteStatus;
  isFavorite: boolean;
  date: number;
  tags: string[];
}

export interface ReminderItem {
  id: string;
  task: string;
  dueTime: string;
  completed: boolean;
}

export interface TimetableEntry {
  day: string;
  date: string;
  slots: { time: string; activity: string; subject: string }[];
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
  summaryType: 'Detailed',
};

export const DEFAULT_SETTINGS: UserSettings = {
  learning: {
    preferredSubject: 'Science',
    grade: '10th',
    difficulty: 'Medium',
    language: 'English',
    dailyGoalMins: 30,
  },
  aiTutor: {
    personality: 'Friendly',
    explanationStyle: 'Detailed',
    answerFormat: 'Text + Examples',
    followUp: true,
    memory: true,
  },
  chat: {
    autoSave: true,
    fontSize: 'Medium',
    voiceOutput: false,
    typingIndicator: true,
  },
  notifications: {
    studyReminders: true,
    examAlerts: true,
    aiTips: true,
    push: true,
  },
  appearance: {
    theme: 'Light',
    animations: true,
    primaryColor: 'Gold',
    fontFamily: 'Inter',
  },
  privacy: {
    twoFactor: false,
    appLock: false,
  },
};

export const SJTUTOR_AVATAR = "https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg";
