
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

const StudyTimer: React.FC = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const getSeconds = `0${seconds % 60}`.slice(-2);
    const minutes = Math.floor(seconds / 60);
    const getMinutes = `0${minutes % 60}`.slice(-2);
    const getHours = `0${Math.floor(seconds / 3600)}`.slice(-2);
    return `${getHours}:${getMinutes}:${getSeconds}`;
  };

  // Visibility Change Listener (The Core Logic)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // If the user minimizes window, switches tabs, or covers the window completely
      if (document.hidden) {
        if (isRunning) {
          setIsRunning(false);
          setAutoPaused(true);
        }
      }
      // Note: We intentionally do NOT add an 'else' block to resume 
      // when document.hidden is false. The user must manually resume.
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning]);

  // Timer Interval Logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    setAutoPaused(false);
  };

  const handlePause = () => {
    setIsRunning(false);
    setAutoPaused(false); // Manual pause, so not auto-paused
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
    setAutoPaused(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-full max-w-md mx-auto animate-in fade-in zoom-in duration-300">
      
      <div className="mb-6 flex flex-col items-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${isRunning ? 'bg-primary-50 text-primary-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
           <Clock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Focus Timer</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Stay focused. Timer stops if you switch tabs.</p>
      </div>

      {/* Time Display */}
      <div className="text-6xl font-mono font-bold text-slate-800 dark:text-white mb-8 tracking-wider">
        {formatTime(time)}
      </div>

      {/* Auto Pause Warning */}
      {autoPaused && (
        <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 animate-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-bold">Timer Paused!</p>
            <p className="text-xs">You left the app. Focus to resume.</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4 w-full">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            {time > 0 ? 'Resume' : 'Start Focus'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Pause className="w-5 h-5 fill-current" />
            Pause
          </button>
        )}

        <button
          onClick={handleReset}
          disabled={time === 0}
          className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reset Timer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats/Motivation */}
      {time > 0 && !isRunning && !autoPaused && (
        <div className="mt-6 flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-1.5 rounded-full">
           <CheckCircle2 className="w-4 h-4" />
           <span>Session recorded</span>
        </div>
      )}
    </div>
  );
};

export default StudyTimer;
