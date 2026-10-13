import React, { useEffect } from 'react';
import { Target, Clock, BellOff } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingDeepWorkButtonProps {
  onEnterFocus: () => void;
}

export const FloatingDeepWorkButton: React.FC<FloatingDeepWorkButtonProps> = ({
  onEnterFocus,
}) => {
  // Global shortcut Alt+F to enter focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        onEnterFocus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnterFocus]);

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
        onClick={onEnterFocus}
        title="Enter Deep Work Focus Mode (Alt+F)"
        className="group relative flex items-center gap-3 bg-slate-900/95 dark:bg-slate-900/95 hover:bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80 hover:border-primary-500/80 backdrop-blur-xl transition-all duration-300 text-left select-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        {/* Subtle glowing animated background pulse */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-indigo-500 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-500 pointer-events-none" />

        {/* Focus Icon with live breathing dot */}
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
          <Target className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900" />
          </span>
        </div>

        {/* Text Details */}
        <div className="relative flex flex-col pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-wide text-white group-hover:text-primary-300 transition-colors uppercase">
              Deep Work Focus
            </span>
            <span className="hidden sm:inline-block text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
              Alt+F
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="flex items-center gap-1 text-primary-300 font-medium">
              <Clock className="w-3 h-3" /> 25m Pomodoro
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-slate-400">
              <BellOff className="w-3 h-3" /> Mutes alerts
            </span>
          </div>
        </div>
      </motion.button>
    </div>
  );
};
