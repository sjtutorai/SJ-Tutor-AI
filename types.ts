
export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  SUMMARY = 'SUMMARY',
  QUIZ = 'QUIZ',
  HOMEWORK = 'HOMEWORK',
  ESSAY = 'ESSAY',
  TUTOR = 'TUTOR',
  PROFILE = 'PROFILE',
  NOTES = 'NOTES',
  SETTINGS = 'SETTINGS',
  ABOUT = 'ABOUT',
  ID_CARD = 'ID_CARD',
  TIMER = 'TIMER',
  PRIVACY = 'PRIVACY',
  TERMS = 'TERMS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  SHARED_CONTENT = 'SHARED_CONTENT',
  GROUPS = 'GROUPS',
  GROUP_INVITE = 'GROUP_INVITE',
}

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface HomeworkFile {
  name: string;
  type: string;
  dataUrl: string;
}

export interface StudyRequestData {
  subject: string;
  gradeClass: string;
  board: string;
  language: string;
  chapterName: string;
  author?: string;
  questionCount?: number;
  maxCharacters?: number;
  difficulty?: DifficultyLevel;
  homeworkQuery?: string;
}

export interface QuizQuestion {
  question: string;
  imageUrl?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  answerKeyExplanation?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  images?: string[];
  timestamp: number;
  id?: string;
  suggestions?: string[];
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
  board?: string;
  bio: string;
  photoURL?: string;
  language?: string;
  learningGoal?: string;
  learningStyle?: 'Visual' | 'Auditory' | 'Reading/Writing' | 'Kinesthetic';
  credits: number;
  planType?: 'Free' | 'Starter' | 'Scholar' | 'Achiever';
  phoneVerified?: boolean;
  registrationNumber?: string;
  dob?: string;
  state?: string;
  district?: string;
  claimedOffers?: number[];
  emblems?: string[];
  hasCompletedOnboarding?: boolean;
  isRegisteredInFirestore?: boolean;
  trialStartDate?: number;
  twoFactorEnabled?: boolean;
  twoFactorPassword?: string;
  pinLockEnabled?: boolean;
  securityPin?: string;
  securityPinLength?: 4 | 6;
  biometricsEnabled?: boolean;
}

export type RingtoneStyle = 
  | 'Modern Chime' 
  | 'Classic Phone' 
  | 'Melodic Marimba' 
  | 'Cosmic Synth' 
  | 'Gentle Zen' 
  | 'Energetic Pulse';

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
    twoFactorPassword?: string;
    pinLock: boolean;
    appLock: boolean;
    pin?: string;
    pinLength?: 4 | 6;
    biometrics?: boolean;
  };
  calls: {
    ringtone: RingtoneStyle;
    ringtoneVolume: number; // 0 to 100
    ringbackStyle: 'Standard' | 'Melodic' | 'Subtle';
    vibrateOnCall: boolean;
    enableSoundAlerts: boolean;
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
  folder?: string;
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

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  totalScore: number;
  quizzesCompleted: number;
  highestScore: number;
  lastActive: number;
}

export const INITIAL_FORM_DATA: StudyRequestData = {
  subject: '',
  gradeClass: '',
  board: '',
  language: 'English',
  chapterName: '',
  author: '',
  questionCount: 5,
  maxCharacters: 5000,
  difficulty: 'Medium',
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
    twoFactorPassword: '',
    pinLock: false,
    appLock: false,
    pin: '',
    pinLength: 4,
    biometrics: false,
  },
  calls: {
    ringtone: 'Modern Chime',
    ringtoneVolume: 80,
    ringbackStyle: 'Standard',
    vibrateOnCall: true,
    enableSoundAlerts: true,
  },
};

export const SJTUTOR_AVATAR = "/logo.png";
export const SJTUTOR_AVATAR_REMOTE = "https://sjtutorai.vercel.app/logo.png";
export const SJTUTOR_AVATAR_IBB = "https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg";

export interface GroupPollOption {
  id: string;
  text: string;
  votes: string[]; // array of user UIDs
}

export interface GroupPoll {
  question: string;
  options: GroupPollOption[];
  allowMultiple?: boolean;
  createdBy: string;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'member';
  joinedAt: number;
  canMessage?: boolean;
  lastActive?: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  isAi?: boolean;
  text: string;
  timestamp: number;
  type: 'text' | 'image' | 'poll' | 'system' | 'note' | 'voice';
  mediaUrl?: string;
  noteData?: { title: string; content: string; subject?: string };
  pollData?: GroupPoll;
  replyTo?: { id: string; senderName: string; text: string };
  reactions?: Record<string, string[]>; // { "👍": ["uid1"] }
  status?: 'sent' | 'delivered' | 'read';
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  gradeClass?: string;
  iconEmoji?: string;
  iconUrl?: string;
  bgColor?: string;
  createdBy: string;
  creatorName: string;
  createdAt: number;
  updatedAt: number;
  members: Record<string, GroupMember>;
  memberCount: number;
  isPublic: boolean;
  onlyAdminsCanMessage?: boolean;
  inviteCode: string;
  pinnedMessageId?: string;
  pinnedMessageText?: string;
  joinRequests?: Record<string, { uid: string; displayName: string; photoURL?: string; requestedAt: number }>;
  onlyAdminsCanPost?: boolean;
  onlyAdminsCanEditInfo?: boolean;
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: number;
  };
  chatBgImage?: string;
  chatBgColor?: string;
  chatBgOverlay?: number;
  chatBgBlur?: number;
  chatBgOverlay?: number; // 0 to 1
  chatBgBlur?: number; // 0 to 20 px
}

export interface ChatBackgroundConfig {
  imageUrl?: string;
  bgColor?: string;
  overlayOpacity?: number; // 0 to 1
  blur?: number; // px
  themePreset?: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: string;
  users: string[]; // [uid1, uid2]
  status: FriendshipStatus;
  requestedBy: string; // UID of requester
  createdAt: number;
  updatedAt: number;
  userDetails?: Record<string, {
    uid: string;
    displayName: string;
    photoURL?: string;
    email?: string;
    registrationNumber?: string;
    institution?: string;
    grade?: string;
  }>;
}

export interface DirectMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: number;
  type: 'text' | 'image' | 'voice' | 'note' | 'system';
  mediaUrl?: string;
  voiceUrl?: string;
  noteData?: { title: string; content: string; subject?: string };
  replyTo?: { id: string; senderName: string; text: string };
  reactions?: Record<string, string[]>; // { "👍": ["uid1"] }
  status?: 'sent' | 'delivered' | 'read';
}

export interface DirectChat {
  id: string;
  participants: string[]; // [uid1, uid2]
  participantDetails: Record<string, {
    uid: string;
    displayName: string;
    photoURL?: string;
    email?: string;
    registrationNumber?: string;
    lastActive?: number;
  }>;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    timestamp: number;
    read?: boolean;
  };
  unreadCount?: Record<string, number>; // { [uid]: count }
  clearedAt?: Record<string, number>; // { [uid]: timestamp }
  createdAt: number;
  updatedAt: number;
  chatBgImage?: string;
  chatBgColor?: string;
  chatBgOverlay?: number;
  chatBgBlur?: number;
}

export type TimerStateType = 'IDLE' | 'RUNNING' | 'PAUSED';

export interface UserTimerState {
  timerState: TimerStateType;
  timeLeftMs: number;
  initialTimeMs: number;
  expectedEndTime: number | null;
  isFocusModeActive: boolean;
  selectedApps: string[];
  inputH: string;
  inputM: string;
  inputS: string;
  updatedAt: number;
  deviceId?: string;
}

export interface StudySessionRecord {
  id?: string;
  date: string;
  duration: number;
  completed: boolean;
  focusMode: boolean;
  timestamp?: number;
}

export type CallType = 'audio' | 'video';

export type DirectCallStatus = 'ringing' | 'connected' | 'ended' | 'declined' | 'busy' | 'missed';

export interface DirectCall {
  id: string;
  chatId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  type: CallType;
  status: DirectCallStatus;
  startedAt: number;
  offer?: { type: string; sdp: string };
  answer?: { type: string; sdp: string };
  callerCandidates?: any[];
  receiverCandidates?: any[];
  callerMuted?: boolean;
  receiverMuted?: boolean;
  callerVideoOff?: boolean;
  receiverVideoOff?: boolean;
  connectedAt?: number;
  endedAt?: number;
  duration?: number;
}

export interface GroupCallParticipant {
  uid: string;
  displayName: string;
  photoURL?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  joinedAt: number;
  role?: 'host' | 'participant';
}

export interface GroupCall {
  id: string;
  groupId: string;
  groupName: string;
  hostUid: string;
  hostName: string;
  type: CallType;
  status: 'active' | 'ended';
  startedAt: number;
  endedAt?: number;
  participants: Record<string, GroupCallParticipant>;
}

