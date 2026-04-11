import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './components/ui/button';
import { Trophy, ThumbsUp, Target, RotateCcw, LayoutDashboard } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizResultModalProps {
  isOpen: boolean;
  score: number;
  total: number;
  onRetry: () => void;
  onDashboard: () => void;
}

export const QuizResultModal: React.FC<QuizResultModalProps> = ({ isOpen, score, total, onRetry, onDashboard }) => {
  const percentage = Math.round((score / total) * 100);
  
  useEffect(() => {
    if (isOpen && percentage >= 80) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

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

      return () => clearInterval(interval);
    }
  }, [isOpen, percentage]);

  const getFeedback = () => {
    if (percentage >= 80) return { 
      title: "Excellent Work! 🎉", 
      color: "text-green-600", 
      bg: "bg-green-100", 
      icon: <Trophy className="w-12 h-12" />,
      desc: "You've mastered this topic! Keep up the amazing momentum."
    };
    if (percentage >= 50) return { 
      title: "Good Job! 👍", 
      color: "text-blue-600", 
      bg: "bg-blue-100", 
      icon: <ThumbsUp className="w-12 h-12" />,
      desc: "Solid performance! A bit more practice and you'll be at the top."
    };
    return { 
      title: "Keep Practicing 💪", 
      color: "text-orange-600", 
      bg: "bg-orange-100", 
      icon: <Target className="w-12 h-12" />,
      desc: "Don't give up! Every mistake is a learning opportunity. You can do it!"
    };
  };

  const feedback = getFeedback();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center overflow-hidden"
          >
            <div className={`mx-auto w-24 h-24 ${feedback.bg} ${feedback.color} rounded-full flex items-center justify-center mb-6`}>
              {feedback.icon}
            </div>
            
            <h3 className={`text-3xl font-bold mb-2 ${feedback.color}`}>{feedback.title}</h3>
            
            <div className="flex justify-center items-baseline gap-2 mb-4">
              <span className="text-5xl font-black text-slate-900">{score}</span>
              <span className="text-2xl text-slate-400">/ {total}</span>
            </div>
            
            <div className="w-full bg-slate-100 h-3 rounded-full mb-6 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`h-full ${percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`}
              />
            </div>

            <p className="text-slate-600 mb-8 leading-relaxed">
              {feedback.desc}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button onClick={onRetry} variant="outline" className="h-12 rounded-xl border-slate-200">
                <RotateCcw className="mr-2 w-4 h-4" /> Retry Quiz
              </Button>
              <Button onClick={onDashboard} className="btn-primary h-12 rounded-xl">
                <LayoutDashboard className="mr-2 w-4 h-4" /> Dashboard
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
