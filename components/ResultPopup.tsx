
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, AlertCircle, RefreshCw, Share2, X } from 'lucide-react';

interface ResultPopupProps {
  score: number;
  total: number;
  onClose: () => void;
  onReset: () => void;
  onShare: () => void;
}

const ResultPopup: React.FC<ResultPopupProps> = ({ score, total, onClose, onReset, onShare }) => {
  const percentage = Math.round((score / total) * 100);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    playSound(percentage);
  }, [percentage]);

  const playSound = (pct: number) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    if (pct >= 80) {
      // Celebration sound: Arpeggio
      const now = audioCtx.currentTime;
      playTone(523.25, 'sine', 0.5, now); // C5
      playTone(659.25, 'sine', 0.5, now + 0.1); // E5
      playTone(783.99, 'sine', 0.5, now + 0.2); // G5
      playTone(1046.50, 'sine', 0.8, now + 0.3); // C6
    } else if (pct >= 50) {
      // Normal sound: Double beep
      const now = audioCtx.currentTime;
      playTone(440, 'sine', 0.3, now); // A4
      playTone(554.37, 'sine', 0.4, now + 0.15); // C#5
    } else {
      // Sad sound: Descending
      const now = audioCtx.currentTime;
      playTone(329.63, 'triangle', 0.6, now); // E4
      playTone(261.63, 'triangle', 0.8, now + 0.3); // C4
    }
  };

  const getResultData = () => {
    if (percentage >= 80) {
      return {
        title: "Excellent!",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        icon: <Trophy className="w-12 h-12 text-emerald-500" />,
        animation: { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }
      };
    } else if (percentage >= 50) {
      return {
        title: "Good Job!",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        icon: <Star className="w-12 h-12 text-blue-500" />,
        animation: { y: [0, -10, 0] }
      };
    } else {
      return {
        title: "Try Again!",
        color: "text-rose-600",
        bgColor: "bg-rose-50",
        borderColor: "border-rose-200",
        icon: <AlertCircle className="w-12 h-12 text-rose-500" />,
        animation: { x: [-5, 5, -5, 5, 0] }
      };
    }
  };

  const result = getResultData();

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={`relative w-full max-w-md overflow-hidden bg-white rounded-3xl shadow-2xl border ${result.borderColor}`}
            id="result-popup"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`p-8 text-center ${result.bgColor}`}>
              <motion.div
                animate={result.animation}
                transition={{ duration: 0.6, repeat: percentage >= 80 ? Infinity : 0, repeatDelay: 2 }}
                className="inline-flex items-center justify-center w-24 h-24 mb-6 bg-white rounded-full shadow-inner"
              >
                {result.icon}
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`text-3xl font-black mb-2 ${result.color}`}
              >
                {result.title}
              </motion.h2>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-500 font-medium"
              >
                You scored {percentage}%
              </motion.div>
            </div>

            <div className="p-8 bg-white">
              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-800">{score}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Correct</div>
                </div>
                <div className="w-px h-10 bg-slate-100" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-800">{total}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onReset}
                  className="flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-primary-600 rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake
                </button>
                <button
                  onClick={onShare}
                  className="flex items-center justify-center gap-2 px-6 py-3 font-bold text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ResultPopup;
