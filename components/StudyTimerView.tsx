import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Shield, AlertTriangle, Settings2, Smartphone, Check, Cloud, Lock, KeyRound, X, Eye, EyeOff } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { UserProfile, TimerStateType, UserTimerState } from '../types';
import { saveUserTimerState, subscribeToUserTimerState, saveStudySessionToFirestore } from '../utils/firebaseUtils';

interface StudyTimerViewProps {
  userProfile?: UserProfile;
  userId?: string | null;
  userEmail?: string | null;
  onProfileUpdate?: (updates: Partial<UserProfile>) => void;
}

async function hashParentPin(pin: string, scopeId: string): Promise<string> {
  const payload = `sjtutor_parent_focus_pin::${scopeId || 'guest'}::${pin}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(payload);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below if Web Crypto is unavailable
  }
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv_${(hash >>> 0).toString(16)}`;
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
  { id: 'msg', name: 'Messenger', default: true },
  { id: 'chrome', name: 'Chrome', default: false },
  { id: 'games', name: 'Games', default: false },
];

const StudyTimerView: React.FC<StudyTimerViewProps> = ({ userProfile, userId, userEmail, onProfileUpdate }) => {
  // Generate or retrieve unique device session ID to identify local vs remote updates
  const deviceIdRef = useRef<string>(
    (() => {
      let id = sessionStorage.getItem('sjtutor_device_id');
      if (!id) {
        id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        sessionStorage.setItem('sjtutor_device_id', id);
      }
      return id;
    })()
  );

  // Input states
  const [inputH, setInputH] = useState('00');
  const [inputM, setInputM] = useState('25');
  const [inputS, setInputS] = useState('00');

  // Timer internal state
  const [timerState, setTimerState] = useState<TimerStateType>('IDLE');
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [initialTimeMs, setInitialTimeMs] = useState(0);
  const expectedEndTimeRef = useRef<number | null>(null);

  // Sync status
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const isLocalUpdateRef = useRef<boolean>(false);

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

  // Dedicated 4-digit Parent PIN state for Stay Focused Lock (Return & Terminate)
  const pinScopeId = userId || 'guest';
  const pinStorageKey = `sjtutor_parent_pin_${pinScopeId}`;
  const [parentPinHash, setParentPinHash] = useState<string | null>(() => {
    try {
      return userProfile?.parentFocusPinHash || localStorage.getItem(`sjtutor_parent_pin_${userId || 'guest'}`) || null;
    } catch {
      return userProfile?.parentFocusPinHash || null;
    }
  });
  const [pinModalMode, setPinModalMode] = useState<
    null | 'setup' | 'setup-before-focus' | 'change' | 'verify-return' | 'verify-terminate'
  >(null);
  const [pinStep, setPinStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [pendingNewPin, setPendingNewPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinNotice, setPinNotice] = useState<string | null>(null);
  const [showPinDigits, setShowPinDigits] = useState<boolean>(false);
  const [pinShakeKey, setPinShakeKey] = useState<number>(0);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep parentPinHash synchronized with userProfile and localStorage when account changes
  useEffect(() => {
    try {
      const localHash = localStorage.getItem(pinStorageKey);
      const profileHash = userProfile?.parentFocusPinHash || null;
      const resolved = profileHash || localHash || null;
      setParentPinHash(resolved);
      if (profileHash && profileHash !== localHash) {
        localStorage.setItem(pinStorageKey, profileHash);
      }
    } catch {
      setParentPinHash(userProfile?.parentFocusPinHash || null);
    }
  }, [pinStorageKey, userProfile?.parentFocusPinHash]);

  // Auto-focus first PIN box whenever PIN modal opens or step changes
  useEffect(() => {
    if (pinModalMode) {
      const timer = setTimeout(() => {
        pinInputRefs.current[0]?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [pinModalMode, pinStep]);

  const openPinModal = (mode: 'setup' | 'setup-before-focus' | 'change' | 'verify-return' | 'verify-terminate') => {
    setPinDigits(['', '', '', '']);
    setPendingNewPin('');
    setPinError(null);
    setPinNotice(null);
    setShowPinDigits(false);
    setPinStep(mode === 'change' ? 'current' : 'new');
    setPinModalMode(mode);
  };

  const closePinModal = () => {
    setPinModalMode(null);
    setPinDigits(['', '', '', '']);
    setPendingNewPin('');
    setPinError(null);
  };

  const persistParentPinHash = (hash: string) => {
    setParentPinHash(hash);
    try {
      localStorage.setItem(pinStorageKey, hash);
    } catch {
      // ignore storage failure
    }
    if (onProfileUpdate) {
      onProfileUpdate({ parentFocusPinHash: hash });
    }
  };

  const triggerPinError = (message: string) => {
    setPinError(message);
    setPinShakeKey((k) => k + 1);
    setPinDigits(['', '', '', '']);
    setTimeout(() => {
      pinInputRefs.current[0]?.focus();
    }, 60);
  };

  const handlePinDigitChange = (idx: number, rawVal: string) => {
    const clean = rawVal.replace(/\D/g, '');
    setPinError(null);

    if (clean.length > 1) {
      const pasted = clean.slice(0, 4).split('');
      const next = ['', '', '', ''];
      pasted.forEach((ch, i) => {
        next[i] = ch;
      });
      setPinDigits(next);
      const focusIdx = Math.min(3, pasted.length);
      pinInputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...pinDigits];
    next[idx] = clean;
    setPinDigits(next);
    if (clean && idx < 3) {
      pinInputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      pinInputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitParentPin();
    }
  };

  const handleSubmitParentPin = async () => {
    const enteredPin = pinDigits.join('');
    if (enteredPin.length !== 4) {
      triggerPinError('Please enter all 4 digits of the Parent PIN.');
      return;
    }

    if (pinModalMode === 'verify-return' || pinModalMode === 'verify-terminate') {
      if (!parentPinHash) {
        // Fallback if no Parent PIN was configured yet: require setting one first
        openPinModal('setup');
        return;
      }
      const enteredHash = await hashParentPin(enteredPin, pinScopeId);
      if (enteredHash !== parentPinHash) {
        triggerPinError('Incorrect Parent PIN. Ask a parent to unlock this screen.');
        return;
      }

      const action = pinModalMode;
      closePinModal();
      if (action === 'verify-return') {
        setShowBlockingOverlay(false);
      } else if (action === 'verify-terminate') {
        setShowBlockingOverlay(false);
        confirmStop();
      }
      return;
    }

    if (pinModalMode === 'change' && pinStep === 'current') {
      const enteredHash = await hashParentPin(enteredPin, pinScopeId);
      if (parentPinHash && enteredHash !== parentPinHash) {
        triggerPinError('Current Parent PIN is incorrect. Please try again.');
        return;
      }
      setPinDigits(['', '', '', '']);
      setPinError(null);
      setPinStep('new');
      return;
    }

    if (pinStep === 'new') {
      setPendingNewPin(enteredPin);
      setPinDigits(['', '', '', '']);
      setPinError(null);
      setPinStep('confirm');
      return;
    }

    if (pinStep === 'confirm') {
      if (enteredPin !== pendingNewPin) {
        setPendingNewPin('');
        setPinStep('new');
        triggerPinError('PINs did not match. Please enter your new 4-digit Parent PIN again.');
        return;
      }
      const hashed = await hashParentPin(enteredPin, pinScopeId);
      persistParentPinHash(hashed);
      const wasSetupBeforeFocus = pinModalMode === 'setup-before-focus';
      closePinModal();
      setPinNotice('Parent PIN saved and active for Focus Lock.');
      setTimeout(() => setPinNotice(null), 4000);
      if (wasSetupBeforeFocus) {
        if (hasAccessibilityPerm === null) {
          setShowPermDialog(true);
        } else {
          startTimer(true);
        }
      }
    }
  };

  // Real-time synchronization across all devices for this user account
  useEffect(() => {
    if (!userId || userId === 'guest') {
      setIsSynced(false);
      return;
    }

    const unsubscribe = subscribeToUserTimerState(userId, (remoteTimer: UserTimerState | null) => {
      setIsSynced(true);
      if (!remoteTimer) return;

      // If update was initiated by this device very recently, ignore to prevent stutter
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
        setInitialTimeMs(remoteTimer.initialTimeMs || remaining);
        setIsFocusModeActive(Boolean(remoteTimer.isFocusModeActive));
        if (remoteTimer.selectedApps) setSelectedApps(remoteTimer.selectedApps);
      } else if (remoteTimer.timerState === 'PAUSED') {
        expectedEndTimeRef.current = null;
        setTimerState('PAUSED');
        setTimeLeftMs(remoteTimer.timeLeftMs);
        setInitialTimeMs(remoteTimer.initialTimeMs);
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

    // Sync IDLE state to all devices
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
        deviceId: deviceIdRef.current as any,
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
      timestamp: Date.now()
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

    // Save session to Firestore for this user
    if (userId && userId !== 'guest') {
      saveStudySessionToFirestore(userId, session);
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
    const expectedEnd = Date.now() + timeLeftMs;
    expectedEndTimeRef.current = expectedEnd;
    setShowFocusSetup(false);
    setShowPermDialog(false);

    try {
      const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (!isInsideIframe && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch {
      // ignore
    }

    // Sync across all devices for this email
    if (userId && userId !== 'guest') {
      isLocalUpdateRef.current = true;
      saveUserTimerState(userId, {
        timerState: 'RUNNING',
        timeLeftMs,
        initialTimeMs: initialTimeMs || timeLeftMs,
        expectedEndTime: expectedEnd,
        isFocusModeActive: withFocusMode,
        selectedApps,
        inputH,
        inputM,
        inputS,
        deviceId: deviceIdRef.current as any,
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
        deviceId: deviceIdRef.current as any,
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
        deviceId: deviceIdRef.current as any,
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
        deviceId: deviceIdRef.current as any,
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
        deviceId: deviceIdRef.current as any,
      });
    }
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
    <div className="max-w-xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500 relative">
      
      {/* Real-time Cross-Device Sync & Parent PIN Control Strip */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm transition-all">
          <Cloud className={`w-3.5 h-3.5 ${isSynced ? 'text-emerald-500' : 'text-amber-500'}`} />
          <span>
            {userId && userEmail 
              ? `Synced across all devices (${userEmail})` 
              : 'Sign in to auto-sync timer across all your devices'}
          </span>
          {isSynced && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live sync active" />
          )}
        </div>

        <button
          type="button"
          onClick={() => openPinModal(parentPinHash ? 'change' : 'setup')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors cursor-pointer ${
            parentPinHash
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/70'
          }`}
          title={parentPinHash ? 'Update Parent Focus PIN' : 'Set a 4-digit Parent PIN to lock Focus Mode'}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{parentPinHash ? 'Parent PIN Active · Change' : 'Set Parent PIN'}</span>
        </button>
      </div>

      {pinNotice && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{pinNotice}</span>
        </div>
      )}

      {/* 5. BLOCKING SCREEN OVERLAY (Protected by Dedicated Parent PIN) */}
      {showBlockingOverlay && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
          <Shield className="w-20 h-20 text-rose-500 mb-6" />
          <h1 className="text-4xl font-extrabold text-white mb-4">Stay Focused 📚</h1>
          <p className="text-slate-300 text-lg mb-8 max-w-sm">
            Your study session is currently running. Distracting apps are blocked until you finish.
          </p>
          <div className="text-6xl font-mono font-bold text-white mb-10 tabular-nums tracking-tighter">
            {dH}:{dM}:{dS}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
            <button 
              type="button"
              onClick={() => openPinModal(parentPinHash ? 'verify-return' : 'setup')}
              className="w-full sm:flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>Return to SJ Tutor AI</span>
            </button>
            <button
              type="button"
              id="btn-terminate-study-session-overlay"
              onClick={() => openPinModal(parentPinHash ? 'verify-terminate' : 'setup')}
              className="w-full sm:flex-1 px-6 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current shrink-0" />
              <span>Terminate Session</span>
            </button>
          </div>
          <p className="mt-5 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <span>Parent PIN required to exit or terminate Focus Mode</span>
          </p>
        </div>
      )}

      {/* DEDICATED PARENT PIN MODAL (Setup / Change / Verify Return / Verify Terminate) */}
      {pinModalMode && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <motion.div
            key={pinShakeKey}
            initial={pinShakeKey > 0 ? { x: -8 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={pinShakeKey > 0 ? { x: [0, -8, 8, -6, 6, 0] } : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: pinShakeKey > 0 ? 0.32 : 0.18 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    pinModalMode === 'verify-terminate'
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                      : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    {pinModalMode === 'verify-return'
                      ? 'Parent PIN Required'
                      : pinModalMode === 'verify-terminate'
                      ? 'Parent PIN to Terminate'
                      : pinModalMode === 'change'
                      ? pinStep === 'current'
                        ? 'Verify Current Parent PIN'
                        : pinStep === 'new'
                        ? 'Enter New Parent PIN'
                        : 'Confirm New Parent PIN'
                      : pinStep === 'new'
                      ? 'Create 4-Digit Parent PIN'
                      : 'Confirm Parent PIN'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {pinModalMode === 'verify-return'
                      ? 'Enter the 4-digit Parent PIN to return to SJ Tutor AI.'
                      : pinModalMode === 'verify-terminate'
                      ? 'Enter the 4-digit Parent PIN to terminate this study session.'
                      : pinModalMode === 'change' && pinStep === 'current'
                      ? 'Enter your existing Parent PIN before setting a new one.'
                      : pinStep === 'confirm'
                      ? 'Re-enter the 4-digit Parent PIN to confirm.'
                      : 'Parents use this PIN to unlock Return and Terminate during Focus Mode.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePinModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close Parent PIN dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      pinInputRefs.current[idx] = el;
                    }}
                    type={showPinDigits ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={pinDigits[idx]}
                    onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    aria-label={`Parent PIN digit ${idx + 1}`}
                    className="w-13 h-14 text-center text-2xl font-mono font-bold tabular-nums rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                  />
                ))}
              </div>

              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={() => setShowPinDigits((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPinDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPinDigits ? 'Hide PIN' : 'Show PIN'}</span>
                </button>
              </div>

              {pinError && (
                <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={closePinModal}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitParentPin}
                  className={`flex-1 py-3 rounded-xl text-white text-sm font-bold shadow-md transition-all cursor-pointer ${
                    pinModalMode === 'verify-terminate'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {pinModalMode === 'verify-return'
                    ? 'Unlock & Return'
                    : pinModalMode === 'verify-terminate'
                    ? 'Unlock & Terminate'
                    : pinStep === 'confirm'
                    ? 'Save Parent PIN'
                    : 'Continue'}
                </button>
              </div>
            </div>
          </motion.div>
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
                    if (!parentPinHash) {
                      setShowFocusSetup(false);
                      openPinModal('setup-before-focus');
                      return;
                    }
                    if (hasAccessibilityPerm === null) {
                      setShowFocusSetup(false);
                      setShowPermDialog(true);
                    } else {
                      startTimer(true);
                    }
                  }}
                  className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md shadow-primary-500/20 transition-all cursor-pointer"
                >
                  {parentPinHash ? 'Continue' : 'Set Parent PIN & Start'}
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
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Terminate Study Session?</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Are you sure you want to terminate this study session? Your focus time so far will be recorded.
            </p>
            <div className="flex gap-3">
              <button onClick={cancelStop} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold">
                Continue Studying
              </button>
              <button 
                id="btn-terminate-study-session-confirm"
                onClick={confirmStop} 
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
              >
                <Square className="w-4 h-4 fill-current" />
                Terminate Session
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
              <button onClick={() => { setShowCompletion(false); }} className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TIMER UI */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden relative"
      >
        <div className="p-8 text-center bg-gradient-to-b from-primary-50 to-white dark:from-slate-900 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700 perspective-1200">
          <motion.h2
            initial={{ opacity: 0, scale: 0.88, rotateX: 16, y: 6 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight preserve-3d"
          >
            Study Timer
          </motion.h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Set your duration and stay focused across all your devices</p>
        </div>

        <div className="p-8 flex flex-col items-center">
          
          {timerState === 'IDLE' ? (
            /* Input View */
            <div className="flex items-center justify-center gap-4 mb-10 w-full max-w-sm mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <input
                  type="number"
                  value={inputH}
                  onChange={e => setInputH(e.target.value)}
                  onBlur={e => handleInputBlur('H', e.target.value)}
                  className="w-full aspect-square text-center text-5xl font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hours</span>
              </motion.div>
              <span className="text-4xl font-bold text-slate-300 dark:text-slate-600 pb-6">:</span>
              
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.11, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <input
                  type="number"
                  value={inputM}
                  onChange={e => setInputM(e.target.value)}
                  onBlur={e => handleInputBlur('M', e.target.value)}
                  className="w-full aspect-square text-center text-5xl font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Minutes</span>
              </motion.div>
              <span className="text-4xl font-bold text-slate-300 dark:text-slate-600 pb-6">:</span>
              
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.17, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <input
                  type="number"
                  value={inputS}
                  onChange={e => setInputS(e.target.value)}
                  onBlur={e => handleInputBlur('S', e.target.value)}
                  className="w-full aspect-square text-center text-5xl font-mono font-bold bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl border-2 border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all"
                />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Seconds</span>
              </motion.div>
            </div>
          ) : (
            /* Running / Paused View with Circular Progress */
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-72 h-72 flex items-center justify-center mb-10"
            >
              <svg viewBox="0 0 288 288" className="w-full h-full transform -rotate-90 drop-shadow-md">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <span className="whitespace-nowrap text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white font-mono tracking-tight tabular-nums leading-none drop-shadow-sm">
                  {dH} : {dM} : {dS}
                </span>
                <div className="flex items-center gap-2 mt-3.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  <div className={`w-2 h-2 rounded-full ${timerState === 'RUNNING' ? 'bg-primary-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {timerState === 'RUNNING' ? 'Focusing' : 'Paused'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 w-full max-w-sm">
            {timerState === 'IDLE' && (
              <motion.button
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.985 }}
                onClick={handleStartRequest}
                className="btn-glow-border w-full py-4 bg-gradient-to-r from-primary-500 via-indigo-600 to-primary-700 hover:from-primary-600 hover:via-indigo-500 hover:to-primary-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                <span>Start Focus Session</span>
              </motion.button>
            )}

            {timerState !== 'IDLE' && (
              <>
                {timerState === 'RUNNING' ? (
                  <motion.button
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePause}
                    className="flex-1 py-4 bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-2xl font-bold text-lg transition-colors flex flex-col items-center justify-center gap-1 group cursor-pointer"
                  >
                    <Pause className="w-6 h-6 fill-current group-hover:scale-110 transition-transform duration-300" />
                    Pause
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleResume}
                    className="flex-1 py-4 bg-primary-100 hover:bg-primary-200 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400 rounded-2xl font-bold text-lg transition-colors flex flex-col items-center justify-center gap-1 group cursor-pointer"
                  >
                    <Play className="w-6 h-6 fill-current group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
                    Resume
                  </motion.button>
                )}
                
                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStopRequest}
                  className="w-24 py-4 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 rounded-2xl font-bold transition-colors flex flex-col items-center justify-center gap-1 group cursor-pointer"
                >
                  <Square className="w-6 h-6 fill-current group-hover:scale-110 transition-transform duration-300" />
                  Stop
                </motion.button>
                
                {timerState === 'PAUSED' && (
                  <motion.button
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleReset}
                    className="w-24 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 rounded-2xl font-bold transition-colors flex flex-col items-center justify-center gap-1 group cursor-pointer"
                  >
                    <RotateCcw className="w-6 h-6 group-hover:-rotate-45 transition-transform duration-300" />
                    Reset
                  </motion.button>
                )}
              </>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default StudyTimerView;
