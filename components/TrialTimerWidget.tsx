import React, { useState, useEffect } from 'react';
import { Zap, Crown, CheckCircle2, ChevronRight, X, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000; // 10 days in milliseconds

export interface TrialInfo {
  trialStartDate: number;
  trialEndDate: number;
  remainingMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isPro: boolean;
  percentRemaining: number;
  formattedTime: string;
}

export function calculateTrialInfo(userProfile?: UserProfile, uid?: string): TrialInfo {
  const isPro = Boolean(
    userProfile?.planType && 
    userProfile.planType !== 'Free'
  );

  const storageKey = `sjtutor_trial_start_${uid || 'guest'}`;
  let startMs = userProfile?.trialStartDate;

  if (!startMs) {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      startMs = parseInt(saved, 10);
    } else {
      startMs = Date.now();
      try {
        localStorage.setItem(storageKey, startMs.toString());
      } catch (e) {
        console.warn('Could not store trialStartDate in localStorage', e);
      }
    }
  }

  const endMs = startMs + TEN_DAYS_MS;
  const now = Date.now();
  const remainingMs = Math.max(0, endMs - now);
  const isExpired = remainingMs <= 0 && !isPro;

  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const percentRemaining = Math.min(100, Math.max(0, (remainingMs / TEN_DAYS_MS) * 100));

  let formattedTime = `${days}d ${hours}h ${minutes}m`;
  if (days === 0 && hours === 0) {
    formattedTime = `${minutes}m ${seconds}s`;
  } else if (days === 0) {
    formattedTime = `${hours}h ${minutes}m ${seconds}s`;
  }

  return {
    trialStartDate: startMs,
    trialEndDate: endMs,
    remainingMs,
    days,
    hours,
    minutes,
    seconds,
    isExpired,
    isPro,
    percentRemaining,
    formattedTime,
  };
}

interface TrialHeaderBadgeProps {
  userProfile?: UserProfile;
  uid?: string;
  onOpenUpgrade: () => void;
}

export const TrialHeaderBadge: React.FC<TrialHeaderBadgeProps> = ({
  userProfile,
  uid,
  onOpenUpgrade,
}) => {
  const [trial, setTrial] = useState<TrialInfo>(() => calculateTrialInfo(userProfile, uid));
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrial(calculateTrialInfo(userProfile, uid));
    }, 1000);
    return () => clearInterval(interval);
  }, [userProfile, uid]);

  const creditsDisplay = `${userProfile?.credits ?? 100} Credits`;

  if (trial.isPro) {
    return (
      <button 
        onClick={onOpenUpgrade}
        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs rounded-full shadow-sm hover:scale-105 transition-transform"
        title="Available Study Credits • Click to Add More"
      >
        <Zap className="w-3.5 h-3.5 fill-current text-slate-950" />
        <span className="font-mono font-extrabold">{creditsDisplay}</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          if (trial.isExpired) {
            onOpenUpgrade();
          } else {
            setShowModal(true);
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${
          trial.isExpired
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            : trial.days <= 2
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
        }`}
        title={trial.isExpired ? "Click to Upgrade Credits" : `10-Day Free Trial (${trial.formattedTime} remaining) • Click for details`}
      >
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <span className="font-mono font-extrabold">
          {creditsDisplay}
        </span>
      </button>

      {/* Trial Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header pattern */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white text-center relative overflow-hidden">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-3">
                <Sparkles className="w-3.5 h-3.5" /> 10-Day Full Access Trial
              </div>

              <h3 className="text-2xl font-black tracking-tight mb-1">
                {trial.isExpired ? '10-Day Trial Finished' : 'Free Trial Status'}
              </h3>
              <p className="text-xs text-slate-300">
                {trial.isExpired
                  ? 'You have 100 Free Credits active on your Free Tier! Upgrade anytime for unlimited access.'
                  : 'Enjoy unlimited access to all AI features for 10 days, followed by 100 Free Credits.'}
              </p>

              {/* Countdown Grid */}
              <div className="grid grid-cols-4 gap-2 mt-5 max-w-xs mx-auto">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5">
                  <span className="block text-2xl font-black font-mono text-emerald-400">
                    {String(trial.days).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Days</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5">
                  <span className="block text-2xl font-black font-mono text-emerald-400">
                    {String(trial.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Hours</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5">
                  <span className="block text-2xl font-black font-mono text-emerald-400">
                    {String(trial.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Mins</span>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5">
                  <span className="block text-2xl font-black font-mono text-emerald-400">
                    {String(trial.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Secs</span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  <span>Trial Progress</span>
                  <span>{Math.round(100 - trial.percentRemaining)}% Used</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${trial.percentRemaining}%` }}
                  />
                </div>
              </div>

              {/* Included Perks */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
                <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Your 10-Day Trial & Free Tier Benefits:
                </p>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Unlimited AI Tutor & Homework Helper during 10 days</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>100 Free Credits awarded automatically after trial ends</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Custom Quiz, Flashcard & Summary Generators</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Private 1-on-1 & Group Study Rooms with WebRTC Voice/Video</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    onOpenUpgrade();
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition"
                >
                  <Crown className="w-4 h-4 fill-current" />
                  Upgrade Plan Now <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface TrialBannerCardProps {
  userProfile?: UserProfile;
  uid?: string;
  onOpenUpgrade: () => void;
}

export const TrialBannerCard: React.FC<TrialBannerCardProps> = ({
  userProfile,
  uid,
  onOpenUpgrade,
}) => {
  const [trial, setTrial] = useState<TrialInfo>(() => calculateTrialInfo(userProfile, uid));

  useEffect(() => {
    const interval = setInterval(() => {
      setTrial(calculateTrialInfo(userProfile, uid));
    }, 1000);
    return () => clearInterval(interval);
  }, [userProfile, uid]);

  if (trial.isPro || trial.isExpired) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 md:p-6 text-white shadow-xl border border-indigo-500/30 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{trial.isExpired ? '100 Free Credits Active' : '10-Day Free Trial Active'}</span>
          </div>

          <h3 className="text-xl md:text-2xl font-black tracking-tight">
            {trial.isExpired
              ? 'Your 10-day trial concluded — 100 Free Credits awarded!'
              : `You have ${trial.days} days and ${trial.hours} hours left in your free trial`}
          </h3>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
            {trial.isExpired
              ? 'You have received 100 Free Credits to continue generating notes, quizzes, and asking questions. Upgrade to Premium anytime for unlimited access.'
              : 'Explore all AI features with unlimited access for 10 days. After your trial, you will get 100 Free Credits on the Free Plan!'}
          </p>

          {/* Progress bar */}
          <div className="pt-1 max-w-md">
            <div className="flex justify-between text-[11px] text-slate-400 font-bold mb-1">
              <span>Trial Time Left</span>
              <span>{Math.round(trial.percentRemaining)}%</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-1000"
                style={{ width: `${trial.percentRemaining}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side Countdown Boxes + CTA */}
        <div className="flex flex-col items-center md:items-end justify-center gap-3 shrink-0">
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 max-w-full overflow-x-auto py-1">
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 text-center min-w-[46px] xs:min-w-[52px] sm:min-w-[58px]">
              <span className="block text-base xs:text-lg sm:text-xl font-black font-mono text-emerald-400">{String(trial.days).padStart(2, '0')}</span>
              <span className="text-[8px] xs:text-[9px] uppercase font-bold text-slate-400">Days</span>
            </div>
            <span className="text-slate-500 font-bold text-sm sm:text-lg select-none">:</span>
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 text-center min-w-[46px] xs:min-w-[52px] sm:min-w-[58px]">
              <span className="block text-base xs:text-lg sm:text-xl font-black font-mono text-emerald-400">{String(trial.hours).padStart(2, '0')}</span>
              <span className="text-[8px] xs:text-[9px] uppercase font-bold text-slate-400">Hrs</span>
            </div>
            <span className="text-slate-500 font-bold text-sm sm:text-lg select-none">:</span>
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 text-center min-w-[46px] xs:min-w-[52px] sm:min-w-[58px]">
              <span className="block text-base xs:text-lg sm:text-xl font-black font-mono text-emerald-400">{String(trial.minutes).padStart(2, '0')}</span>
              <span className="text-[8px] xs:text-[9px] uppercase font-bold text-slate-400">Min</span>
            </div>
            <span className="text-slate-500 font-bold text-sm sm:text-lg select-none">:</span>
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 text-center min-w-[46px] xs:min-w-[52px] sm:min-w-[58px]">
              <span className="block text-base xs:text-lg sm:text-xl font-black font-mono text-emerald-400">{String(trial.seconds).padStart(2, '0')}</span>
              <span className="text-[8px] xs:text-[9px] uppercase font-bold text-slate-400">Sec</span>
            </div>
          </div>

          <button
            onClick={onOpenUpgrade}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition hover:scale-102"
          >
            <Crown className="w-4 h-4 fill-current" />
            {trial.isExpired ? 'Upgrade Now' : 'Lock In Premium Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};
