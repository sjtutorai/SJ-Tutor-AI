import React from 'react';
import { Lock, Sparkles, LogIn, ArrowRight } from 'lucide-react';

interface SharedLockScreenProps {
  type: string;
  title: string;
  subtitle?: string;
  teaser?: string;
  onAuthenticate: () => void;
}

const SharedLockScreen: React.FC<SharedLockScreenProps> = ({
  type = 'Summary',
  title,
  subtitle = 'AI Generated content',
  teaser = 'This is a premium summary generated using advanced AI models...',
  onAuthenticate
}) => {
  return (
    <div className="max-w-2xl mx-auto my-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Banner with visual accent */}
        <div className="bg-gradient-to-r from-primary-500 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 rounded-full bg-white/15 blur-xl"></div>
          
          <div className="mx-auto bg-white/20 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">AI Generated {type}</h2>
          <p className="text-xs text-slate-100/90 mt-1 font-medium select-none">{subtitle}</p>
        </div>

        {/* Info card body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-[10px] font-bold tracking-wider text-primary-600 dark:text-primary-400 uppercase bg-primary-100/60 dark:bg-primary-900/40 px-2.5 py-1 rounded-full">
              Shared Study Resource
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 leading-tight">
              {title}
            </h3>
          </div>

          {/* Teaser area with fading mask */}
          <div className="relative bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl p-5 overflow-hidden">
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 text-sm leading-relaxed space-y-2 select-none">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Teaser & Overview Preview:</p>
              <p>{teaser}</p>
              <p className="blur-[1.5px] opacity-40">Connecting ideas together requires summarizing academic boards guidelines, providing clear and concise notes for student exam prep. Important keys inside this chapter include deep conceptual links...</p>
            </div>
            
            {/* The Fade Mask */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent pointer-events-none"></div>
          </div>

          {/* Prompt Lock Message */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center sm:text-left">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Log in or Sign up to access this content</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                Sign up for a free student account to read this full AI Summary, practice with interactive quizzes, and save it directly to your dashboard.
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={onAuthenticate}
              className="flex-1 py-3 px-5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group transform active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              Sign Up or Log In
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedLockScreen;
