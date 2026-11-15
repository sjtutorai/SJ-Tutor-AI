import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Flame,
  Target,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  TrendingUp,
  BookOpen,
  Sparkles,
  BarChart3,
  Clock,
  ChevronRight,
  Award,
} from 'lucide-react';
import { AppMode, HistoryItem, UserProfile } from '../types';
import {
  useStreak,
  getLocalDateString,
  get24HourStreakProgress,
} from './StreakContext';
import { getStreakTier } from './StreakTierBadge';
import { SettingsService } from '../services/settingsService';

interface DailyGoalItem {
  id: string;
  title: string;
  targetLabel: string;
  completed: boolean;
}

interface StudentDashboardChartsProps {
  history: HistoryItem[];
  userProfile: UserProfile;
  userId?: string | null;
  onNavigateMode: (mode: AppMode) => void;
  onQuickSubjectStudy: (subject: string, mode: AppMode) => void;
}

const DEFAULT_DAILY_GOALS = (dailyMins: number, preferredSubject: string): DailyGoalItem[] => [
  {
    id: 'goal-focus-mins',
    title: `Complete ${dailyMins} min focused study`,
    targetLabel: `${dailyMins}m`,
    completed: false,
  },
  {
    id: 'goal-quiz',
    title: `Practice 1 ${preferredSubject || 'Core'} Quiz`,
    targetLabel: 'Quiz',
    completed: false,
  },
  {
    id: 'goal-revision',
    title: 'Review chapter notes or summary',
    targetLabel: 'Notes',
    completed: false,
  },
];

export const StudentDashboardCharts: React.FC<StudentDashboardChartsProps> = ({
  history,
  userProfile,
  userId,
  onNavigateMode,
  onQuickSubjectStudy,
}) => {
  const { streak } = useStreak();
  const todayStr = getLocalDateString(new Date());
  const settings = SettingsService.getSettings();
  const dailyGoalMins = settings.learning.dailyGoalMins || 30;
  const preferredSubject = settings.learning.preferredSubject || 'Mathematics';

  // Animated streak counter
  const currentStreak = Math.max(
    streak.currentStreak || 0,
    userProfile.streak || 0,
    userProfile.currentStreak || 0
  );
  const [animatedStreakCount, setAnimatedStreakCount] = useState(0);

  useEffect(() => {
    if (currentStreak <= 0) {
      setAnimatedStreakCount(0);
      return;
    }
    let frame = 0;
    const totalFrames = 24;
    const timer = window.setInterval(() => {
      frame++;
      const next = Math.round((currentStreak * frame) / totalFrames);
      setAnimatedStreakCount(next);
      if (frame >= totalFrames) {
        setAnimatedStreakCount(currentStreak);
        window.clearInterval(timer);
      }
    }, 22);
    return () => window.clearInterval(timer);
  }, [currentStreak]);

  const userTier = useMemo(() => getStreakTier(currentStreak), [currentStreak]);
  const cycleProgress = useMemo(() => get24HourStreakProgress(streak), [streak]);

  // Daily Study Goals persisted per user & date in localStorage
  const goalsStorageKey = `sjtutor_daily_goals_${userId || 'guest'}_${todayStr}`;
  const [dailyGoals, setDailyGoals] = useState<DailyGoalItem[]>(() => {
    try {
      const saved = localStorage.getItem(goalsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage error
    }
    return DEFAULT_DAILY_GOALS(dailyGoalMins, preferredSubject);
  });
  const [newGoalText, setNewGoalText] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(goalsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDailyGoals(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    setDailyGoals(DEFAULT_DAILY_GOALS(dailyGoalMins, preferredSubject));
  }, [goalsStorageKey, dailyGoalMins, preferredSubject]);

  const persistGoals = (updated: DailyGoalItem[]) => {
    setDailyGoals(updated);
    try {
      localStorage.setItem(goalsStorageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const toggleGoal = (id: string) => {
    persistGoals(
      dailyGoals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newGoalText.trim();
    if (!trimmed) return;
    const item: DailyGoalItem = {
      id: `goal-${Date.now()}`,
      title: trimmed,
      targetLabel: 'Today',
      completed: false,
    };
    persistGoals([...dailyGoals, item]);
    setNewGoalText('');
    setIsAddingGoal(false);
  };

  const removeGoal = (id: string) => {
    persistGoals(dailyGoals.filter((g) => g.id !== id));
  };

  const completedGoalsCount = dailyGoals.filter((g) => g.completed).length;
  const goalsPercentage =
    dailyGoals.length > 0
      ? Math.round((completedGoalsCount / dailyGoals.length) * 100)
      : 0;

  // Weekly 7-Day Activity Data (Real history + streakHistory)
  const weeklyActivity = useMemo(() => {
    const days: {
      label: string;
      dateStr: string;
      sessions: number;
      studied: boolean;
      isToday: boolean;
    }[] = [];

    const streakDates = new Set([
      ...(streak.streakHistory || []),
      ...(userProfile.streakHistory || []),
    ]);

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dStr = getLocalDateString(d);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const daySessions = history.filter((item) => {
        if (!item.timestamp) return false;
        return getLocalDateString(new Date(item.timestamp)) === dStr;
      }).length;

      const studied = daySessions > 0 || streakDates.has(dStr);
      const effectiveCount = daySessions > 0 ? daySessions : studied ? 1 : 0;

      days.push({
        label: dayLabel,
        dateStr: dStr,
        sessions: effectiveCount,
        studied,
        isToday: i === 0,
      });
    }
    return days;
  }, [history, streak.streakHistory, userProfile.streakHistory]);

  const maxWeeklySessions = Math.max(3, ...weeklyActivity.map((d) => d.sessions));
  const totalWeeklySessions = weeklyActivity.reduce((acc, d) => acc + d.sessions, 0);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // Subject Progress Cards derived from real history + user profile subjects
  const subjectProgressList = useMemo(() => {
    const subjectMap = new Map<
      string,
      { sessions: number; quizzes: number; avgScore: number | null; scoreSum: number; scoreCount: number }
    >();

    // Seed with user's configured subjects if present
    const profileSubjects: string[] = Array.isArray((userProfile as any).subjects)
      ? (userProfile as any).subjects
      : [];

    if (profileSubjects.length > 0) {
      profileSubjects.slice(0, 4).forEach((sub) => {
        const clean = sub.trim();
        if (clean) {
          subjectMap.set(clean, {
            sessions: 0,
            quizzes: 0,
            avgScore: null,
            scoreSum: 0,
            scoreCount: 0,
          });
        }
      });
    } else {
      [preferredSubject || 'Mathematics', 'Science', 'English'].forEach((sub) => {
        subjectMap.set(sub, {
          sessions: 0,
          quizzes: 0,
          avgScore: null,
          scoreSum: 0,
          scoreCount: 0,
        });
      });
    }

    // Aggregate real history activity per subject
    history.forEach((item) => {
      const rawSub =
        item.formData?.subject ||
        (item.subtitle?.includes('•') ? item.subtitle.split('•')[1]?.trim() : '') ||
        'General Study';
      const subjectName = rawSub.trim() || 'General Study';

      const prev = subjectMap.get(subjectName) || {
        sessions: 0,
        quizzes: 0,
        avgScore: null,
        scoreSum: 0,
        scoreCount: 0,
      };
      prev.sessions += 1;
      if (item.type === AppMode.QUIZ) {
        prev.quizzes += 1;
        if (typeof item.score === 'number') {
          const totalQ = Array.isArray(item.content) && item.content.length > 0 ? item.content.length : 5;
          const pct = Math.min(100, Math.round((item.score / totalQ) * 100));
          prev.scoreSum += pct;
          prev.scoreCount += 1;
          prev.avgScore = Math.round(prev.scoreSum / prev.scoreCount);
        }
      }
      subjectMap.set(subjectName, prev);
    });

    const accentPalette = [
      { bar: 'from-blue-600 to-indigo-600', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300', dot: 'bg-blue-600' },
      { bar: 'from-violet-600 to-purple-600', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300', dot: 'bg-violet-600' },
      { bar: 'from-indigo-600 to-blue-500', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300', dot: 'bg-indigo-600' },
      { bar: 'from-sky-600 to-violet-600', badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300', dot: 'bg-sky-600' },
    ];

    return Array.from(subjectMap.entries())
      .sort((a, b) => b[1].sessions - a[1].sessions)
      .slice(0, 4)
      .map(([name, data], idx) => {
        // Real mastery % combines activity volume (up to 60%) + quiz performance if available (up to 40%), never inventing metrics for 0 sessions
        const volumePct = Math.min(100, data.sessions * 15);
        const progress =
          data.sessions === 0
            ? 0
            : data.avgScore !== null
            ? Math.min(100, Math.round(volumePct * 0.4 + data.avgScore * 0.6))
            : volumePct;

        return {
          name,
          sessions: data.sessions,
          quizzes: data.quizzes,
          avgScore: data.avgScore,
          progress,
          palette: accentPalette[idx % accentPalette.length],
        };
      });
  }, [history, userProfile, preferredSubject]);

  // Quiz & Study Distribution Analytics (Real data only)
  const studyMix = useMemo(() => {
    const summaries = history.filter((h) => h.type === AppMode.SUMMARY).length;
    const quizzes = history.filter((h) => h.type === AppMode.QUIZ).length;
    const homework = history.filter(
      (h) => h.type === AppMode.HOMEWORK || h.type === AppMode.ESSAY
    ).length;
    const tutor = history.filter((h) => h.type === AppMode.TUTOR).length;
    const total = summaries + quizzes + homework + tutor;

    const scoredQuizzes = history
      .filter((h) => h.type === AppMode.QUIZ && typeof h.score === 'number')
      .slice(0, 6)
      .reverse()
      .map((q) => {
        const totalQ = Array.isArray(q.content) && q.content.length > 0 ? q.content.length : 5;
        return {
          title: q.title || 'Quiz',
          pct: Math.min(100, Math.round(((q.score || 0) / totalQ) * 100)),
        };
      });

    const avgQuizAccuracy =
      scoredQuizzes.length > 0
        ? Math.round(scoredQuizzes.reduce((acc, q) => acc + q.pct, 0) / scoredQuizzes.length)
        : null;

    return {
      total,
      scoredQuizzes,
      avgQuizAccuracy,
      breakdown: [
        { label: 'Summaries', count: summaries, color: 'bg-blue-600' },
        { label: 'Quizzes', count: quizzes, color: 'bg-violet-600' },
        { label: 'Homework', count: homework, color: 'bg-indigo-500' },
        { label: 'AI Tutor', count: tutor, color: 'bg-sky-500' },
      ],
    };
  }, [history]);

  // Smooth SVG area path for Weekly Activity Chart
  const areaChartGeometry = useMemo(() => {
    const width = 360;
    const height = 118;
    const padX = 18;
    const padY = 14;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;

    const points = weeklyActivity.map((d, i) => {
      const x = padX + (i / Math.max(1, weeklyActivity.length - 1)) * usableW;
      const ratio = d.sessions / maxWeeklySessions;
      const y = padY + usableH - ratio * usableH;
      return { x, y, ...d };
    });

    if (points.length === 0) return { linePath: '', areaPath: '', points: [], width, height };

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      linePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const last = points[points.length - 1];
    const first = points[0];
    const areaPath = `${linePath} L ${last.x} ${height - padY} L ${first.x} ${height - padY} Z`;

    return { linePath, areaPath, points, width, height };
  }, [weeklyActivity, maxWeeklySessions]);

  return (
    <div className="space-y-6 mb-8">
      {/* ROW 1: Animated Study Streak + Daily Study Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Animated Study Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_28px_-6px_rgba(37,99,235,0.12)] p-6 flex flex-col justify-between relative overflow-hidden"
        >
          {/* Soft blue-violet top accent wash */}
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/15 blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1.5">
                <Flame className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Study Streak</span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                  {animatedStreakCount}
                </span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {currentStreak === 1 ? 'Day Active' : 'Days Streak'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {userTier.emoji} {userTier.name} Tier • Best record:{' '}
                <strong className="text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                  {Math.max(streak.highestStreak || 0, currentStreak)}d
                </strong>
              </p>
            </div>

            {/* 24h Streak Progress Mini Gauge */}
            <div className="flex flex-col items-end shrink-0">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28"
                    cy="28"
                    r="23"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  <motion.circle
                    cx="28"
                    cy="28"
                    r="23"
                    fill="none"
                    stroke="url(#dashStreakGrad)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={144.5}
                    initial={{ strokeDashoffset: 144.5 }}
                    animate={{
                      strokeDashoffset:
                        144.5 - (144.5 * Math.max(4, cycleProgress.progressPercent)) / 100,
                    }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <defs>
                    <linearGradient id="dashStreakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#7C3AED" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-[11px] font-bold font-mono tabular-nums text-slate-800 dark:text-slate-100">
                  {cycleProgress.progressPercent}%
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-1">
                {cycleProgress.canClaim ? 'Next day ready' : '24h cycle'}
              </span>
            </div>
          </div>

          {/* 7-day real activity strip */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 relative z-10">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
              <span>Last 7 Days Consistency</span>
              <span className="text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {weeklyActivity.filter((d) => d.studied).length}/7 days active
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weeklyActivity.map((day) => (
                <div
                  key={day.dateStr}
                  className={`py-2 px-1 rounded-xl border text-center transition-all ${
                    day.studied
                      ? 'bg-gradient-to-b from-blue-50 to-violet-50/70 dark:from-blue-950/60 dark:to-violet-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : day.isToday
                      ? 'bg-slate-50 dark:bg-slate-800 border-blue-300 dark:border-blue-700 text-slate-700 dark:text-slate-200'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase">{day.label}</span>
                  <div className="mt-1 flex justify-center">
                    {day.studied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Daily Study Goals Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_28px_-6px_rgba(15,23,42,0.06)] p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
                  <Target className="w-4 h-4" />
                  <span>Daily Study Goals</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Today&apos;s Target ({dailyGoalMins} mins focus goal)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono tabular-nums text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 px-2.5 py-1 rounded-lg">
                  {completedGoalsCount}/{dailyGoals.length} Complete ({goalsPercentage}%)
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingGoal((v) => !v)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/50 text-slate-600 hover:text-blue-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Add daily study goal"
                  aria-label="Add daily study goal"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goalsPercentage}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"
              />
            </div>

            {/* Quick Add Goal Form */}
            {isAddingGoal && (
              <form onSubmit={handleAddGoal} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  placeholder="e.g., Solve 5 Calculus integration problems"
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Add
                </button>
              </form>
            )}

            {/* Interactive Checklist */}
            <div className="space-y-2 max-h-[168px] overflow-y-auto pr-1 custom-scrollbar">
              {dailyGoals.map((goal) => (
                <div
                  key={goal.id}
                  className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                    goal.completed
                      ? 'bg-blue-50/50 dark:bg-blue-950/25 border-blue-200/70 dark:border-blue-900/50'
                      : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className="flex items-center gap-2.5 flex-1 text-left cursor-pointer min-w-0"
                  >
                    {goal.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                    )}
                    <span
                      className={`text-xs font-semibold truncate ${
                        goal.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {goal.title}
                    </span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700">
                      {goal.targetLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGoal(goal.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Remove goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Need focused study time?
            </span>
            <button
              type="button"
              onClick={() => onNavigateMode(AppMode.TIMER)}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Launch Study Timer</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ROW 2: Animated Subject Progress Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_28px_-6px_rgba(15,23,42,0.06)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Subject Mastery</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Subject Progress Overview
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateMode(AppMode.QUIZ)}
            className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Adaptive Quiz</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjectProgressList.map((subj, idx) => (
            <motion.button
              type="button"
              key={subj.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              onClick={() => onQuickSubjectStudy(subj.name, AppMode.TUTOR)}
              className="text-left p-4 rounded-xl bg-slate-50/75 dark:bg-slate-800/50 border border-slate-200/75 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs hover:shadow-md cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {subj.name}
                </span>
                <span className="text-xs font-extrabold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  {subj.progress}%
                </span>
              </div>

              <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${subj.progress}%` }}
                  transition={{ duration: 0.85, delay: 0.15 + idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full bg-gradient-to-r ${subj.palette.bar}`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-mono tabular-nums">
                  {subj.sessions} {subj.sessions === 1 ? 'session' : 'sessions'}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                  {subj.avgScore !== null ? `Quiz Avg ${subj.avgScore}%` : 'Study now →'}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ROW 3: Professional Charts (Weekly Study Activity + Quiz & Activity Mix) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Weekly Study Activity SVG Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_28px_-6px_rgba(15,23,42,0.06)] p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Weekly Momentum</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                7-Day Study Activity
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                {totalWeeklySessions}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                completed sessions
              </span>
            </div>
          </div>

          <div className="relative bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 p-4">
            <svg
              viewBox={`0 0 ${areaChartGeometry.width} ${areaChartGeometry.height}`}
              className="w-full h-36 overflow-visible"
              role="img"
              aria-label="Weekly Study Activity Chart"
            >
              <defs>
                <linearGradient id="weeklyAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="weeklyLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>

              {/* Subtle Horizontal Grid Lines */}
              {[0.25, 0.5, 0.75, 1].map((frac) => {
                const y = 14 + (118 - 28) * (1 - frac);
                return (
                  <line
                    key={frac}
                    x1={18}
                    y1={y}
                    x2={342}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="3 4"
                    className="text-slate-200 dark:text-slate-700"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Area Fill */}
              {areaChartGeometry.areaPath && (
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  d={areaChartGeometry.areaPath}
                  fill="url(#weeklyAreaFill)"
                />
              )}

              {/* Smooth Curve */}
              {areaChartGeometry.linePath && (
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  d={areaChartGeometry.linePath}
                  fill="none"
                  stroke="url(#weeklyLineGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}

              {/* Data Points */}
              {areaChartGeometry.points.map((pt, i) => (
                <g
                  key={pt.dateStr}
                  onMouseEnter={() => setHoveredDayIdx(i)}
                  onMouseLeave={() => setHoveredDayIdx(null)}
                  className="cursor-pointer"
                >
                  <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredDayIdx === i ? 5.5 : pt.studied ? 4 : 3}
                    fill={pt.studied ? '#2563EB' : '#CBD5E1'}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                </g>
              ))}
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between px-2 mt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {weeklyActivity.map((d, idx) => (
                <span
                  key={d.dateStr}
                  className={`${
                    hoveredDayIdx === idx || d.isToday
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : ''
                  }`}
                >
                  {d.label}
                </span>
              ))}
            </div>

            {hoveredDayIdx !== null && weeklyActivity[hoveredDayIdx] && (
              <div className="mt-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between border-t border-slate-200/70 dark:border-slate-700 pt-2">
                <span>{weeklyActivity[hoveredDayIdx].dateStr}</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {weeklyActivity[hoveredDayIdx].sessions}{' '}
                  {weeklyActivity[hoveredDayIdx].sessions === 1 ? 'session' : 'sessions'}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Assessment & Learning Mix Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_28px_-6px_rgba(15,23,42,0.06)] p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
                  <BarChart3 className="w-4 h-4" />
                  <span>Performance Analytics</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Quiz &amp; Module Distribution
                </h3>
              </div>

              {studyMix.avgQuizAccuracy !== null && (
                <div className="text-right">
                  <span className="text-lg font-extrabold font-mono tabular-nums text-violet-600 dark:text-violet-400">
                    {studyMix.avgQuizAccuracy}%
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase">
                    Quiz Avg
                  </span>
                </div>
              )}
            </div>

            {/* Learning Module Stacked Breakdown */}
            <div className="space-y-3 mb-5">
              {studyMix.breakdown.map((mod) => {
                const pct =
                  studyMix.total > 0 ? Math.round((mod.count / studyMix.total) * 100) : 0;
                return (
                  <div key={mod.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {mod.label}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {mod.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full ${mod.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Quiz Scores Mini Bar Chart or Empty Prompt */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            {studyMix.scoredQuizzes.length > 0 ? (
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    Recent Quiz Scores
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Last {studyMix.scoredQuizzes.length}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-2 items-end h-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-200/60 dark:border-slate-800">
                  {studyMix.scoredQuizzes.map((q, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-end h-full gap-1" title={`${q.title}: ${q.pct}%`}>
                      <div className="w-full bg-slate-200/70 dark:bg-slate-700 rounded-t-md h-full flex items-end overflow-hidden">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(12, q.pct)}%` }}
                          transition={{ duration: 0.7, delay: idx * 0.06 }}
                          className="w-full bg-gradient-to-t from-blue-600 to-violet-500 rounded-t-md"
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                        {q.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Complete your first practice quiz to chart accuracy trends.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateMode(AppMode.QUIZ)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold shrink-0 hover:opacity-95 transition-opacity cursor-pointer"
                >
                  Take Quiz
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentDashboardCharts;
