import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SmartTimetable,
  SmartTimetableSession,
  TimetableSubjectConfig,
  TimetableAvailabilityConfig,
  TimetableBreakPreferences,
  TimetableExamInfo,
  TimetablePlanType,
  TimetableSubjectDifficulty,
  TimetableConfidenceLevel,
  TimetablePriorityLevel,
  DayOfWeek,
  TimetableSessionType,
  ReminderOffsetType,
  ReminderItem,
  UserProfile,
} from '../types';
import {
  Sparkles,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Download,
  Printer,
  Share2,
  Copy,
  Archive,
  Bell,
  BookOpen,
  BarChart3,
  Layers,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Upload,
  FileText,
  X,
  Sun,
  Sunset,
  Moon,
  Coffee,
  GripVertical,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiService } from '../services/geminiService';
import {
  saveSmartTimetablesToFirestore,
  getSmartTimetablesFromFirestore,
} from '../utils/firebaseUtils';
import { useNotifications } from './NotificationContext';
import { jsPDF } from 'jspdf';
import Logo from './Logo';

interface SmartTimetableGeneratorProps {
  userId: string | null;
  userProfile?: UserProfile;
  reminders: ReminderItem[];
  onUpdateReminders: (next: ReminderItem[]) => void;
  onDeductCredit?: (amount: number) => boolean;
}

const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const COMMON_SUBJECTS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Social Science',
  'History',
  'Geography',
  'Civics',
  'English',
  'Kannada',
  'Hindi',
  'Computer Science',
];

const SUBJECT_COLOR_PALETTE: Record<
  string,
  {
    label: string;
    bg: string;
    lightBg: string;
    border: string;
    text: string;
    badgeBg: string;
    hex: [number, number, number];
  }
> = {
  blue: {
    label: 'Electric Blue',
    bg: 'bg-blue-600',
    lightBg: 'bg-blue-50/90 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-100/80 dark:bg-blue-900/50',
    hex: [37, 99, 235],
  },
  violet: {
    label: 'Royal Violet',
    bg: 'bg-violet-600',
    lightBg: 'bg-violet-50/90 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    text: 'text-violet-700 dark:text-violet-300',
    badgeBg: 'bg-violet-100/80 dark:bg-violet-900/50',
    hex: [124, 58, 237],
  },
  emerald: {
    label: 'Emerald',
    bg: 'bg-emerald-600',
    lightBg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-100/80 dark:bg-emerald-900/50',
    hex: [5, 150, 105],
  },
  amber: {
    label: 'Golden Amber',
    bg: 'bg-amber-500',
    lightBg: 'bg-amber-50/90 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-100/80 dark:bg-amber-900/50',
    hex: [217, 119, 6],
  },
  rose: {
    label: 'Crimson Rose',
    bg: 'bg-rose-600',
    lightBg: 'bg-rose-50/90 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-100/80 dark:bg-rose-900/50',
    hex: [225, 29, 72],
  },
  cyan: {
    label: 'Ocean Cyan',
    bg: 'bg-cyan-600',
    lightBg: 'bg-cyan-50/90 dark:bg-cyan-950/40',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-300',
    badgeBg: 'bg-cyan-100/80 dark:bg-cyan-900/50',
    hex: [8, 145, 178],
  },
  indigo: {
    label: 'Deep Indigo',
    bg: 'bg-indigo-600',
    lightBg: 'bg-indigo-50/90 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-700 dark:text-indigo-300',
    badgeBg: 'bg-indigo-100/80 dark:bg-indigo-900/50',
    hex: [79, 70, 229],
  },
  orange: {
    label: 'Sunset Orange',
    bg: 'bg-orange-500',
    lightBg: 'bg-orange-50/90 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
    badgeBg: 'bg-orange-100/80 dark:bg-orange-900/50',
    hex: [234, 88, 12],
  },
};

const COLOR_KEYS = Object.keys(SUBJECT_COLOR_PALETTE);

interface TimetableTemplatePreset {
  id: string;
  name: string;
  subtitle: string;
  planType: TimetablePlanType;
  sessionDuration: 25 | 30 | 45 | 60 | 90;
  hasSchool: boolean;
  studyStart: string;
  studyEnd: string;
  revisionFrequency: 'Daily' | 'Every 2 Days' | 'Weekly' | 'Weekends Only';
}

const TIMETABLE_TEMPLATES: TimetableTemplatePreset[] = [
  {
    id: 'balanced-daily',
    name: 'Balanced Daily Routine',
    subtitle: 'Steady daily progress across core subjects with smart breaks',
    planType: 'Weekly Study Timetable',
    sessionDuration: 45,
    hasSchool: true,
    studyStart: '16:30',
    studyEnd: '21:30',
    revisionFrequency: 'Every 2 Days',
  },
  {
    id: 'school-student',
    name: 'School Student Timetable',
    subtitle: 'Built around 8 AM–3:30 PM school hours & evening study blocks',
    planType: 'Weekly Study Timetable',
    sessionDuration: 45,
    hasSchool: true,
    studyStart: '17:00',
    studyEnd: '21:30',
    revisionFrequency: 'Daily',
  },
  {
    id: 'exam-prep',
    name: 'Exam Preparation Plan',
    subtitle: 'High-intensity syllabus completion, active recall & mock tests',
    planType: 'Exam Preparation Timetable',
    sessionDuration: 60,
    hasSchool: false,
    studyStart: '07:00',
    studyEnd: '21:30',
    revisionFrequency: 'Daily',
  },
  {
    id: 'weekend-study',
    name: 'Weekend Study Plan',
    subtitle: 'Deep-work Saturday & Sunday blocks for backlog & revision',
    planType: 'Custom Timetable',
    sessionDuration: 60,
    hasSchool: false,
    studyStart: '08:00',
    studyEnd: '20:00',
    revisionFrequency: 'Weekends Only',
  },
  {
    id: 'holiday-study',
    name: 'Holiday Study Plan',
    subtitle: 'Full-day flexible vacation routine with generous breaks',
    planType: 'Holiday Timetable',
    sessionDuration: 45,
    hasSchool: false,
    studyStart: '08:30',
    studyEnd: '19:30',
    revisionFrequency: 'Every 2 Days',
  },
  {
    id: 'revision-focused',
    name: 'Revision-Focused Timetable',
    subtitle: 'Rapid spaced-repetition cycles & practice problem sets',
    planType: 'Exam Preparation Timetable',
    sessionDuration: 30,
    hasSchool: true,
    studyStart: '16:30',
    studyEnd: '21:30',
    revisionFrequency: 'Daily',
  },
  {
    id: 'custom-plan',
    name: 'Custom Timetable',
    subtitle: 'Tailor every time window, break, and subject priority from scratch',
    planType: 'Custom Timetable',
    sessionDuration: 45,
    hasSchool: true,
    studyStart: '16:00',
    studyEnd: '21:00',
    revisionFrequency: 'Daily',
  },
];

const GENERATION_STAGES = [
  'Analysing your subjects...',
  'Understanding your availability...',
  'Evaluating subject priorities...',
  'Balancing study sessions...',
  'Scheduling revision periods...',
  'Preparing your personalised timetable...',
];

const IMPROVEMENT_OPTIONS = [
  {
    id: 'balance',
    label: 'Balance my subjects',
    desc: 'Distribute study time evenly so no subject is neglected',
  },
  {
    id: 'difficult',
    label: 'Give more time to difficult subjects',
    desc: 'Allocate extra peak-focus blocks to Difficult & Needs Improvement subjects',
  },
  {
    id: 'revision',
    label: 'Increase revision sessions',
    desc: 'Add more active-recall and spaced-repetition revision blocks',
  },
  {
    id: 'reduce',
    label: 'Reduce daily study hours',
    desc: 'Make the daily workload lighter and prevent burnout',
  },
  {
    id: 'exams',
    label: 'Prepare for upcoming exams',
    desc: 'Prioritize exam dates, practice papers, and incomplete chapters',
  },
  {
    id: 'optimise',
    label: 'Optimise my available time',
    desc: 'Eliminate dead gaps and align subjects with morning/evening energy levels',
  },
  {
    id: 'new',
    label: 'Create a completely new timetable',
    desc: 'Open the 6-step wizard to configure a brand-new study plan',
  },
];

function parseTimeToMins(t: string): number {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return 16 * 60;
  return Math.max(0, Math.min(23 * 60 + 59, parseInt(m[1], 10) * 60 + parseInt(m[2], 10)));
}

function formatMinsToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 55, Math.round(mins)));
  const hh = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export const SmartTimetableGenerator: React.FC<SmartTimetableGeneratorProps> = ({
  userId,
  userProfile,
  reminders,
  onUpdateReminders,
}) => {
  const { triggerToast } = useNotifications();

  // Persistent list of timetables
  const [timetables, setTimetables] = useState<SmartTimetable[]>([]);
  const [activeTimetableId, setActiveTimetableId] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  // Mode: 'DASHBOARD' | 'WIZARD' | 'GENERATING'
  const [screenMode, setScreenMode] = useState<'DASHBOARD' | 'WIZARD' | 'GENERATING'>('DASHBOARD');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [editingTimetableId, setEditingTimetableId] = useState<string | null>(null);
  const [generationStageIdx, setGenerationStageIdx] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Dashboard View Selector: 'WEEKLY' | 'DAILY' | 'CALENDAR' | 'SUBJECT' | 'ANALYTICS'
  const [dashboardView, setDashboardView] = useState<
    'WEEKLY' | 'DAILY' | 'CALENDAR' | 'SUBJECT' | 'ANALYTICS'
  >('WEEKLY');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);

  // Modals
  const [selectedSession, setSelectedSession] = useState<SmartTimetableSession | null>(null);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
  const [pendingImproveGoal, setPendingImproveGoal] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isManageTimetablesOpen, setIsManageTimetablesOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);

  // Wizard Step 1 State
  const [ttName, setTtName] = useState('My Smart Study Timetable');
  const [ttGrade, setTtGrade] = useState(userProfile?.grade || '10th Grade');
  const [ttBoard, setTtBoard] = useState(userProfile?.board || 'CBSE');
  const [ttPlanType, setTtPlanType] = useState<TimetablePlanType>('Weekly Study Timetable');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('balanced-daily');

  // Wizard Step 2 State: Subjects
  const [subjects, setSubjects] = useState<TimetableSubjectConfig[]>([
    {
      id: 'subj-1',
      name: 'Mathematics',
      targetHours: 1.5,
      targetMode: 'daily',
      difficulty: 'Difficult',
      confidence: 'Needs Improvement',
      priority: 'High',
      color: 'blue',
    },
    {
      id: 'subj-2',
      name: 'Science',
      targetHours: 1.5,
      targetMode: 'daily',
      difficulty: 'Medium',
      confidence: 'Average',
      priority: 'High',
      color: 'emerald',
    },
    {
      id: 'subj-3',
      name: 'English',
      targetHours: 1,
      targetMode: 'daily',
      difficulty: 'Easy',
      confidence: 'Strong',
      priority: 'Medium',
      color: 'violet',
    },
  ]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectHours, setNewSubjectHours] = useState<number>(1);
  const [newSubjectMode, setNewSubjectMode] = useState<'daily' | 'weekly'>('daily');
  const [newSubjectDifficulty, setNewSubjectDifficulty] =
    useState<TimetableSubjectDifficulty>('Medium');
  const [newSubjectConfidence] =
    useState<TimetableConfidenceLevel>('Average');
  const [newSubjectPriority] = useState<TimetablePriorityLevel>('Medium');
  const [newSubjectColor, setNewSubjectColor] = useState<string>('indigo');

  // Wizard Step 3 State: Availability
  const [availability, setAvailability] = useState<TimetableAvailabilityConfig>({
    preset: 'Evening Study',
    preferredDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    morningAvailable: true,
    afternoonAvailable: false,
    eveningAvailable: true,
    nightAvailable: true,
    studyStartTime: '16:30',
    studyEndTime: '21:30',
    hasSchoolHours: true,
    schoolStartTime: '08:00',
    schoolEndTime: '15:30',
    hasCoachingHours: false,
    coachingStartTime: '17:00',
    coachingEndTime: '18:30',
    travelMinutesPerDay: 30,
    customWindows: [],
  });

  // Wizard Step 4 State: Breaks & Preferences
  const [breakPrefs, setBreakPrefs] = useState<TimetableBreakPreferences>({
    sessionDurationMinutes: 45,
    maxContinuousStudyMinutes: 90,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    lunchBreakTime: '13:00',
    lunchBreakDuration: 45,
    dinnerBreakTime: '20:00',
    dinnerBreakDuration: 30,
    sleepStartTime: '22:30',
    sleepEndTime: '06:00',
    revisionFrequency: 'Daily',
    autoInsertBreaks: true,
  });

  // Wizard Step 5 State: Exam Info
  const [examInfo, setExamInfo] = useState<TimetableExamInfo>({
    examName: '',
    examStartDate: '',
    examEndDate: '',
    revisionRequirements: 'Include 1 daily active recall session and weekend practice tests',
    syllabusNotes: '',
    subjectExams: [],
  });
  const syllabusFileRef = useRef<HTMLInputElement | null>(null);

  // New / Edit Session Form State
  const [sessionForm, setSessionForm] = useState<{
    day: DayOfWeek;
    startTime: string;
    durationMinutes: number;
    subject: string;
    topic: string;
    sessionType: TimetableSessionType;
    color: string;
    notes: string;
    reminderOffset: ReminderOffsetType;
  }>({
    day: 'Monday',
    startTime: '17:00',
    durationMinutes: 45,
    subject: 'Mathematics',
    topic: 'Core Concept Practice',
    sessionType: 'Study',
    color: 'blue',
    notes: '',
    reminderOffset: '10m',
  });

  // Load saved timetables from Firestore / localStorage
  useEffect(() => {
    let mounted = true;
    setIsLoadingInitial(true);
    getSmartTimetablesFromFirestore(userId)
      .then((list) => {
        if (!mounted) return;
        setTimetables(list);
        const active = list.find((t) => t.isActive && !t.isArchived) || list.find((t) => !t.isArchived);
        if (active) {
          setActiveTimetableId(active.id);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingInitial(false);
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Rotate generation stage messages while generating
  useEffect(() => {
    if (screenMode !== 'GENERATING') return;
    setGenerationStageIdx(0);
    const interval = window.setInterval(() => {
      setGenerationStageIdx((prev) => (prev < GENERATION_STAGES.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => window.clearInterval(interval);
  }, [screenMode]);

  const activeTimetable = useMemo(() => {
    return (
      timetables.find((t) => t.id === activeTimetableId && !t.isArchived) ||
      timetables.find((t) => !t.isArchived) ||
      null
    );
  }, [timetables, activeTimetableId]);

  const persistTimetables = (nextList: SmartTimetable[]) => {
    setTimetables(nextList);
    saveSmartTimetablesToFirestore(userId, nextList);
  };

  // Apply a template preset in Step 1
  const handleSelectTemplate = (tpl: TimetableTemplatePreset) => {
    setSelectedTemplateId(tpl.id);
    setTtPlanType(tpl.planType);
    setAvailability((prev) => ({
      ...prev,
      hasSchoolHours: tpl.hasSchool,
      studyStartTime: tpl.studyStart,
      studyEndTime: tpl.studyEnd,
      preferredDays:
        tpl.id === 'weekend-study'
          ? ['Saturday', 'Sunday']
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    }));
    setBreakPrefs((prev) => ({
      ...prev,
      sessionDurationMinutes: tpl.sessionDuration,
      revisionFrequency: tpl.revisionFrequency,
    }));
    triggerToast(
      `Template Applied: ${tpl.name}`,
      'All steps have been pre-configured. You can customize any detail!',
      'Important Alerts'
    );
  };

  // Capacity & Conflict check for Step 3
  const capacityAnalysis = useMemo(() => {
    const startM = parseTimeToMins(availability.studyStartTime);
    const endM = parseTimeToMins(availability.studyEndTime);
    let rawDailyWindowMins = endM > startM ? endM - startM : 240;
    if (availability.hasCoachingHours) {
      const cS = parseTimeToMins(availability.coachingStartTime);
      const cE = parseTimeToMins(availability.coachingEndTime);
      if (cE > cS && cS >= startM && cE <= endM) {
        rawDailyWindowMins -= cE - cS;
      }
    }
    rawDailyWindowMins = Math.max(60, rawDailyWindowMins - availability.travelMinutesPerDay);
    const availableDailyHours = Number((rawDailyWindowMins / 60).toFixed(1));

    const requestedDailyHours = Number(
      subjects
        .reduce((acc, s) => {
          const daily =
            s.targetMode === 'daily'
              ? s.targetHours
              : s.targetHours / Math.max(1, availability.preferredDays.length);
          return acc + daily;
        }, 0)
        .toFixed(1)
    );

    const hasConflict = requestedDailyHours > availableDailyHours;
    return {
      availableDailyHours,
      requestedDailyHours,
      hasConflict,
    };
  }, [availability, subjects]);

  // Add a subject in Step 2
  const handleAddSubject = (presetName?: string) => {
    const nameToUse = (presetName || newSubjectName).trim();
    if (!nameToUse) return;
    if (subjects.some((s) => s.name.toLowerCase() === nameToUse.toLowerCase())) {
      triggerToast('Subject Exists', `${nameToUse} is already in your subject list.`, 'Important Alerts');
      return;
    }
    const nextColor = COLOR_KEYS[subjects.length % COLOR_KEYS.length];
    const item: TimetableSubjectConfig = {
      id: `subj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: nameToUse,
      targetHours: presetName ? 1 : newSubjectHours || 1,
      targetMode: presetName ? 'daily' : newSubjectMode,
      difficulty: presetName ? 'Medium' : newSubjectDifficulty,
      confidence: presetName ? 'Average' : newSubjectConfidence,
      priority: presetName ? 'Medium' : newSubjectPriority,
      color: presetName ? nextColor : newSubjectColor,
    };
    setSubjects((prev) => [...prev, item]);
    if (!presetName) setNewSubjectName('');
  };

  const handleMoveSubject = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= subjects.length) return;
    const copy = [...subjects];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setSubjects(copy);
  };

  // Handle Syllabus Upload in Step 5
  const handleSyllabusFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result.slice(0, 2500) : '';
      setExamInfo((prev) => ({
        ...prev,
        syllabusNotes: `${prev.syllabusNotes}\n[Uploaded Syllabus: ${file.name}]\n${content}`.trim(),
      }));
      triggerToast('Syllabus Attached 📄', `Loaded syllabus details from "${file.name}".`, 'Important Alerts');
    };
    reader.readAsText(file);
  };

  // Start Wizard for creating or editing a timetable
  const openWizardForNew = () => {
    setEditingTimetableId(null);
    setTtName(`Smart Study Plan ${timetables.length + 1}`);
    setWizardStep(1);
    setGenerationError(null);
    setScreenMode('WIZARD');
  };

  const openWizardForEdit = (tt: SmartTimetable) => {
    setEditingTimetableId(tt.id);
    setTtName(tt.name);
    setTtGrade(tt.gradeClass);
    setTtBoard(tt.board);
    setTtPlanType(tt.planType);
    setSelectedTemplateId(tt.templateId || 'balanced-daily');
    setSubjects(tt.subjects);
    setAvailability(tt.availability);
    setBreakPrefs(tt.breakPreferences);
    setExamInfo(tt.examInfo);
    setWizardStep(1);
    setGenerationError(null);
    setScreenMode('WIZARD');
  };

  // Generate Smart Timetable via Gemini AI
  const handleGenerateSmartTimetable = async () => {
    if (subjects.length === 0) {
      triggerToast('No Subjects Selected', 'Please add at least one subject in Step 2.', 'Important Alerts');
      setWizardStep(2);
      return;
    }
    if (availability.preferredDays.length === 0) {
      triggerToast('No Days Selected', 'Please select at least one study day in Step 3.', 'Important Alerts');
      setWizardStep(3);
      return;
    }

    setGenerationError(null);
    setScreenMode('GENERATING');

    try {
      const config = {
        name: ttName.trim() || 'My Smart Study Timetable',
        gradeClass: ttGrade.trim() || '10th Grade',
        board: ttBoard.trim() || 'CBSE',
        planType: ttPlanType,
        templateId: selectedTemplateId,
        subjects,
        availability,
        breakPreferences: breakPrefs,
        examInfo,
      };

      const result = await GeminiService.generateSmartTimetable(config);
      const now = Date.now();
      const newId = editingTimetableId || `smart_tt_${now}`;

      const newTimetable: SmartTimetable = {
        id: newId,
        ...config,
        isActive: true,
        isArchived: false,
        sessions: result.sessions,
        aiAdvice: result.aiAdvice,
        conflictWarning:
          result.conflictWarning ||
          (capacityAnalysis.hasConflict
            ? `Note: Your requested ${capacityAnalysis.requestedDailyHours}h/day exceeded your ${capacityAnalysis.availableDailyHours}h/day window, so sessions were balanced to fit your real availability.`
            : undefined),
        createdAt: editingTimetableId
          ? timetables.find((t) => t.id === editingTimetableId)?.createdAt || now
          : now,
        updatedAt: now,
      };

      const nextList = editingTimetableId
        ? timetables.map((t) =>
            t.id === editingTimetableId ? newTimetable : { ...t, isActive: false }
          )
        : [newTimetable, ...timetables.map((t) => ({ ...t, isActive: false }))];

      persistTimetables(nextList);
      setActiveTimetableId(newId);
      setScreenMode('DASHBOARD');
      triggerToast(
        'Smart Timetable Ready! ✨',
        `Generated ${result.sessions.length} conflict-free sessions across ${availability.preferredDays.length} days.`,
        'Important Alerts'
      );
    } catch (err: any) {
      console.error('Smart timetable generation failed:', err);
      setGenerationError(
        err?.message || 'Could not generate your timetable right now. Please try again.'
      );
      setScreenMode('WIZARD');
      setWizardStep(6);
    }
  };

  // Update sessions inside the active timetable
  const updateActiveTimetableSessions = (
    updater: (sessions: SmartTimetableSession[]) => SmartTimetableSession[]
  ) => {
    if (!activeTimetable) return;
    const updatedSessions = updater(activeTimetable.sessions);
    const nextList = timetables.map((t) =>
      t.id === activeTimetable.id
        ? { ...t, sessions: updatedSessions, updatedAt: Date.now() }
        : t
    );
    persistTimetables(nextList);
  };

  // Toggle session completion with animation & toast
  const handleToggleSessionComplete = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    updateActiveTimetableSessions((sessions) =>
      sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const nextCompleted = !s.completed;
        if (nextCompleted) {
          triggerToast(
            'Session Completed! 🎯',
            `Great job completing "${s.subject} — ${s.topic}" (${s.durationMinutes} mins)!`,
            'Important Alerts'
          );
        }
        return {
          ...s,
          completed: nextCompleted,
          completedAt: nextCompleted ? Date.now() : undefined,
        };
      })
    );
    if (selectedSession && selectedSession.id === sessionId) {
      setSelectedSession((prev) =>
        prev ? { ...prev, completed: !prev.completed, completedAt: !prev.completed ? Date.now() : undefined } : null
      );
    }
  };

  // Move / Reschedule a session to a target day & startTime with overlap prevention
  const handleMoveOrRescheduleSession = (
    sessionId: string,
    targetDay: DayOfWeek,
    targetStartTime?: string
  ) => {
    if (!activeTimetable) return;
    const currentSession = activeTimetable.sessions.find((s) => s.id === sessionId);
    if (!currentSession) return;

    const desiredStartMins = parseTimeToMins(targetStartTime || currentSession.startTime);
    const dur = currentSession.durationMinutes;

    const otherDaySessions = activeTimetable.sessions
      .filter((s) => s.day === targetDay && s.id !== sessionId)
      .sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));

    let finalStartMins = desiredStartMins;
    let hadOverlap = false;

    for (const existing of otherDaySessions) {
      const exStart = parseTimeToMins(existing.startTime);
      const exEnd = parseTimeToMins(existing.endTime);
      if (finalStartMins < exEnd && finalStartMins + dur > exStart) {
        hadOverlap = true;
        finalStartMins = exEnd + 5; // automatically place 5 mins after conflicting session
      }
    }

    const finalStartTime = formatMinsToTime(finalStartMins);
    const finalEndTime = formatMinsToTime(finalStartMins + dur);

    if (hadOverlap) {
      setConflictBanner(
        `Scheduling conflict prevented on ${targetDay}: "${currentSession.subject}" was automatically shifted to ${finalStartTime}–${finalEndTime} so two subjects never overlap.`
      );
      setTimeout(() => setConflictBanner(null), 6500);
    } else {
      setConflictBanner(null);
    }

    updateActiveTimetableSessions((sessions) =>
      sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              day: targetDay,
              startTime: finalStartTime,
              endTime: finalEndTime,
            }
          : s
      )
    );

    if (selectedSession?.id === sessionId) {
      setSelectedSession((prev) =>
        prev
          ? {
              ...prev,
              day: targetDay,
              startTime: finalStartTime,
              endTime: finalEndTime,
            }
          : null
      );
    }
  };

  // Sync a session reminder with the main SJ Tutor AI reminders list (avoiding duplicates)
  const handleSyncSessionReminder = (
    session: SmartTimetableSession,
    offset: ReminderOffsetType
  ) => {
    const remId = session.reminderId || `tt_rem_${session.id}`;
    if (offset === 'none') {
      const filtered = reminders.filter((r) => r.id !== remId);
      onUpdateReminders(filtered);
      updateActiveTimetableSessions((list) =>
        list.map((s) => (s.id === session.id ? { ...s, reminderOffset: 'none', reminderId: undefined } : s))
      );
      triggerToast('Reminder Removed', `Cleared reminder for ${session.subject}.`, 'Important Alerts');
      return;
    }

    const offsetMins =
      offset === '5m' ? 5 : offset === '10m' ? 10 : offset === '15m' ? 15 : offset === 'custom' ? session.customReminderMinutes || 20 : 0;
    const sessionMins = Math.max(0, parseTimeToMins(session.startTime) - offsetMins);
    const reminderTimeStr = formatMinsToTime(sessionMins);
    const todayIso = new Date().toISOString().split('T')[0];
    const dueTimeIso = new Date(`${todayIso}T${reminderTimeStr}:00`).toISOString();

    const newRem: ReminderItem = {
      id: remId,
      task: `📚 [${session.day} ${session.startTime}] ${session.subject}: ${session.topic} (${
        offset === 'at_time' ? 'At start' : `${offsetMins}m before`
      })`,
      dueTime: dueTimeIso,
      completed: session.completed,
    };

    const exists = reminders.some((r) => r.id === remId);
    const nextReminders = exists
      ? reminders.map((r) => (r.id === remId ? newRem : r))
      : [newRem, ...reminders];
    onUpdateReminders(nextReminders);

    updateActiveTimetableSessions((list) =>
      list.map((s) =>
        s.id === session.id ? { ...s, reminderOffset: offset, reminderId: remId } : s
      )
    );

    if (selectedSession?.id === session.id) {
      setSelectedSession((prev) =>
        prev ? { ...prev, reminderOffset: offset, reminderId: remId } : null
      );
    }

    triggerToast(
      'Smart Reminder Set 🔔',
      `We will notify you ${offset === 'at_time' ? 'at' : `${offsetMins} mins before`} ${session.subject} (${session.day} ${session.startTime}).`,
      'Important Alerts'
    );
  };

  // Add a custom session manually
  const handleAddNewSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTimetable) return;
    const startMins = parseTimeToMins(sessionForm.startTime);
    const dur = Math.max(10, Math.min(180, Number(sessionForm.durationMinutes) || 45));
    const newId = `st_manual_${Date.now()}`;
    const newSess: SmartTimetableSession = {
      id: newId,
      day: sessionForm.day,
      startTime: formatMinsToTime(startMins),
      endTime: formatMinsToTime(startMins + dur),
      durationMinutes: dur,
      subject: sessionForm.subject.trim() || 'General Study',
      topic: sessionForm.topic.trim() || 'Focused Study Session',
      sessionType: sessionForm.sessionType,
      color: sessionForm.color,
      completed: false,
      notes: sessionForm.notes,
      reminderOffset: sessionForm.reminderOffset,
    };

    updateActiveTimetableSessions((prev) => [...prev, newSess]);
    setIsAddSessionModalOpen(false);
    triggerToast('Session Added ✅', `Added "${newSess.subject}" on ${newSess.day}.`, 'Important Alerts');
  };

  // Delete session
  const handleDeleteSession = (sessionId: string) => {
    updateActiveTimetableSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (selectedSession?.id === sessionId) setSelectedSession(null);
    triggerToast('Session Removed', 'Study session deleted from your timetable.', 'Important Alerts');
  };

  // Improve My Timetable via AI
  const handleConfirmImproveTimetable = async () => {
    if (!activeTimetable || !pendingImproveGoal) return;
    if (pendingImproveGoal === 'new') {
      setIsImproveModalOpen(false);
      setPendingImproveGoal(null);
      openWizardForNew();
      return;
    }

    const goalObj = IMPROVEMENT_OPTIONS.find((o) => o.id === pendingImproveGoal);
    const goalText = goalObj ? `${goalObj.label}: ${goalObj.desc}` : pendingImproveGoal;
    setIsImproveModalOpen(false);
    setPendingImproveGoal(null);
    setScreenMode('GENERATING');

    try {
      const improved = await GeminiService.improveSmartTimetable(activeTimetable, goalText);
      const nextList = timetables.map((t) =>
        t.id === activeTimetable.id
          ? {
              ...t,
              sessions: improved.sessions,
              aiAdvice: improved.aiAdvice,
              updatedAt: Date.now(),
            }
          : t
      );
      persistTimetables(nextList);
      setScreenMode('DASHBOARD');
      triggerToast(
        'Timetable Optimised! ✨',
        `Updated your schedule for: "${goalObj?.label || 'Smart Optimization'}".`,
        'Important Alerts'
      );
    } catch (err: any) {
      setScreenMode('DASHBOARD');
      triggerToast(
        'Optimization Notice',
        err?.message || 'Could not regenerate timetable right now.',
        'Important Alerts'
      );
    }
  };

  // Export functions: A4 PDF, PNG, CSV, Print, Share
  const handleExportPDF = () => {
    if (!activeTimetable) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(`SJ TUTOR AI — ${activeTimetable.name}`, 14, 12);
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(
      `Class: ${activeTimetable.gradeClass} (${activeTimetable.board})  |  Plan: ${activeTimetable.planType}  |  Generated: ${new Date().toLocaleDateString()}`,
      14,
      19
    );

    let y = 32;
    for (const day of DAYS_OF_WEEK) {
      const daySessions = activeTimetable.sessions
        .filter((s) => s.day === day)
        .sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));
      if (daySessions.length === 0) continue;

      if (y > 180) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 5, 269, 8, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.text(day.toUpperCase(), 17, y);
      y += 6;

      for (const sess of daySessions) {
        if (y > 192) {
          doc.addPage();
          y = 20;
        }
        const pal = SUBJECT_COLOR_PALETTE[sess.color] || SUBJECT_COLOR_PALETTE.blue;
        doc.setFillColor(pal.hex[0], pal.hex[1], pal.hex[2]);
        doc.rect(14, y - 3.5, 3, 5.5, 'F');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(
          `${sess.startTime} - ${sess.endTime} (${sess.durationMinutes}m)  |  [${sess.sessionType}] ${sess.subject}: ${sess.topic} ${
            sess.completed ? '[COMPLETED]' : ''
          }`,
          20,
          y
        );
        y += 6.5;
      }
      y += 3;
    }

    doc.save(`${activeTimetable.name.replace(/\s+/g, '_').toLowerCase()}_timetable.pdf`);
    setIsExportMenuOpen(false);
    triggerToast('PDF Downloaded 📄', 'Your A4 study timetable PDF is ready.', 'Important Alerts');
  };

  const handleExportCSV = () => {
    if (!activeTimetable) return;
    const headers = ['Day', 'Start Time', 'End Time', 'Duration (Mins)', 'Subject', 'Topic', 'Type', 'Status'];
    const rows = activeTimetable.sessions.map((s) => [
      s.day,
      s.startTime,
      s.endTime,
      String(s.durationMinutes),
      `"${s.subject.replace(/"/g, '""')}"`,
      `"${s.topic.replace(/"/g, '""')}"`,
      s.sessionType,
      s.completed ? 'Completed' : 'Planned',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTimetable.name.replace(/\s+/g, '_').toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
    triggerToast('CSV Exported 📊', 'Downloaded spreadsheet-ready timetable CSV.', 'Important Alerts');
  };

  const handleExportPNG = () => {
    if (!activeTimetable) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1400, 95);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(`SJ TUTOR AI — ${activeTimetable.name}`, 40, 48);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(
      `${activeTimetable.gradeClass} (${activeTimetable.board}) • ${activeTimetable.planType}`,
      40,
      76
    );

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 95, 1400, 805);

    const colW = 190;
    DAYS_OF_WEEK.forEach((day, dIdx) => {
      const x = 35 + dIdx * colW;
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(day, x, 130);

      const daySessions = activeTimetable.sessions
        .filter((s) => s.day === day)
        .sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));

      daySessions.slice(0, 7).forEach((sess, sIdx) => {
        const y = 150 + sIdx * 98;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, colW - 14, 86);
        const pal = SUBJECT_COLOR_PALETTE[sess.color] || SUBJECT_COLOR_PALETTE.blue;
        ctx.fillStyle = `rgb(${pal.hex[0]}, ${pal.hex[1]}, ${pal.hex[2]})`;
        ctx.fillRect(x, y, 6, 86);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillText(sess.subject.slice(0, 18), x + 14, y + 24);
        ctx.fillStyle = '#475569';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`${sess.startTime} - ${sess.endTime}`, x + 14, y + 44);
        ctx.fillText(sess.topic.slice(0, 22), x + 14, y + 64);
      });
    });

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${activeTimetable.name.replace(/\s+/g, '_').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setIsExportMenuOpen(false);
    triggerToast('PNG Image Downloaded 🖼️', 'Saved high-resolution timetable snapshot.', 'Important Alerts');
  };

  const handleShareTimetable = async () => {
    if (!activeTimetable) return;
    const summaryLines = DAYS_OF_WEEK.map((day) => {
      const ds = activeTimetable.sessions.filter((s) => s.day === day && s.sessionType !== 'Break');
      if (ds.length === 0) return null;
      return `${day}: ${ds.map((s) => `${s.startTime} ${s.subject}`).join(' | ')}`;
    })
      .filter(Boolean)
      .join('\n');

    const text = `🎓 SJ Tutor AI — ${activeTimetable.name} (${activeTimetable.gradeClass})\n\n${summaryLines}`;
    try {
      await navigator.clipboard.writeText(text);
      triggerToast('Copied to Clipboard! 🔗', 'Timetable summary is ready to share with friends or parents.', 'Important Alerts');
    } catch {
      triggerToast('Share Ready', 'Select Print or PDF to share your timetable.', 'Important Alerts');
    }
    setIsExportMenuOpen(false);
  };

  // Computed Dashboard KPIs & Real Completed Study Analytics
  const stats = useMemo(() => {
    if (!activeTimetable) {
      return {
        totalWeeklyHours: 0,
        completedHours: 0,
        totalStudySessions: 0,
        completedSessions: 0,
        missedSessions: 0,
        completionRate: 0,
        dailyAvgHours: 0,
        bySubject: [] as {
          subject: string;
          color: string;
          plannedMins: number;
          completedMins: number;
          completedCount: number;
          totalCount: number;
        }[],
        byDay: [] as {
          day: DayOfWeek;
          shortDay: string;
          plannedHours: number;
          completedHours: number;
          completedCount: number;
          totalCount: number;
        }[],
      };
    }

    const nonBreakSessions = activeTimetable.sessions.filter((s) => s.sessionType !== 'Break');
    const totalStudyMins = nonBreakSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const completedList = nonBreakSessions.filter((s) => s.completed);
    const completedMins = completedList.reduce((acc, s) => acc + s.durationMinutes, 0);

    const totalWeeklyHours = Number((totalStudyMins / 60).toFixed(1));
    const completedHours = Number((completedMins / 60).toFixed(1));
    const totalStudySessions = nonBreakSessions.length;
    const completedSessions = completedList.length;
    const missedSessions = Math.max(0, totalStudySessions - completedSessions);
    const completionRate =
      totalStudySessions > 0 ? Math.round((completedSessions / totalStudySessions) * 100) : 0;
    const activeDaysCount = Math.max(
      1,
      new Set(nonBreakSessions.map((s) => s.day)).size
    );
    const dailyAvgHours = Number((totalWeeklyHours / activeDaysCount).toFixed(1));

    const subjMap: Record<
      string,
      {
        subject: string;
        color: string;
        plannedMins: number;
        completedMins: number;
        completedCount: number;
        totalCount: number;
      }
    > = {};

    nonBreakSessions.forEach((s) => {
      if (!subjMap[s.subject]) {
        subjMap[s.subject] = {
          subject: s.subject,
          color: s.color || 'blue',
          plannedMins: 0,
          completedMins: 0,
          completedCount: 0,
          totalCount: 0,
        };
      }
      subjMap[s.subject].plannedMins += s.durationMinutes;
      subjMap[s.subject].totalCount += 1;
      if (s.completed) {
        subjMap[s.subject].completedMins += s.durationMinutes;
        subjMap[s.subject].completedCount += 1;
      }
    });

    const byDay = DAYS_OF_WEEK.map((day) => {
      const ds = nonBreakSessions.filter((s) => s.day === day);
      const pMins = ds.reduce((a, b) => a + b.durationMinutes, 0);
      const cMins = ds.filter((s) => s.completed).reduce((a, b) => a + b.durationMinutes, 0);
      return {
        day,
        shortDay: day.slice(0, 3),
        plannedHours: Number((pMins / 60).toFixed(1)),
        completedHours: Number((cMins / 60).toFixed(1)),
        completedCount: ds.filter((s) => s.completed).length,
        totalCount: ds.length,
      };
    });

    return {
      totalWeeklyHours,
      completedHours,
      totalStudySessions,
      completedSessions,
      missedSessions,
      completionRate,
      dailyAvgHours,
      bySubject: Object.values(subjMap),
      byDay,
    };
  }, [activeTimetable]);

  // ---------------------------------------------------------------------------
  // RENDER 1: BEAUTIFUL AI GENERATION EXPERIENCE
  // ---------------------------------------------------------------------------
  if (screenMode === 'GENERATING') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-2xl mx-auto my-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 text-center relative overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Animated AI Orb */}
        <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/35 via-indigo-500/30 to-violet-500/35 blur-xl"
          />
          <div className="absolute inset-1 rounded-full border-2 border-indigo-400/35 animate-perspective-orbit" />
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-primary-500 via-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30"
          >
            <div className="w-full h-full rounded-[13px] bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden">
              <Logo className="w-full h-full" iconOnly noBorder />
            </div>
          </motion.div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" style={{ animationDuration: '4s' }} />
          <span>AI Smart Timetable Engine</span>
        </div>

        <div className="h-9 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.h3
              key={generationStageIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight"
            >
              {GENERATION_STAGES[generationStageIdx]}
            </motion.h3>
          </AnimatePresence>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          Designing a conflict-free schedule around your subjects, availability, school timings, and revision goals.
        </p>

        {/* Live Stage Checklist */}
        <div className="mt-7 max-w-sm mx-auto space-y-2 text-left">
          {GENERATION_STAGES.map((stageText, idx) => {
            const isDone = idx < generationStageIdx;
            const isCurrent = idx === generationStageIdx;
            return (
              <div
                key={stageText}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border text-xs transition-all ${
                  isCurrent
                    ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold shadow-2xs'
                    : isDone
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                </div>
                <span className="truncate">{stageText}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER 2: 6-STEP MULTI-STEP TIMETABLE CREATION WIZARD
  // ---------------------------------------------------------------------------
  if (screenMode === 'WIZARD') {
    const stepTitles = [
      { step: 1, title: 'Basic Info & Templates' },
      { step: 2, title: 'Subject Selection' },
      { step: 3, title: 'Available Study Time' },
      { step: 4, title: 'Breaks & Preferences' },
      { step: 5, title: 'Exam Information' },
      { step: 6, title: 'Review & Generate' },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-6"
      >
        {/* Top Bar with Back Button + Step Progress */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                {timetables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScreenMode('DASHBOARD')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    title="Back to Timetable Dashboard"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  <span>
                    {editingTimetableId ? 'Edit Smart Study Timetable' : 'AI Smart Timetable Wizard'}
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Step {wizardStep} of 6 — {stepTitles[wizardStep - 1].title}
              </p>
            </div>

            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
              {Math.round((wizardStep / 6) * 100)}% Configured
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {stepTitles.map((s) => {
              const isCurrent = wizardStep === s.step;
              const isDone = wizardStep > s.step;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setWizardStep(s.step)}
                  className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-primary-50/90 dark:bg-primary-950/40 border-primary-500 text-primary-800 dark:text-primary-300 shadow-2xs'
                      : isDone
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      Step {s.step}
                    </span>
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <div className="text-xs font-bold truncate">{s.title}</div>
                </button>
              );
            })}
          </div>
        </div>

        {generationError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{generationError}</span>
            </div>
            <button
              type="button"
              onClick={handleGenerateSmartTimetable}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer"
            >
              Retry Now
            </button>
          </div>
        )}

        {/* WIZARD STEP CONTENT CARD */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`wizard-step-${wizardStep}`}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6"
          >
            {/* STEP 1: BASIC INFORMATION & TEMPLATES */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    1. Choose a Starting Template (Customisable)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pick a ready-made blueprint or start with a custom schedule.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {TIMETABLE_TEMPLATES.map((tpl) => {
                      const active = selectedTemplateId === tpl.id;
                      return (
                        <motion.button
                          key={tpl.id}
                          type="button"
                          whileHover={{ y: -2, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectTemplate(tpl)}
                          className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                            active
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/40 shadow-xs'
                              : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {tpl.name}
                            </span>
                            {active && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {tpl.subtitle}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Timetable Name
                    </label>
                    <input
                      type="text"
                      value={ttName}
                      onChange={(e) => setTtName(e.target.value)}
                      placeholder="e.g. Midterm Excellence Plan"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Timetable Type
                    </label>
                    <select
                      value={ttPlanType}
                      onChange={(e) => setTtPlanType(e.target.value as TimetablePlanType)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Daily Study Timetable">Daily Study Timetable</option>
                      <option value="Weekly Study Timetable">Weekly Study Timetable</option>
                      <option value="Exam Preparation Timetable">Exam Preparation Timetable</option>
                      <option value="Holiday Timetable">Holiday Timetable</option>
                      <option value="Custom Timetable">Custom Timetable</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Class / Grade
                    </label>
                    <input
                      type="text"
                      value={ttGrade}
                      onChange={(e) => setTtGrade(e.target.value)}
                      placeholder="e.g. 10th Grade"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Educational Board
                    </label>
                    <select
                      value={ttBoard}
                      onChange={(e) => setTtBoard(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="CBSE">CBSE</option>
                      <option value="ICSE">ICSE</option>
                      <option value="State Board">State Board</option>
                      <option value="IB / IGCSE">IB / IGCSE</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SUBJECT SELECTION */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    2. Add Your Subjects & Priorities
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Click any common subject to add it instantly, or configure a custom subject below.
                  </p>

                  {/* Quick-Add Common Subject Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {COMMON_SUBJECTS.map((subjName) => {
                      const alreadyAdded = subjects.some(
                        (s) => s.name.toLowerCase() === subjName.toLowerCase()
                      );
                      return (
                        <button
                          key={subjName}
                          type="button"
                          onClick={() => !alreadyAdded && handleAddSubject(subjName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                            alreadyAdded
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {alreadyAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          <span>{subjName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Subject Builder Row */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Custom Subject Name
                    </label>
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g. Sanskrit, Economics, Robotics..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Target Hours ({newSubjectMode})
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="25"
                        value={newSubjectHours}
                        onChange={(e) => setNewSubjectHours(parseFloat(e.target.value) || 1)}
                        className="w-16 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                      />
                      <select
                        value={newSubjectMode}
                        onChange={(e) => setNewSubjectMode(e.target.value as 'daily' | 'weekly')}
                        className="flex-1 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                      >
                        <option value="daily">/ Day</option>
                        <option value="weekly">/ Week</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Difficulty</label>
                    <select
                      value={newSubjectDifficulty}
                      onChange={(e) =>
                        setNewSubjectDifficulty(e.target.value as TimetableSubjectDifficulty)
                      }
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Difficult">Difficult</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Colour</label>
                    <select
                      value={newSubjectColor}
                      onChange={(e) => setNewSubjectColor(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                    >
                      {COLOR_KEYS.map((ck) => (
                        <option key={ck} value={ck}>
                          {SUBJECT_COLOR_PALETTE[ck].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSubject()}
                    className="btn-glow-border py-2 px-4 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Subject</span>
                  </button>
                </div>

                {/* Subject List with Inline Editing, Colour Coding & Reordering */}
                {subjects.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      No subjects selected yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click any common subject above or add a custom subject to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {subjects.map((subj, idx) => {
                      const pal = SUBJECT_COLOR_PALETTE[subj.color] || SUBJECT_COLOR_PALETTE.blue;
                      return (
                        <motion.div
                          key={subj.id}
                          layout
                          className={`p-3.5 rounded-2xl border ${pal.border} ${pal.lightBg} flex flex-wrap items-center justify-between gap-3`}
                        >
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleMoveSubject(idx, 'up')}
                                disabled={idx === 0}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Move subject up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveSubject(idx, 'down')}
                                disabled={idx === subjects.length - 1}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Move subject down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className={`w-3.5 h-9 rounded-full ${pal.bg}`} />
                            <div>
                              <input
                                type="text"
                                value={subj.name}
                                onChange={(e) =>
                                  setSubjects((prev) =>
                                    prev.map((s) =>
                                      s.id === subj.id ? { ...s, name: e.target.value } : s
                                    )
                                  )
                                }
                                className="font-extrabold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-slate-400 outline-none"
                              />
                              <div className="text-[10px] font-semibold text-slate-500">
                                Priority #{idx + 1}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {/* Target hours */}
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="20"
                                value={subj.targetHours}
                                onChange={(e) =>
                                  setSubjects((prev) =>
                                    prev.map((s) =>
                                      s.id === subj.id
                                        ? { ...s, targetHours: parseFloat(e.target.value) || 1 }
                                        : s
                                    )
                                  )
                                }
                                className="w-12 text-xs font-bold bg-transparent outline-none text-slate-800 dark:text-white"
                              />
                              <span className="text-[10px] text-slate-400">
                                h/{subj.targetMode === 'daily' ? 'day' : 'wk'}
                              </span>
                            </div>

                            {/* Difficulty */}
                            <select
                              value={subj.difficulty}
                              onChange={(e) =>
                                setSubjects((prev) =>
                                  prev.map((s) =>
                                    s.id === subj.id
                                      ? {
                                          ...s,
                                          difficulty: e.target.value as TimetableSubjectDifficulty,
                                        }
                                      : s
                                  )
                                )
                              }
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                            >
                              <option value="Easy">Easy</option>
                              <option value="Medium">Medium</option>
                              <option value="Difficult">Difficult</option>
                            </select>

                            {/* Confidence */}
                            <select
                              value={subj.confidence}
                              onChange={(e) =>
                                setSubjects((prev) =>
                                  prev.map((s) =>
                                    s.id === subj.id
                                      ? {
                                          ...s,
                                          confidence: e.target.value as TimetableConfidenceLevel,
                                        }
                                      : s
                                  )
                                )
                              }
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                            >
                              <option value="Strong">Confidence: Strong</option>
                              <option value="Average">Confidence: Average</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                            </select>

                            {/* Priority */}
                            <select
                              value={subj.priority}
                              onChange={(e) =>
                                setSubjects((prev) =>
                                  prev.map((s) =>
                                    s.id === subj.id
                                      ? { ...s, priority: e.target.value as TimetablePriorityLevel }
                                      : s
                                  )
                                )
                              }
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                            >
                              <option value="Low">Priority: Low</option>
                              <option value="Medium">Priority: Medium</option>
                              <option value="High">Priority: High</option>
                            </select>

                            {/* Colour selector */}
                            <select
                              value={subj.color}
                              onChange={(e) =>
                                setSubjects((prev) =>
                                  prev.map((s) =>
                                    s.id === subj.id ? { ...s, color: e.target.value } : s
                                  )
                                )
                              }
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                            >
                              {COLOR_KEYS.map((ck) => (
                                <option key={ck} value={ck}>
                                  {SUBJECT_COLOR_PALETTE[ck].label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                setSubjects((prev) => prev.filter((s) => s.id !== subj.id))
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              title="Remove subject"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: AVAILABLE STUDY TIME */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      3. Available Study Time & Weekly Routine
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Configure your preferred study days, time windows, and school/coaching blocks.
                    </p>
                  </div>

                  {/* Schedule Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        'Morning Study',
                        'Evening Study',
                        'Full-Day Holiday Study',
                        'Custom Schedule',
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (preset === 'Morning Study') {
                            setAvailability((prev) => ({
                              ...prev,
                              preset,
                              morningAvailable: true,
                              eveningAvailable: true,
                              studyStartTime: '05:30',
                              studyEndTime: '08:00',
                            }));
                          } else if (preset === 'Evening Study') {
                            setAvailability((prev) => ({
                              ...prev,
                              preset,
                              morningAvailable: false,
                              eveningAvailable: true,
                              nightAvailable: true,
                              studyStartTime: '16:30',
                              studyEndTime: '21:30',
                            }));
                          } else if (preset === 'Full-Day Holiday Study') {
                            setAvailability((prev) => ({
                              ...prev,
                              preset,
                              hasSchoolHours: false,
                              morningAvailable: true,
                              afternoonAvailable: true,
                              eveningAvailable: true,
                              studyStartTime: '08:30',
                              studyEndTime: '20:00',
                            }));
                          } else {
                            setAvailability((prev) => ({ ...prev, preset }));
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          availability.preset === preset
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Study Days (Mon - Sun) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Interactive Weekly Availability Selector (Monday – Sunday)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const active = availability.preferredDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setAvailability((prev) => ({
                              ...prev,
                              preferredDays: active
                                ? prev.preferredDays.filter((d) => d !== day)
                                : [...prev.preferredDays, day],
                            }))
                          }
                          className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            active
                              ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-700 dark:text-primary-300 shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-primary-600" />}
                          <span>{day.slice(0, 3)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time of Day Availability Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'morningAvailable', label: 'Morning (5–11 AM)', icon: Sun },
                    { key: 'afternoonAvailable', label: 'Afternoon (12–4 PM)', icon: Coffee },
                    { key: 'eveningAvailable', label: 'Evening (4–8 PM)', icon: Sunset },
                    { key: 'nightAvailable', label: 'Night (8–11 PM)', icon: Moon },
                  ].map((period) => {
                    const Icon = period.icon;
                    const isOn = Boolean((availability as any)[period.key]);
                    return (
                      <button
                        key={period.key}
                        type="button"
                        onClick={() =>
                          setAvailability((prev) => ({
                            ...prev,
                            [period.key]: !(prev as any)[period.key],
                          }))
                        }
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-3 ${
                          isOn
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 text-blue-800 dark:text-blue-200'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">{period.label}</div>
                          <div className="text-[10px] opacity-75">
                            {isOn ? 'Available' : 'Unavailable'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Study Window, School Hours, Coaching Hours & Travel */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="text-xs font-extrabold text-slate-800 dark:text-white">
                      Primary Study Window
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={availability.studyStartTime}
                          onChange={(e) =>
                            setAvailability((prev) => ({ ...prev, studyStartTime: e.target.value }))
                          }
                          className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={availability.studyEndTime}
                          onChange={(e) =>
                            setAvailability((prev) => ({ ...prev, studyEndTime: e.target.value }))
                          }
                          className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                        Block School Hours
                      </span>
                      <input
                        type="checkbox"
                        checked={availability.hasSchoolHours}
                        onChange={(e) =>
                          setAvailability((prev) => ({ ...prev, hasSchoolHours: e.target.checked }))
                        }
                        className="rounded text-primary-600"
                      />
                    </label>
                    {availability.hasSchoolHours && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">
                            From
                          </label>
                          <input
                            type="time"
                            value={availability.schoolStartTime}
                            onChange={(e) =>
                              setAvailability((prev) => ({
                                ...prev,
                                schoolStartTime: e.target.value,
                              }))
                            }
                            className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">To</label>
                          <input
                            type="time"
                            value={availability.schoolEndTime}
                            onChange={(e) =>
                              setAvailability((prev) => ({
                                ...prev,
                                schoolEndTime: e.target.value,
                              }))
                            }
                            className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                        Coaching / Tuition Hours
                      </span>
                      <input
                        type="checkbox"
                        checked={availability.hasCoachingHours}
                        onChange={(e) =>
                          setAvailability((prev) => ({
                            ...prev,
                            hasCoachingHours: e.target.checked,
                          }))
                        }
                        className="rounded text-primary-600"
                      />
                    </label>
                    {availability.hasCoachingHours ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">
                            From
                          </label>
                          <input
                            type="time"
                            value={availability.coachingStartTime}
                            onChange={(e) =>
                              setAvailability((prev) => ({
                                ...prev,
                                coachingStartTime: e.target.value,
                              }))
                            }
                            className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase">To</label>
                          <input
                            type="time"
                            value={availability.coachingEndTime}
                            onChange={(e) =>
                              setAvailability((prev) => ({
                                ...prev,
                                coachingEndTime: e.target.value,
                              }))
                            }
                            className="w-full mt-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">
                          Daily Travel Time (Minutes)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="180"
                          step="15"
                          value={availability.travelMinutesPerDay}
                          onChange={(e) =>
                            setAvailability((prev) => ({
                              ...prev,
                              travelMinutesPerDay: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-Time Capacity & Conflict Warning Banner */}
                {capacityAnalysis.hasConflict && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold">Study Time Conflict Detected:</span> Your
                        selected subjects request{' '}
                        <span className="font-bold">{capacityAnalysis.requestedDailyHours} hrs/day</span>,
                        which exceeds your available study window of{' '}
                        <span className="font-bold">{capacityAnalysis.availableDailyHours} hrs/day</span>.
                        We recommend extending your study window or auto-scaling subject hours.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const perSubj = Number(
                          Math.max(
                            0.5,
                            capacityAnalysis.availableDailyHours / Math.max(1, subjects.length)
                          ).toFixed(1)
                        );
                        setSubjects((prev) =>
                          prev.map((s) => ({ ...s, targetHours: perSubj, targetMode: 'daily' }))
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Auto-Balance Hours
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: BREAKS AND PREFERENCES */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    4. Breaks, Session Duration & Sleep Schedule
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure Pomodoro-style intervals, restorative breaks, and sleep protection.
                  </p>
                </div>

                {/* Preferred Study Session Duration Pills */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Preferred Study Session Duration
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {([25, 30, 45, 60, 90] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          setBreakPrefs((prev) => ({ ...prev, sessionDurationMinutes: mins }))
                        }
                        className={`py-3 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                          breakPrefs.sessionDurationMinutes === mins
                            ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {mins} Mins
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Short Break (Mins)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="30"
                      value={breakPrefs.shortBreakMinutes}
                      onChange={(e) =>
                        setBreakPrefs((prev) => ({
                          ...prev,
                          shortBreakMinutes: parseInt(e.target.value, 10) || 10,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Long Break (Mins)
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="60"
                      value={breakPrefs.longBreakMinutes}
                      onChange={(e) =>
                        setBreakPrefs((prev) => ({
                          ...prev,
                          longBreakMinutes: parseInt(e.target.value, 10) || 25,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Preferred Revision Frequency
                    </label>
                    <select
                      value={breakPrefs.revisionFrequency}
                      onChange={(e) =>
                        setBreakPrefs((prev) => ({
                          ...prev,
                          revisionFrequency: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    >
                      <option value="Daily">Daily Revision</option>
                      <option value="Every 2 Days">Every 2 Days</option>
                      <option value="Weekly">Weekly Revision</option>
                      <option value="Weekends Only">Weekends Only</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Dinner Break Time
                    </label>
                    <input
                      type="time"
                      value={breakPrefs.dinnerBreakTime}
                      onChange={(e) =>
                        setBreakPrefs((prev) => ({ ...prev, dinnerBreakTime: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Sleep Start Time
                    </label>
                    <input
                      type="time"
                      value={breakPrefs.sleepStartTime}
                      onChange={(e) =>
                        setBreakPrefs((prev) => ({ ...prev, sleepStartTime: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Wake Up Time
                    </label>
                    <input
                      type="time"
                      value={breakPrefs.sleepEndTime}
                      onChange={(e) =>
                        setBreakPrefs((prev) => ({ ...prev, sleepEndTime: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={breakPrefs.autoInsertBreaks}
                    onChange={(e) =>
                      setBreakPrefs((prev) => ({ ...prev, autoInsertBreaks: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <div>
                    <div className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                      Automatically insert restorative breaks between study blocks
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Prevents cognitive fatigue and boosts long-term retention.
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* STEP 5: EXAM INFORMATION (OPTIONAL) */}
            {wizardStep === 5 && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      5. Examination Details & Syllabus (Optional)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Add upcoming exam dates or syllabus notes so AI prioritizes incomplete chapters.
                    </p>
                  </div>

                  <input
                    ref={syllabusFileRef}
                    type="file"
                    accept=".txt,.md,.csv,.json"
                    onChange={handleSyllabusFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => syllabusFileRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Syllabus Document</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Examination Name
                    </label>
                    <input
                      type="text"
                      value={examInfo.examName}
                      onChange={(e) => setExamInfo((prev) => ({ ...prev, examName: e.target.value }))}
                      placeholder="e.g. Pre-Board / Final Term Exams"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Exam Start Date
                    </label>
                    <input
                      type="date"
                      value={examInfo.examStartDate}
                      onChange={(e) =>
                        setExamInfo((prev) => ({ ...prev, examStartDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Exam End Date
                    </label>
                    <input
                      type="date"
                      value={examInfo.examEndDate}
                      onChange={(e) =>
                        setExamInfo((prev) => ({ ...prev, examEndDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                    Chapters to Complete & Specific Revision Goals
                  </label>
                  <textarea
                    rows={4}
                    value={examInfo.syllabusNotes}
                    onChange={(e) =>
                      setExamInfo((prev) => ({ ...prev, syllabusNotes: e.target.value }))
                    }
                    placeholder="e.g. Math: Quadratic Equations, Trigonometry | Science: Light Reflection & Refraction, Chemical Reactions..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW AND GENERATE */}
            {wizardStep === 6 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    6. Review Your Smart Timetable Configuration
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Verify your settings below or click any section to edit before generating.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                        Basic Info & Template
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="text-xs font-bold text-primary-600 hover:underline cursor-pointer"
                      >
                        Edit Step 1
                      </button>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div>
                        <span className="font-semibold">Name:</span> {ttName}
                      </div>
                      <div>
                        <span className="font-semibold">Class & Board:</span> {ttGrade} ({ttBoard})
                      </div>
                      <div>
                        <span className="font-semibold">Type:</span> {ttPlanType}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                        Subjects ({subjects.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="text-xs font-bold text-primary-600 hover:underline cursor-pointer"
                      >
                        Edit Step 2
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map((s) => {
                        const pal = SUBJECT_COLOR_PALETTE[s.color] || SUBJECT_COLOR_PALETTE.blue;
                        return (
                          <span
                            key={s.id}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${pal.border} ${pal.lightBg} ${pal.text}`}
                          >
                            {s.name} ({s.targetHours}h • {s.difficulty})
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                        Availability & Routine
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="text-xs font-bold text-primary-600 hover:underline cursor-pointer"
                      >
                        Edit Step 3
                      </button>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div>
                        <span className="font-semibold">Days:</span>{' '}
                        {availability.preferredDays.map((d) => d.slice(0, 3)).join(', ')}
                      </div>
                      <div>
                        <span className="font-semibold">Study Window:</span>{' '}
                        {availability.studyStartTime} – {availability.studyEndTime}
                      </div>
                      <div>
                        <span className="font-semibold">School Block:</span>{' '}
                        {availability.hasSchoolHours
                          ? `${availability.schoolStartTime} – ${availability.schoolEndTime}`
                          : 'None'}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                        Breaks & Exam Focus
                      </span>
                      <button
                        type="button"
                        onClick={() => setWizardStep(4)}
                        className="text-xs font-bold text-primary-600 hover:underline cursor-pointer"
                      >
                        Edit Step 4/5
                      </button>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      <div>
                        <span className="font-semibold">Session Length:</span>{' '}
                        {breakPrefs.sessionDurationMinutes} mins (Short break:{' '}
                        {breakPrefs.shortBreakMinutes}m)
                      </div>
                      <div>
                        <span className="font-semibold">Revision:</span>{' '}
                        {breakPrefs.revisionFrequency}
                      </div>
                      {examInfo.examName && (
                        <div>
                          <span className="font-semibold">Target Exam:</span> {examInfo.examName} (
                          {examInfo.examStartDate || 'Upcoming'})
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleGenerateSmartTimetable}
                  className="btn-glow-border w-full py-4 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 hover:from-primary-600 hover:via-indigo-500 hover:to-primary-800 text-white rounded-xl font-extrabold text-lg shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                  <span>✨ Generate My Smart Timetable</span>
                </motion.button>
              </div>
            )}

            {/* Wizard Footer Navigation */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                disabled={wizardStep === 1}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>

              {wizardStep < 6 && (
                <motion.button
                  type="button"
                  whileHover={{ y: -1, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setWizardStep((s) => Math.min(6, s + 1))}
                  className="btn-glow-border px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span>Continue to Step {wizardStep + 1}</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER 3: EMPTY STATE (WHEN NO TIMETABLE HAS BEEN CREATED YET)
  // ---------------------------------------------------------------------------
  if (!isLoadingInitial && !activeTimetable) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-12 text-center relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary-500 via-indigo-600 to-violet-600 p-1 mx-auto mb-5 shadow-xl shadow-indigo-500/20">
          <div className="w-full h-full rounded-[20px] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
            <Logo className="w-full h-full" iconOnly noBorder />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Your perfect study routine starts here!
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          Let AI create a personalised timetable that fits your subjects, school timings, exam goals, and daily routine.
        </p>

        {/* Quick Template Preview Pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-xl mx-auto">
          {TIMETABLE_TEMPLATES.slice(0, 5).map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => {
                handleSelectTemplate(tpl);
                openWizardForNew();
              }}
              className="px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
            >
              ⚡ {tpl.name}
            </button>
          ))}
        </div>

        <div className="mt-8 max-w-sm mx-auto">
          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={openWizardForNew}
            className="btn-glow-border w-full py-4 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 hover:from-primary-600 hover:via-indigo-500 hover:to-primary-800 text-white rounded-xl font-extrabold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
            <span>Create My Timetable</span>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  if (isLoadingInitial || !activeTimetable) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="h-28 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shimmer-surface" />
        <div className="h-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shimmer-surface" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER 4: GENERATED TIMETABLE DASHBOARD
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* HEADER & TIMETABLE SELECTOR BAR */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Active Smart Schedule • {activeTimetable.planType}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Your Personalised Study Timetable
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Designed intelligently around your learning goals and daily routine.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timetable Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsManageTimetablesOpen((o) => !o)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer"
              >
                <Layers className="w-4 h-4 text-primary-600" />
                <span className="max-w-[150px] truncate">{activeTimetable.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-black">
                  ACTIVE
                </span>
              </button>
            </div>

            <motion.button
              type="button"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsAddSessionModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer group"
            >
              <Plus className="w-4 h-4 text-primary-600 group-hover:rotate-90 transition-transform" />
              <span>+ Session</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsImproveModalOpen(true)}
              className="btn-glow-border px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer group"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 group-hover:scale-110 transition-transform" />
              <span>✨ Improve My Timetable</span>
            </motion.button>

            {/* Export Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((o) => !o)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 z-30 space-y-1">
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span>Download as PDF (A4)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPNG}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-500" />
                    <span>Download as PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      window.print();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-indigo-500" />
                    <span>Print Timetable</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShareTimetable}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-violet-500" />
                    <span>Share Timetable</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6 TOP KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/70">
          <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Timetable</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
              {activeTimetable.name}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Class / Board</div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
              {activeTimetable.gradeClass} • {activeTimetable.board}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60">
            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
              Weekly Study Hours
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
              {stats.completedHours}h / {stats.totalWeeklyHours}h
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/60">
            <div className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase">
              Total Subjects
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
              {activeTimetable.subjects.length} Subjects
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60">
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
              Daily Average
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
              {stats.dailyAvgHours} hrs / day
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              <span>Completion</span>
              <span>{stats.completionRate}%</span>
            </div>
            <div className="w-full h-2 bg-emerald-200/70 dark:bg-emerald-950 rounded-full overflow-hidden mt-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.completionRate}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* AI Coaching Tip or Conflict Warning */}
        {(activeTimetable.aiAdvice || conflictBanner || activeTimetable.conflictWarning) && (
          <div className="mt-4 flex flex-col gap-2">
            {activeTimetable.aiAdvice && (
              <div className="px-4 py-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong className="font-extrabold">AI Study Tip:</strong> {activeTimetable.aiAdvice}
                </span>
              </div>
            )}
            {(conflictBanner || activeTimetable.conflictWarning) && (
              <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{conflictBanner || activeTimetable.conflictWarning}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* MULTI-TIMETABLE MANAGER DRAWER (WHEN OPEN) */}
      <AnimatePresence>
        {isManageTimetablesOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4 overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Manage Your Timetables ({timetables.filter((t) => !t.isArchived).length})
                </h3>
                <p className="text-xs text-slate-400">
                  Switch active timetable, rename, duplicate, edit in wizard, or create a new schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={openWizardForNew}
                className="btn-glow-border px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Timetable</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {timetables
                .filter((t) => !t.isArchived)
                .map((tt) => {
                  const isCurrent = tt.id === activeTimetable.id;
                  return (
                    <div
                      key={tt.id}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'bg-primary-50/50 dark:bg-primary-950/30 border-primary-500'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          {renamingId === tt.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 text-xs font-bold flex-1"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (renameValue.trim()) {
                                    persistTimetables(
                                      timetables.map((item) =>
                                        item.id === tt.id
                                          ? { ...item, name: renameValue.trim() }
                                          : item
                                      )
                                    );
                                  }
                                  setRenamingId(null);
                                }}
                                className="p-1 text-emerald-600 cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {tt.name}
                            </h4>
                          )}
                          {tt.isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {tt.gradeClass} • {tt.planType} • {tt.sessions.length} sessions
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTimetableId(tt.id);
                              persistTimetables(
                                timetables.map((item) => ({
                                  ...item,
                                  isActive: item.id === tt.id,
                                }))
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary-600 text-white text-[11px] font-bold cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(tt.id);
                            setRenameValue(tt.name);
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 cursor-pointer"
                          title="Rename"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openWizardForEdit(tt)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                          title="Edit in Wizard"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const dup: SmartTimetable = {
                              ...tt,
                              id: `smart_tt_${Date.now()}`,
                              name: `${tt.name} (Copy)`,
                              isActive: false,
                              createdAt: Date.now(),
                              updatedAt: Date.now(),
                            };
                            persistTimetables([dup, ...timetables]);
                            triggerToast('Timetable Duplicated', `Created "${dup.name}".`, 'Important Alerts');
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            persistTimetables(
                              timetables.map((item) =>
                                item.id === tt.id ? { ...item, isArchived: true, isActive: false } : item
                              )
                            );
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 cursor-pointer"
                          title="Archive"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = timetables.filter((item) => item.id !== tt.id);
                            persistTimetables(remaining);
                            if (activeTimetableId === tt.id) {
                              setActiveTimetableId(remaining[0]?.id || null);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW SELECTOR BAR: WEEKLY | DAILY | CALENDAR | SUBJECT | ANALYTICS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'WEEKLY', label: 'Weekly View', icon: Calendar },
            { id: 'DAILY', label: 'Daily View', icon: Clock },
            { id: 'CALENDAR', label: 'Calendar View', icon: Layers },
            { id: 'SUBJECT', label: 'Subject View', icon: BookOpen },
            { id: 'ANALYTICS', label: 'Study Analytics', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = dashboardView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDashboardView(tab.id as any)}
                className={`relative px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                  active
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="smart-tt-view-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                    className="absolute inset-0 bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 rounded-xl -z-10"
                  />
                )}
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-semibold text-slate-400 px-3 hidden md:block">
          Tip: Drag & drop cards across days or click any session to edit, set reminders, or mark completed.
        </div>
      </div>

      {/* 1. WEEKLY VIEW (MON - SUN GRID WITH DRAG & DROP) */}
      {dashboardView === 'WEEKLY' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map((day) => {
            const daySessions = activeTimetable.sessions
              .filter((s) => s.day === day)
              .sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));

            return (
              <div
                key={day}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedSessionId) {
                    handleMoveOrRescheduleSession(draggedSessionId, day);
                    setDraggedSessionId(null);
                  }
                }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 flex flex-col min-h-[360px]"
              >
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                      {day}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {daySessions.filter((s) => s.sessionType !== 'Break').length} sessions
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSessionForm((prev) => ({ ...prev, day }));
                      setIsAddSessionModalOpen(true);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-600 cursor-pointer"
                    title={`Add session to ${day}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {daySessions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-slate-700/70 rounded-xl text-slate-400 text-[11px]">
                    <span>Rest / Free Day</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 flex-1">
                    {daySessions.map((sess) => {
                      const pal =
                        SUBJECT_COLOR_PALETTE[sess.color] || SUBJECT_COLOR_PALETTE.blue;
                      return (
                        <motion.div
                          key={sess.id}
                          layout
                          draggable
                          onDragStart={() => setDraggedSessionId(sess.id)}
                          onDragEnd={() => setDraggedSessionId(null)}
                          whileHover={{ y: -2, scale: 1.01 }}
                          onClick={() => setSelectedSession(sess)}
                          className={`p-3 rounded-xl border ${pal.border} ${pal.lightBg} cursor-pointer transition shadow-2xs hover:shadow-md relative group ${
                            sess.completed ? 'opacity-75' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${pal.badgeBg} ${pal.text}`}
                            >
                              {sess.sessionType}
                            </span>

                            <div className="flex items-center gap-1">
                              <GripVertical className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.8 }}
                                onClick={(e) => handleToggleSessionComplete(sess.id, e)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                                  sess.completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                                }`}
                                title={sess.completed ? 'Completed' : 'Mark as Completed'}
                              >
                                {sess.completed && <Check className="w-3 h-3" />}
                              </motion.button>
                            </div>
                          </div>

                          <div
                            className={`font-extrabold text-xs text-slate-900 dark:text-white mt-1.5 leading-snug ${
                              sess.completed ? 'line-through opacity-75' : ''
                            }`}
                          >
                            {sess.subject}
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                            {sess.topic}
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            <span>
                              {sess.startTime} – {sess.endTime}
                            </span>
                            <span>{sess.durationMinutes}m</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. DAILY VIEW (VERTICAL TIMELINE FOR SELECTED DAY) */}
      {dashboardView === 'DAILY' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    selectedDay === day
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSessionForm((prev) => ({ ...prev, day: selectedDay }));
                setIsAddSessionModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Session to {selectedDay}</span>
            </button>
          </div>

          <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900 space-y-4">
            {activeTimetable.sessions
              .filter((s) => s.day === selectedDay)
              .sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime))
              .map((sess) => {
                const pal = SUBJECT_COLOR_PALETTE[sess.color] || SUBJECT_COLOR_PALETTE.blue;
                return (
                  <motion.div
                    key={sess.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setSelectedSession(sess)}
                    className={`relative p-4 rounded-2xl border ${pal.border} ${pal.lightBg} flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:shadow-md transition`}
                  >
                    <div
                      className={`absolute -left-[31px] top-5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${pal.bg}`}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-200">
                          {sess.startTime} – {sess.endTime}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${pal.badgeBg} ${pal.text}`}
                        >
                          {sess.sessionType} • {sess.durationMinutes} mins
                        </span>
                      </div>
                      <h4
                        className={`text-sm font-extrabold text-slate-900 dark:text-white ${
                          sess.completed ? 'line-through opacity-70' : ''
                        }`}
                      >
                        {sess.subject} — {sess.topic}
                      </h4>
                      {sess.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{sess.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSessionComplete(sess.id, e)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                          sess.completed
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{sess.completed ? 'Completed' : 'Mark Complete'}</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}

      {/* 3. CALENDAR VIEW */}
      {dashboardView === 'CALENDAR' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Monthly / Weekly Schedule Calendar
              </h3>
              <p className="text-xs text-slate-500">
                Week {calendarWeekOffset >= 0 ? `+${calendarWeekOffset + 1}` : calendarWeekOffset} Overview
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCalendarWeekOffset((w) => w - 1)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarWeekOffset(0)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Current Week
              </button>
              <button
                type="button"
                onClick={() => setCalendarWeekOffset((w) => w + 1)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
            {DAYS_OF_WEEK.map((day, dIdx) => {
              const dateObj = new Date();
              dateObj.setDate(dateObj.getDate() + calendarWeekOffset * 7 + dIdx);
              const ds = activeTimetable.sessions
                .filter((s) => s.day === day)
                .sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));
              return (
                <div
                  key={day}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2 min-h-[220px]"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white">
                      {day.slice(0, 3)}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {ds.map((s) => {
                      const pal = SUBJECT_COLOR_PALETTE[s.color] || SUBJECT_COLOR_PALETTE.blue;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSession(s)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg border ${pal.border} ${pal.lightBg} text-[10px] font-bold truncate cursor-pointer`}
                        >
                          {s.startTime} {s.subject}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SUBJECT VIEW (GROUPED BY SUBJECT) */}
      {dashboardView === 'SUBJECT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.bySubject.map((subjStat) => {
            const pal = SUBJECT_COLOR_PALETTE[subjStat.color] || SUBJECT_COLOR_PALETTE.blue;
            const subjSessions = activeTimetable.sessions.filter(
              (s) => s.subject === subjStat.subject
            );
            const pct =
              subjStat.totalCount > 0
                ? Math.round((subjStat.completedCount / subjStat.totalCount) * 100)
                : 0;
            return (
              <div
                key={subjStat.subject}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3.5 h-8 rounded-full ${pal.bg}`} />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {subjStat.subject}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {(subjStat.completedMins / 60).toFixed(1)}h completed of{' '}
                        {(subjStat.plannedMins / 60).toFixed(1)}h planned ({pct}%)
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${pal.badgeBg} ${pal.text}`}
                  >
                    {subjStat.completedCount}/{subjStat.totalCount} Done
                  </span>
                </div>

                <div className="space-y-2">
                  {subjSessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-2 cursor-pointer hover:border-indigo-400 transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-white">
                          {s.day} • {s.startTime} – {s.endTime} ({s.durationMinutes}m)
                        </div>
                        <div className="text-[11px] text-slate-500">{s.topic}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleToggleSessionComplete(s.id, e)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer ${
                          s.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-300'
                        }`}
                      >
                        {s.completed && <Check className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. STUDY PROGRESS ANALYTICS (ACTUAL COMPLETED DATA) */}
      {dashboardView === 'ANALYTICS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-400 uppercase">
                Actual Completed Hours
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {stats.completedHours} hrs
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Out of {stats.totalWeeklyHours} planned weekly hours
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-400 uppercase">Completed Sessions</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.completedSessions}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Verified completed study blocks
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-400 uppercase">
                Pending / Remaining
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {stats.missedSessions}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Sessions remaining this week
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-bold text-slate-400 uppercase">Completion Rate</div>
              <div className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">
                {stats.completionRate}%
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Based strictly on completed sessions
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Completed vs Planned Study Hours Visual Bar Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Weekly Progress Chart (Completed vs Planned Hours)
                </h3>
                <p className="text-xs text-slate-400">
                  Tracks actual completed study time each day of the week
                </p>
              </div>

              <div className="grid grid-cols-7 gap-3 items-end h-48 pt-6 px-2">
                {stats.byDay.map((d) => {
                  const maxH = Math.max(4, ...stats.byDay.map((x) => x.plannedHours));
                  const plannedPct = Math.min(100, Math.round((d.plannedHours / maxH) * 100));
                  const compPct = Math.min(100, Math.round((d.completedHours / maxH) * 100));
                  return (
                    <div key={d.day} className="flex flex-col items-center gap-2 h-full justify-end">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {d.completedHours}h
                      </div>
                      <div className="w-full max-w-[34px] h-32 bg-slate-100 dark:bg-slate-900 rounded-xl relative overflow-hidden flex items-end">
                        <div
                          style={{ height: `${plannedPct}%` }}
                          className="w-full bg-indigo-100 dark:bg-indigo-950/60 rounded-t-xl absolute bottom-0"
                        />
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${compPct}%` }}
                          className="w-full bg-gradient-to-t from-blue-600 to-violet-500 rounded-t-xl relative z-10"
                        />
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">
                        {d.shortDay}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject-Wise Completed Study Distribution & Daily Consistency Heatmap */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Subject-Wise Completed Study Time
                </h3>
                <p className="text-xs text-slate-400">
                  Actual study hours logged per subject
                </p>
              </div>

              <div className="space-y-3">
                {stats.bySubject.map((s) => {
                  const pal = SUBJECT_COLOR_PALETTE[s.color] || SUBJECT_COLOR_PALETTE.blue;
                  const pct =
                    s.plannedMins > 0 ? Math.round((s.completedMins / s.plannedMins) * 100) : 0;
                  return (
                    <div key={s.subject} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-800 dark:text-white">{s.subject}</span>
                        <span className="text-slate-500">
                          {(s.completedMins / 60).toFixed(1)}h / {(s.plannedMins / 60).toFixed(1)}h ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className={`h-full ${pal.bg} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Daily Study Activity Consistency Heatmap */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="text-xs font-extrabold text-slate-800 dark:text-white mb-2">
                  Daily Study Activity Heatmap
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {stats.byDay.map((d) => {
                    const ratio = d.totalCount > 0 ? d.completedCount / d.totalCount : 0;
                    const heatClass =
                      ratio >= 0.8
                        ? 'bg-emerald-500 text-white'
                        : ratio >= 0.4
                        ? 'bg-emerald-300 text-emerald-950'
                        : ratio > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-400';
                    return (
                      <div
                        key={d.day}
                        className={`p-2.5 rounded-xl text-center ${heatClass} transition`}
                      >
                        <div className="text-[10px] font-black uppercase">{d.shortDay}</div>
                        <div className="text-xs font-extrabold mt-0.5">
                          {d.completedCount}/{d.totalCount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SESSION DETAIL / EDIT / REMINDER MODAL */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 14 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase">
                    {selectedSession.sessionType} Session
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedSession.subject}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Reschedule Day
                  </label>
                  <select
                    value={selectedSession.day}
                    onChange={(e) =>
                      handleMoveOrRescheduleSession(
                        selectedSession.id,
                        e.target.value as DayOfWeek,
                        selectedSession.startTime
                      )
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={selectedSession.startTime}
                    onChange={(e) =>
                      handleMoveOrRescheduleSession(
                        selectedSession.id,
                        selectedSession.day,
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Change Subject
                  </label>
                  <input
                    type="text"
                    value={selectedSession.subject}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSession((prev) => (prev ? { ...prev, subject: val } : null));
                      updateActiveTimetableSessions((list) =>
                        list.map((s) => (s.id === selectedSession.id ? { ...s, subject: val } : s))
                      );
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    step="5"
                    value={selectedSession.durationMinutes}
                    onChange={(e) => {
                      const dur = Math.max(10, parseInt(e.target.value, 10) || 45);
                      const endT = formatMinsToTime(
                        parseTimeToMins(selectedSession.startTime) + dur
                      );
                      setSelectedSession((prev) =>
                        prev ? { ...prev, durationMinutes: dur, endTime: endT } : null
                      );
                      updateActiveTimetableSessions((list) =>
                        list.map((s) =>
                          s.id === selectedSession.id
                            ? { ...s, durationMinutes: dur, endTime: endT }
                            : s
                        )
                      );
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Topic / Chapter Goal
                  </label>
                  <input
                    type="text"
                    value={selectedSession.topic}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSession((prev) => (prev ? { ...prev, topic: val } : null));
                      updateActiveTimetableSessions((list) =>
                        list.map((s) => (s.id === selectedSession.id ? { ...s, topic: val } : s))
                      );
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Session Study Notes
                  </label>
                  <textarea
                    rows={2}
                    value={selectedSession.notes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSession((prev) => (prev ? { ...prev, notes: val } : null));
                      updateActiveTimetableSessions((list) =>
                        list.map((s) => (s.id === selectedSession.id ? { ...s, notes: val } : s))
                      );
                    }}
                    placeholder="Add page numbers, formulas to revise, or homework links..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white outline-none resize-none"
                  />
                </div>
              </div>

              {/* Smart Reminder Configuration */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                  <Bell className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Smart Study Reminder</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'at_time', label: 'At Session Time' },
                      { id: '5m', label: '5m Before' },
                      { id: '10m', label: '10m Before' },
                      { id: '15m', label: '15m Before' },
                      { id: 'none', label: 'Off' },
                    ] as { id: ReminderOffsetType; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSyncSessionReminder(selectedSession, opt.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        selectedSession.reminderOffset === opt.id
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteSession(selectedSession.id)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSessionComplete(selectedSession.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
                      selectedSession.completed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {selectedSession.completed ? 'Completed' : 'Mark as Completed'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSession(null)}
                    className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD NEW SESSION MODAL */}
      <AnimatePresence>
        {isAddSessionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setIsAddSessionModalOpen(false)}
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 14 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleAddNewSessionSubmit}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Add Custom Study Session
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Day</label>
                  <select
                    value={sessionForm.day}
                    onChange={(e) =>
                      setSessionForm((prev) => ({ ...prev, day: e.target.value as DayOfWeek }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Session Type
                  </label>
                  <select
                    value={sessionForm.sessionType}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        sessionType: e.target.value as TimetableSessionType,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="Study">Study</option>
                    <option value="Revision">Revision</option>
                    <option value="Practice">Practice</option>
                    <option value="Break">Break</option>
                    <option value="Assessment">Assessment</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={sessionForm.startTime}
                    onChange={(e) =>
                      setSessionForm((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    step="5"
                    value={sessionForm.durationMinutes}
                    onChange={(e) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        durationMinutes: parseInt(e.target.value, 10) || 45,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Subject</label>
                  <input
                    type="text"
                    required
                    value={sessionForm.subject}
                    onChange={(e) =>
                      setSessionForm((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    placeholder="e.g. Mathematics"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Topic / Chapter
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionForm.topic}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g. Quadratic Equations Exercise 4.2"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSessionModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-glow-border flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 text-white text-xs font-bold cursor-pointer"
                >
                  Add Session
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "✨ IMPROVE MY TIMETABLE" AI REGENERATION MODAL WITH CONFIRMATION */}
      <AnimatePresence>
        {isImproveModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => {
              setIsImproveModalOpen(false);
              setPendingImproveGoal(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 14 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  <span>✨ Improve My Timetable</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsImproveModalOpen(false);
                    setPendingImproveGoal(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select how you would like SJ Tutor AI to optimise your current schedule while preserving your core preferences:
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {IMPROVEMENT_OPTIONS.map((opt) => {
                  const isChosen = pendingImproveGoal === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPendingImproveGoal(opt.id)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition cursor-pointer ${
                        isChosen
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/40'
                          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {pendingImproveGoal && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Confirm Schedule Update:</strong> Replacing the current timetable sessions will generate a fresh AI schedule for <em>&quot;{activeTimetable.name}&quot;</em>. Continue?
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImproveModalOpen(false);
                    setPendingImproveGoal(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!pendingImproveGoal}
                  onClick={handleConfirmImproveTimetable}
                  className="btn-glow-border flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 text-white text-xs font-extrabold disabled:opacity-40 cursor-pointer"
                >
                  Confirm & Optimise
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartTimetableGenerator;
