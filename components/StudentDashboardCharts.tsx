import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Crown,
  Lock,
  Layers,
  X,
  Zap,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { AppMode, HistoryItem, UserProfile } from '../types';
import {
  useStreak,
  getLocalDateString,
  get24HourStreakProgress,
  STREAK_MILESTONES,
} from './StreakContext';
import {
  STREAK_TIERS,
  StreakTier,
  getStreakTier,
  getStreakTierProgress,
  AnimatedStreakLevelCrest,
} from './StreakTierBadge';
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
  const { streak, claimMilestone } = useStreak();
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
  const highestStreak = Math.max(
    streak.highestStreak || 0,
    userProfile.highestStreak || 0,
    currentStreak
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
  const tierProgress = useMemo(() => getStreakTierProgress(currentStreak), [currentStreak]);
  const cycleProgress = useMemo(() => get24HourStreakProgress(streak), [streak]);

  // Interactive Study Streak Board Level Preview State
  const [previewTierId, setPreviewTierId] = useState<string | null>(null);
  const [showBoardLevelsModal, setShowBoardLevelsModal] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  const displayedTier: StreakTier = useMemo(() => {
    if (previewTierId) {
      return STREAK_TIERS.find((t) => t.id === previewTierId) || userTier;
    }
    return userTier;
  }, [previewTierId, userTier]);

  const isPreviewingOtherLevel = displayedTier.id !== userTier.id;
  const isDisplayedLevelUnlocked = currentStreak >= displayedTier.minDays;

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

  const handleClaimMilestoneFromBoard = async (days: number) => {
    const res = await claimMilestone(days);
    setClaimFeedback(res.message);
    window.setTimeout(() => setClaimFeedback(null), 3500);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* ROW 1: Animated Multi-Level Study Streak Board + Daily Study Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Animated Multi-Level Study Streak Board Card */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border-2 ${displayedTier.boardCardBorder} shadow-[0_8px_32px_-6px_rgba(37,99,235,0.14)] p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden transition-colors duration-500`}
        >
          {/* Level-Adaptive Animated Background Wash & Floating Orbs */}
          <motion.div
            key={`bg-wash-${displayedTier.id}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45 }}
            className={`absolute inset-0 bg-gradient-to-br ${displayedTier.boardBgGradient} pointer-events-none`}
          />
          <motion.div
            animate={{
              x: [0, 14, -8, 0],
              y: [0, -12, 8, 0],
              scale: [1, 1.12, 0.95, 1],
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute -right-14 -top-14 w-52 h-52 rounded-full bg-gradient-to-br ${displayedTier.gradient} opacity-15 blur-3xl pointer-events-none`}
          />
          <motion.div
            animate={{
              x: [0, -10, 10, 0],
              y: [0, 10, -10, 0],
            }}
            transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute -left-16 -bottom-16 w-44 h-44 rounded-full bg-gradient-to-tr ${displayedTier.gradient} opacity-10 blur-2xl pointer-events-none`}
          />

          {/* Top Header: Study Streak Board Level Crest + Streak Metrics + 24h Gauge */}
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r ${displayedTier.gradient} text-white shadow-xs`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Study Streak Board • {displayedTier.levelLabel}</span>
                </span>
                {isPreviewingOtherLevel ? (
                  <button
                    type="button"
                    onClick={() => setPreviewTierId(null)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/80 dark:bg-white/15 text-white text-[10px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                    title="Return to your active streak level"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Preview Mode • Reset</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Active Board Level ({userTier.tierRank} of {STREAK_TIERS.length})
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowBoardLevelsModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/85 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>All 9 Levels</span>
              </button>
            </div>

            {/* Main Board Banner */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`board-hero-${displayedTier.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/75 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/90 shadow-xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <AnimatedStreakLevelCrest
                    tier={displayedTier}
                    size="md"
                    isUnlocked={isDisplayedLevelUnlocked}
                    isCurrent={displayedTier.id === userTier.id}
                  />

                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
                        {isPreviewingOtherLevel ? `${displayedTier.minDays}+` : animatedStreakCount}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                        {isPreviewingOtherLevel
                          ? 'Days Required'
                          : currentStreak === 1
                          ? 'Day Streak'
                          : 'Days Streak'}
                      </span>
                      {!isPreviewingOtherLevel && (
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                          (Best: {highestStreak}d)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                        {displayedTier.emoji} {displayedTier.boardTitle}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                      {displayedTier.perk} • {displayedTier.creditBonusLabel}
                    </p>
                  </div>
                </div>

                {/* 24h Streak Progress Mini Gauge */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-13 h-13 flex items-center justify-center">
                    <svg className="w-13 h-13 -rotate-90" viewBox="0 0 56 56">
                      <circle
                        cx="28"
                        cy="28"
                        r="23"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4.5"
                        className="text-slate-200/70 dark:text-slate-800"
                      />
                      <motion.circle
                        cx="28"
                        cy="28"
                        r="23"
                        fill="none"
                        stroke={`url(#dashBoardGrad-${displayedTier.id})`}
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeDasharray={144.5}
                        initial={{ strokeDashoffset: 144.5 }}
                        animate={{
                          strokeDashoffset:
                            144.5 - (144.5 * Math.max(5, cycleProgress.progressPercent)) / 100,
                        }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      />
                      <defs>
                        <linearGradient
                          id={`dashBoardGrad-${displayedTier.id}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={displayedTier.boardAccentHex} />
                          <stop offset="100%" stopColor={displayedTier.boardSecondaryHex} />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute text-[10px] font-extrabold font-mono tabular-nums text-slate-800 dark:text-slate-100">
                      {cycleProgress.progressPercent}%
                    </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                    {cycleProgress.canClaim ? 'Ready!' : '24h Cycle'}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Level Progression Bar to Next Study Streak Board Level */}
            <div className="mt-3.5 px-1">
              <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  {tierProgress.nextTier ? (
                    <span>
                      Level Up Progress to{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {tierProgress.nextTier.levelLabel} ({tierProgress.nextTier.name})
                      </strong>
                    </span>
                  ) : (
                    <span>Max Study Streak Board Level Reached!</span>
                  )}
                </span>
                <span className="font-mono font-extrabold text-slate-700 dark:text-slate-200 tabular-nums">
                  {tierProgress.nextTier
                    ? `${tierProgress.percentage}% • ${tierProgress.daysToNext}d left`
                    : '100% MAX'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                <motion.div
                  key={`prog-${displayedTier.id}-${tierProgress.percentage}`}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      isPreviewingOtherLevel
                        ? isDisplayedLevelUnlocked
                          ? 100
                          : Math.min(95, Math.round((currentStreak / Math.max(1, displayedTier.minDays)) * 100))
                        : Math.max(6, tierProgress.percentage)
                    }%`,
                  }}
                  transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full bg-gradient-to-r ${displayedTier.gradient} relative overflow-hidden`}
                >
                  <motion.div
                    animate={{ x: ['-100%', '220%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                    className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/45 to-transparent"
                  />
                </motion.div>
              </div>
            </div>

            {/* Interactive 9-Level Study Streak Board Selector Strip */}
            <div className="mt-3.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 px-0.5">
                <span>Interactive Streak Board Levels (Click to Preview Animation)</span>
                <span className="font-mono tabular-nums">
                  {STREAK_TIERS.filter((t) => currentStreak >= t.minDays).length}/{STREAK_TIERS.length} Unlocked
                </span>
              </div>
              <div className="grid grid-cols-9 gap-1">
                {STREAK_TIERS.map((tier) => {
                  const unlocked = currentStreak >= tier.minDays;
                  const isActivePreview = displayedTier.id === tier.id;
                  const isUserCurrent = userTier.id === tier.id;

                  return (
                    <motion.button
                      key={tier.id}
                      type="button"
                      whileHover={{ y: -2, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setPreviewTierId(tier.id === userTier.id ? null : tier.id)
                      }
                      title={`${tier.boardTitle} (${tier.minDays}+ Days) • ${
                        unlocked ? 'Unlocked' : `Unlocks at ${tier.minDays} days`
                      }`}
                      className={`relative py-1.5 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isActivePreview
                          ? `bg-gradient-to-b ${tier.gradient} text-white border-white shadow-md scale-105 z-10`
                          : unlocked
                          ? 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-400'
                          : 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-400 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <span className="text-xs leading-none">{tier.emoji}</span>
                      <span className="text-[9px] font-extrabold font-mono mt-0.5 leading-none">
                        L{tier.tierRank}
                      </span>
                      {isUserCurrent && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isActivePreview ? 'bg-white' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7-Day Animated Study Streak Board Consistency Grid */}
          <div className="mt-4 pt-3.5 border-t border-slate-200/70 dark:border-slate-800 relative z-10">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>7-Day Streak Board Activity</span>
              </span>
              <span className="font-mono font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {weeklyActivity.filter((d) => d.studied).length}/7 Days Active
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {weeklyActivity.map((day, idx) => (
                <motion.div
                  key={`${day.dateStr}-${displayedTier.id}`}
                  initial={{ opacity: 0, y: 10, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.35,
                    delay: idx * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  whileHover={{ y: -2, scale: 1.03 }}
                  className={`py-2 px-1 rounded-xl border text-center transition-all relative overflow-hidden ${
                    day.studied
                      ? `bg-gradient-to-b ${displayedTier.gradient} text-white border-white/40 shadow-sm`
                      : day.isToday
                      ? 'bg-white dark:bg-slate-800 border-2 border-amber-400 dark:border-amber-500 text-slate-800 dark:text-slate-100'
                      : 'bg-white/70 dark:bg-slate-800/45 border-slate-200/70 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="block text-[10px] font-extrabold uppercase tracking-tight">
                    {day.label}
                  </span>
                  <div className="mt-1 flex justify-center items-center h-4">
                    {day.studied ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.25, 1] }}
                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                        className="text-xs leading-none"
                      >
                        {displayedTier.emoji}
                      </motion.span>
                    ) : day.isToday ? (
                      <span className="text-[9px] font-extrabold uppercase text-amber-600 dark:text-amber-400">
                        Today
                      </span>
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Daily Study Goals Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_28px_-6px_rgba(15,23,42,0.06)] p-6 flex flex-col justify-between"
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
            <div className="space-y-2 max-h-[195px] overflow-y-auto pr-1 custom-scrollbar">
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

              {areaChartGeometry.areaPath && (
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  d={areaChartGeometry.areaPath}
                  fill="url(#weeklyAreaFill)"
                />
              )}

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

      {/* FULL 9-LEVEL STUDY STREAK BOARD EXPLORER MODAL */}
      <AnimatePresence>
        {showBoardLevelsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 18 }}
              transition={{ duration: 0.22 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Hero Header */}
              <div className={`relative p-5 sm:p-6 bg-gradient-to-r ${displayedTier.gradient} text-white shrink-0 overflow-hidden`}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                  className="absolute -right-20 -top-20 w-64 h-64 rounded-full border-2 border-dashed border-white/20 pointer-events-none"
                />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <AnimatedStreakLevelCrest
                      tier={displayedTier}
                      size="lg"
                      isUnlocked={true}
                      isCurrent={true}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md bg-black/25 text-white text-[11px] font-extrabold uppercase tracking-wider">
                          9-Level Study Streak Board System
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-mono font-bold">
                          Current Streak: {currentStreak} Days
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                        {displayedTier.emoji} {displayedTier.boardTitle}
                      </h2>
                      <p className="text-xs sm:text-sm text-white/90 font-medium mt-0.5">
                        {displayedTier.description} — {displayedTier.perk}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBoardLevelsModal(false)}
                    className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                    aria-label="Close Study Streak Board Levels"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {claimFeedback && (
                <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{claimFeedback}</span>
                </div>
              )}

              {/* 9 Animated Study Streak Board Levels Grid */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {STREAK_TIERS.map((tier, idx) => {
                    const isUnlocked = currentStreak >= tier.minDays;
                    const isCurrent = userTier.id === tier.id;
                    const isPreviewSelected = displayedTier.id === tier.id;
                    const daysLeft = Math.max(0, tier.minDays - currentStreak);
                    const matchingMilestone = STREAK_MILESTONES.find(
                      (m) => m.days === tier.minDays
                    );
                    const canClaimMilestoneReward =
                      matchingMilestone &&
                      isUnlocked &&
                      !(streak.claimedMilestones || []).includes(matchingMilestone.days);

                    return (
                      <motion.div
                        key={tier.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: idx * 0.04 }}
                        whileHover={{ y: -4 }}
                        onClick={() => setPreviewTierId(tier.id === userTier.id ? null : tier.id)}
                        className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden ${
                          isPreviewSelected
                            ? `${tier.boardCardBorder} bg-gradient-to-br ${tier.boardBgGradient} shadow-lg`
                            : isUnlocked
                            ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 hover:border-amber-400'
                            : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 opacity-85 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <AnimatedStreakLevelCrest
                              tier={tier}
                              size="sm"
                              isUnlocked={isUnlocked}
                              isCurrent={isCurrent}
                            />

                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r ${tier.gradient} text-white`}
                              >
                                Level {tier.tierRank}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                  Active Level
                                </span>
                              )}
                            </div>
                          </div>

                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {tier.emoji} {tier.name} Board
                          </h4>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            {tier.minDays === 0
                              ? '0 – 2 Study Days'
                              : tier.maxDays
                              ? `${tier.minDays} – ${tier.maxDays} Study Days`
                              : '365+ Study Days (Immortal)'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                            {tier.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/70 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-amber-600 dark:text-amber-400 truncate">
                              {tier.creditBonusLabel}
                            </span>
                            {isUnlocked ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                              </span>
                            ) : (
                              <span className="text-slate-400 flex items-center gap-1 shrink-0 font-mono">
                                <Lock className="w-3 h-3" /> {daysLeft}d left
                              </span>
                            )}
                          </div>

                          {canClaimMilestoneReward && matchingMilestone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClaimMilestoneFromBoard(matchingMilestone.days);
                              }}
                              className={`w-full py-1.5 px-3 rounded-xl bg-gradient-to-r ${tier.gradient} text-white text-xs font-extrabold shadow-sm hover:opacity-95 transition-opacity cursor-pointer flex items-center justify-center gap-1.5`}
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              <span>Claim +{matchingMilestone.rewardCredits} Credits</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click any level card above to preview its animated Study Streak Board on your dashboard.
                </p>
                <div className="flex items-center gap-2">
                  {isPreviewingOtherLevel && (
                    <button
                      type="button"
                      onClick={() => setPreviewTierId(null)}
                      className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Reset to My Active Level
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowBoardLevelsModal(false)}
                    className={`px-4 py-2 rounded-xl bg-gradient-to-r ${displayedTier.gradient} text-white text-xs font-bold shadow-sm hover:opacity-95 transition-opacity cursor-pointer`}
                  >
                    Apply Board View
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDashboardCharts;
