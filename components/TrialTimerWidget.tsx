import React, { useState } from 'react';
import { Zap, Crown, CheckCircle2, ChevronRight, X, Sparkles, Coins, Flame, BookOpen, BrainCircuit, MessageCircle } from 'lucide-react';
import { UserProfile } from '../types';

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

export function calculateTrialInfo(userProfile?: UserProfile): TrialInfo {
  const isPro = Boolean(
    userProfile?.planType && 
    userProfile.planType !== 'Free'
  );

  return {
    trialStartDate: Date.now(),
    trialEndDate: Date.now(),
    remainingMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
    isPro,
    percentRemaining: 0,
    formattedTime: "0d",
  };
}

interface TrialHeaderBadgeProps {
  userProfile?: UserProfile;
  uid?: string;
  onOpenUpgrade: () => void;
}

export const TrialHeaderBadge: React.FC<TrialHeaderBadgeProps> = ({
  userProfile,
  onOpenUpgrade,
}) => {
  const [showModal, setShowModal] = useState(false);
  const credits = userProfile?.credits ?? 100;
  const isPro = Boolean(userProfile?.planType && userProfile.planType !== 'Free');

  // Color dynamics based on credit level
  const isLow = credits < 15;
  const isModerate = credits >= 15 && credits < 50;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm border ${
          isPro
            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black border-amber-300 hover:scale-105'
            : isLow
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 animate-pulse'
            : isModerate
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
        }`}
        title={`You have ${credits} credits remaining. Click for breakdown & recharge options.`}
      >
        {isPro ? (
          <Crown className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Zap className={`w-3.5 h-3.5 ${isLow ? 'text-rose-500 fill-rose-500' : 'text-amber-500 fill-amber-500'}`} />
        )}
        <span className="font-mono font-extrabold">
          {isPro ? `${userProfile?.planType || 'Pro'} • ${credits} Cr` : `${credits} Credits`}
        </span>
      </button>

      {/* Credit & Usage Breakdown Modal */}
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

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 mb-3">
                <Coins className="w-3.5 h-3.5" /> Credit Usage & Balance
              </div>

              <div className="my-2">
                <span className="text-4xl font-black font-mono text-amber-400 tracking-tight">
                  {credits}
                </span>
                <span className="text-sm font-semibold text-slate-300 ml-1.5">Credits Available</span>
              </div>

              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                Credits are deducted as you use AI features. Keep your streak active to earn free bonus credits daily!
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              {/* Credit Rates Breakdown */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
                <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  AI Generation Credit Costs:
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-medium"><MessageCircle className="w-3.5 h-3.5 text-blue-500" /> AI Tutor Chat</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">1 Cr</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-medium"><BookOpen className="w-3.5 h-3.5 text-emerald-500" /> Summary</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">5 Cr</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-medium"><Sparkles className="w-3.5 h-3.5 text-purple-500" /> Homework Solver</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">5 Cr</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 font-medium"><BrainCircuit className="w-3.5 h-3.5 text-amber-500" /> Quiz Generator</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">5 Cr</span>
                  </div>
                </div>
              </div>

              {/* How to Earn More Credits */}
              <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                <p className="font-bold flex items-center gap-1 text-amber-900 dark:text-amber-100">
                  <Flame className="w-4 h-4 text-amber-500" /> Earn Free Credits:
                </p>
                <ul className="space-y-1 text-[11px] font-medium text-amber-800/90 dark:text-amber-200/90">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Daily Study Streaks reward up to <strong>+500 Credits</strong> at milestones</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Score 75%+ on Quizzes to earn <strong>+50 Bonus Credits</strong></span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    onOpenUpgrade();
                  }}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Crown className="w-4 h-4 fill-current" />
                  Recharge / Upgrade Credits <ChevronRight className="w-4 h-4" />
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
  onOpenUpgrade,
}) => {
  const credits = userProfile?.credits ?? 100;
  const isPro = Boolean(userProfile?.planType && userProfile.planType !== 'Free');

  // Only show if user has low credits or is on Free tier
  if (isPro && credits > 50) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 md:p-6 text-white shadow-xl border border-indigo-500/30 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -right-10 -top-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold border border-amber-500/30">
            <Zap className="w-3.5 h-3.5 fill-amber-300" />
            <span>{credits} AI Credits Available</span>
          </div>

          <h3 className="text-xl md:text-2xl font-black tracking-tight">
            {credits < 15
              ? `Running Low on Credits (${credits} Remaining)`
              : `You have ${credits} Credits on your Account`}
          </h3>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
            AI operations use credits to generate summaries, solve problems, and create quizzes. Maintain daily study streaks or recharge credits to never get interrupted.
          </p>
        </div>

        {/* Right Side Balance Box + CTA */}
        <div className="flex flex-col items-center md:items-end justify-center gap-3 shrink-0">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl px-5 py-3 text-center min-w-[140px]">
            <span className="block text-2xl font-black font-mono text-amber-400">{credits}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400">Current Balance</span>
          </div>

          <button
            onClick={onOpenUpgrade}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition hover:scale-102 cursor-pointer"
          >
            <Crown className="w-4 h-4 fill-current" />
            Get More Credits
          </button>
        </div>
      </div>
    </div>
  );
};
