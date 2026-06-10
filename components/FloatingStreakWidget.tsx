import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Flame, 
  Trophy, 
  X, 
  Sparkles, 
  Clock, 
  Lock, 
  Award,
  HelpCircle,
  TrendingUp,
  History
} from 'lucide-react';
import { useStreak, STREAK_MILESTONES, getLocalDateString } from './StreakContext';
import { UserProfile } from '../types';

interface FloatingStreakWidgetProps {
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile, redirect?: boolean) => void;
}

export const FloatingStreakWidget: React.FC<FloatingStreakWidgetProps> = ({ 
  userProfile
}) => {
  const { streak, leaderboard, claimMilestone } = useStreak();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab ] = useState<'STREAK' | 'MILESTONES' | 'LEADERBOARD'>('STREAK');
  
  // Position state saved as percentile to handle responsive window resizes seamlessly
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

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

  // Track drag end and save coordinates
  const handleDragEnd = (_event: any, info: any) => {
    const newX = position.x + info.offset.x;
    const newY = position.y + info.offset.y;

    const clampedX = Math.max(10, Math.min(newX, window.innerWidth - 80));
    const clampedY = Math.max(10, Math.min(newY, window.innerHeight - 80));

    setPosition({ x: clampedX, y: clampedY });
    localStorage.setItem('sjtutor_streak_widget_x_pct', ((clampedX / window.innerWidth) * 100).toFixed(2));
    localStorage.setItem('sjtutor_streak_widget_y_pct', ((clampedY / window.innerHeight) * 100).toFixed(2));
  };

  // Generate 30 Day calendar grid for Streak History
  const generatePast30Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      list.push({
        dateString: dateStr,
        dayOfMonth: d.getDate(),
        monthLabel: d.toLocaleString('default', { month: 'short' }),
        isToday: dateStr === getLocalDateString(),
        isCompleted: streak.streakHistory ? streak.streakHistory.includes(dateStr) : false,
      });
    }
    return list;
  };

  const calendarGrid = generatePast30Days();

  // Highlight user ranking in leaderboard
  const getLeaderboardWithRank = () => {
    const sorted = [...leaderboard].sort((a, b) => b.highestStreak - a.highestStreak);
    
    // Check if user is in sorted list, if not insert
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

  // Helper check for milestones
  const getMilestoneProgress = (daysGoal: number) => {
    const percentage = Math.min(100, (streak.currentStreak / daysGoal) * 100);
    return percentage;
  };

  return (
    <>
      {/* Floating Draggable Streak Pill */}
      <motion.div
        ref={dragRef}
        drag
        dragMomentum={false}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        style={{
          x: 0,
          y: 0,
          left: position.x,
          top: position.y,
          position: 'fixed',
          zIndex: 9999,
        }}
        whileHover={{ scale: 1.1, cursor: 'grab' }}
        whileTap={{ scale: 0.95, cursor: 'grabbing' }}
        className="touch-none select-none"
      >
        <button
          onClick={() => setIsOpen(true)}
          title="Keep learning daily to maintain your streak!"
          className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white p-0.5 shadow-[0_4px_20px_rgba(249,115,22,0.4)] md:shadow-[0_8px_30px_rgba(249,115,22,0.4)] dark:shadow-[0_8px_30px_rgba(220,38,38,0.3)] hover:shadow-orange-500/60 transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
        >
          {/* Inner ring & flame details */}
          <div className="absolute inset-0.5 bg-slate-900 rounded-full flex items-center justify-center transition-colors group-hover:bg-slate-900/90 overflow-hidden">
            {/* Animated Glow Elements */}
            <span className="absolute inset-[-50%] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.15),transparent_60%)] animate-pulse" />
            
            {/* Fire surround effect */}
            <Flame className="absolute text-orange-500/30 w-11 h-11 animate-pulse" />
            
            <div className="relative flex flex-col items-center justify-center pt-1.5">
              <Calendar className="w-5 h-5 text-amber-200 group-hover:scale-105 transition-transform" />
              <span className="text-[10px] font-bold tracking-tight text-orange-100 flex items-center gap-0.5 mt-0.5 pb-1">
                🔥 {streak.currentStreak}
              </span>
            </div>
          </div>
          
          {/* Active indicator flame flare */}
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce shadow">
            🔥
          </span>
        </button>
      </motion.div>

      {/* Expanded Streak Hub Dashboard Sheet/Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100"
            >
              {/* Card Premium Gradient Header */}
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 p-6 text-white relative">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-6 right-6 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white/90 hover:text-white transition-colors focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-6 h-6 animate-pulse text-yellow-300 fill-yellow-300" />
                  <span className="text-xs font-black uppercase tracking-widest text-amber-100">SJ Tutor AI Streak Hub</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <h1 className="text-4xl font-extrabold tracking-tight">{streak.currentStreak}</h1>
                  <span className="text-lg font-bold text-amber-100">Day Streak!</span>
                </div>
                
                <p className="text-xs text-orange-50 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  Last Activity: {streak.lastActivityDate ? `${streak.lastActivityDate}` : 'No learning completed today yet'}
                </p>

                {/* Slogan */}
                <span className="absolute bottom-[-15px] left-6 text-[10px] font-semibold bg-slate-950 text-amber-400 px-3 py-1 rounded-full border border-orange-500 shadow-md">
                  🚀 Keep learning daily to maintain your streak!
                </span>
              </div>

              {/* Navigation Tabs */}
              <div className="mt-6 px-6 border-b border-slate-100 dark:border-slate-800 flex gap-4 text-sm font-bold">
                <button
                  onClick={() => setActiveTab('STREAK')}
                  className={`pb-3 border-b-2 transition-colors ${activeTab === 'STREAK' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <History className="w-4 h-4" />
                    History
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('MILESTONES')}
                  className={`pb-3 border-b-2 transition-colors ${activeTab === 'MILESTONES' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Emblems
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('LEADERBOARD')}
                  className={`pb-3 border-b-2 transition-colors ${activeTab === 'LEADERBOARD' ? 'border-orange-500 text-orange-600 dark:text-orange-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}
                >
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" />
                    Leaderboard
                  </span>
                </button>
              </div>

              {/* Tab Contents - Scrollable Box */}
              <div className="p-6 max-h-[400px] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
                
                {/* 1. STREAK HISTORY CALENDAR TAB */}
                {activeTab === 'STREAK' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Top Streak Milestone</p>
                        <p className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
                          🔥 {streak.highestStreak} Days
                        </p>
                      </div>
                      <div className="bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20">
                        <TrendingUp className="w-6 h-6 text-orange-500" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2.5">Streak Calendar History (Past 30 Days)</h3>
                      <div className="grid grid-cols-6 gap-2">
                        {calendarGrid.map((day, idx) => (
                          <div 
                            key={idx} 
                            title={`${day.monthLabel} ${day.dayOfMonth}: ${day.isCompleted ? 'Completed Activity' : 'No activity'}`}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border ${day.isCompleted ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-orange-400 shadow-[0_2px_8px_rgba(249,115,22,0.2)]' : day.isToday ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white font-bold' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                          >
                            <span className="text-[9px] font-black uppercase opacity-80 leading-none">{day.monthLabel}</span>
                            <span className="text-sm font-extrabold mt-0.5 leading-none">{day.dayOfMonth}</span>
                            {day.isCompleted ? (
                              <Flame className="w-3.5 h-3.5 mt-1 text-yellow-200 fill-yellow-200" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mt-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-center text-center bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 gap-1.5 mt-2">
                      <HelpCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      Complete daily Quizzes, Lesson Summaries, Homework Questions, or Chat with AI Tutor to build your sequence. Let&apos;s study!
                    </div>
                  </div>
                )}

                {/* 2. EMBLEMS TAB */}
                {activeTab === 'MILESTONES' && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 font-medium px-1 flex items-center gap-1 mb-2">
                      <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                      Collect prestigious Emblems as you maintain your consecutive daily learning.
                    </p>
                    {STREAK_MILESTONES.map((m, idx) => {
                      const progress = getMilestoneProgress(m.days);
                      const isReached = streak.currentStreak >= m.days;
                      const isClaimed = streak.claimedMilestones && streak.claimedMilestones.includes(m.days);
                      const canClaim = isReached && !isClaimed;

                      return (
                        <div 
                          key={idx}
                          className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border transition-all ${isReached ? (isClaimed ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/10 dark:bg-amber-950/5' : 'border-emerald-300 dark:border-emerald-500/30 ring-2 ring-emerald-500/10') : 'border-slate-100 dark:border-slate-800/80'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-2.5">
                              <span className={`text-3xl p-2 rounded-xl flex items-center justify-center ${isReached ? (isClaimed ? 'bg-amber-500/10' : 'bg-emerald-500/10') : 'bg-slate-100 dark:bg-slate-700/50 opacity-40'}`}>{m.badge}</span>
                              <div>
                                <h4 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 flex-wrap">
                                  {m.label}
                                  {isClaimed && (
                                    <span className="text-[9px] bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-amber-200 dark:border-amber-900/50">
                                      ✨ Collected
                                    </span>
                                  )}
                                  {canClaim && (
                                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                      Ready to Claim
                                    </span>
                                  )}
                                </h4>
                                <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-0.5 dark:text-slate-400 font-bold">
                                  Goal: <span className="text-orange-500 font-extrabold">{m.days} consecutive learning days</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isClaimed ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400' : isReached ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'}`}>
                                {isClaimed ? 'Emblem Active' : isReached ? 'Earned' : 'Locked'}
                              </span>
                            </div>
                          </div>

                          {/* Progress Line */}
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                              <span>Progress</span>
                              <span>{streak.currentStreak}/{m.days} Days ({Math.floor(progress)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isClaimed ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Action button */}
                          {canClaim && (
                            <button
                              onClick={() => claimMilestone(m.days)}
                              className="mt-3 w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 hover:shadow-lg active:scale-95 transition-all"
                            >
                              <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                              Add Emblem to Collection!
                            </button>
                          )}
                          {!isReached && (
                            <div className="mt-2.5 text-[10px] text-slate-400 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-slate-400" />
                              Unlock by keeping up your progress for {m.days - streak.currentStreak} more days!
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. LEADERBOARD TAB */}
                {activeTab === 'LEADERBOARD' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Trophy className="w-5 h-5 text-amber-500" />
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
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isMe ? 'bg-gradient-to-r from-amber-50 via-orange-50/50 to-red-50/20 border-orange-300 dark:from-slate-800/80 dark:to-slate-800 dark:border-amber-500/50 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800/60'}`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Rank position numbers */}
                              <span className={`h-6 w-6 rounded-full text-xs flex items-center justify-center ${idx < 3 ? rankColors[idx] : 'bg-slate-100 dark:bg-slate-700 text-slate-400 font-bold'}`}>
                                {rankLabel}
                              </span>
                              
                              {/* Avatar fallback */}
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-black text-xs flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700">
                                {player.photoURL ? (
                                  <img src={player.photoURL} alt={player.displayName} className="h-full w-full object-cover" />
                                ) : (
                                  player.displayName.substring(0, 2).toUpperCase()
                                )}
                              </div>

                              <div>
                                <p className={`text-xs font-extrabold truncate max-w-[130px] ${isMe ? 'text-orange-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                  {player.displayName} {isMe && '(You)'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                                  Peak: Flame {player.highestStreak}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 bg-amber-500/10 dark:bg-slate-900/60 border border-orange-500/10 rounded-lg px-2 py-1">
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
              <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-center text-[11px] text-slate-400 font-bold">
                Duolingo-style Streak Engine by SJ Tutor AI • Local Time Zone
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
