import React, { useEffect } from 'react';
import { Command, Keyboard, X, Sparkles, BookOpen, BrainCircuit, FileText, MessageCircle, Users, Calendar, LayoutDashboard, Info } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    { key: `${modKey} + S`, label: 'Instant Summary Mode', icon: FileText, desc: 'Jump to Summary generator' },
    { key: `${modKey} + Q`, label: 'Quiz Creator Mode', icon: BrainCircuit, desc: 'Jump to practice Quiz creator' },
    { key: `${modKey} + H`, label: 'Homework Solver Mode', icon: BookOpen, desc: 'Jump to Homework solution solver' },
    { key: `${modKey} + T`, label: 'AI Tutor Chat Mode', icon: MessageCircle, desc: 'Open interactive AI Tutor chat' },
    { key: `${modKey} + G`, label: 'Study Groups Mode', icon: Users, desc: 'Jump to Study Groups & Chat' },
    { key: `${modKey} + N`, label: 'Notes & Schedule Mode', icon: Calendar, desc: 'Open personal study Notes & Schedule' },
    { key: `${modKey} + D`, label: 'Dashboard Overview', icon: LayoutDashboard, desc: 'Return to main Dashboard' },
    { key: `${modKey} + Shift + A`, label: 'About Us Modal', icon: Info, desc: 'View creators Sadanand Jyoti & Samanyu S Patil' },
    { key: `${modKey} + K`, label: 'Keyboard Shortcuts Cheat Sheet', icon: Keyboard, desc: 'Toggle this shortcuts modal' },
  ];

  return (
    <div className="fixed inset-0 z-[160] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-300 dark:border-amber-800">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Global Keyboard Shortcuts
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Fast navigation between core application modes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3 overflow-y-auto max-h-[70vh]">
          <div className="grid gap-2.5">
            {shortcuts.map((sc, idx) => {
              const Icon = sc.icon;
              return (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{sc.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{sc.desc}</p>
                    </div>
                  </div>
                  <kbd className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
                    {sc.key}
                  </kbd>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Command className="w-3.5 h-3.5 text-amber-500" />
            <span>Shortcuts automatically bypass text input fields.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-bold rounded-lg text-xs transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
