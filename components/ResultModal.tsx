
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, RefreshCw, LayoutDashboard, Eye, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResultModalProps {
  isOpen: boolean;
  score: number;
  totalQuestions: number;
  onRetry: () => void;
  onDashboard: () => void;
  onViewSolutions: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  score,
  totalQuestions,
  onRetry,
  onDashboard,
  onViewSolutions
}) => {
  const percentage = Math.round((score / totalQuestions) * 100);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getFeedback = () => {
    if (percentage >= 80) {
      return {
        title: "Excellent Work! 🎉",
        message: "You've mastered this topic! Your dedication is truly paying off.",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        icon: Trophy,
        emoji: "🎉",
        sound: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3"
      };
    } else if (percentage >= 50) {
      return {
        title: "Good Job! 👍",
        message: "You're on the right track! Keep improving and you'll be an expert soon.",
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        icon: Star,
        emoji: "👍",
        sound: "https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3"
      };
    } else {
      return {
        title: "Keep Practicing 💪",
        message: "Don't give up! Every mistake is a learning opportunity. You can do it!",
        color: "text-rose-600",
        bgColor: "bg-rose-50",
        icon: AlertCircle,
        emoji: "💪",
        sound: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3"
      };
    }
  };

  const feedback = getFeedback();

  useEffect(() => {
    if (isOpen) {
      // Play sound
      if (feedback.sound) {
        audioRef.current = new Audio(feedback.sound);
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
      }

      // Trigger confetti for high scores
      if (percentage >= 80) {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isOpen, percentage, feedback.sound]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Top Pattern */}
            <div className={`h-32 ${feedback.bgColor} dark:bg-slate-700/50 flex items-center justify-center relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-20 h-20 bg-current rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-current rounded-full translate-x-1/2 translate-y-1/2" />
              </div>
              
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className={`w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center ${feedback.color}`}
              >
                <feedback.icon className="w-10 h-10" />
              </motion.div>

              {percentage >= 80 && (
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute top-4 right-4 text-2xl"
                >
                  ✨
                </motion.div>
              )}
            </div>

            <div className="p-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className={`text-2xl font-black mb-2 ${feedback.color}`}>
                  {feedback.title}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                  {feedback.message}
                </p>
              </motion.div>

              <div className="flex items-center justify-center gap-8 mb-10">
                <div className="text-center">
                  <div className="text-4xl font-black text-slate-900 dark:text-white mb-1">
                    {score}<span className="text-xl text-slate-300 dark:text-slate-600 font-normal">/{totalQuestions}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Score</div>
                </div>
                
                <div className="w-px h-12 bg-slate-100 dark:bg-slate-700" />

                <div className="text-center">
                  <div className={`text-4xl font-black mb-1 ${feedback.color}`}>
                    {percentage}%
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Accuracy</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={onRetry}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold transition-all hover:shadow-lg hover:shadow-primary-500/20 flex items-center justify-center gap-2 group"
                >
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  Retry Quiz
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onViewSolutions}
                    className="py-3.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Solutions
                  </button>
                  <button
                    onClick={onDashboard}
                    className="py-3.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Accent */}
            <div className={`h-1.5 w-full ${feedback.bgColor.replace('bg-', 'bg-').replace('50', '500')}`} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ResultModal;
