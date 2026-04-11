import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './components/ui/button';
import { Hand } from 'lucide-react';

interface WelcomeBackModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
}

export const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({ isOpen, onClose, name }) => {
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
            <div className="mx-auto w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-6">
              <Hand className="text-primary-600 w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back, {name}!</h3>
            <p className="text-slate-500 mb-8">Great to see you again. Ready to crush some study goals today?</p>
            <Button onClick={onClose} className="btn-primary w-full h-12 rounded-xl">
              Let&apos;s Go!
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
