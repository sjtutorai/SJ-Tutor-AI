
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Target, Award, Home, RotateCcw, Eye, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizResultModalProps {
  isOpen: boolean;
  score: number;
  total: number;
  onRetry: () => void;
  onDashboard: () => void;
  onViewSolutions?: () => void;
}

const QuizResultModal: React.FC<QuizResultModalProps> = ({
  isOpen,
  score,
  total,
  onRetry,
  onDashboard,
  onViewSolutions
}) => {
  const percentage = Math.round((score / total) * 100);
  
  useEffect(() => {
    if (isOpen && percentage >= 80) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

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

      // Success sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});

      return () => clearInterval(interval);
    }
  }, [isOpen, percentage]);

  const getFeedback = () => {
    if (percentage >= 80) return {
      title: "Excellent Work! 🎉",
      message: "You've mastered this topic! Your dedication is paying off.",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      icon: Trophy
    };
    if (percentage >= 50) return {
      title: "Good Job! 👍",
      message: "Keep improving! You're on the right track to excellence.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      icon: Award
    };
    return {
      title: "Keep Practicing 💪",
      message: "Don't give up! Every mistake is a learning opportunity.",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: Target
    };
  };

  const feedback = getFeedback();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className={`p-8 text-center ${feedback.bgColor}`}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-white shadow-xl border-4 border-white`}
              >
                <feedback.icon className={`w-12 h-12 ${feedback.color}`} />
              </motion.div>
              
              <h2 className={`text-3xl font-black mb-2 ${feedback.color}`}>
                {feedback.title}
              </h2>
              <p className="text-slate-600 font-medium">
                {feedback.message}
              </p>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-slate-800">{score}</span>
                    <span className="text-xl font-bold text-slate-300">/ {total}</span>
                  </div>
                </div>
                
                <div className="w-px h-12 bg-slate-100" />

                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-black text-slate-800">{percentage}%</span>
                  </div>
                </div>
              </div>

              {/* Stars for fun */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star 
                    key={s} 
                    className={`w-6 h-6 ${s <= Math.ceil(percentage / 20) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onRetry}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Retry
                  </button>
                  <button
                    onClick={onDashboard}
                    className="flex items-center justify-center gap-2 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                  >
                    <Home className="w-5 h-5" />
                    Dashboard
                  </button>
                </div>
                
                {onViewSolutions && (
                  <button
                    onClick={onViewSolutions}
                    className="flex items-center justify-center gap-2 py-4 border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <Eye className="w-5 h-5" />
                    View Solutions
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuizResultModal;
