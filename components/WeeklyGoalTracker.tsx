import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, TrendingUp, ChevronUp, ChevronDown, Award, Clock, Sparkles } from 'lucide-react';

interface WeeklyGoalTrackerProps {
  userId: string | null;
}

const WeeklyGoalTracker: React.FC<WeeklyGoalTrackerProps> = ({ userId }) => {
  const key = userId || 'guest';
  
  // States
  const [weeklyGoalHours, setWeeklyGoalHours] = useState<number>(10);
  const [completedHours, setCompletedHours] = useState<number>(0);
  const [completedMinutes, setCompletedMinutes] = useState<number>(0);

  // Load and calculate study goal + completed hours
  const calculateProgress = () => {
    try {
      // 1. Get weekly target hours
      const savedGoal = localStorage.getItem(`weekly_study_goal_hours_${key}`);
      if (savedGoal) {
        setWeeklyGoalHours(parseInt(savedGoal) || 10);
      } else {
        setWeeklyGoalHours(10);
      }

      // 2. Load study milestones/sessions and filter to the last 7 days
      const milestonesStr = localStorage.getItem(`study_milestones_${key}`) || '[]';
      const milestones = JSON.parse(milestonesStr);
      
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      
      // Filter sessions matching key criteria
      const recentTimerSessions = milestones.filter((m: any) => {
        return m.timestamp >= oneWeekAgo && m.type === 'Timer Focus Session';
      });

      // Sum minutes, falling back to 25 if durationMinutes is missing
      const totalMinutesRef = recentTimerSessions.reduce((acc: number, cur: any) => {
        const mins = cur.durationMinutes !== undefined ? cur.durationMinutes : 25;
        return acc + mins;
      }, 0);

      setCompletedMinutes(totalMinutesRef);
      setCompletedHours(parseFloat((totalMinutesRef / 60).toFixed(1)));
    } catch (err) {
      console.error("Error loaded or calculating weekly progress:", err);
    }
  };

  useEffect(() => {
    calculateProgress();

    // Listen for storage changes and timer completion events
    window.addEventListener('storage', calculateProgress);
    window.addEventListener('study-hours-updated', calculateProgress);
    window.addEventListener('streak-updated', calculateProgress);

    return () => {
      window.removeEventListener('storage', calculateProgress);
      window.removeEventListener('study-hours-updated', calculateProgress);
      window.removeEventListener('streak-updated', calculateProgress);
    };
  }, [userId, key]);

  // Adjust Weekly Goal Hours
  const adjustGoal = (amount: number) => {
    const newGoal = Math.max(1, Math.min(100, weeklyGoalHours + amount));
    setWeeklyGoalHours(newGoal);
    localStorage.setItem(`weekly_study_goal_hours_${key}`, newGoal.toString());
  };

  // Calculations
  const percentage = Math.min(100, Math.round((completedHours / weeklyGoalHours) * 100));

  // Motivational messages based on achievement percentage
  const getMotivationalMessage = () => {
    if (percentage >= 100) return "🌟 Incredible work! You've achieved your weekly study milestone!";
    if (percentage >= 75) return "🚀 So close! Your mental muscles are building spectacular progress.";
    if (percentage >= 50) return "✨ Halfway there! Standard consistency protects your focus.";
    if (percentage >= 25) return "🔥 Steady gains! Every focused block brings you closer to your goal.";
    return "📚 Off to a solid start! Open the Study Timer and power your potential.";
  };

  return (
    <div id="weekly-study-goal-card" className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden my-6">
      {/* Dynamic blurred radial glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        
        {/* Goal Set & Typography Info Left Block */}
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg tracking-tight uppercase">Weekly Study Goal Progress</h3>
              <p className="text-xs text-slate-400">Calculated over your live Study Timer focus sessions this week</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-950/40 p-4 border border-white/5 rounded-2xl backdrop-blur-sm">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Weekly Target</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-mono font-black text-white">{weeklyGoalHours} hrs</span>
                
                {/* Adjustments buttons */}
                <div className="flex flex-col gap-0.5">
                  <button 
                    onClick={() => adjustGoal(1)} 
                    className="p-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded hover:text-amber-400 transition-colors"
                    title="Increase target by 1 hour"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => adjustGoal(-1)} 
                    className="p-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded hover:text-amber-400 transition-colors"
                    title="Decrease target by 1 hour"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Time Completed</p>
              <p className="text-xl font-mono font-black text-amber-400 mt-1 flex items-baseline gap-1">
                {completedHours} <span className="text-xs text-slate-400 font-semibold uppercase">hrs</span>
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Active Timer Sessions</p>
              <p className="text-xl font-mono font-black text-primary-400 mt-1 flex items-center gap-1.5 leading-none">
                <Clock className="w-4 h-4 text-primary-500" />
                {Math.round(completedMinutes)} <span className="text-xs text-slate-400 font-semibold uppercase">mins</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs font-bold text-slate-250 italic">
              {getMotivationalMessage()}
            </p>
          </div>
        </div>

        {/* Circular high-fidelity graphic overlay or progressive gauge to the Right */}
        <div className="flex flex-col items-center justify-center p-2 flex-shrink-0">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center select-none">
            {/* SVG Progress Circle Background and path */}
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="64" 
                cy="64" 
                r="48" 
                className="stroke-slate-800" 
                strokeWidth="10" 
                fill="transparent" 
              />
              <motion.circle 
                cx="64" 
                cy="64" 
                r="48" 
                className="stroke-amber-500" 
                strokeWidth="10" 
                fill="transparent" 
                strokeDasharray={2 * Math.PI * 48}
                animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - percentage / 100) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-mono font-black text-white">{percentage}%</span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Complete</span>
            </div>
          </div>
          {percentage >= 100 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-2 text-[10px] text-amber-400 font-black tracking-widest uppercase flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full"
            >
              <Award className="w-3.5 h-3.5" /> Goal Mastered
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
};

export default WeeklyGoalTracker;
