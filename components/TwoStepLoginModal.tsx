import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  LogOut, 
  AlertCircle, 
  RefreshCw, 
  HelpCircle,
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';
import { SecurityPinService } from '../services/securityPinService';
import { SettingsService } from '../services/settingsService';
import Logo from './Logo';

interface TwoStepLoginModalProps {
  userProfile: UserProfile;
  uid: string;
  onVerifySuccess: () => void;
  onLogout: () => void;
  onUpdateProfile?: (updatedProfile: Partial<UserProfile>) => Promise<void> | void;
}

export const TwoStepLoginModal: React.FC<TwoStepLoginModalProps> = ({
  userProfile,
  uid,
  onVerifySuccess,
  onLogout,
  onUpdateProfile,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Recovery States
  const [enteredAnswer, setEnteredAnswer] = useState('');
  const [isAnswerVerified, setIsAnswerVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const storedSecret = userProfile.twoFactorPassword || userProfile.securityPin || '';
  const configuredQuestion = userProfile.securityQuestion || SettingsService.getSettings().privacy.securityQuestion || '';
  const configuredAnswer = userProfile.securityAnswer || SettingsService.getSettings().privacy.securityAnswer || '';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your Two-Step Verification Password.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const isValid = await SecurityPinService.verifySecret(password.trim(), storedSecret, uid);

      if (isValid) {
        SecurityPinService.setTwoStepVerified(uid);
        onVerifySuccess();
      } else {
        setError('Incorrect Two-Step Verification Password. Please try again.');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Verification error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify Security Answer for 2-step reset
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

  // Save new 2-step password after answer verified
  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (newPassword.length < 4) {
      setForgotError('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError('New password and confirmation password do not match.');
      return;
    }

    try {
      setIsResetting(true);
      const hashed = await SecurityPinService.hashSecret(newPassword.trim(), uid);

      const updatedProfile: Partial<UserProfile> = {
        twoFactorEnabled: true,
        twoFactorPassword: hashed,
      };

      if (onUpdateProfile) {
        await onUpdateProfile(updatedProfile);
      }

      SettingsService.updateSettings({
        privacy: {
          ...SettingsService.getSettings().privacy,
          twoFactor: true,
          twoFactorPassword: hashed,
        },
      });

      SecurityPinService.setTwoStepVerified(uid);
      setShowForgotModal(false);
      onVerifySuccess();
    } catch (err: any) {
      setForgotError(err?.message || 'Failed to save new password. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 overflow-hidden text-left">
        {/* Top Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 p-0.5 shadow-xl flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
                <Logo className="w-10 h-10" iconOnly noBorder />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full shadow-md">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            2-Step Login Verification
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
            Welcome back, <strong className="text-slate-800 dark:text-slate-200">{userProfile.displayName || 'Student'}</strong>! Please enter your 2-Step Verification Password to access your account.
          </p>

          {userProfile.email && (
            <span className="mt-2 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[11px] font-mono border border-slate-200 dark:border-slate-700">
              {userProfile.email}
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!storedSecret ? (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-800 dark:text-amber-200 text-xs leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-100">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                No 2-Step Password Kept
              </div>
              <p>
                Your account does not have a 2-Step Verification password configured yet. You can continue into your account and configure one in Settings &gt; Privacy &amp; Security.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                SecurityPinService.setTwoStepVerified(uid);
                onVerifySuccess();
              }}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Continue to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  2-Step Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your 2-step password"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Verify &amp; Continue
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={() => {
              setForgotError(null);
              setEnteredAnswer('');
              setIsAnswerVerified(false);
              setNewPassword('');
              setConfirmNewPassword('');
              setShowForgotModal(true);
            }}
            className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Forgot Password?</span>
          </button>

          <button
            onClick={onLogout}
            className="hover:text-rose-500 flex items-center gap-1 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Forgot Password / Security Question Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full text-left space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                2-Step Password Recovery
              </h3>
            </div>

            {/* Policy Notice: 50-Day Reset */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                  50-Day Automatic Reset Policy
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  Lost passwords without verified recovery answers are protected by a mandatory <strong>50-day holding delay</strong> before reset. If you set a security question, verify it below for instant access.
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-xs flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* Case A: Configured Question Exists */}
            {configuredQuestion && configuredAnswer ? (
              !isAnswerVerified ? (
                /* Step 1: Answer Question */
                <form onSubmit={handleVerifySecurityAnswer} className="space-y-3.5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                      Your Security Question:
                    </span>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      &ldquo;{configuredQuestion}&rdquo;
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Your Security Answer
                    </label>
                    <input
                      type="text"
                      autoFocus
                      value={enteredAnswer}
                      onChange={(e) => setEnteredAnswer(e.target.value)}
                      placeholder="Enter the secret answer you set"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Answer matching is case-insensitive.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting || !enteredAnswer.trim()}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                /* Step 2: Set New 2-Step Password */
                <form onSubmit={handleSaveResetPassword} className="space-y-3.5 animate-in fade-in">
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span><strong>Answer Verified!</strong> Create your new 2-Step password below:</span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        New 2-Step Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                      >
                        {showNewPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showNewPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new 2-step password"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Confirm New 2-Step Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new 2-step password"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting || !newPassword || newPassword !== confirmNewPassword}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isResetting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Save &amp; Unlock Account
                      </>
                    )}
                  </button>
                </form>
              )
            ) : (
              /* Case B: No Question Configured -> Show 50-day reset holding and contact support */
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  No recovery security question was configured on this account. Under our data security policy, your account credentials will automatically reset in <strong>50 days</strong>.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                  For immediate identity verification, please contact admin support at <strong className="text-slate-800 dark:text-slate-200">support@sjtutorai.com</strong>.
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                  >
                    Back to Verification
                  </button>
                  <button
                    onClick={onLogout}
                    className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
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
