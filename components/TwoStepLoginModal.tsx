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
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { SecurityPinService } from '../services/securityPinService';
import Logo from './Logo';

interface TwoStepLoginModalProps {
  userProfile: UserProfile;
  uid: string;
  onVerifySuccess: () => void;
  onLogout: () => void;
}

export const TwoStepLoginModal: React.FC<TwoStepLoginModalProps> = ({
  userProfile,
  uid,
  onVerifySuccess,
  onLogout,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const storedSecret = userProfile.twoFactorPassword || userProfile.securityPin || '';
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

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-7 overflow-hidden text-left">
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

          <h3 className="text-xl font-black text-slate-900 dark:text-white">
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
                <Lock className="w-4 h-4" /> Verify & Continue
              </>
            )}
          </button>
        </form>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={() => setShowForgotModal(true)}
            className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Need help?</span>
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

      {/* Forgot / Help Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full text-left space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">2-Step Verification Help</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your 2-Step Verification Password was created in your SJ Tutor AI Security Settings to protect your account during sign-in.
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
              If you lost access, you can sign out and contact admin support at <strong className="text-slate-800 dark:text-slate-200">support@sjtutorai.com</strong>.
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
        </div>
      )}
    </div>
  );
};
