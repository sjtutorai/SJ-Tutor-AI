import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, SkipForward, RotateCcw } from 'lucide-react';
import Logo from '../Logo';
import aiNeuralOrbImg from '../../src/assets/images/ai_neural_orb_1794732977576.jpg';

interface CinematicLoginStageProps {
  children: React.ReactNode;
  onClose: () => void;
  /** Play the full 3D cinematic opening sequence (true only on initial login visit in session) */
  playIntroAnimation: boolean;
  onIntroFinished?: () => void;
}

interface FloatingFormula {
  id: number;
  text: string;
  x: number;
  y: number;
  depth: number;
  duration: number;
  delay: number;
  color: string;
}

const WELCOME_LINE = 'WELCOME TO SJ TUTOR AI';

const EDUCATIONAL_SYMBOLS = [
  'E = mc²',
  '∫ f(x) dx',
  'a² + b² = c²',
  'e^{iπ} + 1 = 0',
  '∇ × E = -∂B/∂t',
  '∑ n²',
  'λ = h / p',
  'ΔG = ΔH − TΔS',
  'π ≈ 3.14159',
  'lim (x→∞)',
  'H₂O',
  'sin²θ + cos²θ = 1',
  '√(x² + y²)',
  'Σ',
  'Ω',
  '∞',
];

export const CinematicLoginStage: React.FC<CinematicLoginStageProps> = ({
  children,
  onClose,
  playIntroAnimation,
  onIntroFinished,
}) => {
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const shouldAnimateIntro = playIntroAnimation && !prefersReducedMotion;
  const [phase, setPhase] = useState<'intro' | 'ready'>(
    shouldAnimateIntro ? 'intro' : 'ready'
  );
  const [introReplayKey, setIntroReplayKey] = useState(0);

  // Deterministic floating educational formulas positioned around the edges/background
  const formulas = useMemo<FloatingFormula[]>(() => {
    const coords = [
      { x: 7, y: 14 },
      { x: 82, y: 12 },
      { x: 14, y: 34 },
      { x: 86, y: 31 },
      { x: 5, y: 58 },
      { x: 90, y: 54 },
      { x: 11, y: 79 },
      { x: 81, y: 78 },
      { x: 26, y: 10 },
      { x: 67, y: 16 },
      { x: 24, y: 88 },
      { x: 68, y: 89 },
      { x: 48, y: 8 },
      { x: 49, y: 91 },
      { x: 19, y: 50 },
      { x: 76, y: 46 },
    ];
    const palette = [
      'text-blue-300/55 border-blue-400/20 bg-blue-950/25',
      'text-violet-300/55 border-violet-400/20 bg-violet-950/25',
      'text-cyan-300/55 border-cyan-400/20 bg-cyan-950/25',
    ];
    return EDUCATIONAL_SYMBOLS.map((text, idx) => ({
      id: idx,
      text,
      x: coords[idx % coords.length].x,
      y: coords[idx % coords.length].y,
      depth: idx % 3 === 0 ? 1.15 : idx % 2 === 0 ? 0.95 : 0.85,
      duration: 5.5 + (idx % 4) * 1.4,
      delay: (idx % 5) * 0.35,
      color: palette[idx % palette.length],
    }));
  }, []);

  useEffect(() => {
    if (phase !== 'intro') return;
    const timer = window.setTimeout(() => {
      setPhase('ready');
      onIntroFinished?.();
    }, 3150);
    return () => window.clearTimeout(timer);
  }, [phase, introReplayKey, onIntroFinished]);

  const handleSkipIntro = () => {
    setPhase('ready');
    onIntroFinished?.();
  };

  const handleReplayIntro = () => {
    setIntroReplayKey((k) => k + 1);
    setPhase('intro');
  };

  const letters = useMemo(() => WELCOME_LINE.split(''), []);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020617] text-white overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-blue-600/40"
      style={{ perspective: '1400px' }}
    >
      {/* Ambient Dark Navy + Electric Blue & Violet Gradient Layer */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 25%, rgba(37, 99, 235, 0.24) 0%, rgba(124, 58, 237, 0.16) 42%, rgba(2, 6, 23, 0.98) 85%)',
        }}
      />

      {/* Glowing Futuristic AI Orb in the Background */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  scale: phase === 'intro' ? [0.85, 1.08, 1] : [1, 1.05, 1],
                  opacity: phase === 'intro' ? [0.4, 0.9, 0.72] : [0.42, 0.55, 0.42],
                }
          }
          transition={{ duration: phase === 'intro' ? 3 : 8, repeat: phase === 'intro' ? 0 : Infinity, ease: 'easeInOut' }}
          className="relative w-[420px] h-[420px] sm:w-[580px] sm:h-[580px] flex items-center justify-center"
        >
          {/* Outer atmospheric bloom */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/35 via-indigo-500/25 to-violet-600/35 blur-[90px]" />

          {/* Generated Glowing Neural Orb */}
          <img
            src={aiNeuralOrbImg}
            alt=""
            aria-hidden="true"
            className="w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] object-cover rounded-full opacity-45 mix-blend-screen select-none"
            style={{
              maskImage: 'radial-gradient(circle, black 42%, transparent 74%)',
              WebkitMaskImage: 'radial-gradient(circle, black 42%, transparent 74%)',
            }}
          />

          {/* 3D Orbital Telemetry Rings */}
          <div
            className="absolute w-[310px] h-[310px] sm:w-[430px] sm:h-[430px] rounded-full border border-cyan-400/25 animate-perspective-orbit"
          />
          <div
            className="absolute w-[250px] h-[250px] sm:w-[340px] sm:h-[340px] rounded-full border border-violet-400/25 animate-perspective-orbit"
            style={{ animationDuration: '14s', animationDirection: 'reverse' }}
          />
        </motion.div>
      </div>

      {/* Floating Mathematical Formulas & Educational Symbols */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {formulas.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 18 }}
            animate={
              prefersReducedMotion
                ? { opacity: 0.45, y: 0 }
                : {
                    opacity: [0.22, 0.65, 0.22],
                    y: [0, -16, 0],
                    x: [0, item.id % 2 === 0 ? 8 : -8, 0],
                  }
            }
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border backdrop-blur-xs font-mono text-[10px] sm:text-xs font-semibold tracking-tight select-none ${
              idx < 6 ? 'block' : 'hidden sm:block'
            } ${item.color}`}
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `scale(${item.depth})`,
            }}
          >
            {item.text}
          </motion.div>
        ))}
      </div>

      {/* Top Navigation Chrome inside Full-Screen Login */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 flex items-center gap-2">
        {phase === 'intro' ? (
          <button
            type="button"
            onClick={handleSkipIntro}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip Intro</span>
          </button>
        ) : (
          !prefersReducedMotion && (
            <button
              type="button"
              onClick={handleReplayIntro}
              title="Replay opening animation"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 backdrop-blur-md text-slate-300 hover:text-white transition-all cursor-pointer"
              aria-label="Replay opening animation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md text-slate-200 hover:text-white transition-all cursor-pointer"
          aria-label="Close portal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* STAGE 1: CINEMATIC OPENING ANIMATION (3D Logo Zoom + Letter-by-Letter Welcome) */}
      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <motion.div
            key={`intro-${introReplayKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.18,
              rotateX: 12,
              filter: 'blur(8px)',
              transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
            }}
            className="relative z-20 flex flex-col items-center justify-center text-center w-full max-w-6xl px-4 select-none preserve-3d"
          >
            {/* 3D Zoom Animation on SJ Tutor AI Logo */}
            <motion.div
              initial={{ scale: 0.18, rotateX: 38, rotateY: -28, z: -260, opacity: 0 }}
              animate={{ scale: [0.18, 1.1, 1], rotateX: 0, rotateY: 0, z: 0, opacity: 1 }}
              transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-8"
            >
              <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-blue-500/45 via-cyan-400/30 to-violet-600/45 blur-2xl" />
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1.5 bg-gradient-to-tr from-blue-500 via-cyan-400 to-violet-500 shadow-[0_0_60px_rgba(37,99,235,0.65)]">
                <div className="w-full h-full rounded-[20px] bg-slate-950 overflow-hidden flex items-center justify-center">
                  <Logo className="w-full h-full" iconOnly noBorder />
                </div>
              </div>
            </motion.div>

            {/* Letter-by-Letter "WELCOME TO SJ TUTOR AI" Animation (Single Line) */}
            <h1
              aria-label={WELCOME_LINE}
              className="text-base sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-[0.08em] sm:tracking-[0.12em] text-white flex items-center justify-center whitespace-nowrap drop-shadow-[0_4px_24px_rgba(59,130,246,0.45)]"
            >
              {letters.map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 18, rotateX: -65, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: 0.72 + index * 0.048,
                    duration: 0.42,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={
                    char === ' '
                      ? 'w-1.5 sm:w-3 md:w-3.5 inline-block shrink-0'
                      : index >= WELCOME_LINE.indexOf('SJ')
                      ? 'inline-block shrink-0 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400'
                      : 'inline-block shrink-0 text-white'
                  }
                >
                  {char}
                </motion.span>
              ))}
            </h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.9, duration: 0.5 }}
              className="mt-5 flex items-center gap-2 text-xs sm:text-sm font-medium text-blue-200/80 tracking-wider uppercase"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Initializing Personalized Learning Workspace</span>
            </motion.div>
          </motion.div>
        ) : (
          /* STAGE 2: 3D PERSPECTIVE GLASSMORPHISM LOGIN PANEL */
          <motion.div
            key="login-panel"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: 0.9,
                    rotateX: 12,
                    rotateY: -10,
                    y: 34,
                  }
            }
            animate={{
              opacity: 1,
              scale: 1,
              rotateX: 0,
              rotateY: 0,
              y: 0,
            }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-20 w-full max-w-lg my-auto preserve-3d"
          >
            {/* Outer subtle electric-blue & violet glass rim */}
            <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-blue-400/50 via-violet-500/35 to-cyan-400/45 shadow-[0_28px_90px_-15px_rgba(37,99,235,0.52)]">
              <div className="relative rounded-[23px] bg-[#091128]/82 backdrop-blur-2xl p-6 sm:p-8 overflow-hidden border border-white/10">
                {/* Soft internal top luminescence */}
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-blue-500/20 blur-3xl pointer-events-none" />
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicLoginStage;
