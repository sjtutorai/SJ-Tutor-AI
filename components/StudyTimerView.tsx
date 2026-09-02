import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Shield, AlertTriangle, Smartphone, Check, Cloud, BookOpen, Clock, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, TimerStateType, UserTimerState } from '../types';
import { saveUserTimerState, subscribeToUserTimerState, saveStudySessionToFirestore } from '../utils/firebaseUtils';

interface StudyTimerViewProps {
  userProfile?: UserProfile;
  userId?: string | null;
  userEmail?: string | null;
}

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
  { id: 'tiktok', name: 'TikTok', default: true },
  { id: 'games', name: 'Mobile Games', default: true },
  { id: 'chrome', name: 'Web Surfing', default: false },
];

const PRESETS = [
  { label: '1m Sprint', h: '00', m: '01', s: '00', desc: 'Fast test' },
  { label: '15m Sprint', h: '00', m: '15', s: '00', desc: 'Quick revision' },
  { label: '25m Pomodoro', h: '00', m: '25', s: '00', desc: 'Standard focus' },
  { label: '45m Deep Work', h: '00', m: '45', s: '00', desc: 'Intensive study' },
  { label: '60m Marathon', h: '01', m: '00', s: '00', desc: 'Full exam prep' },
];

const SUBJECT_SUGGESTIONS = [
  'General Study',
  'Mathematics',
  'Science & Physics',
  'Chemistry & Biology',
  'Languages & Literature',
  'Computer Science',
  'History & Social Studies',
  'Exam Revision'
];

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'dev_server';
  try {
    let id = sessionStorage.getItem('sjtutor_device_id');
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('sjtutor_device_id', id);
    }
    return id;
  } catch {
    return `dev_${Date.now()}`;
  }
}

const playTimerCompleteChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1 - Warm Bell (587.33 Hz / D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Tone 2 - Resolving High Bell (880 Hz / A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.25);
      gain2.gain.setValueAtTime(0.35, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.8);
    }
  } catch (err) {
    console.warn('AudioContext chime failed, trying standard audio:', err);
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      audio.play().catch(() => {});
    } catch {
      // Audio playback silently failed
    }
  }
};

const StudyTimerView: React.FC<StudyTimerViewProps> = ({ userId, userEmail }) => {
  const deviceIdRef = useRef<string>(getOrCreateDeviceId());

  // Input states
  const [inputH, setInputH] = useState('00');
  const [inputM, setInputM] = useState('25');
  const [inputS, setInputS] = useState('00');
  const [selectedSubject, setSelectedSubject] = useState<string>('General Study');
  const [customSubject, setCustomSubject] = useState<string>('');

  // Timer state
  const [timerState, setTimerState] = useState<TimerStateType>('IDLE');
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [initialTimeMs, setInitialTimeMs] = useState(0);
  const expectedEndTimeRef = useRef<number | null>(null);

  // Sync state
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const isLocalUpdateRef = useRef<boolean>(false);

  // Modals & Settings
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showBlockingOverlay, setShowBlockingOverlay] = useState(false);
  const [showFocusSettings, setShowFocusSettings] = useState(false);
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [selectedApps, setSelectedApps] = useState<string[]>(
    APPS_TO_BLOCK.filter(a => a.default).map(a => a.id)
  );

  const activeSubject = customSubject.trim() || selectedSubject;

  // Local state persistence helper
  const persistLocalTimerState = (state: {
    timerState: TimerStateType;
    timeLeftMs: number;
    initialTimeMs: number;
    expectedEndTime: number | null;
    isFocusModeActive: boolean;
    selectedApps: string[];
    inputH: string;
    inputM: string;
    inputS: string;
    selectedSubject: string;
    customSubject: string;
  }) => {
    try {
      localStorage.setItem('sjtutor_timer_state_cache', JSON.stringify({
        ...state,
        savedAt: Date.now()
      }));
    } catch (e) {
      console.debug('Failed to cache timer state locally:', e);
    }
  };

  // Restore cached timer state on initial mount
  useEffect(() => {
    try {
      const cachedStr = localStorage.getItem('sjtutor_timer_state_cache');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.inputH) setInputH(cached.inputH);
        if (cached.inputM) setInputM(cached.inputM);
        if (cached.inputS) setInputS(cached.inputS);
        if (cached.selectedSubject) setSelectedSubject(cached.selectedSubject);
        if (cached.customSubject) setCustomSubject(cached.customSubject);
        if (cached.selectedApps) setSelectedApps(cached.selectedApps);

        if (cached.timerState === 'RUNNING' && cached.expectedEndTime) {
          const now = Date.now();
          const remaining = Math.max(0, cached.expectedEndTime - now);
          const resolvedInitial = cached.initialTimeMs || remaining;

          if (remaining > 0) {
            expectedEndTimeRef.current = cached.expectedEndTime;
            setInitialTimeMs(resolvedInitial);
            setTimeLeftMs(remaining);
            setTimerState('RUNNING');
            setIsFocusModeActive(Boolean(cached.isFocusModeActive));
          } else {
            setInitialTimeMs(resolvedInitial);
            setTimeLeftMs(0);
            setTimerState('IDLE');
          }
        } else if (cached.timerState === 'PAUSED' && cached.timeLeftMs) {
          setInitialTimeMs(cached.initialTimeMs || cached.timeLeftMs);
          setTimeLeftMs(cached.timeLeftMs);
          setTimerState('PAUSED');
          setIsFocusModeActive(Boolean(cached.isFocusModeActive));
        }
      }
    } catch (e) {
      console.debug('Error loading cached timer state:', e);
    }
  }, []);

  // Persist timer state whenever key properties change
  useEffect(() => {
    persistLocalTimerState({
      timerState,
      timeLeftMs,
      initialTimeMs,
      expectedEndTime: expectedEndTimeRef.current,
      isFocusModeActive,
      selectedApps,
      inputH,
      inputM,
      inputS,
      selectedSubject,
      customSubject,
    });
  }, [timerState, timeLeftMs, initialTimeMs, isFocusModeActive, selectedApps, inputH, inputM, inputS, selectedSubject, customSubject]);

  // Real-time synchronization across devices
  useEffect(() => {
    if (!userId || userId === 'guest') {
      setIsSynced(false);
      return;
    }

    const unsubscribe = subscribeToUserTimerState(userId, (remoteTimer: UserTimerState | null) => {
      setIsSynced(true);
      if (!remoteTimer) return;

      // Avoid feedback loop if initiated by current device
      if (remoteTimer.deviceId === deviceIdRef.current && isLocalUpdateRef.current) {
        isLocalUpdateRef.current = false;
        return;
      }

      if (remoteTimer.timerState === 'RUNNING') {
        const now = Date.now();
        const expectedEnd = remoteTimer.expectedEndTime || (now + remoteTimer.timeLeftMs);
        const remaining = Math.max(0, expectedEnd - now);

        expectedEndTimeRef.current = expectedEnd;
        setTimerState('RUNNING');
        setTimeLeftMs(remaining);

        // Preserve original initial duration so completion percentage remains accurate
        setInitialTimeMs(prev => {
          if (remoteTimer.initialTimeMs && remoteTimer.initialTimeMs > 0) {
            return remoteTimer.initialTimeMs;
          }
          if (prev > 0) return prev;
          return remaining;
        });

        setIsFocusModeActive(Boolean(remoteTimer.isFocusModeActive));
        if (remoteTimer.selectedApps) setSelectedApps(remoteTimer.selectedApps);
      } else if (remoteTimer.timerState === 'PAUSED') {
        expectedEndTimeRef.current = null;
        setTimerState('PAUSED');
        setTimeLeftMs(remoteTimer.timeLeftMs);
        setInitialTimeMs(prev => (remoteTimer.initialTimeMs && remoteTimer.initialTimeMs > 0 ? remoteTimer.initialTimeMs : (prev > 0 ? prev : remoteTimer.timeLeftMs)));
        setIsFocusModeActive(Boolean(remoteTimer.isFocusModeActive));
        if (remoteTimer.selectedApps) setSelectedApps(remoteTimer.selectedApps);
      } else if (remoteTimer.timerState === 'IDLE') {
        expectedEndTimeRef.current = null;
        setTimerState('IDLE');
        setTimeLeftMs(0);
        setIsFocusModeActive(false);
        if (remoteTimer.inputH) setInputH(remoteTimer.inputH);
        if (remoteTimer.inputM) setInputM(remoteTimer.inputM);
        if (remoteTimer.inputS) setInputS(remoteTimer.inputS);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Main high-precision animation loop
  useEffect(() => {
    let animationFrameId: number;
    let intervalId: NodeJS.Timeout;

    const tick = () => {
      if (timerState === 'RUNNING' && expectedEndTimeRef.current) {
        const now = Date.now();
        const remaining = Math.max(0, expectedEndTimeRef.current - now);
        setTimeLeftMs(remaining);

        if (remaining <= 0) {
          handleTimerComplete();
        }
      }
    };

    if (timerState === 'RUNNING') {
      const loop = () => {
        tick();
        if (timerState === 'RUNNING') {
          animationFrameId = requestAnimationFrame(loop);
        }
      };
      animationFrameId = requestAnimationFrame(loop);
      // Fallback interval for background tab execution
      intervalId = setInterval(tick, 500);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerState, initialTimeMs]);

  // Handle visibility changes for web focus simulation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && timerState === 'RUNNING' && isFocusModeActive) {
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
    setTimeLeftMs(0);

    // Play chime & vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 500]);
    }
    playTimerCompleteChime();

    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.6 }
    });

    setShowCompletion(true);
    saveStudySession(true);

    if (userId && userId !== 'guest') {
      isLocalUpdateRef.current = true;
      saveUserTimerState(userId, {
        timerState: 'IDLE',
        timeLeftMs: 0,
        initialTimeMs,
        expectedEndTime: null,
        isFocusModeActive: false,
        selectedApps,
        inputH,
        inputM,
        inputS,
        deviceId: deviceIdRef.current,
        updatedAt: Date.now()
      });
    }
  };

  const saveStudySession = (completed: boolean) => {
    const durationSec = Math.floor(initialTimeMs / 1000);
    const durationSpent = Math.floor((initialTimeMs - timeLeftMs) / 1000);
    const actualDuration = completed ? durationSec : durationSpent;

    const session = {
      date: new Date().toISOString(),
      duration: actualDuration,
      completed,
      focusMode: isFocusModeActive,
      subject: activeSubject,
      timestamp: Date.now()
    };

    try {
      const existing = JSON.parse(localStorage.getItem('sjtutor_study_sessions') || '[]');
      existing.push(session);
      localStorage.setItem('sjtutor_study_sessions', JSON.stringify(existing));

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
      console.warn('Stats save error', e);
    }

    if (userId && userId !== 'guest') {
      saveStudySessionToFirestore(userId, session);
    }
  };

  const startTimer = (focusMode: boolean = isFocusModeActive) => {
    const h = parseInt(inputH) || 0;
    const m = parseInt(inputM) || 0;
    const s = parseInt(inputS) || 0;
    const totalMs = (h * 3600 + m * 60 + s) * 1000;

    if (totalMs <= 0) {
      alert('Please enter a duration greater than 0 seconds.');
      return;
    }

    setInitialTimeMs(totalMs);
    setTimeLeftMs(totalMs);
    setIsFocusModeActive(focusMode);
    setTimerState('RUNNING');

    const expectedEnd = Date.now() + totalMs;
    expectedEndTimeRef.current = expectedEnd;
    setShowFocusSettings(false);

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    if (userId && userId !== 'guest') {
      isLocalUpdateRef.current = true;
      saveUserTimerState(userId, {
        timerState: 'RUNNING',
        timeLeftMs: totalMs,
        initialTimeMs: totalMs,
        expectedEndTime: expectedEnd,
        isFocusModeActive: focusMode,
        selectedApps,
        inputH,
        inputM,
        inputS,
        deviceId: deviceIdRef.current,
        updatedAt: Date.now()
      });
    }
  };

  const handlePause = () => {
    setTimerState('PAUSED');
    expectedEndTimeRef.current = null;

    if (userId && userId !== 'guest') {
      isLocalUpdateRef.current = true;
      saveUserTimerState(userId, {
        timerState: 'PAUSED',
        timeLeftMs,
        initialTimeMs,
        expectedEndTime: null,
        isFocusModeActive,
        selectedApps,
        inputH,
        inputM,
        inputS,
        deviceId: deviceIdRef.current,
        updatedAt: Date.now()
      });
    }
  };

  const handleResume = () => {
    setTimerState('RUNNING');
    const expectedEnd = Date.now() + timeLeftMs;
    expectedEndTimeRef.current = expectedEnd;

    if (userId && userId !== 'guest') {
      isLocalUpdateRef.current = true;
      saveUserTimerState(userId, {
        timerState: 'RUNNING',
        timeLeftMs,
        initialTimeMs,
        expectedEndTime: expectedEnd,
        isFocusModeActive,
        selectedApps,
        inputH,
        inputM,
        inputS,
        deviceId: deviceIdRef.current,
        updatedAt: Date.now()
      });
    }
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
    expectedEndTimeRef.current = null;
    setTimeLeftMs(0);

    if (userId && userId !== 'guest') {
      isLocalUpdateRef.current = true;
      saveUserTimerState(userId, {
        timerState: 'IDLE',
        timeLeftMs: 0,
        initialTimeMs,
        expectedEndTime: null,
        isFocusModeActive: false,
        selectedApps,
        inputH,
        inputM,
        inputS,
        deviceId: deviceIdRef.current,
        updatedAt: Date.now()
      });
    }
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

    if (userId && userId !== 'guest') {
      isLocalUpdateRef.current = true;
      saveUserTimerState(userId, {
        timerState: 'PAUSED',
        timeLeftMs: initialTimeMs,
        initialTimeMs,
        expectedEndTime: null,
        isFocusModeActive,
        selectedApps,
        inputH,
        inputM,
        inputS,
        deviceId: deviceIdRef.current,
        updatedAt: Date.now()
      });
    }
  };

  const applyPreset = (h: string, m: string, s: string) => {
    setInputH(h);
    setInputM(m);
    setInputS(s);
  };

  const formatDisplayTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return {
      h: h.toString().padStart(2, '0'),
      m: m.toString().padStart(2, '0'),
      s: totalSec >= 0 ? s.toString().padStart(2, '0') : '00'
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
    <div className="w-full max-w-2xl mx-auto px-2 xs:px-3 sm:px-6 py-2 sm:py-4 animate-in fade-in duration-300 relative">

      {/* Cross-Device Sync Status Indicator */}
      <div className="mb-3 sm:mb-4 flex items-center justify-center">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm max-w-full truncate">
          <Cloud className={`w-3.5 h-3.5 shrink-0 ${isSynced ? 'text-emerald-500' : 'text-amber-500'}`} />
          <span className="truncate">
            {userId && userEmail
              ? `Synced with ${userEmail}`
              : 'Sign in to auto-sync timer across all devices'}
          </span>
          {isSynced && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Live sync active" />
          )}
        </div>
      </div>

      {/* BLOCKING OVERLAY (When tab returns during focus mode) */}
      {showBlockingOverlay && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 text-center animate-in fade-in">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-4 sm:mb-6 border border-red-500/20">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-2 sm:mb-4 tracking-tight">Stay Focused 📚</h1>
          <p className="text-slate-300 text-sm sm:text-base mb-6 max-w-sm">
            Your study session is in progress. Distracting apps and tabs are blocked until time expires.
          </p>
          <div className="text-4xl sm:text-6xl font-mono font-black text-white mb-8 tabular-nums tracking-tighter">
            {dH}:{dM}:{dS}
          </div>
          <button
            onClick={() => setShowBlockingOverlay(false)}
            className="px-6 sm:px-8 py-3.5 sm:py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-primary-500/30 transition-all active:scale-95"
          >
            Continue Studying
          </button>
        </div>
      )}

      {/* FOCUS MODE APP CONFIGURATION MODAL */}
      {showFocusSettings && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-4 sm:p-6 text-center border-b border-slate-100 dark:border-slate-700 bg-primary-50/50 dark:bg-primary-950/20">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-slate-700 rounded-2xl shadow-sm mx-auto flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">Focus App Shield 🔒</h2>
              <p className="text-slate-600 dark:text-slate-300 mt-1 text-xs sm:text-sm">
                Select distracting apps you want to block during your study session.
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary-600" /> Target Apps
                </h3>
                <span className="text-[11px] font-bold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/40 px-2.5 py-0.5 rounded-full border border-primary-100 dark:border-primary-800">
                  {selectedApps.length} active
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto pr-1 space-y-1.5 mb-5 custom-scrollbar">
                {APPS_TO_BLOCK.map(app => (
                  <button
                    key={app.id}
                    onClick={() => toggleAppSelection(app.id)}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                      selectedApps.includes(app.id)
                        ? 'bg-primary-50/70 border-primary-300 text-primary-900 dark:bg-primary-950/40 dark:border-primary-800 dark:text-primary-200'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>{app.name}</span>
                    {selectedApps.includes(app.id) && (
                      <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowFocusSettings(false)}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-primary-500/20 transition-all active:scale-95"
                >
                  Save & Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STOP CONFIRMATION MODAL */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 text-center animate-in zoom-in-95 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white mb-1.5">End Study Session?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-5">
              Your elapsed focus time will be saved to your daily progress history.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={cancelStop}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-bold text-xs sm:text-sm transition-all"
              >
                Resume
              </button>
              <button
                onClick={confirmStop}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-red-500/20 transition-all"
              >
                End Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETION CELEBRATION MODAL */}
      {showCompletion && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 sm:p-8 text-center animate-in zoom-in-95 duration-300 relative overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-inner">
              <span className="text-3xl sm:text-4xl">🏆</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white mb-1.5">Session Completed!</h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-6">
              Outstanding discipline! You stayed focused for the full duration. Your session data is synced.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setShowCompletion(false)}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                Start Another Session
              </button>
              <button
                onClick={() => setShowCompletion(false)}
                className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs sm:text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TIMER CARD */}
      <div className="bg-white dark:bg-slate-800/95 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] shadow-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden relative">

        {/* Header Bar */}
        <div className="p-4 sm:p-6 lg:p-7 text-center bg-gradient-to-b from-primary-50/70 to-transparent dark:from-primary-950/20 dark:to-transparent border-b border-slate-100 dark:border-slate-700/60">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100/60 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 text-[11px] sm:text-xs font-bold mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Smart Pomodoro & Study Engine</span>
          </div>
          <h2 className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Study Timer
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm font-medium">
            Lock in your focus and track your learning streak effortlessly
          </p>
        </div>

        <div className="p-4 xs:p-5 sm:p-7 lg:p-8 flex flex-col items-center">

          {timerState === 'IDLE' ? (
            /* IDLE MODE: SETUP & DURATION PICKER */
            <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-5 sm:gap-6">

              {/* 1. Quick Duration Presets */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Quick Presets
                  </span>
                </div>
                <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                  {PRESETS.map((p) => {
                    const isSelected = inputH === p.h && inputM === p.m && inputS === p.s;
                    return (
                      <button
                        key={p.label}
                        onClick={() => applyPreset(p.h, p.m, p.s)}
                        className={`p-2.5 sm:p-3 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-700 dark:text-primary-300 font-bold shadow-sm ring-2 ring-primary-500/20'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-bold">{p.label}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Responsive Time Inputs (H:M:S) */}
              <div className="w-full bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-center gap-1.5 xs:gap-3 sm:gap-4 max-w-sm mx-auto">
                  {/* Hours */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={inputH}
                      onChange={e => setInputH(e.target.value)}
                      onBlur={e => handleInputBlur('H', e.target.value)}
                      className="w-full h-14 xs:h-16 sm:h-20 text-center text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hours</span>
                  </div>

                  <span className="text-2xl sm:text-4xl font-bold text-slate-300 dark:text-slate-600 pb-5 select-none">:</span>

                  {/* Minutes */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={inputM}
                      onChange={e => setInputM(e.target.value)}
                      onBlur={e => handleInputBlur('M', e.target.value)}
                      className="w-full h-14 xs:h-16 sm:h-20 text-center text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mins</span>
                  </div>

                  <span className="text-2xl sm:text-4xl font-bold text-slate-300 dark:text-slate-600 pb-5 select-none">:</span>

                  {/* Seconds */}
                  <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={inputS}
                      onChange={e => setInputS(e.target.value)}
                      onBlur={e => handleInputBlur('S', e.target.value)}
                      className="w-full h-14 xs:h-16 sm:h-20 text-center text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Secs</span>
                  </div>
                </div>
              </div>

              {/* 3. Subject Selector */}
              <div className="w-full">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary-600" /> Study Subject
                </span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                  {SUBJECT_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => { setSelectedSubject(s); setCustomSubject(''); }}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedSubject === s && !customSubject
                          ? 'bg-primary-600 text-white font-bold shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter custom topic / exam goal..."
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-white outline-none focus:border-primary-500"
                />
              </div>

              {/* 4. Focus Mode & App Shield Toggle */}
              <div className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      Distraction Blocker Shield
                      {isFocusModeActive && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">ACTIVE</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Blocks {selectedApps.length} distracting apps and alerts
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFocusSettings(true)}
                    className="p-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setIsFocusModeActive(!isFocusModeActive)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${isFocusModeActive ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isFocusModeActive ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* 5. Start Focus Session Action */}
              <button
                onClick={() => startTimer(isFocusModeActive)}
                className="w-full py-4 sm:py-4.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg shadow-lg shadow-primary-500/25 active:scale-98 transition-all flex items-center justify-center gap-2.5"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Focus Session
              </button>

            </div>
          ) : (
            /* ACTIVE / RUNNING / PAUSED CIRCULAR GAUGE */
            <div className="w-full flex flex-col items-center">

              {/* Scalable Vector Circular Progress Gauge */}
              <div className="relative w-56 h-56 xs:w-64 xs:h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 mx-auto flex items-center justify-center mb-6 sm:mb-8 select-none">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 320 320">
                  {/* Background Track */}
                  <circle
                    cx="160"
                    cy="160"
                    r="138"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-slate-100 dark:text-slate-800/80"
                  />
                  {/* Active Dynamic Progress Ring */}
                  <circle
                    cx="160"
                    cy="160"
                    r="138"
                    stroke="var(--color-primary-500, #D4AF37)"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 138}
                    strokeDashoffset={2 * Math.PI * 138 * (1 - Math.max(0, Math.min(100, progressPercent)) / 100)}
                    className="text-primary-500 transition-all duration-300 ease-linear"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center pointer-events-none">
                  <span className="text-3xl xs:text-4xl sm:text-5xl font-black font-mono tracking-tight tabular-nums text-slate-800 dark:text-white drop-shadow-sm whitespace-nowrap">
                    {dH}:{dM}:{dS}
                  </span>

                  <div className="flex items-center gap-1.5 mt-2.5 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${timerState === 'RUNNING' ? 'bg-primary-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {timerState === 'RUNNING' ? 'Focusing' : 'Paused'}
                    </span>
                  </div>

                  {activeSubject && (
                    <span className="text-[11px] sm:text-xs font-semibold text-primary-600 dark:text-primary-400 mt-2 truncate max-w-[180px] sm:max-w-[220px]">
                      📖 {activeSubject}
                    </span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-4 w-full max-w-sm">
                {timerState === 'RUNNING' ? (
                  <button
                    onClick={handlePause}
                    className="flex-1 min-h-[48px] py-3.5 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                  >
                    <Pause className="w-5 h-5 fill-current" />
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    className="flex-1 min-h-[48px] py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary-500/20"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Resume
                  </button>
                )}

                <button
                  onClick={handleStopRequest}
                  className="px-5 min-h-[48px] py-3.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-red-200 dark:border-red-900/50"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop
                </button>

                {timerState === 'PAUSED' && (
                  <button
                    onClick={handleReset}
                    className="px-4 min-h-[48px] py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-xl sm:rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1 active:scale-95"
                    title="Reset to initial duration"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default StudyTimerView;
