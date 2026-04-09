
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PartyPopper, CheckCircle2, Play, X } from 'lucide-react';

interface WelcomeModalProps {
  type: 'returning' | 'new';
  userName: string;
  onClose: () => void;
  onStartTutorial?: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ type, userName, onClose, onStartTutorial }) => {
  useEffect(() => {
    // Play success sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audio.play().catch(() => {}); // Ignore if browser blocks auto-play
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10 text-center space-y-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
            type === 'new' ? 'bg-emerald-100 text-emerald-600' : 'bg-primary-100 text-primary-600'
          }`}>
            {type === 'new' ? (
              <PartyPopper className="w-12 h-12" />
            ) : (
              <CheckCircle2 className="w-12 h-12" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-800">
              {type === 'new' ? 'Account Created!' : 'Welcome Back!'}
            </h2>
            <p className="text-slate-500 text-lg">
              {type === 'new' 
                ? `Welcome to the family, ${userName}! 🎉` 
                : `Great to see you again, ${userName}!`}
            </p>
          </div>

          <div className="pt-4 space-y-3">
            {type === 'new' ? (
              <>
                <button 
                  onClick={onStartTutorial}
                  className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 hover:bg-primary-700 transition-all transform hover:scale-[1.02]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Start Quick Tutorial
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Skip for now
                </button>
              </>
            ) : (
              <button 
                onClick={onClose}
                className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all transform hover:scale-[1.02]"
              >
                Let&apos;s Go!
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeModal;
