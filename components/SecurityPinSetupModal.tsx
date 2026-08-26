import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Fingerprint, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw,
  Smartphone,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { SecurityPinService } from '../services/securityPinService';
import { SettingsService } from '../services/settingsService';

export interface SecurityPinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  uid?: string;
  onSuccess: (updatedProfile: Partial<UserProfile>) => void;
  isDisabling?: boolean;
  initialTab?: 'twostep' | 'pin';
}

export const SecurityPinSetupModal: React.FC<SecurityPinSetupModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  uid,
  onSuccess,
  isDisabling = false,
  initialTab = 'twostep',
}) => {
  const [activeTab, setActiveTab] = useState<'twostep' | 'pin'>(initialTab);
  
  // 2-Step Password States
  const [twoStepPassword, setTwoStepPassword] = useState('');
  const [confirmTwoStepPassword, setConfirmTwoStepPassword] = useState('');
  const [currentTwoStepPassword, setCurrentTwoStepPassword] = useState('');

  // PIN States
  const [pinLength, setPinLength] = useState<4 | 6>(userProfile.securityPinLength || 4);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState<boolean>(userProfile.biometricsEnabled ?? true);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);

  // Security Question States
  const [securityQuestion, setSecurityQuestion] = useState<string>(
    userProfile.securityQuestion || SettingsService.getSettings().privacy.securityQuestion || SecurityPinService.DEFAULT_SECURITY_QUESTIONS[0]
  );
  const [securityAnswer, setSecurityAnswer] = useState<string>(
    userProfile.securityAnswer || SettingsService.getSettings().privacy.securityAnswer || ''
  );
  const [isCustomQuestion, setIsCustomQuestion] = useState(false);

  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const existingTwoFactor = !!userProfile.twoFactorEnabled || !!userProfile.twoFactorPassword;
  const existingPin = userProfile.securityPin || SettingsService.getSettings().privacy.pin || '';

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError(null);
      setTwoStepPassword('');
      setConfirmTwoStepPassword('');
      setCurrentTwoStepPassword('');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinLength(userProfile.securityPinLength || 4);
      setEnableBiometrics(userProfile.biometricsEnabled ?? true);
      setSecurityQuestion(
        userProfile.securityQuestion || SettingsService.getSettings().privacy.securityQuestion || SecurityPinService.DEFAULT_SECURITY_QUESTIONS[0]
      );
      setSecurityAnswer(
        userProfile.securityAnswer || SettingsService.getSettings().privacy.securityAnswer || ''
      );
      SecurityPinService.isBiometricsAvailable().then(setIsBiometricsAvailable);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialTab, userProfile]);

  if (!isOpen) return null;

  // Handle Save / Disable
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    const salt = uid || 'sjtutor_user';

    try {
      if (activeTab === 'twostep') {
        // --- TWO-STEP VERIFICATION (ON LOGIN) ---
        if (isDisabling) {
          if (userProfile.twoFactorPassword) {
            const isValid = await SecurityPinService.verifySecret(currentTwoStepPassword, userProfile.twoFactorPassword, salt);
            if (!isValid) {
              setError('Current 2-Step password is incorrect.');
              setIsProcessing(false);
              return;
            }
          }

          const updated: Partial<UserProfile> = {
            twoFactorEnabled: false,
            twoFactorPassword: '',
          };

          if (uid) {
            SecurityPinService.clearTwoStepVerified(uid);
          }

          SettingsService.updateSettings({
            privacy: {
              ...SettingsService.getSettings().privacy,
              twoFactor: false,
              twoFactorPassword: '',
            },
          });

          onSuccess(updated);
          onClose();
          return;
        }

        // Validate new 2-step password
        if (userProfile.twoFactorPassword && !currentTwoStepPassword) {
          setError('Please enter your current 2-Step password first.');
          setIsProcessing(false);
          return;
        }

        if (userProfile.twoFactorPassword) {
          const isValid = await SecurityPinService.verifySecret(currentTwoStepPassword, userProfile.twoFactorPassword, salt);
          if (!isValid) {
            setError('Current 2-Step password is incorrect.');
            setIsProcessing(false);
            return;
          }
        }

        if (twoStepPassword.length < 4) {
          setError('2-Step Password must be at least 4 characters long.');
          setIsProcessing(false);
          return;
        }

        if (twoStepPassword !== confirmTwoStepPassword) {
          setError('New 2-Step password and confirmation do not match.');
          setIsProcessing(false);
          return;
        }

        let hashedAnswer = userProfile.securityAnswer || '';
        if (securityAnswer.trim()) {
          hashedAnswer = await SecurityPinService.hashSecurityAnswer(securityAnswer.trim(), salt);
        }

        const hashed = await SecurityPinService.hashSecret(twoStepPassword.trim(), salt);
        const updated: Partial<UserProfile> = {
          twoFactorEnabled: true,
          twoFactorPassword: hashed,
          securityQuestion: securityQuestion.trim(),
          securityAnswer: hashedAnswer,
          securityQuestionSetAt: Date.now(),
        };

        if (uid) {
          SecurityPinService.setTwoStepVerified(uid);
        }

        SettingsService.updateSettings({
          privacy: {
            ...SettingsService.getSettings().privacy,
            twoFactor: true,
            twoFactorPassword: hashed,
            securityQuestion: securityQuestion.trim(),
            securityAnswer: hashedAnswer,
          },
        });

        onSuccess(updated);
        onClose();

      } else {
        // --- SECURITY PIN (ON REFRESH / VISIT) ---
        if (isDisabling) {
          if (existingPin) {
            const isValid = await SecurityPinService.verifyPin(currentPin, existingPin, salt);
            if (!isValid) {
              setError('Current Security PIN is incorrect.');
              setIsProcessing(false);
              return;
            }
          }

          const updated: Partial<UserProfile> = {
            pinLockEnabled: false,
            securityPin: '',
            securityPinLength: 4,
            biometricsEnabled: false,
          };

          if (uid) {
            SecurityPinService.clearLocalConfig(uid);
          }

          SettingsService.updateSettings({
            privacy: {
              ...SettingsService.getSettings().privacy,
              pinLock: false,
              appLock: false,
              pin: '',
              biometrics: false,
            },
          });

          onSuccess(updated);
          onClose();
          return;
        }

        if (existingPin && !currentPin) {
          setError('Please enter your current PIN first.');
          setIsProcessing(false);
          return;
        }

        if (existingPin) {
          const isValid = await SecurityPinService.verifyPin(currentPin, existingPin, salt);
          if (!isValid) {
            setError('Current Security PIN is incorrect.');
            setIsProcessing(false);
            return;
          }
        }

        const cleanNewPin = newPin.trim();
        const cleanConfirmPin = confirmPin.trim();

        if (cleanNewPin.length !== pinLength) {
          setError(`Please enter a valid ${pinLength}-digit security PIN.`);
          setIsProcessing(false);
          return;
        }

        if (!/^\d+$/.test(cleanNewPin)) {
          setError('Security PIN must contain numbers only.');
          setIsProcessing(false);
          return;
        }

        if (cleanNewPin !== cleanConfirmPin) {
          setError('New PIN and confirmation PIN do not match.');
          setIsProcessing(false);
          return;
        }

        let hashedAnswer = userProfile.securityAnswer || '';
        if (securityAnswer.trim()) {
          hashedAnswer = await SecurityPinService.hashSecurityAnswer(securityAnswer.trim(), salt);
        }

        const pinHash = await SecurityPinService.hashPin(cleanNewPin, salt);

        const updated: Partial<UserProfile> = {
          pinLockEnabled: true,
          securityPin: pinHash,
          securityPinLength: pinLength,
          biometricsEnabled: enableBiometrics && isBiometricsAvailable,
          securityQuestion: securityQuestion.trim(),
          securityAnswer: hashedAnswer,
          securityQuestionSetAt: Date.now(),
        };

        if (uid) {
          SecurityPinService.saveLocalConfig(uid, {
            enabled: true,
            pinHash,
            pinLength,
            salt,
            biometricsEnabled: enableBiometrics && isBiometricsAvailable,
            updatedAt: Date.now(),
          });
          SecurityPinService.setSessionUnlocked(uid);
        }

        SettingsService.updateSettings({
          privacy: {
            ...SettingsService.getSettings().privacy,
            pinLock: true,
            appLock: true,
            pin: pinHash,
            pinLength,
            biometrics: enableBiometrics && isBiometricsAvailable,
            securityQuestion: securityQuestion.trim(),
            securityAnswer: hashedAnswer,
          },
        });

        onSuccess(updated);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Operation failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 overflow-hidden text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Switcher (if not disabling) */}
        {!isDisabling && (
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('twostep');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'twostep'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2-Step (On Login)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('pin');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'pin'
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN (On Refresh / Visit)</span>
            </button>
          </div>
        )}

        {/* Header Section */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-3 rounded-2xl text-white shadow-md ${
            activeTab === 'twostep'
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
              : 'bg-gradient-to-tr from-primary-600 to-indigo-600'
          }`}>
            {isDisabling ? (
              <Lock className="w-6 h-6" />
            ) : activeTab === 'twostep' ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <KeyRound className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {isDisabling
                ? activeTab === 'twostep' ? 'Disable 2-Step Login' : 'Disable Security PIN'
                : activeTab === 'twostep'
                ? existingTwoFactor ? 'Change 2-Step Password' : 'Set Up 2-Step Login'
                : existingPin ? 'Change Security PIN' : 'Set Up Security PIN'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === 'twostep'
                ? 'Prompted every time you sign in to your account.'
                : 'Prompted every time you refresh or revisit the website.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* ======================= TAB 1: 2-STEP ON LOGIN ======================= */}
          {activeTab === 'twostep' && (
            <>
              {existingTwoFactor && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Current 2-Step Password
                  </label>
                  <input
                    ref={inputRef}
                    type={showSecret ? 'text' : 'password'}
                    value={currentTwoStepPassword}
                    onChange={(e) => setCurrentTwoStepPassword(e.target.value)}
                    placeholder="Enter current 2-step password"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    required
                  />
                </div>
              )}

              {!isDisabling && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        New 2-Step Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={twoStepPassword}
                      onChange={(e) => setTwoStepPassword(e.target.value)}
                      placeholder="Create a strong 2-step password"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Confirm 2-Step Password
                    </label>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={confirmTwoStepPassword}
                      onChange={(e) => setConfirmTwoStepPassword(e.target.value)}
                      placeholder="Confirm your 2-step password"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      required
                    />
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      <strong>Login Protection:</strong> Whenever you sign in from any browser (Google, Yahoo, Email), this password is required before access is granted.
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {/* ======================= TAB 2: PIN ON REFRESH/VISIT ======================= */}
          {activeTab === 'pin' && (
            <>
              {existingPin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Current Security PIN
                  </label>
                  <input
                    ref={inputRef}
                    type={showSecret ? 'text' : 'password'}
                    maxLength={6}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter current PIN"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
                    required
                  />
                </div>
              )}

              {!isDisabling && (
                <>
                  {/* Select PIN Length */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Select PIN Format
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPinLength(4);
                          setNewPin('');
                          setConfirmPin('');
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          pinLength === 4
                            ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-700 dark:text-primary-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" /> 4-Digit PIN
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPinLength(6);
                          setNewPin('');
                          setConfirmPin('');
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          pinLength === 6
                            ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-700 dark:text-primary-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> 6-Digit PIN
                      </button>
                    </div>
                  </div>

                  {/* New PIN Input */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        New {pinLength}-Digit PIN
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      maxLength={pinLength}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder={`Enter ${pinLength} numbers`}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
                      required
                    />
                  </div>

                  {/* Confirm PIN Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Confirm {pinLength}-Digit PIN
                    </label>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      maxLength={pinLength}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder={`Re-enter ${pinLength} numbers`}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
                      required
                    />
                  </div>

                  {/* Recovery Security Question */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Security Question (PIN Recovery)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomQuestion(!isCustomQuestion)}
                        className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                      >
                        {isCustomQuestion ? 'Choose Preset' : 'Custom Question'}
                      </button>
                    </div>

                    {isCustomQuestion ? (
                      <input
                        type="text"
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        placeholder="Write your custom recovery question"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                    ) : (
                      <select
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {SecurityPinService.DEFAULT_SECURITY_QUESTIONS.map((q, idx) => (
                          <option key={idx} value={q}>
                            {q}
                          </option>
                        ))}
                      </select>
                    )}

                    <div>
                      <input
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        placeholder="Your secret answer (e.g., Fluffy, Paris, Lincoln)"
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Used to instantly reset your PIN if forgotten (otherwise requires a 50-day hold).
                      </span>
                    </div>
                  </div>

                  {/* Biometrics */}
                  {isBiometricsAvailable && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                          <Fingerprint className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            Fingerprint / Face ID
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Fast biometric unlock on refresh
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableBiometrics}
                          onChange={(e) => setEnableBiometrics(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  )}

                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl text-[11px] text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                    <Smartphone className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      <strong>Refresh & Visit Lock:</strong> Whenever you refresh the browser tab or revisit SJ Tutor AI, enter this {pinLength}-digit PIN (or use Touch/Face ID) to unlock.
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className={`flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 ${
                isDisabling
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : activeTab === 'twostep'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              } disabled:opacity-50`}
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isDisabling ? (
                <>
                  <Lock className="w-4 h-4" /> Disable
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save & Enable
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
