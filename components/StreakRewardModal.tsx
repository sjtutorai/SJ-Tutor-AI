import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Zap, 
  Flame, 
  CheckCircle2, 
  Share2, 
  ArrowRight, 
  X,
  Gift
} from 'lucide-react';
import { STREAK_MILESTONES, StreakMilestone } from './StreakContext';

interface StreakRewardModalProps {
  days: number;
  onClose: () => void;
  onClaimReward?: (days: number, credits: number) => void;
  userCredits?: number;
}

export const StreakRewardModal: React.FC<StreakRewardModalProps> = ({
  days,
  onClose,
  onClaimReward,
  userCredits = 100,
}) => {
  const [claimed, setClaimed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Find milestone metadata
  const milestone: StreakMilestone = STREAK_MILESTONES.find((m) => m.days === days) || {
    days,
    title: `${days}-Day Learning Legend`,
    rewardCredits: Math.max(10, Math.floor(days * 3.5)),
    badge: days >= 100 ? '⚡' : days >= 30 ? '💎' : days >= 14 ? '🥇' : '🥈',
    color: 'from-amber-500 to-orange-600',
    description: `Achieved an extraordinary ${days}-day continuous learning streak!`,
  };

  // Trigger high-energy festive confetti burst on mount
  useEffect(() => {
    try {
      // Immediate burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#3b82f6'],
      });

      // Secondary side cannons
      const end = Date.now() + 1.8 * 1000;
      const interval: any = setInterval(() => {
        if (Date.now() > end) {
          return clearInterval(interval);
        }
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: {
            x: Math.random(),
            y: Math.random() * 0.4 + 0.1,
          },
          colors: ['#fbbf24', '#f97316', '#34d399', '#a78bfa'],
        });
      }, 300);

      // Play chime
      playCelebrationSound();

      return () => clearInterval(interval);
    } catch (e) {
      console.warn('Confetti effect fallback:', e);
    }
  }, [days]);

  // Audio synthesizer chime
  const playCelebrationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const freqs = [440, 554.37, 659.25, 880, 1108.73]; // A Major arpeggio
      freqs.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.08);
        osc.stop(audioCtx.currentTime + i * 0.08 + 0.45);
      });
    } catch {
      // ignore
    }
  };

  const handleClaim = () => {
    setClaimed(true);
    if (onClaimReward) {
      onClaimReward(days, milestone.rewardCredits);
    }
    // Mini confetti burst on claim
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#fbbf24', '#38bdf8'],
      });
    } catch (e) {
      console.warn('Mini confetti error:', e);
    }
    
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleShare = async () => {
    const text = `🔥 I just achieved a ${days}-Day Learning Streak on SJ Tutor AI! 🚀 Total Milestone Reward: +${milestone.rewardCredits} Credits!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${days}-Day Learning Streak Milestone!`,
          text,
          url: window.location.href,
        });
      } catch (e) {
        console.warn('Share error:', e);
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="streak-reward-modal-backdrop"
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
      >
        <motion.div
          id="streak-reward-modal-card"
          initial={{ opacity: 0, scale: 0.85, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-amber-300/80 dark:border-amber-500/40 overflow-hidden text-center"
        >
          {/* Top Banner with Radiant Fire Gradient */}
          <div className="relative pt-10 pb-6 px-6 bg-gradient-to-b from-amber-500/20 via-orange-500/10 to-transparent overflow-hidden">
            {/* Background Glow Orbs */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full blur-3xl opacity-30 pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Milestone Badge in Glowing Outer Ring */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/60"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/40 flex items-center justify-center border-2 border-amber-200 text-3xl"
              >
                <span>{milestone.badge}</span>
                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border-2 border-white text-xs font-black text-amber-400">
                  🔥
                </span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4"
            >
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Milestone Unlocked!
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {days}-Day Streak!
              </h2>
              <p className="mt-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
                {milestone.title}
              </p>
            </motion.div>
          </div>

          {/* Body Content */}
          <div className="px-6 pb-6 space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {milestone.description} Keep up the continuous study dedication!
            </p>

            {/* Reward Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Gift className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Milestone Reward
                  </div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    Bonus Learning Credits
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Current: {userCredits} cr → New: {userCredits + milestone.rewardCredits} cr
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700 shadow-xs font-black text-lg text-emerald-600 dark:text-emerald-400">
                <Zap className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                <span>+{milestone.rewardCredits}</span>
              </div>
            </motion.div>

            {/* Permanent Protection Reminder */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Streak never resets to 0 • Permanent scholar progress</span>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                id="claim-streak-reward-btn"
                onClick={handleClaim}
                disabled={claimed}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                {claimed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>Reward Added to Balance!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Claim +{milestone.rewardCredits} Credits & Continue</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{copySuccess ? 'Copied to Clipboard! 🎉' : 'Share Milestone Achievement'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StreakRewardModal;
