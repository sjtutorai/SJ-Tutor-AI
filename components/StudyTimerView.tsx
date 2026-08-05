import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Shield, AlertTriangle, Settings2, Smartphone, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UserProfile {
  // Add necessary types if needed, or any
  [key: string]: any;
}

interface StudyTimerViewProps {
  userProfile?: UserProfile;
}

type TimerState = 'IDLE' | 'RUNNING' | 'PAUSED';

const APPS_TO_BLOCK = [
  { id: 'insta', name: 'Instagram', default: true },
  { id: 'wa', name: 'WhatsApp', default: true },
  { id: 'fb', name: 'Facebook', default: true },
  { id: 'snap', name: 'Snapchat', default: true },
  { id: 'tele', name: 'Telegram', default: true },
  { id: 'yt', name: 'YouTube', default: true },
  { id: 'x', name: 'X (Twitter)', default: true },
  { id: 'threads', name: 'Threads', default: true },
  { id: 'discord', name: 'Discord', default: true },
  { id: 'msg', name: 'Messenger', default: true },
  { id: 'chrome', name: 'Chrome', default: false },
  { id: 'games', name: 'Games', default: false },
];

const StudyTimerView: React.FC<StudyTimerViewProps> = () => {
  // Input states
  const [inputH, setInputH] = useState('00');
  const [inputM, setInputM] = useState('25');
  const [inputS, setInputS] = useState('00');

  // Timer internal state
  const [timerState, setTimerState] = useState<TimerState>('IDLE');
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [initialTimeMs, setInitialTimeMs] = useState(0);
  const expectedEndTimeRef = useRef<number | null>(null);

  // Modals / Overlays
  const [showFocusSetup, setShowFocusSetup] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showBlockingOverlay, setShowBlockingOverlay] = useState(false);
  
  // Settings
  const [selectedApps, setSelectedApps] = useState<string[]>(
    APPS_TO_BLOCK.filter(a => a.default).map(a => a.id)
  );
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [hasAccessibilityPerm, setHasAccessibilityPerm] = useState<boolean | null>(null);
  const [showPermDialog, setShowPermDialog] = useState(false);

  // Update timer in background/foreground accurately
  useEffect(() => {
    let animationFrameId: number;
    let intervalId: NodeJS.Timeout;

    const tick = () => {
      if (timerState === 'RUNNING' && expectedEndTimeRef.current) {
        const now = Date.now();
        const remaining = Math.max(0, expectedEndTimeRef.current - now);
        setTimeLeftMs(remaining);

        if (remaining === 0) {
          handleTimerComplete();
        } else {
          // fallback to interval for background if requestAnimationFrame pauses
        }
      }
    };

    if (timerState === 'RUNNING') {
      // Use requestAnimationFrame for smooth UI updates
      const loop = () => {
        tick();
        if (timerState === 'RUNNING') {
          animationFrameId = requestAnimationFrame(loop);
        }
      };
      animationFrameId = requestAnimationFrame(loop);
      
      // Fallback interval for background execution (since browsers pause rAF)
      intervalId = setInterval(tick, 500);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerState]);

  // Handle visibility changes for web-based "App Blocking" simulation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && timerState === 'RUNNING' && isFocusModeActive) {
        // Tab went to background.
        // In a real native app, the Accessibility Service handles this.
        // We simulate it here by showing the blocking screen when they return if they left.
      } else if (!document.hidden && timerState === 'RUNNING' && isFocusModeActive) {
        // Returned to tab
        setShowBlockingOverlay(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerState, isFocusModeActive]);

  const handleTimerComplete = () => {
    setTimerState('IDLE');
    setIsFocusModeActive(false);
    expectedEndTimeRef.current = null;
    
    // Play sound & vibrate
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audio.play().catch(e => console.warn("Audio play blocked", e));

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });

    setShowCompletion(true);
    saveStudySession(true);
  };

  const saveStudySession = (completed: boolean) => {
    const durationSec = Math.floor(initialTimeMs / 1000);
    const durationSpent = Math.floor((initialTimeMs - timeLeftMs) / 1000);
    
    const session = {
      date: new Date().toISOString(),
      duration: completed ? durationSec : durationSpent,
      completed,
      focusMode: isFocusModeActive
    };

    try {
      const existing = JSON.parse(localStorage.getItem('sjtutor_study_sessions') || '[]');
      existing.push(session);
      localStorage.setItem('sjtutor_study_sessions', JSON.stringify(existing));
      
      // Update daily total
      if (completed) {
        const todayStr = new Date().toDateString();
        const savedDate = localStorage.getItem('sjtutor_daily_study_date');
        const savedProgress = localStorage.getItem('sjtutor_daily_study_progress');
        const currentProg = (savedDate === todayStr && savedProgress) ? parseInt(savedProgress) : 0;
        localStorage.setItem('sjtutor_daily_study_progress', String(currentProg + Math.round(durationSec / 60)));
        localStorage.setItem('sjtutor_daily_study_date', todayStr);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.warn("Stats save error", e);
    }
  };

  const handleStartRequest = () => {
    const h = parseInt(inputH) || 0;
    const m = parseInt(inputM) || 0;
    const s = parseInt(inputS) || 0;
    const totalMs = (h * 3600 + m * 60 + s) * 1000;

    if (totalMs <= 0) {
      alert("Please enter a duration greater than 0.");
      return;
    }

    setInitialTimeMs(totalMs);
    setTimeLeftMs(totalMs);
    setShowFocusSetup(true);
  };

  const startTimer = (withFocusMode: boolean) => {
    setIsFocusModeActive(withFocusMode);
    setTimerState('RUNNING');
    expectedEndTimeRef.current = Date.now() + timeLeftMs;
    setShowFocusSetup(false);
    setShowPermDialog(false);

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const handlePause = () => {
    setTimerState('PAUSED');
    expectedEndTimeRef.current = null;
  };

  const handleResume = () => {
    setTimerState('RUNNING');
    expectedEndTimeRef.current = Date.now() + timeLeftMs;
  };

  const handleStopRequest = () => {
    setShowStopConfirm(true);
    if (timerState === 'RUNNING') handlePause();
  };

  const confirmStop = () => {
    saveStudySession(false);
    setTimerState('IDLE');
    setIsFocusModeActive(false);
    setShowStopConfirm(false);
  };

  const cancelStop = () => {
    setShowStopConfirm(false);
    handleResume();
  };

  const handleReset = () => {
    if (timerState === 'IDLE') return;
    setTimerState('PAUSED');
    setTimeLeftMs(initialTimeMs);
    expectedEndTimeRef.current = null;
  };

  // Format Helpers
  const formatDisplayTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return {
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: s.toString().padStart(2, '0')
    };
  };

  const { h: dH, m: dM, s: dS } = formatDisplayTime(timeLeftMs);
  const progressPercent = initialTimeMs > 0 ? ((initialTimeMs - timeLeftMs) / initialTimeMs) * 100 : 0;

  const handleInputBlur = (type: 'H' | 'M' | 'S', val: string) => {
    let num = parseInt(val) || 0;
    if (type === 'H' && num > 23) num = 23;
    if (type === 'M' && num > 59) num = 59;
    if (type === 'S' && num > 59) num = 59;
    
    const formatted = num.toString().padStart(2, '0');
    if (type === 'H') setInputH(formatted);
    if (type === 'M') setInputM(formatted);
    if (type === 'S') setInputS(formatted);
  };

  const toggleAppSelection = (id: string) => {
    setSelectedApps(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500 relative">
      
      {/* 5. BLOCKING SCREEN OVERLAY */}
      {showBlockingOverlay && (
        <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
          <Shield className="w-20 h-20 text-red-500 mb-6" />
          <h1 className="text-4xl font-extrabold text-white mb-4">Stay Focused 📚</h1>
          <p className="text-slate-300 text-lg mb-8 max-w-sm">
            Your study session is currently running. Distracting apps are blocked until you finish.
          </p>
          <div className="text-6xl font-mono font-bold text-white mb-12 tabular-nums tracking-tighter">
            {dH}:{dM}:{dS}
          </div>
          <button 
            onClick={() => setShowBlockingOverlay(false)}
            className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-500/30 transition-all active:scale-95"
          >
            Return to SJ Tutor AI
          </button>
        </div>
      )}

      {/* FOCUS MODE SETUP MODAL */}
      {showFocusSetup && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-700 bg-primary-50 dark:bg-primary-900/20">
              <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl shadow-sm mx-auto flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Focus Mode Enabled 🔒</h2>
              <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">
                To help you concentrate, distracting apps will be blocked until your study session finishes.
              </p>
            </div>
            
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Apps to block
                </h3>
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-md">
                  {selectedApps.length} selected
                </span>
              </div>
              
              <div className="max-h-48 overflow-y-auto pr-2 space-y-2 mb-6 custom-scrollbar">
                {APPS_TO_BLOCK.map(app => (
                  <button
                    key={app.id}
                    onClick={() => toggleAppSelection(app.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-medium transition-colors ${
                      selectedApps.includes(app.id) 
                        ? 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-900/30 dark:border-primary-800 dark:text-primary-300' 
                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {app.name}
                    {selectedApps.includes(app.id) && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFocusSetup(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (hasAccessibilityPerm === null) {
                      setShowFocusSetup(false);
                      setShowPermDialog(true);
                    } else {
                      startTimer(true);
                    }
                  }}
                  className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md shadow-primary-500/20 transition-all"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERMISSION DIALOG */}
      {showPermDialog && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 text-center animate-in zoom-in-95">
            <Settings2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Accessibility Service Required</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              To detect and block distracting apps, SJ Tutor AI needs Accessibility Permissions. Since you are using the web version, native app blocking is limited. The timer will still function accurately.
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  setHasAccessibilityPerm(false);
                  startTimer(true); // Start anyway, we'll use web-based blur detection
                }}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold"
              >
                Understood, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STOP CONFIRMATION */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 text-center animate-in zoom-in-95">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Stop Session?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to stop this study session? Your progress so far will be saved as interrupted.
            </p>
            <div className="flex gap-3">
              <button onClick={cancelStop} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold">
                Cancel
              </button>
              <button onClick={confirmStop} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-md shadow-amber-500/20">
                Stop Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETION MODAL */}
      {showCompletion && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2">Session Completed!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Great job! You stayed focused for the entire duration. Focus Mode has been turned off and your apps are unblocked.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowCompletion(false)} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-colors">
                Start Another Session
              </button>
              <button onClick={() => { setShowCompletion(false); /* route to stats if available */ }} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold transition-colors">
                View Study Statistics
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MAIN TIMER UI */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden relative">
        <div className="p-8 text-center bg-gradient-to-b from-primary-50 to-white dark:from-slate-900 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Study Timer</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Set your duration and stay focused</p>
        </div>

        <div className="p-8 flex flex-col items-center">
          
          {timerState === 'IDLE' ? (
            /* Input View */
            <div className="flex items-center justify-center gap-4 mb-10 w-full max-w-sm mx-auto">
              <div className="flex flex-col items-center gap-2 flex-1">
                <input
                  type="number"
                  value={inputH}
                  onChange={e => setInputH(e.target.value)}
                  onBlur={e => handleInputBlur('H', e.target.value)}
                  className="w-full aspect-square text-center text-5xl font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hours</span>
              </div>
              <span className="text-4xl font-bold text-slate-300 dark:text-slate-600 pb-6">:</span>
              
              <div className="flex flex-col items-center gap-2 flex-1">
                <input
                  type="number"
                  value={inputM}
                  onChange={e => setInputM(e.target.value)}
                  onBlur={e => handleInputBlur('M', e.target.value)}
                  className="w-full aspect-square text-center text-5xl font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Minutes</span>
              </div>
              <span className="text-4xl font-bold text-slate-300 dark:text-slate-600 pb-6">:</span>
              
              <div className="flex flex-col items-center gap-2 flex-1">
                <input
                  type="number"
                  value={inputS}
                  onChange={e => setInputS(e.target.value)}
                  onBlur={e => handleInputBlur('S', e.target.value)}
                  className="w-full aspect-square text-center text-5xl font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Seconds</span>
              </div>
            </div>
          ) : (
            /* Running / Paused View with Circular Progress */
            <div className="relative w-72 h-72 flex items-center justify-center mb-10">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-md">
                <circle
                  cx="144"
                  cy="144"
                  r="134"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-700"
                />
                <circle
                  cx="144"
                  cy="144"
                  r="134"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 134}
                  strokeDashoffset={2 * Math.PI * 134 * (1 - progressPercent / 100)}
                  className="text-primary-500 transition-all duration-300 ease-linear"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold text-slate-800 dark:text-white font-mono tracking-tighter tabular-nums drop-shadow-sm">
                  {dH} : {dM} : {dS}
                </span>
                <div className="flex items-center gap-2 mt-3 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  <div className={`w-2 h-2 rounded-full ${timerState === 'RUNNING' ? 'bg-primary-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {timerState === 'RUNNING' ? 'Focusing' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 w-full max-w-sm">
            {timerState === 'IDLE' && (
              <button
                onClick={handleStartRequest}
                className="w-full py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl font-bold text-xl shadow-xl shadow-primary-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6 fill-current" />
                Start Focus Session
              </button>
            )}

            {timerState !== 'IDLE' && (
              <>
                {timerState === 'RUNNING' ? (
                  <button
                    onClick={handlePause}
                    className="flex-1 py-4 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-2xl font-bold text-lg transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <Pause className="w-6 h-6 fill-current" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    className="flex-1 py-4 bg-primary-100 hover:bg-primary-200 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 rounded-2xl font-bold text-lg transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    Resume
                  </button>
                )}
                
                <button
                  onClick={handleStopRequest}
                  className="w-24 py-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-2xl font-bold transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <Square className="w-6 h-6 fill-current" />
                  Stop
                </button>
                
                {timerState === 'PAUSED' && (
                  <button
                    onClick={handleReset}
                    className="w-24 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 rounded-2xl font-bold transition-colors flex flex-col items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-6 h-6" />
                    Reset
                  </button>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudyTimerView;
