import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Flame, 
  Trophy, 
  Calendar as CalendarIcon, 
  Sparkles, 
  X, 
  Gift, 
  CheckCircle2, 
  Lock, 
  Share2, 
  Volume2, 
  VolumeX, 
  Zap, 
  ShieldCheck, 
  Users,
  Info,
  ChevronRight,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  useStreak, 
  STREAK_MILESTONES, 
  LeaderboardEntry, 
  getLocalDateString,
  getTimeUntilNextStreakClaim
} from './StreakContext';
import { UserProfile } from '../types';

interface FloatingStreakWidgetProps {
  userProfile?: UserProfile;
  onProfileUpdate?: (updates: Partial<UserProfile>) => void;
}

export const FloatingStreakWidget: React.FC<FloatingStreakWidgetProps> = ({ 
  userProfile, 
  onProfileUpdate 
}) => {
  const { 
    streak, 
    isStudiedToday, 
    claimMilestone, 
    fetchLeaderboard 
  } = useStreak();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'roadmap' | 'calendar' | 'leaderboard' | 'guide'>('weekly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [claimStatusMsg, setClaimStatusMsg] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isNewlyAchievedPulse, setIsNewlyAchievedPulse] = useState(false);

  // Local celebratory toast when streak increases after completing 24-hour cycle and study activity
  const [celebrationModal, setCelebrationModal] = useState<{
    show: boolean;
    streakCount: number;
    milestone: number | null;
  } | null>(null);

  // Realtime 24-hour streak claim countdown
  const [claimCountdown, setClaimCountdown] = useState(() => getTimeUntilNextStreakClaim(streak));

  useEffect(() => {
    setClaimCountdown(getTimeUntilNextStreakClaim(streak));
    const interval = setInterval(() => {
      setClaimCountdown(getTimeUntilNextStreakClaim(streak));
    }, 10000);
    return () => clearInterval(interval);
  }, [streak.lastStudyTimestamp, streak.lastStudyDate]);

  // STRICT POLICY: Only display streak increased celebration when the 24 hours is completed and user completes study activity to claim it
  useEffect(() => {
    const handleStreakClaimed = (e: Event) => {
      const customEvent = e as CustomEvent<{ streakCount: number; milestone: number | null; actionType?: string }>;
      const streakCount = customEvent.detail?.streakCount || streak.currentStreak || 1;
      const milestone = customEvent.detail?.milestone || STREAK_MILESTONES.find(m => m.days === streakCount)?.days || null;

      setIsNewlyAchievedPulse(true);
      setCelebrationModal({
        show: true,
        streakCount,
        milestone,
      });

      // Confetti burst for milestone / claimed daily streak
      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#f59e0b', '#ef4444', '#10b981', '#6366f1'],
        });
      } catch (err) {
        console.warn('Confetti burst error:', err);
      }

      playCelebrationChime();

      // Reset pulse after 10 seconds
      const t = setTimeout(() => setIsNewlyAchievedPulse(false), 10000);
      return () => clearTimeout(t);
    };

    window.addEventListener('sjtutor_streak_incremented', handleStreakClaimed);
    return () => {
      window.removeEventListener('sjtutor_streak_incremented', handleStreakClaimed);
    };
  }, [streak.currentStreak]);

  // Storage key for custom dragged streak position
  const STREAK_POS_KEY = 'sjtutor_streak_widget_pos';

  // Position state for floating drag / docking anywhere on screen
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('sjtutor_streak_widget_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // Clamp inside current window dimensions
          return {
            x: Math.max(8, Math.min(window.innerWidth - 64, parsed.x)),
            y: Math.max(8, Math.min(window.innerHeight - 64, parsed.y)),
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load saved streak position:', e);
    }
    return null;
  });

  const [isDraggingActive, setIsDraggingActive] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startPosX: 0, startPosY: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);

  // Keep widget in bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const clampedX = Math.max(8, Math.min(window.innerWidth - 64, prev.x));
        const clampedY = Math.max(8, Math.min(window.innerHeight - 64, prev.y));
        if (clampedX !== prev.x || clampedY !== prev.y) {
          const updated = { x: clampedX, y: clampedY };
          try {
            localStorage.setItem(STREAK_POS_KEY, JSON.stringify(updated));
          } catch (e) {
            console.warn('Failed to save streak position on resize:', e);
          }
          return updated;
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Play pleasant web audio celebration chime
  const playCelebrationChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.18, audioCtx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.09);
        osc.stop(audioCtx.currentTime + idx * 0.09 + 0.4);
      });
    } catch {
      // Audio context not allowed or unsupported
    }
  };

  const currentStreak = streak.currentStreak || 0;
  const highestStreak = streak.highestStreak || currentStreak;
  const totalLearningDays = streak.streakHistory?.length || (currentStreak > 0 ? currentStreak : 0);

  // Next milestone calculation
  const nextMilestone = useMemo(() => {
    return STREAK_MILESTONES.find((m) => m.days > currentStreak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  }, [currentStreak]);

  const prevMilestoneDays = useMemo(() => {
    const prev = [...STREAK_MILESTONES].reverse().find((m) => m.days <= currentStreak);
    return prev ? prev.days : 0;
  }, [currentStreak]);

  const milestoneProgress = useMemo(() => {
    if (!nextMilestone) return 100;
    const span = nextMilestone.days - prevMilestoneDays;
    if (span <= 0) return 100;
    const done = currentStreak - prevMilestoneDays;
    return Math.min(100, Math.max(0, Math.round((done / span) * 100)));
  }, [currentStreak, nextMilestone, prevMilestoneDays]);

  // Load leaderboard when tab is opened
  useEffect(() => {
    if (isOpen && activeTab === 'leaderboard') {
      setLoadingLeaderboard(true);
      fetchLeaderboard()
        .then((data) => {
          setLeaderboard(data);
          setLoadingLeaderboard(false);
        })
        .catch(() => setLoadingLeaderboard(false));
    }
  }, [isOpen, activeTab, fetchLeaderboard]);

  // Handle milestone reward claim
  const handleClaim = async (days: number) => {
    const res = await claimMilestone(days);
    if (res.success) {
      playCelebrationChime();
      setClaimStatusMsg(res.message);
      if (onProfileUpdate && userProfile) {
        onProfileUpdate({
          credits: (userProfile.credits || 100) + res.creditsAdded,
        });
      }
      setTimeout(() => setClaimStatusMsg(null), 4000);
    } else {
      setClaimStatusMsg(res.message);
      setTimeout(() => setClaimStatusMsg(null), 3000);
    }
  };

  // Calculate Current Week (Monday to Sunday)
  const currentWeek = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Mon, ... 6 is Sat
    const distToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday);

    const days: {
      dayName: string;
      shortDate: string;
      dateStr: string;
      completed: boolean;
      isToday: boolean;
      isFuture: boolean;
    }[] = [];

    const historySet = new Set(streak.streakHistory || []);
    const todayStr = getLocalDateString(now);
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = getLocalDateString(d);
      const isToday = dStr === todayStr;
      const isCompleted = historySet.has(dStr);
      const isFuture = d > now && !isToday;

      days.push({
        dayName: dayNames[i],
        shortDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dateStr: dStr,
        completed: isCompleted,
        isToday,
        isFuture,
      });
    }

    return days;
  }, [streak.streakHistory]);

  // Generate 30-day activity map
  const last30Days = useMemo(() => {
    const days: { dateStr: string; dayNum: number; dayOfWeek: string; completed: boolean; isToday: boolean }[] = [];
    const today = new Date();
    const historySet = new Set(streak.streakHistory || []);
    const todayStr = getLocalDateString(today);

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = getLocalDateString(d);
      days.push({
        dateStr: dStr,
        dayNum: d.getDate(),
        dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        completed: historySet.has(dStr),
        isToday: dStr === todayStr,
      });
    }
    return days;
  }, [streak.streakHistory]);

  // Share streak achievement
  const handleShare = () => {
    const shareText = `🔥 I'm on a ${currentStreak} Day Streak on SJ Tutor AI! Best record: ${highestStreak} Days with ${totalLearningDays} total learning days. Keep learning! 🚀`;
    if (navigator.share) {
      navigator.share({
        title: 'SJ Tutor AI Daily Streak',
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      setClaimStatusMsg('Streak stats copied to clipboard! 📋');
      setTimeout(() => setClaimStatusMsg(null), 3000);
    }
  };

  // Drag handlers for the floating button
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    setIsDraggingActive(true);

    const rect = badgeRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : (position ? position.x : window.innerWidth - 80);
    const currentY = rect ? rect.top : (position ? position.y : window.innerHeight - 80);

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      startPosX: currentX,
      startPosY: currentY,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture fallback
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    const dist = Math.hypot(deltaX, deltaY);

    if (dist > 4) {
      isDragging.current = true;
      const newX = Math.max(8, Math.min(window.innerWidth - 64, dragStart.current.startPosX + deltaX));
      const newY = Math.max(8, Math.min(window.innerHeight - 64, dragStart.current.startPosY + deltaY));
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingActive(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer release fallback
    }

    if (isDragging.current) {
      // Calculate latest position from drag
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      const finalX = Math.max(8, Math.min(window.innerWidth - 64, dragStart.current.startPosX + deltaX));
      const finalY = Math.max(8, Math.min(window.innerHeight - 64, dragStart.current.startPosY + deltaY));
      const finalPos = { x: finalX, y: finalY };
      setPosition(finalPos);
      try {
        localStorage.setItem(STREAK_POS_KEY, JSON.stringify(finalPos));
      } catch (err) {
        console.warn('Failed to save streak position:', err);
      }

      setTimeout(() => {
        isDragging.current = false;
      }, 80);
    } else {
      setIsOpen(true);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingActive(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer cancel fallback
    }
    isDragging.current = false;
  };

  return (
    <>
      {/* Floating Streak Widget Button - Surrounded Circle with Fire Icon (Draggable Anywhere) */}
      <div
        id="floating-streak-container"
        style={
          position
            ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
            : {}
        }
        className={`fixed ${!position ? 'bottom-6 right-6' : ''} z-40 select-none touch-none`}
      >
        <div
          ref={badgeRef}
          id="floating-streak-badge"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          role="button"
          tabIndex={0}
          title={`🔥 ${currentStreak} Day Streak • Drag anywhere to place • Click to open Streak Hub`}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 dark:from-amber-600 dark:via-orange-600 dark:to-amber-700 text-white shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 border-2 border-amber-300/80 dark:border-amber-400/60 backdrop-blur-md transition-all ${
            isDraggingActive 
              ? 'cursor-grabbing scale-110 shadow-2xl shadow-orange-500/60' 
              : isNewlyAchievedPulse
              ? 'cursor-grab scale-105 ring-4 ring-amber-400/80 ring-offset-2 ring-offset-slate-900 animate-pulse shadow-2xl shadow-orange-500/60'
              : 'cursor-grab hover:scale-105 active:scale-95'
          }`}
        >
          {/* Outer Pulsing Glow Ring */}
          <span className={`absolute -inset-1 rounded-full bg-amber-400/30 dark:bg-amber-400/20 pointer-events-none ${
            isNewlyAchievedPulse ? 'animate-ping opacity-100 ring-2 ring-amber-400' : 'animate-ping opacity-75'
          }`} />
          
          {/* Inner Surrounded Circular Border */}
          <div className="absolute inset-1 rounded-full border border-white/40 dark:border-white/20 pointer-events-none" />

          {/* Central Fire Icon */}
          <div className="relative flex flex-col items-center justify-center">
            <Flame className="w-7 h-7 text-amber-100 fill-amber-200 drop-shadow-md animate-pulse" />
          </div>

          {/* Floating Number Badge on Circle */}
          <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 min-w-[22px] h-[22px] bg-slate-950/90 text-amber-300 font-mono font-black text-[11px] rounded-full border border-amber-400/80 flex items-center justify-center shadow-lg">
            {currentStreak}
          </div>

          {/* Learned Today Check Indicator */}
          {isStudiedToday && (
            <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md border-2 border-slate-900">
              ✓
            </div>
          )}
        </div>
      </div>

      {/* Streak Increase Celebration Modal */}
      <AnimatePresence>
        {celebrationModal?.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-amber-200 dark:border-amber-900/60 text-center overflow-hidden"
            >
              {/* Confetti Glow Background */}
              <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-400/20 to-transparent pointer-events-none" />
              
              <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 animate-bounce">
                <Flame className="w-12 h-12 text-white fill-amber-200" />
              </div>

              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                🔥 Streak Increased!
              </h3>
              
              <p className="text-base font-bold text-amber-600 dark:text-amber-400 mb-2">
                You&apos;re now on a {celebrationModal.streakCount} Day Streak!
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium">
                Keep learning! 🚀 Your daily streak never resets — every study day builds permanent academic mastery.
              </p>

              {celebrationModal.milestone && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/50 mb-5 flex items-center justify-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span>Unlocked {celebrationModal.milestone}-Day Milestone Reward!</span>
                </div>
              )}

              <button
                onClick={() => {
                  setCelebrationModal(null);
                  setIsOpen(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-sm shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>View Streak Hub</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Streak Hub Modal / Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Header Hero Banner */}
              <div className="relative p-5 sm:p-6 bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-black/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-inner">
                      <Flame className="w-9 h-9 text-amber-200 fill-amber-300 drop-shadow-md animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-mono">🔥 {currentStreak} Day Streak</h2>
                        {isStudiedToday && (
                          <span className="px-2 py-0.5 bg-emerald-500/90 text-white text-[11px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3 h-3" /> Done Today
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-amber-100 font-semibold mt-0.5">
                        Keep learning! 🚀
                      </p>
                    </div>
                  </div>

                  {/* Header Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
                      className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleShare}
                      title="Share Streak"
                      className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      title="Close"
                      className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress towards Next Milestone */}
                <div className="mt-4 pt-3.5 border-t border-white/20">
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-amber-100 flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-200" /> Next Milestone: {nextMilestone?.title} ({nextMilestone?.days} Days)
                    </span>
                    <span className="font-mono text-amber-200">{milestoneProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-300 via-yellow-200 to-white rounded-full transition-all duration-500 shadow-xs"
                      style={{ width: `${milestoneProgress}%` }}
                    />
                  </div>
                </div>

                {/* 24-Hour Streak Claim Status Banner */}
                <div className="mt-3.5 p-2.5 rounded-xl bg-black/25 backdrop-blur-xs border border-white/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{claimCountdown.canClaim ? '✨' : '⏳'}</span>
                    <div>
                      <div className="font-bold text-white">
                        {claimCountdown.canClaim
                          ? '24 Hours Completed! Ready to Claim'
                          : `Next Streak Increase in ${claimCountdown.hours}h ${claimCountdown.minutes}m`}
                      </div>
                      <div className="text-[11px] text-amber-100/90 font-medium">
                        {claimCountdown.canClaim
                          ? `Complete any study activity (quiz, tutor question, study timer) to claim Day ${currentStreak + 1}!`
                          : 'Streak secured for this 24h cycle. Keep studying to maintain mastery!'}
                      </div>
                    </div>
                  </div>
                  {claimCountdown.canClaim && (
                    <span className="px-2.5 py-1 bg-amber-300 text-amber-950 font-black text-[10px] rounded-lg tracking-wider uppercase shadow-xs">
                      Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Toast Feedback */}
              {claimStatusMsg && (
                <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2 text-center text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2 animate-fadeIn">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{claimStatusMsg}</span>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 shrink-0 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`flex items-center gap-1.5 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'weekly'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Weekly & Stats</span>
                </button>
                <button
                  onClick={() => setActiveTab('roadmap')}
                  className={`flex items-center gap-1.5 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'roadmap'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Milestones</span>
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`flex items-center gap-1.5 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'calendar'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>30-Day Heatmap</span>
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`flex items-center gap-1.5 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'leaderboard'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Leaderboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('guide')}
                  className={`flex items-center gap-1.5 py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'guide'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  <span>No-Reset Policy</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
                {/* TAB 1: WEEKLY VIEW & STATS */}
                {activeTab === 'weekly' && (
                  <div className="space-y-5">
                    {/* Weekly Calendar View */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-amber-500" />
                          <span>This Week&apos;s Learning Schedule</span>
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">Mon – Sun</span>
                      </div>

                      <div className="grid grid-cols-7 gap-2 sm:gap-3">
                        {currentWeek.map((day) => (
                          <div
                            key={day.dateStr}
                            className={`flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-xl border text-center transition-all ${
                              day.completed
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 shadow-xs'
                                : day.isToday
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 text-amber-800 dark:text-amber-200 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="text-xs font-bold uppercase">{day.dayName}</span>
                            <div className="my-1.5">
                              {day.completed ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-sm shadow-xs">
                                  ✓
                                </span>
                              ) : (
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-base font-bold ${day.isToday ? 'border-2 border-dashed border-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                  ○
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-medium opacity-80">{day.shortDate.split(' ')[1]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Statistics Cards */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                        Learning Statistics
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40 flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Flame className="w-5 h-5 fill-current" />
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Streak</span>
                            <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{currentStreak} Days</p>
                          </div>
                        </div>

                        <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-2xl border border-orange-200 dark:border-orange-900/40 flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Longest Streak</span>
                            <p className="text-xl font-black text-orange-600 dark:text-orange-400 font-mono">{highestStreak} Days</p>
                          </div>
                        </div>

                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Learning Days</span>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{totalLearningDays}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MILESTONES */}
                {activeTab === 'roadmap' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Permanent Milestones ({STREAK_MILESTONES.filter(m => currentStreak >= m.days).length}/{STREAK_MILESTONES.length} Completed)
                      </h3>
                      <span className="text-xs text-slate-500">
                        Milestones are permanently preserved
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {STREAK_MILESTONES.map((milestone) => {
                        const isUnlocked = currentStreak >= milestone.days;
                        const isClaimed = (streak.claimedMilestones || []).includes(milestone.days);
                        const isNext = !isUnlocked && nextMilestone?.days === milestone.days;

                        return (
                          <div
                            key={milestone.days}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                              isClaimed
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                                : isUnlocked
                                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 shadow-xs'
                                : isNext
                                ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/40'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-2xl shrink-0 p-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-2xs border border-slate-100 dark:border-slate-700">
                                {milestone.badge}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    {milestone.title}
                                  </h4>
                                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-mono font-bold">
                                    {milestone.days} Days
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {milestone.description}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {isClaimed ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 bg-emerald-100/70 dark:bg-emerald-900/40 rounded-xl">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed (+{milestone.rewardCredits})
                                </span>
                              ) : isUnlocked ? (
                                <button
                                  onClick={() => handleClaim(milestone.days)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 active:scale-95 transition-all"
                                >
                                  <Gift className="w-3.5 h-3.5" /> Claim +{milestone.rewardCredits} Cr
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                  <Lock className="w-3 h-3" /> +{milestone.rewardCredits} Cr
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 3: 30-DAY HEATMAP */}
                {activeTab === 'calendar' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                        30-Day Activity Heatmap
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Every day you generate study materials, solve homework, or chat with SJ Tutor AI extends your streak.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                        {last30Days.map((day) => (
                          <div
                            key={day.dateStr}
                            title={`${day.dateStr}: ${day.completed ? 'Studied 🔥' : 'No activity'}`}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                              day.completed
                                ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-600 shadow-xs'
                                : day.isToday
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-dashed border-amber-400 text-amber-700 dark:text-amber-300 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold opacity-75">{day.dayOfWeek}</span>
                            <span className="text-sm font-black font-mono">{day.dayNum}</span>
                            <span className="text-[10px] mt-0.5">
                              {day.completed ? '🔥' : day.isToday ? 'Today' : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: LEADERBOARD */}
                {activeTab === 'leaderboard' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Top SJ Tutor AI Scholars
                      </h3>
                      <span className="text-xs text-slate-500">Live community standings</span>
                    </div>

                    {loadingLeaderboard ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Loading streak champions...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {leaderboard.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                            Be the first on the leaderboard! Start learning today.
                          </div>
                        ) : (
                          leaderboard.map((item, index) => {
                            const isMe = item.uid === streak.uid;
                            return (
                              <div
                                key={item.uid}
                                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                  isMe
                                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-xs'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-7 text-center font-black text-sm text-slate-500 dark:text-slate-400 font-mono">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                                    {item.photoURL ? (
                                      <img src={item.photoURL} alt={item.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                      item.displayName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                        {item.displayName}
                                      </span>
                                      {isMe && (
                                        <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-bold rounded">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                      High Record: {item.highestStreak} Days
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 font-mono font-black text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-900/50">
                                  <span>🔥</span> {item.currentStreak}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: NO RESET POLICY */}
                {activeTab === 'guide' && (
                  <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40">
                      <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-1">
                        <Zap className="w-4 h-4 text-amber-600" /> The SJ Tutor AI No-Reset Policy
                      </h4>
                      <p>
                        Your streak represents your cumulative learning commitment and will <strong>NEVER reset to 0</strong>. If you miss a day, your progress is kept safe. Every new day you study, your streak continues to grow!
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                        Activities That Extend Your Streak (+1):
                      </h5>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-400 pl-1">
                        <li>Generating study summaries, notes, or flashcards</li>
                        <li>Completing an interactive quiz or homework problem</li>
                        <li>Interactive voice or chat sessions with SJ Tutor AI</li>
                        <li>Conducting focus sessions with the Study Timer</li>
                      </ul>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                        Permanent Milestone Badges:
                      </h5>
                      <p className="text-slate-500 dark:text-slate-400">
                        Once you achieve a milestone (7, 14, 30, 50, 100, 365 days), it remains permanently unlocked with bonus learning credits.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Permanent streak protection enabled</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingStreakWidget;
