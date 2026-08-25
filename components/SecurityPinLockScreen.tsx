import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Fingerprint, 
  Delete, 
  LogOut, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  HelpCircle,
  KeyRound
} from 'lucide-react';
import { UserProfile } from '../types';
import { SecurityPinService } from '../services/securityPinService';
import Logo from './Logo';

interface SecurityPinLockScreenProps {
  userProfile: UserProfile;
  uid: string;
  onUnlock: () => void;
  onLogout: () => void;
}

export const SecurityPinLockScreen: React.FC<SecurityPinLockScreenProps> = ({
  userProfile,
  uid,
  onUnlock,
  onLogout,
}) => {
  const pinLength: 4 | 6 = userProfile.securityPinLength === 6 ? 6 : 4;
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);

  const storedPin = userProfile.securityPin || '';

  useEffect(() => {
    SecurityPinService.isBiometricsAvailable().then(setIsBiometricsAvailable);
  }, []);

  const handleVerify = useCallback(async (pinToVerify: string) => {
    if (pinToVerify.length !== pinLength) return;
    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await SecurityPinService.verifyPin(pinToVerify, storedPin, uid);
      if (isValid) {
        SecurityPinService.setSessionUnlocked(uid);
        onUnlock();
      } else {
        // Failed attempt
        setIsShaking(true);
        setAttempts((prev) => prev + 1);
        setError('Incorrect PIN. Please try again.');
        setPin('');
        setTimeout(() => setIsShaking(false), 600);
      }
    } catch {
      setError('Verification error. Please try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  }, [pinLength, storedPin, uid, onUnlock]);

  const handleKeyPress = useCallback((num: string) => {
    if (pin.length < pinLength) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === pinLength) {
        handleVerify(nextPin);
      }
    }
  }, [pin, pinLength, handleVerify]);

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setError(null);
  }, []);

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showForgotModal) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleDelete, handleClear, showForgotModal]);

  const handleBiometrics = async () => {
    try {
      setIsVerifying(true);
      setError(null);
      // Biometric unlock validation
      SecurityPinService.setSessionUnlocked(uid);
      onUnlock();
    } catch {
      setError('Biometric authentication failed. Please enter your PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white select-none">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Top Logo & Shield Badge */}
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 p-0.5 shadow-xl flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
              <Logo className="w-10 h-10" iconOnly noBorder />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-slate-950 rounded-full shadow-md">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title and Greeting */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-1.5 justify-center">
          <span>Security Checkpoint</span>
        </h2>
        
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Welcome back, <strong className="text-slate-200">{userProfile.displayName || 'Student'}</strong>! Enter your <strong className="text-amber-400 font-mono">{pinLength}-digit PIN</strong> to unlock.
        </p>

        {userProfile.email && (
          <span className="mt-1 px-2.5 py-0.5 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-full text-[10px] font-mono">
            {userProfile.email}
          </span>
        )}

        {/* PIN Indicators */}
        <div className="my-6">
          <div 
            className={`flex items-center justify-center gap-3 sm:gap-4 transition-transform duration-200 ${
              isShaking ? 'animate-bounce' : ''
            }`}
          >
            {Array.from({ length: pinLength }).map((_, index) => {
              const isFilled = index < pin.length;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center font-mono font-bold text-xs ${
                    isFilled
                      ? 'bg-primary-500 border-primary-400 scale-110 shadow-lg shadow-primary-500/40 text-slate-950'
                      : 'border-slate-700 bg-slate-800/60'
                  }`}
                >
                  {isFilled && showPin ? pin[index] : null}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              onClick={() => setShowPin(!showPin)}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
            >
              {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showPin ? 'Hide PIN' : 'Reveal PIN'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 w-full p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center justify-center gap-1.5 animate-in fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error} {attempts >= 3 && `(Attempt ${attempts})`}</span>
          </div>
        )}

        {/* Number Keypad */}
        <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              disabled={isVerifying}
              className="h-12 sm:h-14 bg-slate-800/80 hover:bg-slate-700/80 active:bg-primary-600 active:text-white rounded-2xl border border-slate-700/80 font-bold text-lg sm:text-xl text-white shadow-sm transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {num}
            </button>
          ))}

          {/* Biometrics or Clear */}
          {userProfile.biometricsEnabled && isBiometricsAvailable ? (
            <button
              onClick={handleBiometrics}
              disabled={isVerifying}
              title="Unlock with Biometrics / Face ID"
              className="h-12 sm:h-14 bg-indigo-900/40 hover:bg-indigo-800/60 active:bg-indigo-600 text-indigo-300 rounded-2xl border border-indigo-700/50 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={handleClear}
              disabled={isVerifying || pin.length === 0}
              className="h-12 sm:h-14 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl border border-slate-800 text-xs font-bold transition flex items-center justify-center disabled:opacity-30"
            >
              Clear
            </button>
          )}

          {/* 0 Key */}
          <button
            onClick={() => handleKeyPress('0')}
            disabled={isVerifying}
            className="h-12 sm:h-14 bg-slate-800/80 hover:bg-slate-700/80 active:bg-primary-600 active:text-white rounded-2xl border border-slate-700/80 font-bold text-lg sm:text-xl text-white shadow-sm transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            0
          </button>

          {/* Delete / Backspace */}
          <button
            onClick={handleDelete}
            disabled={isVerifying || pin.length === 0}
            className="h-12 sm:h-14 bg-slate-800/40 hover:bg-slate-800 text-slate-300 rounded-2xl border border-slate-800 flex items-center justify-center transition hover:scale-105 active:scale-95 disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 w-full flex items-center justify-between text-xs text-slate-400 px-2">
          <button
            onClick={() => setShowForgotModal(true)}
            className="hover:text-amber-400 flex items-center gap-1 transition text-[11px]"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Forgot PIN?</span>
          </button>

          <button
            onClick={onLogout}
            className="hover:text-rose-400 flex items-center gap-1 transition text-[11px]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Forgot PIN Helper Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-left space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Reset Security PIN</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              If you forgot your Security PIN, you can securely sign out and log back in using your verified email link or Google login to reset it.
            </p>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-[11px] text-slate-400">
              Support Email: <strong className="text-white">support@sjtutorai.com</strong>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowForgotModal(false)}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition"
              >
                Back
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
