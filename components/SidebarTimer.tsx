
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings2, Clock, AlertCircle, Check, X } from 'lucide-react';

const SidebarTimer: React.FC = () => {
  // State
  const [duration, setDuration] = useState(25); // Minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Seconds
  const [isActive, setIsActive] = useState(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings input state
  const [editDuration, setEditDuration] = useState('25');

  const timerRef = useRef<number | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sj_study_timer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDuration(parsed.duration || 25);
        setEditDuration(String(parsed.duration || 25));
        
        // Restore time left, but default to duration if finished/invalid
        const savedTime = parsed.timeLeft;
        setTimeLeft(typeof savedTime === 'number' ? savedTime : (parsed.duration || 25) * 60);
        
        // Do not auto-resume isActive to prevent confusion
        setIsAutoPaused(parsed.isAutoPaused || false);
      } catch (e) {
        console.error("Failed to load timer settings");
      }
    }
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    localStorage.setItem('sj_study_timer', JSON.stringify({
      duration,
      timeLeft,
      isAutoPaused
    }));
  }, [duration, timeLeft, isAutoPaused]);

  // Timer Tick Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // Play notification sound here if needed
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  // Auto-Pause Logic (Visibility & Focus)
  useEffect(() => {
    const handleInterruption = () => {
      if (isActive) {
        setIsActive(false);
        setIsAutoPaused(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleInterruption();
    };

    const handleWindowBlur = () => {
      // Pause when window loses focus (e.g. alt-tab or clicking outside)
      handleInterruption();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isActive]);

  // Handlers
  const toggleTimer = () => {
    if (timeLeft === 0) {
        // If finished, restart with current duration
        setTimeLeft(duration * 60);
        setIsActive(true);
        setIsAutoPaused(false);
        return;
    }
    setIsActive(!isActive);
    setIsAutoPaused(false); // Clear auto-pause warning on manual interaction
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsAutoPaused(false);
    setTimeLeft(duration * 60);
  };

  const handleSaveSettings = () => {
    let newDuration = parseInt(editDuration);
    if (isNaN(newDuration) || newDuration < 1) newDuration = 1;
    if (newDuration > 180) newDuration = 180;

    setDuration(newDuration);
    setEditDuration(String(newDuration));
    setTimeLeft(newDuration * 60);
    setIsActive(false);
    setIsAutoPaused(false);
    setShowSettings(false);
  };

  // Format Helper
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalSeconds = duration * 60;
    if (totalSeconds === 0) return 0;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  return (
    <div className="w-full px-3 pb-2 pt-0">
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 relative overflow-hidden group transition-all">
        
        {/* Progress Bar Background */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-primary-500 transition-all duration-1000 ease-linear opacity-30" 
          style={{ width: `${getProgress()}%` }}
        />

        {!showSettings ? (
          <>
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isActive ? 'Focusing' : timeLeft === 0 ? 'Done' : 'Timer'}
                </span>
              </div>
              <button 
                onClick={() => setShowSettings(true)}
                disabled={isActive}
                className={`p-1 rounded-md transition-colors ${isActive ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'}`}
                title="Settings"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time Display */}
            <div className="text-center mb-3">
              <span className={`text-3xl font-mono font-bold tracking-tighter ${
                timeLeft === 0 ? 'text-emerald-600 dark:text-emerald-400' : 
                isActive ? 'text-slate-800 dark:text-white' : 
                'text-slate-500 dark:text-slate-400'
              }`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <button
                onClick={toggleTimer}
                className={`flex-1 py-1.5 flex items-center justify-center rounded-lg text-white font-bold text-xs transition-all shadow-sm ${
                  timeLeft === 0 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : isActive 
                      ? 'bg-amber-500 hover:bg-amber-600' 
                      : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {timeLeft === 0 ? <RotateCcw className="w-3.5 h-3.5" /> : isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              
              <button
                onClick={resetTimer}
                disabled={isActive}
                className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Auto-Pause Warning */}
            {isAutoPaused && (
              <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 px-2 py-1.5 rounded flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-1 leading-tight">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                Paused (inactive)
              </div>
            )}
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
             <div className="flex justify-between items-center mb-3 border-b border-slate-100 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Timer</span>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
             </div>
             
             <div className="flex items-center gap-2 mb-3">
               <input 
                 type="number" 
                 min="1" max="180"
                 value={editDuration}
                 onChange={(e) => setEditDuration(e.target.value)}
                 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-center font-bold text-slate-800 dark:text-white text-sm focus:ring-1 focus:ring-primary-500 outline-none"
               />
               <span className="text-xs text-slate-500">min</span>
             </div>

             <div className="grid grid-cols-4 gap-1.5 mb-3">
               {[15, 25, 45, 60].map(m => (
                 <button
                   key={m}
                   onClick={() => setEditDuration(String(m))}
                   className={`py-1 rounded text-[10px] font-medium border transition-colors ${
                     editDuration === String(m)
                       ? 'bg-primary-50 border-primary-200 text-primary-700'
                       : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500'
                   }`}
                 >
                   {m}
                 </button>
               ))}
             </div>

             <button 
               onClick={handleSaveSettings}
               className="w-full py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 flex items-center justify-center gap-1"
             >
               <Check className="w-3 h-3" /> Save & Reset
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarTimer;
