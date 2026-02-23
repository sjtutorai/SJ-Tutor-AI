import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, CheckCircle2, Coffee, Zap } from 'lucide-react';

const PRESETS = [
  { label: 'Pomodoro', minutes: 25, icon: Zap },
  { label: 'Short Break', minutes: 5, icon: Coffee },
  { label: 'Long Break', minutes: 15, icon: Coffee },
  { label: 'Deep Work', minutes: 50, icon: Zap },
];

const StudyTimerView: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [task, setTask] = useState('');
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [customMinutes, setCustomMinutes] = useState('');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Play sound or notify
      if (Notification.permission === 'granted') {
        new Notification("Time's up!", {
          body: mode === 'FOCUS' ? "Great job! Take a break." : "Break's over! Back to work.",
          icon: '/favicon.ico' // Fallback
        });
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timeLeft, mode]);

  // Cleanup on unmount (auto-stop)
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
  };

  const setDuration = (minutes: number, newMode: 'FOCUS' | 'BREAK') => {
    setIsActive(false);
    setMode(newMode);
    setInitialTime(minutes * 60);
    setTimeLeft(minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  return (
    <div className="max-w-md mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center transition-colors duration-500 ${mode === 'FOCUS' ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-sm mb-4">
            <Clock className={`w-8 h-8 ${mode === 'FOCUS' ? 'text-primary-600' : 'text-emerald-600'}`} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
            {mode === 'FOCUS' ? 'Focus Timer' : 'Break Time'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {mode === 'FOCUS' ? 'Stay focused and productive' : 'Relax and recharge'}
          </p>
        </div>

        {/* Timer Display */}
        <div className="p-8 flex flex-col items-center">
          <div className="relative w-64 h-64 flex items-center justify-center mb-8">
            {/* Circular Progress SVG */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-100 dark:text-slate-700"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                className={`transition-all duration-1000 ease-linear ${mode === 'FOCUS' ? 'text-primary-500' : 'text-emerald-500'}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold text-slate-800 dark:text-white font-mono tracking-tighter">
                {formatTime(timeLeft)}
              </span>
              <span className="text-sm text-slate-400 font-medium mt-2 uppercase tracking-widest">
                {isActive ? 'Running' : 'Paused'}
              </span>
            </div>
          </div>

          {/* Task Input */}
          <div className="w-full mb-8 relative">
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="What are you working on?"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 pl-10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
            <CheckCircle2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={toggleTimer}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                isActive 
                  ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' 
                  : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-500/30'
              }`}
            >
              {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            <button
              onClick={resetTimer}
              className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-2 gap-3 w-full mb-6">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setDuration(preset.minutes, preset.minutes > 15 && preset.minutes < 50 ? 'BREAK' : (preset.minutes === 5 ? 'BREAK' : 'FOCUS'))}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${
                  initialTime === preset.minutes * 60
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <preset.icon className="w-3.5 h-3.5" />
                {preset.label} ({preset.minutes}m)
              </button>
            ))}
          </div>

          {/* Custom Timer */}
          <div className="w-full pt-6 border-t border-slate-100 dark:border-slate-700">
             <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-3 text-center">Custom Duration</p>
             <div className="flex gap-2">
               <input 
                 type="number" 
                 min="1" 
                 max="180"
                 value={customMinutes}
                 onChange={(e) => setCustomMinutes(e.target.value)}
                 placeholder="Minutes"
                 className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                 onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseInt(customMinutes);
                      if (val > 0) {
                        setDuration(val, 'FOCUS');
                        setCustomMinutes('');
                      }
                    }
                 }}
               />
               <button 
                 onClick={() => {
                    const val = parseInt(customMinutes);
                    if (val > 0) {
                      setDuration(val, 'FOCUS');
                      setCustomMinutes('');
                    }
                 }}
                 className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
               >
                 Set
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyTimerView;
