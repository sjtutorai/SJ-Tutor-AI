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
  KeyRound,
  Clock,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';
import { SecurityPinService } from '../services/securityPinService';
import { SettingsService } from '../services/settingsService';
import Logo from './Logo';

interface SecurityPinLockScreenProps {
  userProfile: UserProfile;
  uid: string;
  onUnlock: () => void;
  onLogout: () => void;
  onUpdateProfile?: (updatedProfile: Partial<UserProfile>) => Promise<void> | void;
}

export const SecurityPinLockScreen: React.FC<SecurityPinLockScreenProps> = ({
  userProfile,
  uid,
  onUnlock,
  onLogout,
  onUpdateProfile,
}) => {
  const privacySettings = SettingsService.getSettings().privacy;
  const pinLength: 4 | 6 = (userProfile.securityPinLength === 6 || privacySettings.pinLength === 6) ? 6 : 4;
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);

  // Forgot PIN Recovery States
  const [enteredAnswer, setEnteredAnswer] = useState('');
  const [isAnswerVerified, setIsAnswerVerified] = useState(false);
  const [resetPinLength, setResetPinLength] = useState<4 | 6>(pinLength);
  const [newResetPin, setNewResetPin] = useState('');
  const [confirmResetPin, setConfirmResetPin] = useState('');
  const [showResetPin, setShowResetPin] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const storedPin = userProfile.securityPin || privacySettings.pin || '';
  const configuredQuestion = userProfile.securityQuestion || privacySettings.securityQuestion || '';
  const configuredAnswer = userProfile.securityAnswer || privacySettings.securityAnswer || '';

  useEffect(() => {
    SecurityPinService.isBiometricsAvailable().then(setIsBiometricsAvailable);
  }, []);

  const handleVerify = useCallback(async (pinToVerify: string) => {
    if (pinToVerify.length !== pinLength) return;
    setIsVerifying(true);
    setError(null);

    try {
      if (!storedPin) {
        // Initial setup for users who don't have a PIN saved yet
        const pinHash = await SecurityPinService.hashPin(pinToVerify, uid);
        const updatedProfile: Partial<UserProfile> = {
          securityPin: pinHash,
          securityPinLength: pinLength,
          pinLockEnabled: true,
        };
        if (onUpdateProfile) {
          await onUpdateProfile(updatedProfile);
        }
        SettingsService.updateSettings({
          privacy: {
            ...SettingsService.getSettings().privacy,
            pin: pinHash,
            pinLength,
            pinLock: true,
            appLock: true,
          },
        });
        SecurityPinService.saveLocalConfig(uid, {
          enabled: true,
          pinHash,
          pinLength,
          salt: uid,
          biometricsEnabled: userProfile.biometricsEnabled,
          updatedAt: Date.now(),
        });
        SecurityPinService.setSessionUnlocked(uid);
        onUnlock();
        return;
      }

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
  }, [pinLength, storedPin, uid, onUnlock, onUpdateProfile, userProfile.biometricsEnabled]);

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

  // Biometrics Authentication Handler
  const handleBiometrics = async () => {
    try {
      setIsVerifying(true);
      setError(null);
      
      const isAuthenticated = await SecurityPinService.authenticateWithBiometrics(
        uid,
        userProfile.displayName || userProfile.email || 'Student'
      );

      if (isAuthenticated) {
        SecurityPinService.setSessionUnlocked(uid);
        onUnlock();
      } else {
        setError('Biometric authentication failed. Please enter your PIN.');
      }
    } catch (err: any) {
      setError(err?.message || 'Biometric sensor cancelled or unavailable. Please enter your PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Forgot PIN: Verify Security Question Answer
  const handleVerifySecurityAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!enteredAnswer.trim()) {
      setForgotError('Please enter your security answer.');
      return;
    }

    try {
      setIsResetting(true);
      const isCorrect = await SecurityPinService.verifySecurityAnswer(
        enteredAnswer.trim(),
        configuredAnswer,
        uid
      );

      if (isCorrect) {
        setIsAnswerVerified(true);
        setForgotError(null);
      } else {
        setForgotError('Incorrect security answer. Please check your answer and try again.');
      }
    } catch {
      setForgotError('Verification failed. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  // Forgot PIN: Save New PIN after Security Answer is Verified
  const handleSaveResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    const cleanNewPin = newResetPin.trim();
    const cleanConfirmPin = confirmResetPin.trim();

    if (cleanNewPin.length !== resetPinLength) {
      setForgotError(`Please enter a valid ${resetPinLength}-digit PIN.`);
      return;
    }

    if (!/^\d+$/.test(cleanNewPin)) {
      setForgotError('PIN must contain numeric digits only.');
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      setForgotError('New PIN and confirmation PIN do not match.');
      return;
    }

    try {
      setIsResetting(true);
      const pinHash = await SecurityPinService.hashPin(cleanNewPin, uid);

      const updatedProfile: Partial<UserProfile> = {
        securityPin: pinHash,
        securityPinLength: resetPinLength,
        pinLockEnabled: true,
      };

      if (onUpdateProfile) {
        await onUpdateProfile(updatedProfile);
      }

      SettingsService.updateSettings({
        privacy: {
          ...SettingsService.getSettings().privacy,
          pin: pinHash,
          pinLength: resetPinLength,
          pinLock: true,
          appLock: true,
        },
      });

      SecurityPinService.saveLocalConfig(uid, {
        enabled: true,
        pinHash,
        pinLength: resetPinLength,
        salt: uid,
        biometricsEnabled: userProfile.biometricsEnabled,
        updatedAt: Date.now(),
      });

      SecurityPinService.setSessionUnlocked(uid);
      setShowForgotModal(false);
      onUnlock();
    } catch (err: any) {
      setForgotError(err?.message || 'Failed to save new PIN. Please try again.');
    } finally {
      setIsResetting(false);
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
          {!storedPin ? (
            <>
              Welcome, <strong className="text-slate-200">{userProfile.displayName || 'Student'}</strong>! Create your <strong className="text-amber-400 font-mono">{pinLength}-digit PIN</strong> to protect your account on reloads and visits.
            </>
          ) : (
            <>
              Welcome back, <strong className="text-slate-200">{userProfile.displayName || 'Student'}</strong>! Enter your <strong className="text-amber-400 font-mono">{pinLength}-digit PIN</strong> to unlock.
            </>
          )}
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
              title="Authenticate with Biometrics / Fingerprint"
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
            onClick={() => {
              setForgotError(null);
              setEnteredAnswer('');
              setIsAnswerVerified(false);
              setNewResetPin('');
              setConfirmResetPin('');
              setShowForgotModal(true);
            }}
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

      {/* Forgot PIN / Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-left space-y-4 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Reset Security PIN</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent 50-Day Reset Policy Banner */}
            <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-amber-300">The password resets in 50 days</h4>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 rounded-full">
                    50-Day Policy
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  For your account security, credentials without verified recovery answers automatically reset in <strong>50 days</strong>.
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Case A: User has a configured Security Question */}
            {configuredQuestion && configuredAnswer ? (
              !isAnswerVerified ? (
                /* Step 1: Answer the Security Question */
                <form onSubmit={handleVerifySecurityAnswer} className="space-y-3.5">
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-400 block mb-1">
                      Your Security Question:
                    </span>
                    <p className="text-xs font-semibold text-white">
                      &ldquo;{configuredQuestion}&rdquo;
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Your Security Answer
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={enteredAnswer}
                      onChange={(e) => setEnteredAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none transition"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Answer is case-insensitive.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition"
                    >
                      Back to PIN
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting || !enteredAnswer.trim()}
                      className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isResetting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verify Answer
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Step 2: Answer is verified! Reset PIN */
                <form onSubmit={handleSaveResetPin} className="space-y-3.5 animate-in fade-in">
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span><strong>Answer Verified!</strong> Set your new Security PIN below:</span>
                  </div>

                  {/* Select Format */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      PIN Length
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResetPinLength(4);
                          setNewResetPin('');
                          setConfirmResetPin('');
                        }}
                        className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition ${
                          resetPinLength === 4
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        4-Digit PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetPinLength(6);
                          setNewResetPin('');
                          setConfirmResetPin('');
                        }}
                        className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition ${
                          resetPinLength === 6
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        6-Digit PIN
                      </button>
                    </div>
                  </div>

                  {/* New PIN */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        New {resetPinLength}-Digit PIN
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowResetPin(!showResetPin)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {showResetPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showResetPin ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showResetPin ? 'text' : 'password'}
                      maxLength={resetPinLength}
                      value={newResetPin}
                      onChange={(e) => setNewResetPin(e.target.value.replace(/\D/g, ''))}
                      placeholder={`Enter ${resetPinLength} numbers`}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-mono text-center tracking-widest text-base font-bold text-white focus:ring-2 focus:ring-amber-500 outline-none transition"
                      required
                    />
                  </div>

                  {/* Confirm PIN */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Confirm {resetPinLength}-Digit PIN
                    </label>
                    <input
                      type={showResetPin ? 'text' : 'password'}
                      maxLength={resetPinLength}
                      value={confirmResetPin}
                      onChange={(e) => setConfirmResetPin(e.target.value.replace(/\D/g, ''))}
                      placeholder={`Re-enter ${resetPinLength} numbers`}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl font-mono text-center tracking-widest text-base font-bold text-white focus:ring-2 focus:ring-amber-500 outline-none transition"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting || newResetPin.length !== resetPinLength || confirmResetPin.length !== resetPinLength}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                  >
                    {isResetting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Save New PIN & Unlock
                      </>
                    )}
                  </button>
                </form>
              )
            ) : (
              /* Case B: User has NOT set up a Security Question yet */
              <div className="space-y-3.5">
                <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-2">
                  <p className="leading-relaxed">
                    No Security Recovery Question was configured for this account.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    You can either wait for the <strong>50-day automatic reset</strong>, or click below to Sign Out and log back in with your verified Google or Email credentials.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition"
                  >
                    Back to Keypad
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out & Relogin
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

