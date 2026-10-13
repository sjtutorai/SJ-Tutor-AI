import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Plus, X, Volume2, VolumeX, CheckCircle, 
  Sparkles, BellOff, Coffee, Brain, Save, ChevronDown, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useNotifications } from './NotificationContext';
import { NoteItem, UserProfile } from '../types';
import { saveStudySessionToFirestore } from '../utils/firebaseUtils';

interface DeepWorkFocusModeProps {
  onExit: () => void;
  userId?: string | null;
  userProfile?: UserProfile;
  onSaveQuickNote?: (note: Partial<NoteItem>) => void;
}

type SoundscapeType = 'none' | 'lofi' | 'rain' | 'stream' | 'binaural';

const SOUNDSCAPES: { id: SoundscapeType; label: string; icon: string }[] = [
  { id: 'none', label: 'Silent Focus', icon: '🤫' },
  { id: 'lofi', label: 'Warm Lo-Fi Hum', icon: '🎧' },
  { id: 'rain', label: 'Gentle Rain', icon: '🌧️' },
  { id: 'stream', label: 'Zen Stream', icon: '🍃' },
  { id: 'binaural', label: '40Hz Gamma Focus', icon: '🧠' },
];

export const DeepWorkFocusMode: React.FC<DeepWorkFocusModeProps> = ({
  onExit,
  userId,
  onSaveQuickNote,
}) => {
  const { setNotificationsMuted, triggerToast } = useNotifications();

  // Pomodoro Timer States: 25 mins = 1500 seconds
  const POMODORO_DURATION = 25 * 60;
  const SHORT_BREAK_DURATION = 5 * 60;

  const [mode, setMode] = useState<'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'>('FOCUS');
  const [totalSeconds, setTotalSeconds] = useState(POMODORO_DURATION);
  const [secondsLeft, setSecondsLeft] = useState(POMODORO_DURATION);
  const [isActive, setIsActive] = useState(true); // Automatically starts countdown!
  const [completedSessions, setCompletedSessions] = useState(0);
  const [focusGoal, setFocusGoal] = useState('Deep Study & Material Mastery');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [scratchpad, setScratchpad] = useState('');
  const [isScratchpadSaved, setIsScratchpadSaved] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);

  // Soundscape audio synthesizer states
  const [currentSoundscape, setCurrentSoundscape] = useState<SoundscapeType>('none');
  const [soundVolume, setSoundVolume] = useState(0.4);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<any[]>([]);

  // 1. MUTE NOTIFICATIONS ON MOUNT, UNMUTE ON UNMOUNT
  useEffect(() => {
    setNotificationsMuted(true);
    return () => {
      setNotificationsMuted(false);
      stopAudioSynthesis();
    };
  }, [setNotificationsMuted]);

  // 2. POMODORO TICKER (ACCURATE WITH TIMESTAMP DRIFT COMPENSATION)
  const lastTickTimeRef = useRef<number>(Date.now());
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      lastTickTimeRef.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastTickTimeRef.current) / 1000);
        if (elapsed >= 1) {
          lastTickTimeRef.current = now;
          setSecondsLeft((prev) => {
            const nextVal = Math.max(0, prev - elapsed);
            if (nextVal === 0) {
              handleSessionComplete();
            }
            return nextVal;
          });
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  // Web Audio Synthesizer for gentle chimes & ambient focus soundscapes
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, ctx.currentTime); // Solfeggio 528Hz Transformation chime
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2.6);
    } catch (e) {
      console.debug('Chime audio error:', e);
    }
  };

  const stopAudioSynthesis = () => {
    try {
      soundNodesRef.current.forEach((node) => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch {
          // ignore
        }
      });
      soundNodesRef.current = [];
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } catch (e) {
      console.debug('Error stopping audio:', e);
    }
  };

  const startSoundscape = (type: SoundscapeType) => {
    stopAudioSynthesis();
    if (type === 'none') {
      setCurrentSoundscape('none');
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(soundVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (type === 'binaural') {
        // 40Hz Gamma Focus (left 200Hz, right 240Hz)
        const merger = ctx.createChannelMerger(2);
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        oscL.type = 'sine';
        oscR.type = 'sine';
        oscL.frequency.value = 216;
        oscR.frequency.value = 256; // 40Hz difference
        
        const gainL = ctx.createGain();
        const gainR = ctx.createGain();
        gainL.gain.value = 0.2;
        gainR.gain.value = 0.2;

        oscL.connect(gainL);
        gainL.connect(merger, 0, 0);

        oscR.connect(gainR);
        gainR.connect(merger, 0, 1);

        merger.connect(masterGain);
        oscL.start();
        oscR.start();
        soundNodesRef.current = [oscL, oscR, gainL, gainR, merger, masterGain];
      } else if (type === 'lofi') {
        // Warm rich chord drone
        const frequencies = [130.81, 196.00, 261.63, 329.63]; // C minor 7th warm drone
        const nodes: any[] = [];
        frequencies.forEach((freq) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          filter.type = 'lowpass';
          filter.frequency.value = 450;
          gain.gain.value = 0.08;
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start();
          nodes.push(osc, filter, gain);
        });
        nodes.push(masterGain);
        soundNodesRef.current = nodes;
      } else if (type === 'rain' || type === 'stream') {
        // Generative filtered noise
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = buffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
        filter.frequency.value = type === 'rain' ? 800 : 500;
        filter.Q.value = type === 'rain' ? 1 : 3;

        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.12;

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        whiteNoise.start();

        soundNodesRef.current = [whiteNoise, filter, noiseGain, masterGain];
      }

      setCurrentSoundscape(type);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
      setCurrentSoundscape('none');
    }
  };

  // Adjust volume
  useEffect(() => {
    if (audioContextRef.current && soundNodesRef.current.length > 0) {
      const master = soundNodesRef.current[soundNodesRef.current.length - 1];
      if (master && master.gain) {
        master.gain.setValueAtTime(soundVolume, audioContextRef.current.currentTime);
      }
    }
  }, [soundVolume]);

  // Session completion handler
  const handleSessionComplete = () => {
    setIsActive(false);
    playChime();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (mode === 'FOCUS') {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);

      // Log study session in Firestore if authenticated
      if (userId && userId !== 'guest') {
        saveStudySessionToFirestore(userId, {
          date: new Date().toISOString().split('T')[0],
          duration: 25,
          completed: true,
          focusMode: true,
          timestamp: Date.now(),
        }).catch((e) => console.debug('Session record err:', e));
      }

      // Also persist to local session logs
      try {
        const key = `study_pomodoros_${userId || 'guest'}`;
        const prev = JSON.parse(localStorage.getItem(key) || '[]');
        prev.push({
          date: new Date().toISOString(),
          duration: 25,
          goal: focusGoal,
        });
        localStorage.setItem(key, JSON.stringify(prev));
      } catch (e) {
        console.debug('Storage error:', e);
      }

      setIsCompletedModalOpen(true);
    } else {
      // Break complete, transition back to focus
      setMode('FOCUS');
      setTotalSeconds(POMODORO_DURATION);
      setSecondsLeft(POMODORO_DURATION);
      setIsActive(true);
    }
  };

  // Keyboard shortcut listener: Space to toggle pause/play, Esc to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingGoal) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsActive((prev) => !prev);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        setShowExitConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingGoal]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.max(0, ((totalSeconds - secondsLeft) / totalSeconds) * 100));

  // Quick Notes Saver
  const handleSaveScratchpadAsNote = () => {
    if (!scratchpad.trim()) return;
    const newNote: Partial<NoteItem> = {
      title: `Focus Note: ${focusGoal.slice(0, 30)}`,
      content: `### 🎯 Deep Work Session Insight\n**Focus Goal:** ${focusGoal}\n**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n${scratchpad}`,
      subject: 'General Notes',
      folder: 'General Notes',
      tags: ['deep-work', 'pomodoro'],
    };

    if (onSaveQuickNote) {
      onSaveQuickNote(newNote);
    } else {
      // Save locally
      try {
        const key = `notes_${userId || 'guest'}`;
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        const item: NoteItem = {
          id: `note-${Date.now()}`,
          title: newNote.title || 'Focus Note',
          content: newNote.content || '',
          subject: 'General Notes',
          chapter: 'Deep Work Session',
          template: 'Blank',
          status: 'New',
          isFavorite: true,
          date: Date.now(),
          tags: ['deep-work', 'pomodoro'],
          folder: 'General Notes',
        };
        localStorage.setItem(key, JSON.stringify([item, ...local]));
      } catch (e) {
        console.debug('Failed saving quick note:', e);
      }
    }

    setIsScratchpadSaved(true);
    setTimeout(() => setIsScratchpadSaved(false), 3000);
    triggerToast('Note Saved! 📝', 'Your focus thoughts were saved to your Study Notes folder.', 'Important Alerts');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none animate-in fade-in duration-500 font-sans">
      
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary-600/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      {/* TOP ZEN BAR - MINIMAL & CLEAN */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-950/50 border border-primary-800/50 text-primary-300 rounded-xl text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DEEP WORK FOCUS</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Pomodoro #{completedSessions + 1}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl font-medium">
            <BellOff className="w-3.5 h-3.5" />
            <span>Notifications Muted (Do Not Disturb)</span>
          </div>
        </div>

        {/* SOUNDSCAPE CONTROLS & EXIT */}
        <div className="flex items-center gap-3">
          {/* Soundscapes Selector */}
          <div className="relative group">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 transition cursor-pointer">
              {currentSoundscape === 'none' ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-primary-400 animate-pulse" />}
              <span className="hidden md:inline font-medium">
                {SOUNDSCAPES.find((s) => s.id === currentSoundscape)?.label || 'Soundscapes'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>

            {/* Soundscapes Dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-30">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ambient Soundscape
              </div>
              {SOUNDSCAPES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => startSoundscape(s.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                    currentSoundscape === s.id ? 'bg-primary-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </span>
                  {currentSoundscape === s.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}

              {currentSoundscape !== 'none' && (
                <div className="mt-2 pt-2 border-t border-slate-800 px-2 py-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>Volume</span>
                    <span>{Math.round(soundVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Exit Focus Mode Button */}
          <button
            onClick={() => {
              if (isActive && secondsLeft > 60) {
                setShowExitConfirm(true);
              } else {
                onExit();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800/50 rounded-xl text-xs font-semibold transition"
            title="Exit Focus Mode (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Focus</span>
          </button>
        </div>
      </header>

      {/* MAIN FOCUS WORKSPACE */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        
        {/* FOCUS GOAL BANNER */}
        <div className="w-full max-w-md mb-8 text-center">
          {isEditingGoal ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-primary-500/60 rounded-xl p-1.5">
              <input
                type="text"
                autoFocus
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingGoal(false)}
                className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white outline-none"
                placeholder="What are you mastering today?"
              />
              <button
                onClick={() => setIsEditingGoal(false)}
                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold transition"
              >
                Set
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingGoal(true)}
              className="group cursor-pointer inline-flex flex-col items-center gap-1 px-4 py-2 rounded-2xl hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition"
              title="Click to edit intention"
            >
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-400 uppercase">
                <Brain className="w-3.5 h-3.5 text-primary-400" />
                <span>Current Focus Objective</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-slate-100 group-hover:text-primary-300 transition flex items-center gap-2">
                <span>{focusGoal}</span>
                <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition">✎</span>
              </h2>
            </div>
          )}
        </div>

        {/* CIRCULAR TIMER DISPLAY */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center mb-8">
          {/* SVG Progress Ring */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 240 240">
            {/* Background Track */}
            <circle
              cx="120"
              cy="120"
              r="104"
              className="stroke-slate-800/80"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Active Animated Fill */}
            <circle
              cx="120"
              cy="120"
              r="104"
              className={`transition-all duration-700 ease-out ${
                mode === 'FOCUS' ? 'stroke-primary-500' : 'stroke-emerald-400'
              }`}
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 104}
              strokeDashoffset={(2 * Math.PI * 104) * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Central Time and Controls */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">
              {mode === 'FOCUS' ? 'Sprint In Progress' : 'Rest & Recharge'}
            </span>
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-md">
              {formatTime(secondsLeft)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {isActive ? 'Single-tasking only · Breathe' : 'Paused · Press Space to resume'}
            </p>
          </div>
        </div>

        {/* PRIMARY CONTROLS */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2.5 shadow-xl transition transform active:scale-95 ${
              isActive
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-600/30'
            }`}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isActive ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={() => {
              setSecondsLeft(totalSeconds);
              setIsActive(false);
            }}
            className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-2xl transition hover:text-white"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setSecondsLeft((prev) => prev + 5 * 60);
              setTotalSeconds((prev) => prev + 5 * 60);
            }}
            className="px-4 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition flex items-center gap-1"
            title="Add 5 minutes to timer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+5m</span>
          </button>
        </div>

        {/* DISTRACTION-FREE SCRATCHPAD DRAWER */}
        <div className="w-full max-w-xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>💡 Focus Scratchpad</span>
              <span className="text-slate-500 font-normal">(capture stray ideas without breaking focus)</span>
            </span>

            {scratchpad.trim() && (
              <button
                onClick={handleSaveScratchpadAsNote}
                className="flex items-center gap-1 text-[11px] font-bold text-primary-400 hover:text-primary-300 transition"
              >
                {isScratchpadSaved ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Saved to Notes</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    <span>Save to Study Notes</span>
                  </>
                )}
              </button>
            )}
          </div>
          <textarea
            value={scratchpad}
            onChange={(e) => setScratchpad(e.target.value)}
            placeholder="Jot down quick thoughts, formulas, or sudden distractions to review later..."
            rows={2}
            className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/50 resize-none"
          />
        </div>

      </main>

      {/* BOTTOM FOOTER TIPS */}
      <footer className="relative z-10 py-3 px-6 text-center text-xs text-slate-500 border-t border-slate-900">
        <span>Space: Toggle Pause/Play</span>
        <span className="mx-2">·</span>
        <span>Esc: Exit Focus Mode</span>
        <span className="mx-2">·</span>
        <span>All notifications & alerts are completely muted</span>
      </footer>

      {/* SESSION COMPLETE CELEBRATION MODAL */}
      <AnimatePresence>
        {isCompletedModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-primary-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary-600/20 text-primary-400 flex items-center justify-center mx-auto mb-4 border border-primary-500/30">
                <Sparkles className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-white mb-1">Pomodoro Complete! 🎉</h3>
              <p className="text-sm text-slate-400 mb-6">
                You maintained unbroken focus for 25 minutes on{' '}
                <span className="text-primary-300 font-semibold">&quot;{focusGoal}&quot;</span>. Session logged!
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Pomodoros Done</div>
                  <div className="text-lg font-black text-emerald-400">{completedSessions}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Time Mastered</div>
                  <div className="text-lg font-black text-primary-400">{completedSessions * 25} mins</div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setIsCompletedModalOpen(false);
                    setMode('SHORT_BREAK');
                    setTotalSeconds(SHORT_BREAK_DURATION);
                    setSecondsLeft(SHORT_BREAK_DURATION);
                    setIsActive(true);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Take a 5-Minute Break</span>
                </button>

                <button
                  onClick={() => {
                    setIsCompletedModalOpen(false);
                    setMode('FOCUS');
                    setTotalSeconds(POMODORO_DURATION);
                    setSecondsLeft(POMODORO_DURATION);
                    setIsActive(true);
                  }}
                  className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  <Brain className="w-4 h-4" />
                  <span>Start Next 25m Focus Sprint</span>
                </button>

                <button
                  onClick={() => {
                    setIsCompletedModalOpen(false);
                    onExit();
                  }}
                  className="w-full py-2.5 text-slate-400 hover:text-white rounded-xl font-medium text-xs transition"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXIT CONFIRMATION MODAL */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center"
            >
              <h4 className="text-lg font-bold text-white mb-2">Leave Deep Work Session?</h4>
              <p className="text-xs text-slate-400 mb-6">
                You have {formatTime(secondsLeft)} remaining in your focus block. Exiting will unmute notifications and return to the dashboard.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs transition"
                >
                  Keep Focusing
                </button>
                <button
                  onClick={() => {
                    setShowExitConfirm(false);
                    onExit();
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  Exit Session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
