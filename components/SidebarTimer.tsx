
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings2, Clock, AlertCircle } from 'lucide-react';

const SidebarTimer: React.FC = () => {
  // State
  const [duration, setDuration] = useState(25); // Minutes
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Seconds
  const [isActive, setIsActive] = useState(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sj_study_timer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDuration(parsed.duration || 25);
        setTimeLeft(parsed.timeLeft ?? 25 * 60);
        // We do not restore isActive to true to prevent confusion on reload
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

  // Timer Tick
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // Optional: Play sound here
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

  const updateDuration = (mins: number) => {
    if (mins <= 0 || mins > 180) return; // Cap at 3 hours
    setDuration(mins);
    setTimeLeft(mins * 60);
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
    <div className="w-full print:hidden">
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
        
        {/* Progress Bar Background */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-primary-500 transition-all duration-1000 ease-linear opacity-20" 
          style={{ width: `${getProgress()}%` }}
        />

        {/* Header / Top Row */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isActive ? 'Focusing' : isAutoPaused ? 'Auto-Paused' : timeLeft === 0 ? 'Completed' : 'Timer'}
            </span>
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            disabled={isActive}
            className={`p-1.5 rounded-lg transition-colors ${isActive ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'}`}
            title="Timer Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Main Display or Settings */}
        {!showSettings ? (
          <>
            <div className="text-center mb-6">
              <span className={`text-5xl font-mono font-bold tracking-tight ${timeLeft === 0 ? 'text-emerald-600' : isActive ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
              <button
                onClick={toggleTimer}
                className={`flex-1 py-2.5 flex items-center justify-center rounded-xl text-white font-bold text-sm transition-all shadow-sm ${
                  timeLeft === 0 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : isActive 
                      ? 'bg-amber-500 hover:bg-amber-600' 
                      : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {timeLeft === 0 ? (
                  <RotateCcw className="w-4 h-4 mr-2" />
                ) : isActive ? (
                  <Pause className="w-4 h-4 mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {timeLeft === 0 ? 'Restart' : isActive ? 'Pause' : 'Start Focus'}
              </button>
              
              <button
                onClick={resetTimer}
                className="p-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Status Message */}
            {isAutoPaused && (
              <div className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4" />
                Paused due to inactivity
              </div>
            )}
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Set Duration (min)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="1" 
                  max="180"
                  value={duration}
                  onChange={(e) => updateDuration(parseInt(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-lg font-bold text-center outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[15, 25, 45, 60].map(preset => (
                <button
                  key={preset}
                  onClick={() => updateDuration(preset)}
                  className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
                    duration === preset 
                      ? 'bg-primary-50 border-primary-200 text-primary-700' 
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-600 dark:text-slate-300'
                  }`}
                >
                  {preset}m
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => setShowSettings(false)}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SidebarTimer;
