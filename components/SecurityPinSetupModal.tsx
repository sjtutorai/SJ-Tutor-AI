import React, { useState, useEffect, useRef } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  Fingerprint, 
  Eye, 
  EyeOff, 
  Check, 
  Lock, 
  X, 
  AlertCircle, 
  RefreshCw,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  ListFilter,
  PenTool,
  Clock
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
  const [questionMode, setQuestionMode] = useState<'template' | 'custom'>('template');
  const [selectedCategory, setSelectedCategory] = useState<string>(SecurityPinService.SECURITY_QUESTION_CATEGORIES[0].category);
  const [securityQuestion, setSecurityQuestion] = useState<string>(
    userProfile.securityQuestion || SettingsService.getSettings().privacy.securityQuestion || SecurityPinService.DEFAULT_SECURITY_QUESTIONS[0]
  );
  const [securityAnswer, setSecurityAnswer] = useState<string>('');
  const [confirmSecurityAnswer, setConfirmSecurityAnswer] = useState<string>('');
  const [showAnswers, setShowAnswers] = useState(false);

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
      
      const currentQ = userProfile.securityQuestion || SettingsService.getSettings().privacy.securityQuestion || SecurityPinService.DEFAULT_SECURITY_QUESTIONS[0];
      setSecurityQuestion(currentQ);
      const isCustom = !SecurityPinService.DEFAULT_SECURITY_QUESTIONS.includes(currentQ);
      setQuestionMode(isCustom ? 'custom' : 'template');
      setSecurityAnswer('');
      setConfirmSecurityAnswer('');
      setShowAnswers(false);
      
      SecurityPinService.isBiometricsAvailable().then(setIsBiometricsAvailable);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialTab, userProfile]);

  if (!isOpen) return null;

  // Answer matching calculations
  const isAnswerStarted = securityAnswer.trim().length > 0;
  const isConfirmStarted = confirmSecurityAnswer.trim().length > 0;
  const answersMatch = isAnswerStarted && isConfirmStarted && (securityAnswer.trim().toLowerCase() === confirmSecurityAnswer.trim().toLowerCase());
  const answersMismatch = isAnswerStarted && isConfirmStarted && !answersMatch;

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

        // Validate Security Question & Double Answer
        if (!securityQuestion.trim()) {
          setError('Please select or write a Security Question for account recovery.');
          setIsProcessing(false);
          return;
        }

        if (!securityAnswer.trim()) {
          setError('Please enter your secret Security Answer.');
          setIsProcessing(false);
          return;
        }

        if (securityAnswer.trim().length < 2) {
          setError('Security Answer must be at least 2 characters.');
          setIsProcessing(false);
          return;
        }

        if (!confirmSecurityAnswer.trim()) {
          setError('Please repeat your Security Answer in the confirmation field.');
          setIsProcessing(false);
          return;
        }

        if (securityAnswer.trim().toLowerCase() !== confirmSecurityAnswer.trim().toLowerCase()) {
          setError('Security Answer and Confirmation Answer do not match. Please verify.');
          setIsProcessing(false);
          return;
        }

        const hashedAnswer = await SecurityPinService.hashSecurityAnswer(securityAnswer.trim(), salt);
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
        // --- PIN LOCK (ON REFRESH / VISITS) ---
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
          };

          if (uid) {
            SecurityPinService.clearLocalConfig(uid);
            SecurityPinService.setSessionUnlocked(uid);
          }

          SettingsService.updateSettings({
            privacy: {
              ...SettingsService.getSettings().privacy,
              pinLock: false,
              appLock: false,
              pin: '',
              pinLength: 4,
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

        // Validate Security Question & Double Answer
        if (!securityQuestion.trim()) {
          setError('Please select or write a Security Question for account recovery.');
          setIsProcessing(false);
          return;
        }

        if (!securityAnswer.trim()) {
          setError('Please enter your secret Security Answer.');
          setIsProcessing(false);
          return;
        }

        if (securityAnswer.trim().length < 2) {
          setError('Security Answer must be at least 2 characters.');
          setIsProcessing(false);
          return;
        }

        if (!confirmSecurityAnswer.trim()) {
          setError('Please repeat your Security Answer in the confirmation field.');
          setIsProcessing(false);
          return;
        }

        if (securityAnswer.trim().toLowerCase() !== confirmSecurityAnswer.trim().toLowerCase()) {
          setError('Security Answer and Confirmation Answer do not match. Please verify.');
          setIsProcessing(false);
          return;
        }

        const hashedAnswer = await SecurityPinService.hashSecurityAnswer(securityAnswer.trim(), salt);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 overflow-hidden text-left my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Switcher (if not disabling) */}
        {!isDisabling && (
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-4">
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
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-2xl text-white shadow-md ${
            activeTab === 'twostep'
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
              : 'bg-gradient-to-tr from-primary-600 to-indigo-600'
          }`}>
            {isDisabling ? (
              <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : activeTab === 'twostep' ? (
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <KeyRound className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {isDisabling
                ? activeTab === 'twostep' ? 'Disable 2-Step Login' : 'Disable Security PIN'
                : activeTab === 'twostep'
                ? existingTwoFactor ? 'Change 2-Step Password' : 'Set Up 2-Step Login'
                : existingPin ? 'Change Security PIN' : 'Set Up Security PIN'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === 'twostep'
                ? 'Protects your account whenever signing in from any device.'
                : 'Locks your workspace whenever you refresh or revisit the page.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    required
                  />
                </div>
              )}

              {!isDisabling && (
                <>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Step 1: Set Login Password</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-slate-400" />}
                        <span>{showSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>

                    <div>
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={twoStepPassword}
                        onChange={(e) => setTwoStepPassword(e.target.value)}
                        placeholder="Create new 2-step password"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        required
                      />
                    </div>

                    <div>
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={confirmTwoStepPassword}
                        onChange={(e) => setConfirmTwoStepPassword(e.target.value)}
                        placeholder="Confirm 2-step password"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        required
                      />
                    </div>
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
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
                    required
                  />
                </div>
              )}

              {!isDisabling && (
                <>
                  {/* Step 1: PIN Format & Values */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                        <KeyRound className="w-4 h-4 text-primary-500" />
                        <span>Step 1: Choose {pinLength}-Digit PIN</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showSecret ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <input
                          type={showSecret ? 'text' : 'password'}
                          maxLength={pinLength}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                          placeholder={`Enter ${pinLength} numbers`}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
                          required
                        />
                      </div>

                      <div>
                        <input
                          type={showSecret ? 'text' : 'password'}
                          maxLength={pinLength}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          placeholder={`Confirm ${pinLength} numbers`}
                          className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ======================= SHARED STEP 2: SECURITY RECOVERY QUESTION & DOUBLE ANSWER ======================= */}
          {!isDisabling && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-slate-850 dark:border-amber-500/30 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  <span>Step 2: Recovery Security Question</span>
                </span>
                
                {/* Segmented Mode Picker: Preset Templates vs Custom Question */}
                <div className="flex p-0.5 bg-amber-500/15 dark:bg-slate-800 rounded-xl self-start sm:self-auto border border-amber-500/20">
                  <button
                    type="button"
                    onClick={() => {
                      setQuestionMode('template');
                      if (!SecurityPinService.DEFAULT_SECURITY_QUESTIONS.includes(securityQuestion)) {
                        setSecurityQuestion(SecurityPinService.DEFAULT_SECURITY_QUESTIONS[0]);
                      }
                    }}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-black transition flex items-center gap-1 ${
                      questionMode === 'template'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-700 dark:text-amber-300 hover:text-amber-900'
                    }`}
                  >
                    <ListFilter className="w-3 h-3" />
                    <span>Choose Template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuestionMode('custom')}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-black transition flex items-center gap-1 ${
                      questionMode === 'custom'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-amber-700 dark:text-amber-300 hover:text-amber-900'
                    }`}
                  >
                    <PenTool className="w-3 h-3" />
                    <span>Write My Own</span>
                  </button>
                </div>
              </div>

              {/* Question Selection UI */}
              {questionMode === 'template' ? (
                <div className="space-y-2">
                  {/* Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {SecurityPinService.SECURITY_QUESTION_CATEGORIES.map((cat) => (
                      <button
                        key={cat.category}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.category);
                          setSecurityQuestion(cat.questions[0]);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 border ${
                          selectedCategory === cat.category
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.category}</span>
                      </button>
                    ))}
                  </div>

                  {/* Dropdown for current category */}
                  <div className="relative">
                    <select
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      {SecurityPinService.SECURITY_QUESTION_CATEGORIES.find((c) => c.category === selectedCategory)?.questions.map((q, idx) => (
                        <option key={idx} value={q}>
                          {q}
                        </option>
                      )) || SecurityPinService.DEFAULT_SECURITY_QUESTIONS.map((q, idx) => (
                        <option key={idx} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    placeholder="E.g., What was the name of my first high school band?"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-400"
                    required
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                    Write a custom question whose secret answer only you will remember.
                  </span>
                </div>
              )}

              {/* Double-Entry Security Answer Section */}
              <div className="pt-2 border-t border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <span>Secret Recovery Answer</span>
                    <span className="text-amber-500 font-bold">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAnswers(!showAnswers)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    {showAnswers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showAnswers ? 'Hide Answers' : 'Show Answers'}</span>
                  </button>
                </div>

                {/* Answer 1 */}
                <div>
                  <input
                    type={showAnswers ? 'text' : 'password'}
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Enter secret answer"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    required
                  />
                </div>

                {/* Answer 2 (Confirmation - repeated two times) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Repeat Security Answer (To Confirm)
                  </label>
                  <input
                    type={showAnswers ? 'text' : 'password'}
                    value={confirmSecurityAnswer}
                    onChange={(e) => setConfirmSecurityAnswer(e.target.value)}
                    placeholder="Repeat answer exact match"
                    className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 border rounded-xl text-xs text-slate-900 dark:text-white outline-none font-medium transition ${
                      answersMatch
                        ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                        : answersMismatch
                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-400'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500'
                    }`}
                    required
                  />
                </div>

                {/* Real-time Matching Indicator Banner */}
                {answersMatch ? (
                  <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Answers match perfectly (case-insensitive)</span>
                  </div>
                ) : answersMismatch ? (
                  <div className="p-2 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Answers do not match yet</span>
                  </div>
                ) : (
                  <div className="p-2 bg-amber-500/10 rounded-xl text-slate-600 dark:text-slate-400 text-[10px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Repeat your answer twice so you never get locked out.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Biometrics & 50-day Notice (PIN tab) */}
          {!isDisabling && activeTab === 'pin' && (
            <>
              {isBiometricsAvailable && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Fingerprint / Face ID Unlock
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Instant biometric access on refresh or revisit
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

              {/* 50-day policy footer badge */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>50-Day Reset Holding:</strong> If PIN and security answers are forgotten, automatic credential reset is scheduled for 50 days to protect your data.
                </span>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
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
                  <Check className="w-4 h-4" /> Save & Enable Security
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
