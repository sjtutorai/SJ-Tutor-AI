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
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';
import { SecurityPinService } from '../services/securityPinService';
import { SettingsService } from '../services/settingsService';

interface SecurityPinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  uid?: string;
  onSuccess: (updatedProfile: Partial<UserProfile>) => void;
  isDisabling?: boolean;
}

export const SecurityPinSetupModal: React.FC<SecurityPinSetupModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  uid,
  onSuccess,
  isDisabling = false,
}) => {
  const [pinLength, setPinLength] = useState<4 | 6>(userProfile.securityPinLength || 4);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState<boolean>(userProfile.biometricsEnabled ?? true);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const existingPin = userProfile.securityPin || SettingsService.getSettings().privacy.pin || '';
  const isUpdating = !isDisabling && !!existingPin;

  const currentInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinLength(userProfile.securityPinLength || 4);
      setEnableBiometrics(userProfile.biometricsEnabled ?? true);
      SecurityPinService.isBiometricsAvailable().then(setIsBiometricsAvailable);

      setTimeout(() => {
        if (existingPin) {
          currentInputRef.current?.focus();
        } else {
          newInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, userProfile, existingPin]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // If updating or disabling, verify current PIN first
      if (existingPin) {
        const isCurrentValid = await SecurityPinService.verifyPin(currentPin, existingPin, uid || 'sjtutor');
        if (!isCurrentValid) {
          setError('Current security PIN is incorrect. Please re-enter.');
          setIsProcessing(false);
          return;
        }
      }

      // Handle disabling
      if (isDisabling) {
        const updated: Partial<UserProfile> = {
          twoFactorEnabled: false,
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
            twoFactor: false,
            pin: '',
            biometrics: false,
          },
        });

        onSuccess(updated);
        onClose();
        setIsProcessing(false);
        return;
      }

      // Validate new PIN
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

      // Hash PIN for security
      const salt = uid || 'sjtutor_user';
      const pinHash = await SecurityPinService.hashPin(cleanNewPin, salt);

      const updated: Partial<UserProfile> = {
        twoFactorEnabled: true,
        securityPin: pinHash,
        securityPinLength: pinLength,
        biometricsEnabled: enableBiometrics && isBiometricsAvailable,
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
          twoFactor: true,
          pin: pinHash,
          pinLength,
          biometrics: enableBiometrics && isBiometricsAvailable,
        },
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update security PIN. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 overflow-hidden text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-gradient-to-tr from-primary-600 to-indigo-600 text-white rounded-2xl shadow-md">
            {isDisabling ? (
              <Lock className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {isDisabling
                ? 'Disable Two-Step PIN'
                : isUpdating
                ? 'Change Security PIN'
                : 'Set Up Two-Step Verification'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isDisabling
                ? 'Enter your current PIN to turn off two-step lock.'
                : 'Protect your account across all logins and page refreshes.'}
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
          {/* If updating or disabling, ask for current PIN */}
          {existingPin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Current Security PIN
              </label>
              <div className="relative">
                <input
                  ref={currentInputRef}
                  type={showPin ? 'text' : 'password'}
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter current PIN"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
            </div>
          )}

          {!isDisabling && (
            <>
              {/* Select PIN Length (4 vs 6 Digits) */}
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
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      pinLength === 4
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-700 dark:text-primary-300 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <KeyRound className="w-4 h-4" /> 4-Digit PIN
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPinLength(6);
                      setNewPin('');
                      setConfirmPin('');
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      pinLength === 6
                        ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-700 dark:text-primary-300 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" /> 6-Digit PIN (Higher Security)
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
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPin ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  ref={newInputRef}
                  type={showPin ? 'text' : 'password'}
                  maxLength={pinLength}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={`Enter ${pinLength} numbers`}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              {/* Confirm PIN Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm {pinLength}-Digit PIN
                </label>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={pinLength}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={`Re-enter ${pinLength} numbers`}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-lg font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>

              {/* Biometrics Toggle (Fingerprint / Face ID / WebAuthn) */}
              {isBiometricsAvailable && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Enable Biometrics / Passkey
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Unlock using Fingerprint or Face ID
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
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  This PIN will be requested each time you log in or refresh the page to ensure complete account privacy.
                </span>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className={`flex-1 py-3 px-4 rounded-xl text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 ${
                isDisabling
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-primary-600 hover:bg-primary-700'
              } disabled:opacity-50`}
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isDisabling ? (
                <>
                  <Lock className="w-4 h-4" /> Disable Verification
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Save & Enable PIN
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
