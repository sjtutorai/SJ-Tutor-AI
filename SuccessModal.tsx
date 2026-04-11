import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './components/ui/button';
import { PartyPopper } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onStartTutorial: () => void;
  onSkip: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onStartTutorial, onSkip }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
          >
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <PartyPopper className="text-green-600 w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Account Created Successfully 🎉</h3>
            <p className="text-slate-500 mb-8">Welcome to the family! Would you like a quick tour of your new study space?</p>
            <div className="flex flex-col gap-3">
              <Button onClick={onStartTutorial} className="btn-primary w-full h-12 rounded-xl">
                Start Tutorial
              </Button>
              <Button variant="ghost" onClick={onSkip} className="w-full h-12 rounded-xl text-slate-500">
                Skip for now
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
