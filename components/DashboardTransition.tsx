import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';

interface DashboardTransitionProps {
  studentName: string;
  onComplete: () => void;
}

/**
 * Post-authentication cinematic transition:
 * Fades the dark navy cinematic login backdrop into crisp light slate/white,
 * zooms smoothly through the SJ Tutor AI logo, and reveals the Light Student Dashboard.
 */
export const DashboardTransition: React.FC<DashboardTransitionProps> = ({
  studentName,
  onComplete,
}) => {
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReduced ? 450 : 1450;

    const timer = window.setTimeout(() => {
      onComplete();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: [1, 1, 0] }}
      transition={{ duration: 1.45, times: [0, 0.72, 1], ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden pointer-events-none select-none"
    >
      {/* Background fades from dark navy cinematic login into luminous clean white/light grey */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: 'easeInOut' }}
        className="absolute inset-0 bg-[#020617]"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.85, delay: 0.25, ease: 'easeOut' }}
        className="absolute inset-0 bg-gradient-to-b from-white via-[#F8FAFC] to-[#EFF6FF]"
      />

      {/* Expanding blue-violet optical energy ring */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{ scale: 5.5, opacity: 0 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        className="absolute w-40 h-40 rounded-full border-2 border-blue-500/40 bg-gradient-to-tr from-blue-500/20 to-violet-500/20 blur-md"
      />

      {/* Zoom-through SJ Tutor AI logo */}
      <motion.div
        initial={{ scale: 0.92, opacity: 1 }}
        animate={{ scale: [0.92, 1.15, 7], opacity: [1, 1, 0] }}
        transition={{ duration: 1.25, times: [0, 0.32, 1], ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <div className="w-24 h-24 rounded-3xl p-1.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-2xl shadow-blue-500/40">
          <div className="w-full h-full rounded-[20px] bg-white overflow-hidden flex items-center justify-center">
            <Logo className="w-full h-full" iconOnly noBorder />
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: [0, 1, 0], y: [6, 0, -10] }}
          transition={{ duration: 0.85, times: [0, 0.4, 1] }}
          className="text-sm font-bold tracking-wide text-slate-900"
        >
          Welcome Back, {studentName}!
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default DashboardTransition;
