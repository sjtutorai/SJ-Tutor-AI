import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SignUpFlow } from './auth/SignUpFlow';
import { LoginFlow } from './auth/LoginFlow';
import type { UserProfile } from '../types';

interface AuthProps {
  onSignUpSuccess?: (data?: Partial<UserProfile>) => void;
  onClose: () => void;
  onCountryDetected?: (country: string) => void;
  initialCountry?: string | null;
  initialMode?: 'signin' | 'signup';
}

const Auth: React.FC<AuthProps> = ({
  onSignUpSuccess,
  onClose,
  initialMode = 'signin',
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // Sync URL for direct link bookmarking / routing
  useEffect(() => {
    const originalPath = window.location.pathname;
    const targetPath = authMode === 'signup' ? '/signup' : '/login';
    window.history.replaceState(null, '', targetPath);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.history.replaceState(null, '', originalPath === '/login' || originalPath === '/signup' ? '/' : originalPath);
    };
  }, [authMode, onClose]);

  const handleSuccess = (userData: any) => {
    if (onSignUpSuccess) {
      onSignUpSuccess(userData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 overflow-hidden my-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center border border-amber-500/20 overflow-hidden shadow-sm">
            <img
              src="/images/sjtutor-logo.png"
              alt="SJ Tutor AI Logo"
              className="w-8 h-8 object-contain"
              onError={(e) => {
                // Fallback to vector icon if image not found
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<span class="text-amber-500"><svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg></span>';
              }}
            />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              SJ Tutor AI
            </span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Identity Portal
            </span>
          </div>
        </div>

        {/* Mode Switcher Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setAuthMode('signup')}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signup'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setAuthMode('signin')}
              className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signin'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Log In
            </button>
          </div>
        </div>

        {/* Content Body */}
        {authMode === 'signup' ? (
          <SignUpFlow
            onSuccess={handleSuccess}
            onSwitchToLogin={() => setAuthMode('signin')}
          />
        ) : (
          <LoginFlow
            onSuccess={handleSuccess}
            onSwitchToSignUp={() => setAuthMode('signup')}
          />
        )}
      </div>
    </div>
  );
};

export default Auth;
