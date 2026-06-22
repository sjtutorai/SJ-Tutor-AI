import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Trophy, 
  X, 
  Sparkles, 
  Award,
  HelpCircle,
  History,
  Volume2,
  VolumeX,
  CheckCircle2,
  BellRing
} from 'lucide-react';
import { useStreak, STREAK_MILESTONES, getLocalDateString } from './StreakContext';
import { UserProfile } from '../types';

interface FloatingStreakWidgetProps {
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile, redirect?: boolean) => void;
}

export const FloatingStreakWidget: React.FC<FloatingStreakWidgetProps> = ({ 
  userProfile, 
  onProfileUpdate 
}) => {
  const { 
    streak, 
    leaderboard, 
    claimMilestone, 
    celebration, 
    setCelebration, 
    soundEnabled, 
    setSoundEnabled 
  } = useStreak();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab ] = useState<'STREAK' | 'BADGES' | 'LEADERBOARD'>('STREAK');

  // Animation trigger whenever user gets a streak update
  const prevStreakRef = useRef(streak.currentStreak);
  const [scaleTrigger, setScaleTrigger] = useState(false);

  useEffect(() => {
    if (streak.currentStreak > prevStreakRef.current) {
      setScaleTrigger(true);
      const timer = setTimeout(() => setScaleTrigger(false), 1200);
      prevStreakRef.current = streak.currentStreak;
      return () => clearTimeout(timer);
    }
    prevStreakRef.current = streak.currentStreak;
  }, [streak.currentStreak]);
  
  // Position state saved as percentile to handle responsive window resizes seamlessly
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Performance Pointer dragging state variables
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, widgetX: 0, widgetY: 0, timestamp: 0 });
  const hasDragged = useRef(false);

  // Real-time Countdown states
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  // Monitor the 24h countdown
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!streak.updatedAt || streak.currentStreak === 0) {
        return 0; // ready immediately or doesn't apply
      }
      const targetTime = streak.updatedAt + 24 * 60 * 60 * 1000;
      const t = targetTime - Date.now();
      return t > 0 ? t : 0;
    };

    // Initialize
    const initialRemaining = calculateTimeLeft();
    setTimeLeft(initialRemaining);
    if (initialRemaining === 0 && streak.currentStreak > 0) {
      setShowNotificationToast(true);
    }

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining === 0 && streak.currentStreak > 0) {
        setShowNotificationToast(true);
      } else {
        setShowNotificationToast(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [streak.updatedAt, streak.currentStreak]);

  // Keyboard accessibility handler for Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setCelebration(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCelebration]);

  // Initialize and restore saved percentage coordinates
  useEffect(() => {
    const xPct = localStorage.getItem('sjtutor_streak_widget_x_pct');
    const yPct = localStorage.getItem('sjtutor_streak_widget_y_pct');
    
    const x = xPct ? (parseFloat(xPct) / 100) * window.innerWidth : window.innerWidth - 90;
    const y = yPct ? (parseFloat(yPct) / 100) * window.innerHeight : window.innerHeight - 200;
    
    // Clamp coordinates to stay within window bounds on load
    const clampedX = Math.max(10, Math.min(x, window.innerWidth - 80));
    const clampedY = Math.max(10, Math.min(y, window.innerHeight - 80));

    setPosition({ x: clampedX, y: clampedY });
    setIsReady(true);

    const handleResize = () => {
      const currentXPct = localStorage.getItem('sjtutor_streak_widget_x_pct') || '85';
      const currentYPct = localStorage.getItem('sjtutor_streak_widget_y_pct') || '80';
      const resizedX = (parseFloat(currentXPct) / 100) * window.innerWidth;
      const resizedY = (parseFloat(currentYPct) / 100) * window.innerHeight;
      
      setPosition({
        x: Math.max(10, Math.min(resizedX, window.innerWidth - 80)),
        y: Math.max(10, Math.min(resizedY, window.innerHeight - 80))
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isReady) return null;

  // Pointer drag event handlers to allow keeping the toy anywhere
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    hasDragged.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      widgetX: position.x,
      widgetY: position.y,
      timestamp: Date.now()
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;

    if (Math.abs(deltaX) > 15 || Math.abs(deltaY) > 15) {
      hasDragged.current = true;
    }

    let newX = dragStart.current.widgetX + deltaX;
    let newY = dragStart.current.widgetY + deltaY;

    newX = Math.max(5, Math.min(newX, window.innerWidth - 75));
    newY = Math.max(5, Math.min(newY, window.innerHeight - 75));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const xPct = (position.x / window.innerWidth) * 100;
    const yPct = (position.y / window.innerHeight) * 100;
    localStorage.setItem('sjtutor_streak_widget_x_pct', xPct.toFixed(2));
    localStorage.setItem('sjtutor_streak_widget_y_pct', yPct.toFixed(2));

    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    const dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = Date.now() - dragStart.current.timestamp;

    if ((!hasDragged.current || dragDistance < 15) && duration < 350) {
      setIsOpen(true);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasDragged.current) {
      setIsOpen(true);
    }
  };

  // Helper formatting for dynamic clock
  const formatTimeLeft = (ms: number) => {
    if (ms <= 0) return 'Ready to earn!';
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Calculate percentage of remaining cycle
  const getCycleProgress = () => {
    if (!streak.updatedAt || streak.currentStreak === 0) return 100; 
    const elapsed = Date.now() - streak.updatedAt;
    const percentage = Math.min(100, (elapsed / (24 * 60 * 60 * 1000)) * 100);
    return percentage;
  };

  // Gamified Badges tracker configuration
  const gamifiedBadges = [
    { key: 'bronze', days: 7, label: '🥉 Bronze Learner', desc: 'Maintain streak for 7 consecutive days' },
    { key: 'silver', days: 30, label: '🥈 Silver Learner', desc: 'Maintain streak for 30 consecutive days' },
    { key: 'gold', days: 100, label: '🥇 Gold Scholar', desc: 'Maintain streak for 100 consecutive days' },
    { key: 'legend', days: 365, label: '🏆 Legend of SJ Tutor', desc: 'Maintain streak for 365 consecutive days' },
  ];

  // Highlight user ranking in leaderboard
  const getLeaderboardWithRank = () => {
    const sorted = [...leaderboard].sort((a, b) => b.highestStreak - a.highestStreak);
    const userIndex = sorted.findIndex(p => p.uid === streak.uid);
    let finalLeaderboard = sorted;
    
    if (userIndex === -1 && streak.uid !== 'guest') {
      finalLeaderboard = [
        ...sorted,
        {
          uid: streak.uid,
          displayName: userProfile.displayName || 'You',
          photoURL: userProfile.photoURL || '',
          currentStreak: streak.currentStreak,
          highestStreak: streak.highestStreak
        }
      ].sort((a, b) => b.highestStreak - a.highestStreak);
    }
    return finalLeaderboard.slice(0, 10);
  };

  const rankedLeaderboard = getLeaderboardWithRank();

  const getBadgeProgress = (daysNeeded: number) => {
    return Math.min(100, (streak.currentStreak / daysNeeded) * 100);
  };

  // Generate 30 Day calendar grid for Streak History
  const generatePast30Days = () => {
    const list = [];
    const todayStr = getLocalDateString();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      
      const parts = d.toDateString().split(' '); // [Day, Mon, Num, Year]
      list.push({
        dateString: dateStr,
        monthLabel: parts[1], // e.g. "Jun"
        dayOfMonth: parts[2], // e.g. "22"
        isToday: dateStr === todayStr,
        isCompleted: streak.streakHistory ? streak.streakHistory.includes(dateStr) : false,
      });
    }
    return list;
  };

  // Draggable outer SVG circular math
  const pillOutlineRadius = 26;
  const pillOutlineCircumference = 2 * Math.PI * pillOutlineRadius;
  const activeCyclePct = getCycleProgress();
  const pillOutlineOffset = pillOutlineCircumference - (activeCyclePct / 100) * pillOutlineCircumference;

  return (
    <>
      {/* 1. Floating Draggable Streak Pill */}
      <motion.div
        ref={dragRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          left: position.x,
          top: position.y,
          position: 'fixed',
          zIndex: 9999,
        }}
        animate={scaleTrigger ? {
          scale: [1, 1.35, 1.35, 1.1, 1],
          rotate: [0, -18, 18, -12, 12, 0],
          boxShadow: [
            "0_8px_30px_rgba(249,115,22,0.35)",
            "0_0px_60px_rgba(249,115,22,0.85)",
            "0_0px_35px_rgba(249,115,22,0.6)",
            "0_8px_30px_rgba(249,115,22,0.35)"
          ]
        } : {}}
        transition={{ duration: 1.0, ease: "easeInOut" }}
        whileHover={{ scale: 1.1, cursor: 'grab' }}
        whileTap={{ scale: 0.95, cursor: 'grabbing' }}
        className="touch-none select-none"
        aria-label={`SJ Tutor Streak: ${streak.currentStreak} Days. Time left till next: ${formatTimeLeft(timeLeft)}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(true);
          }
        }}
      >
        <div
          onClick={handleClick}
          title="Drag me anywhere! Click to expand Streak Hub"
          className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-white shadow-[0_8px_30px_rgba(249,115,22,0.35)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition"
        >
          {/* Circular SVG Progress Ring outlines the Float Pill directly! */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 64 64">
            <circle 
              cx="32" 
              cy="32" 
              r={pillOutlineRadius} 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.08)" 
              strokeWidth="3.5" 
            />
            <motion.circle 
              cx="32" 
              cy="32" 
              r={pillOutlineRadius} 
              fill="none" 
              stroke="url(#pillProgressGrad)" 
              strokeWidth="3.5" 
              strokeDasharray={pillOutlineCircumference}
              strokeDashoffset={pillOutlineOffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="pillProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>

          {/* Active indicator flame flare */}
          <div className="relative flex flex-col items-center justify-center pt-1 animate-pulse">
            <Flame className="w-6 h-6 text-orange-500 fill-orange-400" />
            <span className="text-[10px] font-black tracking-tighter text-amber-300 mt-0.5 leading-none">
              🔥 {streak.currentStreak}
            </span>
          </div>

          {/* Glowing dot if count down reached 0 */}
          {timeLeft === 0 && streak.currentStreak > 0 && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
        </div>
      </motion.div>

      {/* 2. Expanded Streak Hub Dashboard Sheet/Drawer with Premium Glassmorphism */}
      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] border border-slate-200/50 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100"
            >
              {/* Premium Glow Header */}
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 text-white relative overflow-hidden">
                {/* Visual Accent glows */}
                <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-orange-600/10 rounded-full blur-2xl pointer-events-none" />
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/90 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
                  aria-label="Close Streak Hub"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2 mb-2.5">
                  <Flame className="w-6 h-6 text-amber-400 fill-amber-300 animate-bounce" />
                  <span className="text-xs font-black uppercase tracking-widest text-orange-400">SJ Scholar Streak System</span>
                </div>

                <div className="flex items-baseline gap-2.5">
                  <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                    {streak.currentStreak}
                  </h1>
                  <span className="text-xl font-bold text-amber-200">Day Active Streak</span>
                </div>
                
                {/* Accurate Next Streak Countdown Clock! */}
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-orange-200 text-xs font-black shadow-inner">
                  <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  <span>
                    {timeLeft > 0 ? `⚡ Next Streak Availability In: ${formatTimeLeft(timeLeft)}` : '🔥 Ready to Earn Your Next Streak! Study now!'}
                  </span>
                </div>
              </div>

              {/* Eligibility Floating Banner Inside Modal */}
              {showNotificationToast && (
                <div className="px-6 pt-4">
                  <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-500/15 to-teal-500/5 border border-emerald-500/20 rounded-2xl text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-emerald-500 animate-bounce" />
                      <span>🔥 Your next streak is ready! Complete any study activity now.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="mt-4 px-6 border-b border-slate-200/60 dark:border-slate-800/80 flex gap-4 text-sm font-bold">
                <button
                  onClick={() => setActiveTab('STREAK')}
                  className={`pb-3 border-b-2 transition-colors focus:outline-none ${activeTab === 'STREAK' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    Activity History
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('BADGES')}
                  className={`pb-3 border-b-2 transition-colors focus:outline-none ${activeTab === 'BADGES' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Stellar Badges
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('LEADERBOARD')}
                  className={`pb-3 border-b-2 transition-colors focus:outline-none ${activeTab === 'LEADERBOARD' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </span>
                </button>
              </div>

              {/* Scrollable Container with tabs content */}
              <div className="p-6 max-h-[380px] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30">
                
                {/* TAB 1: HISTORY & STATS BENTO GRID */}
                {activeTab === 'STREAK' && (
                  <div className="space-y-4">
                    {/* Brand New Stats Bento Grid! */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Longest Streak</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white mt-1 flex items-center gap-1">
                          👑 {streak.highestStreak} Days
                        </p>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Days Studied</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white mt-1 flex items-center gap-1">
                          📆 {streak.streakHistory ? streak.streakHistory.length : 0} Days
                        </p>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-sm col-span-2">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Last Sync Activity</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
                          🕒 {streak.lastActivityDate || 'No current activity recorded'}
                        </p>
                      </div>
                    </div>

                    {/* Streak Calendar Grid (Past 30 Days) */}
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-orange-500" />
                        Streak Calendar History (30 Days)
                      </h3>
                      
                      <div className="grid grid-cols-6 gap-2">
                        {generatePast30Days().map((day, idx) => (
                          <div 
                            key={idx} 
                            title={`${day.monthLabel} ${day.dayOfMonth}: ${day.isCompleted ? 'Completed study session' : 'Skipped activity'}`}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${day.isCompleted ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white border-orange-400 shadow-[0_4px_10px_rgba(249,115,22,0.2)]' : day.isToday ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 text-indigo-400 font-bold' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500'}`}
                          >
                            <span className="text-[9px] font-extrabold uppercase opacity-80 leading-none">{day.monthLabel}</span>
                            <span className="text-sm font-black mt-0.5 leading-none">{day.dayOfMonth}</span>
                            {day.isCompleted ? (
                              <Flame className="w-3.5 h-3.5 mt-1 text-yellow-200 fill-yellow-200 animate-bounce" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-center text-center bg-white dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 gap-2">
                      <HelpCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <span>Unlock streak increments after 24 hours pass from previous streak milestones. Complete study items to stay locked!</span>
                    </div>
                  </div>
                )}

                {/* TAB 2: STELLAR BADGES */}
                {activeTab === 'BADGES' && (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-1 text-xs font-black text-slate-400 uppercase tracking-widest pb-1">
                      <Award className="w-4 h-4 text-orange-500" />
                      <span>Automatic Badges Progress</span>
                    </div>

                    {/* Render standard gamified progress meters */}
                    {gamifiedBadges.map((badge, idx) => {
                      const progress = getBadgeProgress(badge.days);
                      const isUnlocked = streak.currentStreak >= badge.days || streak.highestStreak >= badge.days;
                      
                      return (
                        <div 
                          key={idx}
                          className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border transition-all ${isUnlocked ? 'border-amber-300 bg-amber-500/5 dark:border-amber-500/30' : 'border-slate-200/50 dark:border-slate-800'}`}
                        >
                          <div className="flex justify-between items-center mb-2.5">
                            <div className="flex items-center gap-3">
                              <span className={`text-3xl flex-shrink-0 leading-none ${!isUnlocked && 'grayscale'}`}>
                                {badge.label.substring(0, 2)}
                              </span>
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                                  {badge.label.substring(3)}
                                  {isUnlocked && (
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                      Unlocked
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-none">
                                  {badge.desc}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                              {badge.days} Days
                            </span>
                          </div>

                          {/* Interactive Bar */}
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-extrabold mb-1">
                              <span>Status</span>
                              <span>{Math.min(streak.currentStreak, badge.days)}/{badge.days} Days ({Math.floor(progress)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 h-full rounded-full transition-all duration-700"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Standard Milestones Rewards Claim Blocks */}
                    <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-4 mt-2">
                      <div className="flex items-center gap-1 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                        <span>Exclusive Milestones rewards</span>
                      </div>
                      
                      <div className="space-y-2.5">
                        {STREAK_MILESTONES.map((m, idx) => {
                          const isReached = streak.currentStreak >= m.days;
                          const isClaimed = streak.claimedMilestones && streak.claimedMilestones.includes(m.days);
                          const canClaim = isReached && !isClaimed;

                          return (
                            <div 
                              key={idx}
                              className={`bg-white dark:bg-slate-800 p-3.5 rounded-2xl border flex items-center justify-between ${isClaimed ? 'bg-slate-50 dark:bg-slate-850 opacity-80 border-slate-200/50 dark:border-slate-800' : 'border-slate-200/50 dark:border-slate-800'}`}
                            >
                              <div className="flex gap-2.5 items-center">
                                <span className="text-2xl">{m.badge}</span>
                                <div>
                                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">
                                    {m.label} ({m.days} Days)
                                  </h4>
                                  <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">
                                    {isClaimed ? 'Unlocks special profile emblem claimed!' : `Keep going! ${m.days - streak.currentStreak} days left to unlock`}
                                  </p>
                                </div>
                              </div>
                              
                              {canClaim && (
                                <button
                                  onClick={() => claimMilestone(m.days, userProfile, onProfileUpdate)}
                                  className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 font-bold text-white text-[10px] rounded-xl shadow-md cursor-pointer transition active:scale-95"
                                >
                                  Claim Emblem
                                </button>
                              )}
                              {isClaimed && (
                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-100/50 dark:bg-emerald-950/30 px-2 py-1 rounded-lg">
                                  Claimed
                                </span>
                              )}
                              {!isReached && !isClaimed && (
                                <span className="text-[10px] font-bold text-slate-400">
                                  Locked
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: LEADERBOARD */}
                {activeTab === 'LEADERBOARD' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Trophy className="w-5 h-5 text-amber-500 animate-bounce" />
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Top Streak Leaders</h3>
                    </div>

                    <div className="space-y-1.5">
                      {rankedLeaderboard.map((player, idx) => {
                        const isMe = player.uid === streak.uid;
                        const rankColors = [
                          'bg-yellow-500 text-white font-extrabold',
                          'bg-slate-300 text-slate-800 font-extrabold',
                          'bg-amber-600 text-white font-extrabold',
                        ];
                        const rankLabel = idx + 1;

                        return (
                          <div 
                            key={player.uid}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isMe ? 'bg-gradient-to-r from-amber-50 via-orange-50/50 to-red-50/20 border-orange-300 dark:from-slate-850 dark:to-slate-800 dark:border-amber-500/50 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800/60'}`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Position */}
                              <span className={`h-6 w-6 rounded-full text-xs flex items-center justify-center ${idx < 3 ? rankColors[idx] : 'bg-slate-100 dark:bg-slate-700 text-slate-400 font-bold'}`}>
                                {rankLabel}
                              </span>
                              
                              {/* Photo */}
                              <div className="h-8 w-8 rounded-full bg-indigo-500 text-white font-black text-xs flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                                {player.photoURL ? (
                                  <img src={player.photoURL} alt={player.displayName} className="h-full w-full object-cover" />
                                ) : (
                                  player.displayName.substring(0, 2).toUpperCase()
                                )}
                              </div>

                              <div>
                                <p className={`text-xs font-black truncate max-w-[130px] ${isMe ? 'text-orange-700 dark:text-amber-400 font-black' : 'text-slate-755 dark:text-slate-200'}`}>
                                  {player.displayName} {isMe && '(You)'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                  Peak: Flame {player.highestStreak}
                                </p>
                              </div>
                            </div>

                            <div className="bg-amber-500/10 dark:bg-slate-900 px-2 py-1 border border-orange-500/20 rounded-lg">
                              <span className="text-xs font-black text-orange-600 dark:text-orange-400">🔥 {player.currentStreak}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Card Footer */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200/50 dark:border-slate-800 text-center text-[10px] text-slate-400 font-bold flex items-center justify-between px-6">
                <span>SJ Tutor AI Premium Streak Mode</span>
                <span>Active local zone checks</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Global Full-screen Celebration Overlay Pop-up */}
      <AnimatePresence>
        {celebration && celebration.show && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 border-2 border-orange-500/50 shadow-[0_0_50px_rgba(249,115,22,0.4)] text-center overflow-hidden"
            >
              {/* Visual glow ring */}
              <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.25),transparent_60%)] pointer-events-none" />
              
              <button
                onClick={() => setCelebration(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label="Dismiss celebration"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 space-y-4 py-4">
                <motion.div
                  initial={{ scale: 0.5, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 shadow-[0_0_30px_rgba(249,115,22,0.6)]"
                >
                  <Flame className="w-14 h-14 text-yellow-200 fill-yellow-105 animate-pulse" />
                </motion.div>

                <div className="space-y-1">
                  <motion.h2 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-black tracking-tight"
                  >
                    🎉 Streak Increased!
                  </motion.h2>
                  <p className="text-xs text-amber-200 font-bold uppercase tracking-wider">
                    Keep studying on SJ Tutor AI!
                  </p>
                </div>

                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 15, delay: 0.3 }}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl py-3 px-6 inline-block shadow-inner"
                >
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                    Current Streak
                  </span>
                  <span className="text-4xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
                    🔥 {celebration.days} <span className="text-xl font-bold text-white">Days</span>
                  </span>
                </motion.div>

                {celebration.isMilestone && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="p-3 bg-violet-600/20 border border-violet-500/30 rounded-xl text-xs font-semibold text-violet-200 flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-violet-400 animate-bounce" />
                    <span>Unlocked Badge Milestone Badge: {celebration.badge || '🏆'}!</span>
                  </motion.div>
                )}

                <div className="flex items-center justify-center gap-3 pt-2">
                  {/* Sound Effect Controls */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 transition text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 focus:outline-none"
                    title={soundEnabled ? 'Disable Sounds' : 'Enable Sounds'}
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-4 h-4 text-amber-400" />
                        <span>Sound: ON</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-4 h-4 text-slate-500" />
                        <span>Sound: OFF</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setCelebration(null)}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
