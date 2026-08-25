import React from 'react';
import { ShieldAlert, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { motion } from 'motion/react';

interface SecurityPasswordReminderCardProps {
  onSetupClick: () => void;
  onDismiss: () => void;
}

export const SecurityPasswordReminderCard: React.FC<SecurityPasswordReminderCardProps> = ({
  onSetupClick,
  onDismiss,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-amber-500/15 dark:via-emerald-500/15 dark:to-teal-500/15 border border-amber-300/60 dark:border-amber-700/60 p-4 sm:p-5 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0 mt-0.5 sm:mt-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Set Up 2-Step Verification Password
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800">
                Recommended
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Your account currently uses standard credentials. To prevent unauthorized logins when accessing your account across devices, please set a 2-Step Verification password in Settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-1 sm:pt-0">
          <button
            onClick={onSetupClick}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Set Up in Settings
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDismiss}
            title="Dismiss reminder"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
