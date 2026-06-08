import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, CheckCircle2, Coffee, Zap, AlertTriangle, Sparkles } from 'lucide-react';

const PRESETS = [
  { label: 'Pomodoro', minutes: 25, icon: Zap },
  { label: 'Short Break', minutes: 5, icon: Coffee },
  { label: 'Long Break', minutes: 15, icon: Coffee },
  { label: 'Deep Work', minutes: 50, icon: Zap },
];

interface StudyTimerViewProps {
  userProfile: UserProfile;
}

const StudyTimerView: React.FC<StudyTimerViewProps> = ({ userProfile }) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [task, setTask] = useState('');
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [isStrictFocus, setIsStrictFocus] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockDob, setUnlockDob] = useState('');
  const [showForgotTip, setShowForgotTip] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Visibility Change Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        if (isStrictFocus) {
          setIsLocked(true);
        }
        setIsActive(false);
        setShowWarning(true);
        if (Notification.permission === 'granted') {
          new Notification("Timer Paused", {
            body: "Timer paused because you switched tabs. Stay focused!",
            icon: '/favicon.ico'
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

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

  const toggleTimer = () => {
    setIsActive(!isActive);
    if (!isActive) setShowWarning(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialTime);
    setShowWarning(false);
  };

  const setDuration = (minutes: number, newMode: 'FOCUS' | 'BREAK') => {
    setIsActive(false);
    setMode(newMode);
    setInitialTime(minutes * 60);
    setTimeLeft(minutes * 60);
    setShowWarning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUnlock = () => {
    // Normalize DOB for comparison (assuming userProfile.dob is YYYY-MM-DD or similar)
    const normalizedInput = unlockDob.trim();
    if (normalizedInput === userProfile.dob) {
      setIsLocked(false);
      setUnlockDob('');
      setShowForgotTip(false);
    } else {
      alert("Incorrect identifier.");
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert("Notifications enabled! We'll alert you when your timer is up.");
      }
    }
  };

  const progress = ((initialTime - timeLeft) / initialTime) * 100;

  return (
    <div className="max-w-md mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Lock Overlay */}
      {isLocked && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-8 transition-all animate-in fade-in zoom-in duration-300">
           <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-primary-500/30">
              <Zap className="w-10 h-10 text-white fill-current" />
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">Focus Mode Locked</h2>
           <p className="text-slate-400 text-center mb-8 max-w-xs">
             You switched tabs while in strict mode. Enter your verification code to resume.
           </p>
           
           <div className="w-full max-w-xs space-y-4">
             <div className="relative">
               <input
                 type="password"
                 value={unlockDob}
                 onChange={(e) => setUnlockDob(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                 placeholder="••••••••"
                 className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl py-4 px-4 text-white text-center text-2xl tracking-[1em] focus:outline-none focus:border-primary-500 transition-all font-mono"
                 autoFocus
               />
               <div className="absolute inset-y-0 right-4 flex items-center">
                 <button 
                  onClick={handleUnlock}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                 >
                   Open
                 </button>
               </div>
             </div>
             
             <div className="text-center">
               <button 
                onClick={() => setShowForgotTip(true)}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
               >
                 Forgot Code?
               </button>
               {showForgotTip && (
                 <p className="text-xs text-primary-400 mt-2 font-medium animate-in slide-in-from-top-1">
                   Hint: Remember your date of birth (YYYY-MM-DD)
                 </p>
               )}
             </div>
           </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
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

        {/* Warning Message */}
        {showWarning && !isLocked && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border-y border-amber-100 dark:border-amber-800 p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Timer Paused!</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Please don&apos;t switch tabs while the timer is running. Stay focused on your task!
              </p>
            </div>
          </div>
        )}

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

          {/* Social Media Lock Toggle */}
          <div className="w-full mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isStrictFocus ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-400'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Focus Lock Mode</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Lock the app if you switch tabs</p>
                </div>
              </div>
              <button 
                onClick={() => setIsStrictFocus(!isStrictFocus)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isStrictFocus ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isStrictFocus ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
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

          {/* Notification Button */}
          {Notification.permission !== 'granted' && (
            <button 
              onClick={requestNotificationPermission}
              className="w-full mb-6 py-2 bg-primary-50 text-primary-700 rounded-lg text-xs font-bold border border-primary-100 hover:bg-primary-100 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3 h-3" />
              Enable Notifications for Timer Alerts
            </button>
          )}

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
