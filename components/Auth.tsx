import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { SignUpFlow } from './auth/SignUpFlow';
import { LoginFlow } from './auth/LoginFlow';
import { AccountDetectorWidget } from './auth/AccountDetectorWidget';
import Logo from './Logo';
import { getDeviceRegisteredUser, saveDeviceRegisteredUser } from '../utils/registrationDetection';
import type { UserProfile } from '../types';

interface AuthProps {
  onSignUpSuccess?: (data?: Partial<UserProfile>) => void;
  onClose: () => void;
  onCountryDetected?: (country: string) => void;
  initialCountry?: string | null;
  initialMode?: 'signin' | 'signup';
  prefilledIdentifier?: string;
}

const Auth: React.FC<AuthProps> = ({
  onSignUpSuccess,
  onClose,
  initialMode,
  prefilledIdentifier: propPrefilledIdentifier = '',
}) => {
  // Device auto-detection
  const deviceUser = getDeviceRegisteredUser();
  const defaultMode: 'signin' | 'signup' = initialMode
    ? initialMode
    : (deviceUser.hasRegistered ? 'signin' : 'signup');

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(defaultMode);
  const [prefilledIdentifier, setPrefilledIdentifier] = useState<string>(propPrefilledIdentifier);
  const [showDetector, setShowDetector] = useState(false);

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
    if (userData) {
      saveDeviceRegisteredUser({
        email: userData.email,
        name: userData.displayName || userData.firstName,
        sjTutorId: userData.sjTutorId,
        username: userData.username,
      });
    }
    if (onSignUpSuccess) {
      onSignUpSuccess(userData);
    }
    onClose();
  };

  const handleSelectActionFromDetector = (mode: 'signin' | 'signup', identifier?: string) => {
    setAuthMode(mode);
    if (identifier) {
      setPrefilledIdentifier(identifier);
    }
    setShowDetector(false);
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
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center border border-amber-500/20 overflow-hidden shadow-sm">
            <Logo className="w-8 h-8" iconOnly noBorder />
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

        {/* Registration Detection Status Banner */}
        <div className="mb-4">
          {deviceUser.hasRegistered ? (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 truncate">
                  Account detected:{' '}
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {deviceUser.name || deviceUser.email || deviceUser.sjTutorId}
                  </strong>{' '}
                  (Please <strong>Log In</strong>)
                </span>
              </div>
              {authMode !== 'signin' && (
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                >
                  Switch to Log In
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-200 truncate">
                  New student detected on this device (Please <strong>Register</strong>)
                </span>
              </div>
              {authMode !== 'signup' && (
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                >
                  Switch to Register
                </button>
              )}
            </div>
          )}
        </div>

        {/* Account Detector Accordion / Live Check */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowDetector(!showDetector)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-750 rounded-xl transition-all border border-slate-200/60 dark:border-slate-700/60"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-500" />
              <span>Not sure if you have an account? <strong>Check Registration Status</strong></span>
            </span>
            {showDetector ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showDetector && (
            <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <AccountDetectorWidget
                variant="modal"
                initialIdentifier={prefilledIdentifier}
                onSelectAction={handleSelectActionFromDetector}
              />
            </div>
          )}
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
              Sign Up (Register)
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
            onSwitchToLogin={(email) => {
              if (email) setPrefilledIdentifier(email);
              setAuthMode('signin');
            }}
            prefilledIdentifier={prefilledIdentifier}
          />
        ) : (
          <LoginFlow
            onSuccess={handleSuccess}
            onSwitchToSignUp={(email) => {
              if (email) setPrefilledIdentifier(email);
              setAuthMode('signup');
            }}
            prefilledIdentifier={prefilledIdentifier}
          />
        )}
      </div>
    </div>
  );
};

export default Auth;
