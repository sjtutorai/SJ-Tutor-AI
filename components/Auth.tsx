import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { SignUpFlow } from './auth/SignUpFlow';
import { LoginFlow } from './auth/LoginFlow';
import { AccountDetectorWidget } from './auth/AccountDetectorWidget';
import { BigScreenSignUpPage } from './auth/BigScreenSignUpPage';
import { CinematicLoginStage } from './auth/CinematicLoginStage';
import Logo from './Logo';
import { getDeviceRegisteredUser, saveDeviceRegisteredUser } from '../utils/registrationDetection';
import type { UserProfile } from '../types';

const INTRO_SEEN_KEY = 'sjtutor_cinematic_intro_seen';

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
  const deviceUser = getDeviceRegisteredUser();
  const defaultMode: 'signin' | 'signup' = initialMode
    ? initialMode
    : (deviceUser.hasRegistered ? 'signin' : 'signup');

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(defaultMode);
  const [prefilledIdentifier, setPrefilledIdentifier] = useState<string>(propPrefilledIdentifier);
  const [showDetector, setShowDetector] = useState(false);
  const [bigScreenIdentity, setBigScreenIdentity] = useState<any | null>(null);

  // Only play the full 3D cinematic opening once per session on initial login experience
  const [playIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const seen = sessionStorage.getItem(INTRO_SEEN_KEY) === 'true';
      return !seen;
    } catch {
      return true;
    }
  });

  const handleIntroFinished = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

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
      window.history.replaceState(
        null,
        '',
        originalPath === '/login' || originalPath === '/signup' ? '/' : originalPath
      );
    };
  }, [authMode, onClose]);

  const handleSuccess = (userData: any) => {
    handleIntroFinished();
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

  // Full-screen registration onboarding when user initiates social/email signup
  if (bigScreenIdentity) {
    return (
      <BigScreenSignUpPage
        authIdentity={bigScreenIdentity}
        onSuccess={handleSuccess}
        onCancel={() => setBigScreenIdentity(null)}
      />
    );
  }

  return (
    <CinematicLoginStage
      onClose={onClose}
      playIntroAnimation={playIntro}
      onIntroFinished={handleIntroFinished}
    >
      {/* Scope dark classes so all child auth flows adapt cleanly to the dark navy glass panel */}
      <div className="dark text-white relative z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/30 to-violet-600/30 flex items-center justify-center border border-blue-400/30 overflow-hidden shadow-[0_0_24px_rgba(37,99,235,0.3)]">
            <Logo className="w-8 h-8" iconOnly noBorder />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight text-white leading-tight">
              SJ Tutor AI
            </div>
            <div className="text-[11px] font-medium text-blue-300/80 tracking-wide">
              Personalized Study Workspace
            </div>
          </div>
        </div>

        {/* Registration Detection Status Banner */}
        <div className="mb-4">
          {deviceUser.hasRegistered ? (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-200 truncate">
                  Account detected:{' '}
                  <strong className="text-white font-semibold">
                    {deviceUser.name || deviceUser.email || deviceUser.sjTutorId}
                  </strong>
                </span>
              </div>
              {authMode !== 'signin' && (
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline shrink-0 cursor-pointer"
                >
                  Switch to Log In
                </button>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-400/25 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-200 truncate">
                  New to SJ Tutor AI? Create a student account in seconds.
                </span>
              </div>
              {authMode !== 'signup' && (
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="text-[11px] font-bold text-blue-300 hover:text-blue-200 hover:underline shrink-0 cursor-pointer"
                >
                  Register
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
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-all border border-white/10 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-blue-400" />
              <span>Check Existing Account Status</span>
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

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/60 rounded-xl border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => setAuthMode('signin')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('signup')}
            className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              authMode === 'signup'
                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
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
            onRedirectToBigScreen={(identity) => setBigScreenIdentity(identity)}
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
    </CinematicLoginStage>
  );
};

export default Auth;
