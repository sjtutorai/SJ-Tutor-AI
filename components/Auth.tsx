import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sigma,
  Atom,
  BookOpen,
  Compass,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { SignUpFlow } from './auth/SignUpFlow';
import { LoginFlow } from './auth/LoginFlow';
import { AccountDetectorWidget } from './auth/AccountDetectorWidget';
import { BigScreenSignUpPage } from './auth/BigScreenSignUpPage';
import Logo from './Logo';
import { getDeviceRegisteredUser, saveDeviceRegisteredUser } from '../utils/registrationDetection';
import type { UserProfile } from '../types';
import {
  LetterReveal,
  GradientOrbsBackdrop,
  FloatingFormulasField,
  CircularImageReveal,
  ResilientImage,
  CursorSpotlight,
} from './ui/MotionPrimitives';
import authCinematicArtwork from '../src/assets/images/auth_cinematic_education_1794584200004.jpg';

const INTRO_SESSION_KEY = 'sjtutor_cinematic_intro_seen';

interface AuthProps {
  onSignUpSuccess?: (data?: Partial<UserProfile>) => void;
  onClose: () => void;
  onCountryDetected?: (country: string) => void;
  initialCountry?: string | null;
  initialMode?: 'signin' | 'signup';
  prefilledIdentifier?: string;
}

const Auth: React.FC<AuthProps> = ({
  onSignUpSuccess,
  onClose,
  initialMode,
  prefilledIdentifier: propPrefilledIdentifier = '',
}) => {
  const prefersReduced = useReducedMotion();
  const deviceUser = getDeviceRegisteredUser();
  const defaultMode: 'signin' | 'signup' = initialMode
    ? initialMode
    : deviceUser.hasRegistered
    ? 'signin'
    : 'signup';

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(defaultMode);
  const [prefilledIdentifier, setPrefilledIdentifier] = useState<string>(propPrefilledIdentifier);
  const [showDetector, setShowDetector] = useState(false);
  const [bigScreenIdentity, setBigScreenIdentity] = useState<any | null>(null);

  // Full-screen cinematic opening plays ONLY once per session on initial auth entry
  const [showCinematicIntro, setShowCinematicIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(INTRO_SESSION_KEY) !== '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!showCinematicIntro) return;
    if (prefersReduced) {
      setShowCinematicIntro(false);
      try {
        sessionStorage.setItem(INTRO_SESSION_KEY, '1');
      } catch { /* ignore storage unavailable */ }
      return;
    }
    const timer = setTimeout(() => {
      setShowCinematicIntro(false);
      try {
        sessionStorage.setItem(INTRO_SESSION_KEY, '1');
      } catch { /* ignore storage unavailable */ }
    }, 1550);
    return () => clearTimeout(timer);
  }, [showCinematicIntro, prefersReduced]);

  const dismissIntro = () => {
    setShowCinematicIntro(false);
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch { /* ignore storage unavailable */ }
  };

  // Sync URL for direct link bookmarking / routing
  useEffect(() => {
    const originalPath = window.location.pathname;
    const targetPath = authMode === 'signup' ? '/signup' : '/login';
    window.history.replaceState(null, '', targetPath);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.history.replaceState(
        null,
        '',
        originalPath === '/login' || originalPath === '/signup' ? '/' : originalPath
      );
    };
  }, [authMode, onClose]);

  const handleSuccess = (userData: any) => {
    if (userData) {
      saveDeviceRegisteredUser({
        email: userData.email,
        name: userData.displayName || userData.firstName,
        sjTutorId: userData.sjTutorId,
        username: userData.username,
      });
    }
    if (onSignUpSuccess) {
      onSignUpSuccess(userData);
    }
    onClose();
  };

  const handleSelectActionFromDetector = (mode: 'signin' | 'signup', identifier?: string) => {
    setAuthMode(mode);
    if (identifier) {
      setPrefilledIdentifier(identifier);
    }
    setShowDetector(false);
  };

  // Redirect to dedicated full-screen onboarding page when user begins Sign Up flow
  if (bigScreenIdentity) {
    return (
      <BigScreenSignUpPage
        authIdentity={bigScreenIdentity}
        onSuccess={handleSuccess}
        onCancel={() => setBigScreenIdentity(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#04091E] text-slate-100 overflow-y-auto overflow-x-hidden">
      {/* Ambient Dark Navy + Electric Blue/Violet Backdrop */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(rgba(59,130,246,0.22) 1px, transparent 1px), radial-gradient(rgba(124,58,237,0.18) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            backgroundPosition: '0 0, 18px 18px',
          }}
        />
        <GradientOrbsBackdrop />
        <FloatingFormulasField />
      </div>
      <CursorSpotlight />

      {/* ══════════════════════════════════════════════════════════
          CINEMATIC OPENING SEQUENCE (INITIAL VISIT PER SESSION)
         ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCinematicIntro && (
          <motion.div
            key="cinematic-auth-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[70] bg-[#04091E] flex flex-col items-center justify-center px-6 overflow-hidden select-none"
          >
            {/* Glowing Futuristic AI Orb */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.65, 1.15, 1], opacity: [0, 0.9, 0.75] }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-blue-600/35 via-indigo-500/30 to-violet-600/35 blur-[90px]"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
              className="absolute w-72 h-72 rounded-full border border-blue-400/20"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
              className="absolute w-96 h-96 rounded-full border border-violet-400/15 border-dashed"
            />

            <FloatingFormulasField />

            {/* 3D Logo Zoom Entrance */}
            <motion.div
              initial={{ scale: 0.35, opacity: 0, rotateX: 28, rotateY: -18 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0, rotateY: 0 }}
              transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformStyle: 'preserve-3d', perspective: 900 }}
              className="relative z-10 mb-7"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-1.5 bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 shadow-[0_0_65px_rgba(37,99,235,0.6)]">
                <div className="w-full h-full rounded-[20px] bg-slate-950 flex items-center justify-center overflow-hidden">
                  <Logo className="w-full h-full" iconOnly noBorder />
                </div>
              </div>
            </motion.div>

            {/* Letter-by-letter Cinematic Welcome */}
            <div className="relative z-10 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-400 mb-3">
                Intelligent Study Portal
              </p>
              <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                <LetterReveal text="WELCOME TO SJ TUTOR AI" delay={0.18} stagger={0.025} />
              </h1>
            </div>

            <button
              type="button"
              onClick={dismissIntro}
              className="relative z-10 mt-10 text-xs font-semibold text-slate-400 hover:text-white px-4 py-2 rounded-xl border border-white/10 hover:border-blue-400/40 transition-colors cursor-pointer"
            >
              Skip intro
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Floating Return Control */}
      <button
        onClick={onClose}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[60] flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B1437]/85 hover:bg-[#131F4E] text-slate-300 hover:text-white border border-blue-400/20 backdrop-blur-md shadow-lg transition-all cursor-pointer text-xs font-semibold"
        aria-label="Close portal"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Back to Home</span>
      </button>

      {/* ══════════════════════════════════════════════════════════
          FULL-SCREEN RESPONSIVE SPLIT-SCREEN AUTH WORKSPACE
         ══════════════════════════════════════════════════════════ */}
      <div className="relative z-10 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* ── LEFT COLUMN: CINEMATIC BRAND & ARTWORK SHOWCASE ── */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-6 text-center lg:text-left"
          >
            {/* Brand Header */}
            <div className="inline-flex items-center gap-3 mx-auto lg:mx-0">
              <motion.div
                initial={prefersReduced ? false : { scale: 0.6, rotateY: -20 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-blue-500 to-violet-500 shadow-[0_0_24px_rgba(37,99,235,0.45)]"
              >
                <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden">
                  <Logo className="w-full h-full" iconOnly noBorder />
                </div>
              </motion.div>
              <div className="text-left">
                <div className="font-display text-xl font-extrabold tracking-tight text-white">
                  SJ Tutor AI
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">
                  Identity Portal
                </div>
              </div>
            </div>

            {/* Dynamic Heading */}
            <div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold tracking-tight text-white leading-[1.1]">
                {authMode === 'signin' ? (
                  <LetterReveal text="Welcome Back, Learner!" stagger={0.02} />
                ) : (
                  <LetterReveal text="Begin Your Smart Study Journey" stagger={0.018} />
                )}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-md mx-auto lg:mx-0">
                {authMode === 'signin'
                  ? 'Resume your study streaks, interactive AI tutoring sessions, smart revision notes, and exam mastery tracker.'
                  : 'Create your personalized student identity to unlock Class 6–12 mastery, adaptive quizzes, and instant doubt resolution.'}
              </p>
            </div>

            {/* Generated 3D Glass Educational Artwork with Floating Symbols */}
            <div className="relative max-w-sm mx-auto lg:mx-0 hidden sm:block">
              <CircularImageReveal delay={0.15} className="relative rounded-3xl overflow-hidden border border-blue-400/25 shadow-[0_24px_60px_rgba(37,99,235,0.28)]">
                <ResilientImage
                  src={authCinematicArtwork}
                  alt="Futuristic 3D educational geometric polyhedra and orbital atom rings"
                  className="w-full aspect-[4/3] object-cover"
                  fallbackTitle="SJ Tutor AI Study Universe"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04091E]/85 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Encrypted Student Workspace
                  </span>
                  <span className="font-mono text-[11px] text-violet-300">f(x) = ∫ e⁻ˣ dx</span>
                </div>
              </CircularImageReveal>

              {/* Subtle floating educational subject icons around artwork */}
              <motion.div
                animate={prefersReduced ? undefined : { y: [-5, 5, -5] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className="hidden xl:flex absolute -top-4 -right-4 w-11 h-11 rounded-2xl bg-[#0D163A]/90 border border-blue-400/30 items-center justify-center text-blue-400 shadow-lg backdrop-blur-md"
              >
                <Sigma className="w-5 h-5" />
              </motion.div>
              <motion.div
                animate={prefersReduced ? undefined : { y: [5, -5, 5] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
                className="hidden xl:flex absolute -bottom-4 -left-4 w-11 h-11 rounded-2xl bg-[#0D163A]/90 border border-violet-400/30 items-center justify-center text-violet-400 shadow-lg backdrop-blur-md"
              >
                <Atom className="w-5 h-5" />
              </motion.div>
            </div>

            {/* Clean Capabilities Line */}
            <div className="hidden lg:flex items-center gap-5 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                Classes 6–12 & Beyond
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-violet-400" />
                Instant Google & Student ID Access
              </span>
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN: 3D GLASSMORPHISM AUTH CARD ── */}
          <div className="lg:col-span-7 flex justify-center lg:justify-end" style={{ perspective: 1200 }}>
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, rotateY: 9, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl bg-[#0B1437]/82 backdrop-blur-2xl rounded-3xl border border-blue-400/20 shadow-[0_28px_80px_rgba(3,7,18,0.78)] p-6 sm:p-8 overflow-hidden"
            >
              {/* Soft Top Edge Accent Glow */}
              <div className="pointer-events-none absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />

              {/* Device Auto-Detection Notice */}
              <div className="mb-4">
                {deviceUser.hasRegistered ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 truncate">
                        Recognized learner:{' '}
                        <strong className="text-white font-semibold">
                          {deviceUser.name || deviceUser.email || deviceUser.sjTutorId}
                        </strong>
                      </span>
                    </div>
                    {authMode !== 'signin' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('signin')}
                        className="text-[11px] font-bold text-emerald-400 hover:underline shrink-0 cursor-pointer"
                      >
                        Switch to Log In
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-slate-200 truncate">
                        New learner on this device — create your free student profile
                      </span>
                    </div>
                    {authMode !== 'signup' && (
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className="text-[11px] font-bold text-blue-400 hover:underline shrink-0 cursor-pointer"
                      >
                        Sign Up
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Account Detector Toggle */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowDetector(!showDetector)}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-slate-300 bg-[#070E28]/80 hover:bg-[#101C48] rounded-xl transition-all border border-blue-400/15 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Not sure if you&apos;re registered? <strong className="text-white">Check Account</strong>
                    </span>
                  </span>
                  {showDetector ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                <AnimatePresence>
                  {showDetector && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-2"
                    >
                      <AccountDetectorWidget
                        variant="landing"
                        initialIdentifier={prefilledIdentifier}
                        onSelectAction={handleSelectActionFromDetector}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex p-1 bg-[#070E28] rounded-xl border border-blue-400/20">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`px-6 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      authMode === 'signin'
                        ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-blue-600/25'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`px-6 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-blue-600/25'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              {/* Dynamic Auth Flow Content */}
              <AnimatePresence mode="wait">
                {authMode === 'signup' ? (
                  <motion.div
                    key="signup-flow-pane"
                    initial={prefersReduced ? false : { opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={prefersReduced ? undefined : { opacity: 0, x: -18 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <SignUpFlow
                      onSuccess={handleSuccess}
                      onSwitchToLogin={(email) => {
                        if (email) setPrefilledIdentifier(email);
                        setAuthMode('signin');
                      }}
                      prefilledIdentifier={prefilledIdentifier}
                      onRedirectToBigScreen={(identity) => setBigScreenIdentity(identity)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="login-flow-pane"
                    initial={prefersReduced ? false : { opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={prefersReduced ? undefined : { opacity: 0, x: 18 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <LoginFlow
                      onSuccess={handleSuccess}
                      onSwitchToSignUp={(email) => {
                        if (email) setPrefilledIdentifier(email);
                        setAuthMode('signup');
                      }}
                      prefilledIdentifier={prefilledIdentifier}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
