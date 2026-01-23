
export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  SUMMARY = 'SUMMARY',
  QUIZ = 'QUIZ',
  ESSAY = 'ESSAY',
  TUTOR = 'TUTOR',
  PROFILE = 'PROFILE',
  NOTES = 'NOTES'
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
