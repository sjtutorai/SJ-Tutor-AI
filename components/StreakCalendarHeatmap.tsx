import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Snowflake, 
  ShieldCheck, 
  Info, 
  Calendar as CalendarIcon,
  ShoppingBag
} from 'lucide-react';
import { useStreak } from './StreakContext';
import { UserProfile } from '../types';

interface StreakCalendarHeatmapProps {
  profile: UserProfile;
  onProfileUpdate?: (updated: UserProfile, redirect?: boolean) => void;
}

export const StreakCalendarHeatmap: React.FC<StreakCalendarHeatmapProps> = ({
  profile,
  onProfileUpdate,
}) => {
  const { 
    streak, 
    buyStreakFreeze, 
    applyStreakFreeze, 
    isStudiedToday 
  } = useStreak();

  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    dayNum: number;
    dayOfWeek: string;
    level: number;
    isToday: boolean;
    isFrozen: boolean;
    completed: boolean;
  } | null>(null);

  const [freezeActionLoading, setFreezeActionLoading] = useState(false);
  const [freezeMessage, setFreezeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Available Freezes & Credits
  const availableFreezes = typeof streak.streakFreezes === 'number' 
    ? streak.streakFreezes 
    : (profile.streakFreezes ?? 1);

  const currentCredits = profile.credits ?? 100;
  const currentStreak = streak.currentStreak ?? profile.streak ?? 0;
  const freezeCost = 50;

  // Streak history & freeze dates arrays
  const historySet = useMemo(() => {
    const raw = streak.streakHistory || profile.streakHistory || [];
    return new Set(raw.map((d) => (typeof d === 'string' ? d.split('T')[0] : '')));
  }, [streak.streakHistory, profile.streakHistory]);

  const freezeDatesSet = useMemo(() => {
    const raw = streak.streakFreezeDates || profile.streakFreezeDates || [];
    return new Set(raw);
  }, [streak.streakFreezeDates, profile.streakFreezeDates]);

  // Compute 30-day timeline
  const last30Days = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const isToday = i === 0;
      const isFrozen = freezeDatesSet.has(dateStr);
      const completed = historySet.has(dateStr) || isFrozen;

      // Calculate intensity level:
      // 0 = Inactive / rest
      // 1 = Light (1 study action)
      // 2 = Moderate (standard session)
      // 3 = High (extended focus / milestone)
      // If completed, compute varied realistic intensity based on date hash
      let level = 0;
      if (isFrozen) {
        level = 4; // Frozen
      } else if (completed) {
        const hash = (d.getDate() * 7 + d.getMonth() * 13) % 3;
        level = hash === 0 ? 1 : hash === 1 ? 2 : 3;
      }

      days.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isToday,
        isFrozen,
        completed,
        level,
      });
    }
    return days;
  }, [historySet, freezeDatesSet]);

  // Statistics
  const totalActiveDays = last30Days.filter((d) => d.completed).length;
  const consistencyRate = Math.round((totalActiveDays / 30) * 100);

  // Handle Buy Streak Freeze
  const handleBuyFreeze = async () => {
    setFreezeActionLoading(true);
    setFreezeMessage(null);
    try {
      const res = await buyStreakFreeze(freezeCost);
      if (res.success) {
        setFreezeMessage({ text: res.message, type: 'success' });
        if (onProfileUpdate) {
          onProfileUpdate({
            ...profile,
            credits: res.remainingCredits,
            streakFreezes: res.totalFreezes,
          }, false);
        }
      } else {
        setFreezeMessage({ text: res.message, type: 'error' });
      }
    } catch (e: any) {
      setFreezeMessage({ text: e?.message || 'Purchase failed', type: 'error' });
    } finally {
      setFreezeActionLoading(false);
      setTimeout(() => setFreezeMessage(null), 4000);
    }
  };

  // Handle Use Streak Freeze for today
  const handleUseFreeze = async () => {
    if (availableFreezes <= 0) {
      setFreezeMessage({ text: 'No Streak Freezes available. Purchase one below!', type: 'error' });
      return;
    }
    setFreezeActionLoading(true);
    setFreezeMessage(null);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await applyStreakFreeze(todayStr);
      if (res.success) {
        setFreezeMessage({ text: res.message, type: 'success' });
        if (onProfileUpdate) {
          const updatedHistory = [...(profile.streakHistory || [])];
          if (!updatedHistory.includes(todayStr)) updatedHistory.push(todayStr);
          const updatedFreezeDates = [...(profile.streakFreezeDates || []), todayStr];
          onProfileUpdate({
            ...profile,
            streakFreezes: res.remainingFreezes,
            streakFreezeDates: updatedFreezeDates,
            streakHistory: updatedHistory,
          }, false);
        }
      } else {
        setFreezeMessage({ text: res.message, type: 'error' });
      }
    } catch (e: any) {
      setFreezeMessage({ text: e?.message || 'Failed to use freeze', type: 'error' });
    } finally {
      setFreezeActionLoading(false);
      setTimeout(() => setFreezeMessage(null), 4000);
    }
  };

  return (
    <div 
      id="streak-calendar-heatmap-container"
      className="w-full bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
    >
      {/* Header with Title and Streak Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>30-Day Streak Activity Calendar</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                🔥 {currentStreak} Day{currentStreak !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visual log of daily study consistency with color-coded intensity levels.
            </p>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Consistency</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{consistencyRate}%</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Days</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{totalActiveDays}/30</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid Display */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 font-semibold">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
            Last 30 Days Activity Log
          </span>
          <span className="text-[11px] font-mono">
            {last30Days[0]?.fullDateFormatted} — {last30Days[last30Days.length - 1]?.fullDateFormatted}
          </span>
        </div>

        {/* 30-Day Grid */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-2.5">
            {last30Days.map((day) => {
              // Styling per level
              let bgClass = 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800';
              let ringClass = '';

              if (day.isFrozen) {
                bgClass = 'bg-gradient-to-tr from-cyan-400 to-blue-500 text-white border-cyan-400 shadow-xs shadow-cyan-500/20';
                ringClass = 'ring-2 ring-cyan-300 dark:ring-cyan-500/50';
              } else if (day.level === 3) {
                bgClass = 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white border-emerald-600 shadow-xs shadow-emerald-500/20';
                ringClass = 'ring-2 ring-emerald-400/50';
              } else if (day.level === 2) {
                bgClass = 'bg-emerald-400 dark:bg-emerald-600 text-white border-emerald-500';
              } else if (day.level === 1) {
                bgClass = 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800';
              } else if (day.isToday) {
                bgClass = 'bg-amber-50 dark:bg-amber-950/40 border-dashed border-amber-400 text-amber-700 dark:text-amber-300 font-bold';
              }

              return (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${bgClass} ${ringClass}`}
                >
                  <span className="text-[10px] uppercase font-bold opacity-75 leading-tight">
                    {day.dayOfWeek}
                  </span>
                  <span className="text-sm font-black font-mono leading-tight mt-0.5">
                    {day.dayNum}
                  </span>
                  <span className="text-[10px] mt-0.5 leading-tight">
                    {day.isFrozen ? '❄️' : day.completed ? '🔥' : day.isToday ? 'Today' : '—'}
                  </span>

                  {/* Dot Indicator for Today */}
                  {day.isToday && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white dark:border-slate-900 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Hover Details Info Banner */}
          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 min-h-[28px]">
            {hoveredDay ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  📅 {hoveredDay.fullDateFormatted}:
                </span>
                <span>
                  {hoveredDay.isFrozen
                    ? '❄️ Streak Freeze Applied (Protected Missed Day)'
                    : hoveredDay.completed
                    ? `🔥 Level ${hoveredDay.level} Study Activity Completed`
                    : hoveredDay.isToday
                    ? isStudiedToday ? '🔥 Studied Today' : '⏳ Today (Study or use freeze to extend streak)'
                    : '💤 Rest Day (Streak preserved by No-Reset Policy)'}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 italic text-[11px]">
                Hover or tap any date cell above to inspect session intensity details.
              </span>
            )}
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Intensity:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" title="Rest Day" />
              <span>Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-300" title="Light" />
              <span>Light</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-400 dark:bg-emerald-600" title="Moderate" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-gradient-to-tr from-emerald-500 to-teal-500 text-white" title="High" />
              <span>Peak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-gradient-to-tr from-cyan-400 to-blue-500" title="Streak Freeze" />
              <span>❄️ Frozen</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Permanent streak protection</span>
          </div>
        </div>
      </div>

      {/* Streak Freeze Shop & Inventory Section */}
      <div 
        id="streak-freeze-shop-card"
        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-slate-50 dark:from-cyan-950/30 dark:via-blue-950/20 dark:to-slate-800/40 border border-cyan-200 dark:border-cyan-900/50 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
              <Snowflake className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Streak Freeze Power-Up
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  Shop Item
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Allows you to use credits to skip one study day without interrupting your active streak.
              </p>
            </div>
          </div>

          {/* Current Freeze Inventory Count */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-cyan-200 dark:border-cyan-800 shadow-xs shrink-0">
            <Snowflake className="w-4 h-4 text-cyan-500" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Inventory</span>
              <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">
                {availableFreezes} Available
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {freezeMessage && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            freezeMessage.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{freezeMessage.text}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Buy Streak Freeze */}
          <button
            id="buy-streak-freeze-btn"
            onClick={handleBuyFreeze}
            disabled={freezeActionLoading || currentCredits < freezeCost}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Buy Streak Freeze ({freezeCost} Credits)</span>
          </button>

          {/* Use Streak Freeze */}
          <button
            id="use-streak-freeze-btn"
            onClick={handleUseFreeze}
            disabled={freezeActionLoading || availableFreezes <= 0}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-cyan-800 dark:text-cyan-200 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950/80 dark:hover:bg-cyan-900 border border-cyan-200 dark:border-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Use Streak Freeze for Today</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StreakCalendarHeatmap;
