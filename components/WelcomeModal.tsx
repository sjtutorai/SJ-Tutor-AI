
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, PartyPopper, X } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  type: 'welcome' | 'signup';
  userName: string;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, type, userName, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
      audio.volume = 0.2;
      audio.play().catch(() => {});
      
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-10 text-center">
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 10, delay: 0.1 }}
                className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-6"
              >
                {type === 'welcome' ? (
                  <Sparkles className="w-10 h-10 text-primary-600" />
                ) : (
                  <PartyPopper className="w-10 h-10 text-primary-600" />
                )}
              </motion.div>

              <h2 className="text-3xl font-black text-slate-800 mb-2">
                {type === 'welcome' ? 'Welcome Back!' : 'Account Created!'}
              </h2>
              <p className="text-slate-500 font-medium">
                {type === 'welcome' 
                  ? `Great to see you again, ${userName}!` 
                  : `Welcome to the family, ${userName}!`}
              </p>

              <div className="mt-8 flex justify-center">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      className="w-2 h-2 bg-primary-400 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;
