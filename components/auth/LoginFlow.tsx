import React, { useState } from 'react';
import {
  Loader2,
  Mail,
  Github,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { GoogleIcon, AppleIcon, YahooIcon } from './AuthIcons';
import {
  handleSocialAuth,
  loginWithEmail,
  loginSjTutorIdStep1,
  verifySjTutorIdStep2Pin,
  recoverAccountStep1,
  recoverAccountStep2Verify,
  sendPasswordReset,
} from '../../services/authService';
import { SecurityPinService } from '../../services/securityPinService';

interface LoginFlowProps {
  onSuccess: (userData: any) => void;
  onSwitchToSignUp: () => void;
}

type LoginView =
  | 'OVERVIEW'
  | 'ACCOUNT_NOT_FOUND'
  | 'EMAIL'
  | 'SJTUTOR_ID'
  | 'PIN_VERIFY'
  | 'RECOVER_LOOKUP'
  | 'RECOVER_ANSWER'
  | 'RECOVER_SUCCESS';

export const LoginFlow: React.FC<LoginFlowProps> = ({ onSuccess, onSwitchToSignUp }) => {
  const [activeView, setActiveView] = useState<LoginView>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // SJ Tutor AI ID login
  const [sjTutorIdInput, setSjTutorIdInput] = useState('');
  const [sjTutorPassword, setSjTutorPassword] = useState('');
  const [showSjTutorPw, setShowSjTutorPw] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(6);
  const [pin, setPin] = useState('');

  // Account Recovery states
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverQuestion, setRecoverQuestion] = useState('');
  const [recoverSjTutorId, setRecoverSjTutorId] = useState('');
  const [recoverAnswer, setRecoverAnswer] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [recoverNewPin, setRecoverNewPin] = useState('');
  const [recoverPinLength, setRecoverPinLength] = useState<4 | 6>(6);
  const [recoverSuccessMsg, setRecoverSuccessMsg] = useState('');

  // -------------------------------------------------------------
  // 1. Social Log In
  // -------------------------------------------------------------
  const handleSocialLogin = async (provider: 'google' | 'apple' | 'yahoo' | 'github') => {
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await handleSocialAuth(provider, 'signin');
      if (res.status === 'ACCOUNT_NOT_FOUND') {
        setActiveView('ACCOUNT_NOT_FOUND');
        return;
      }
      if (res.status === 'SUCCESS') {
        if (res.user?.uid) {
          SecurityPinService.markLoginAttempt(res.user.uid);
        }
        onSuccess(res.user);
      } else if (res.status === 'ERROR') {
        setErrorAlert(res.message || 'Authentication error.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Error signing in with provider.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. Email + Password Log In
  // -------------------------------------------------------------
  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await loginWithEmail(email, password);
      if (res.status === 'ACCOUNT_NOT_FOUND') {
        setActiveView('ACCOUNT_NOT_FOUND');
        return;
      }
      if (res.status === 'INCORRECT_PASSWORD') {
        setErrorAlert(res.message || 'The password you entered is incorrect. Please try again.');
        return;
      }
      if (res.status === 'TOO_MANY_ATTEMPTS') {
        setErrorAlert('Too many unsuccessful attempts. Please wait 15 minutes and try again.');
        return;
      }
      if (res.status === 'SUCCESS') {
        if (res.user?.uid) {
          SecurityPinService.markLoginAttempt(res.user.uid);
        }
        onSuccess(res.user);
      } else {
        setErrorAlert(res.message || 'Login failed.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Could not connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. SJ Tutor AI ID Login - Step 1
  // -------------------------------------------------------------
  const handleSjTutorIdStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await loginSjTutorIdStep1(sjTutorIdInput, sjTutorPassword);
      if (res.status === 'ACCOUNT_NOT_FOUND') {
        setActiveView('ACCOUNT_NOT_FOUND');
        return;
      }
      if (res.status === 'INCORRECT_PASSWORD') {
        setErrorAlert('The password you entered is incorrect. Please try again.');
        return;
      }
      if (res.status === 'TOO_MANY_ATTEMPTS') {
        setErrorAlert('Too many failed attempts. Account temporarily locked for 15 minutes.');
        return;
      }
      if (res.status === 'PIN_REQUIRED') {
        setChallengeId(res.challengeId || '');
        setPinLength(res.pinLength || 6);
        setPin('');
        setActiveView('PIN_VERIFY');
      } else {
        setErrorAlert(res.message || 'Authentication failed.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Network error during login.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 4. SJ Tutor AI ID Login - Step 2 (PIN Verification, NO OTP!)
  // -------------------------------------------------------------
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length !== pinLength) {
      setErrorAlert(`Please enter your ${pinLength}-digit security PIN.`);
      return;
    }
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await verifySjTutorIdStep2Pin(challengeId, pin);
      if (res.status === 'INCORRECT_PIN') {
        setErrorAlert('The security PIN you entered is incorrect. Please try again.');
        return;
      }
      if (res.status === 'TOO_MANY_ATTEMPTS') {
        setErrorAlert('Too many failed attempts. Please wait 15 minutes.');
        return;
      }
      if (res.status === 'SUCCESS') {
        if (res.user?.uid) {
          SecurityPinService.markLoginAttempt(res.user.uid);
        }
        onSuccess(res.user);
      } else {
        setErrorAlert(res.message || 'PIN verification failed.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Error verifying PIN.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 5. Account Recovery Flow
  // -------------------------------------------------------------
  const handleLookupRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await recoverAccountStep1(recoverIdentifier);
      if (!res.success) {
        setErrorAlert(res.message || 'No account found matching this identifier.');
        return;
      }
      setRecoverSjTutorId(res.sjTutorId || recoverIdentifier);
      setRecoverQuestion(res.securityQuestion || 'What was the name of your first school?');
      setActiveView('RECOVER_ANSWER');
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Error connecting to recovery service.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverAnswer.trim()) {
      setErrorAlert('Please enter your security answer.');
      return;
    }
    if (recoverNewPassword.length < 8) {
      setErrorAlert('New password must be at least 8 characters.');
      return;
    }
    if (recoverNewPin.trim().length !== recoverPinLength) {
      setErrorAlert(`New PIN must be ${recoverPinLength} digits.`);
      return;
    }

    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await recoverAccountStep2Verify({
        sjTutorId: recoverSjTutorId,
        securityAnswer: recoverAnswer,
        newPassword: recoverNewPassword,
        newPin: recoverNewPin,
        pinLength: recoverPinLength,
      });

      if (!res.success) {
        setErrorAlert(res.message || 'Incorrect security answer.');
        return;
      }

      setRecoverSuccessMsg('Your security password and PIN have been successfully reset!');
      setActiveView('RECOVER_SUCCESS');
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Recovery verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailReset = async () => {
    if (!recoverIdentifier) return;
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await sendPasswordReset(recoverIdentifier);
      setRecoverSuccessMsg(res.message);
      setActiveView('RECOVER_SUCCESS');
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Global Error Notice */}
      {errorAlert && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span>{errorAlert}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: OVERVIEW (ALL LOGIN METHODS)
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'OVERVIEW' && (
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Log in to continue your learning journey.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm disabled:opacity-50"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-xl font-medium hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
            >
              <AppleIcon className="w-5 h-5" />
              <span>Continue with Apple</span>
            </button>

            <button
              onClick={() => handleSocialLogin('yahoo')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#6001D2] text-white rounded-xl font-medium hover:bg-[#5200b3] transition-colors shadow-sm disabled:opacity-50"
            >
              <YahooIcon className="w-5 h-5" />
              <span>Continue with Yahoo</span>
            </button>

            <button
              onClick={() => handleSocialLogin('github')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-900 dark:bg-slate-950 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            >
              <Github className="w-5 h-5" />
              <span>Continue with GitHub</span>
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 font-semibold tracking-wider">
                OR
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => setActiveView('EMAIL')}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold transition-colors"
            >
              <Mail className="w-5 h-5 text-amber-500" />
              <span>Log in with Email & Password</span>
            </button>

            <button
              onClick={() => setActiveView('SJTUTOR_ID')}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-all shadow-sm shadow-amber-500/20"
            >
              <KeyRound className="w-5 h-5" />
              <span>Log in with SJ Tutor AI ID & PIN</span>
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <button
              onClick={onSwitchToSignUp}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: ACCOUNT NOT FOUND
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'ACCOUNT_NOT_FOUND' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Account Not Found
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs mx-auto">
            We couldn&apos;t find an SJ Tutor AI account associated with this login. Please try signing up first.
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={onSwitchToSignUp}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all shadow-sm shadow-amber-500/20"
            >
              Sign Up
            </button>
            <button
              onClick={() => setActiveView('OVERVIEW')}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: EMAIL + PASSWORD LOGIN
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'EMAIL' && (
        <div>
          <button
            onClick={() => setActiveView('OVERVIEW')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All login options</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Log in with Email
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Enter your email address and password.
            </p>
          </div>

          <form onSubmit={handleEmailLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverIdentifier(email);
                    setActiveView('RECOVER_LOOKUP');
                  }}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Log In</span>}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <button
              onClick={onSwitchToSignUp}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: SJ TUTOR AI ID LOGIN - STEP 1 (ID + PASSWORD)
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'SJTUTOR_ID' && (
        <div>
          <button
            onClick={() => setActiveView('OVERVIEW')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All login options</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Log in with SJ Tutor AI ID
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Enter your unique ID and 2-step verification password.
            </p>
          </div>

          <form onSubmit={handleSjTutorIdStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SJ Tutor AI ID
              </label>
              <input
                type="text"
                required
                placeholder="SJTA-XXXXXX"
                value={sjTutorIdInput}
                onChange={(e) => setSjTutorIdInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 font-mono uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  2-Step Verification Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverIdentifier(sjTutorIdInput);
                    setActiveView('RECOVER_LOOKUP');
                  }}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showSjTutorPw ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={sjTutorPassword}
                  onChange={(e) => setSjTutorPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSjTutorPw(!showSjTutorPw)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showSjTutorPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue to PIN</span>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setActiveView('RECOVER_LOOKUP')}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
            >
              Forgot your SJ Tutor AI ID or PIN? Recover account
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: SJ TUTOR AI ID LOGIN - STEP 2 (PIN VERIFICATION)
          (NO OTP! Strictly verifies 4 or 6-digit PIN)
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'PIN_VERIFY' && (
        <div>
          <button
            onClick={() => setActiveView('SJTUTOR_ID')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Enter Your Security PIN
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Enter your {pinLength}-digit security PIN to unlock your account.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-5">
            <div>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                maxLength={pinLength}
                placeholder={'•'.repeat(pinLength)}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== pinLength}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify PIN & Log In</span>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setRecoverIdentifier(sjTutorIdInput);
                setActiveView('RECOVER_LOOKUP');
              }}
              className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Forgot your PIN? Recover using Security Question
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: ACCOUNT RECOVERY - LOOKUP
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'RECOVER_LOOKUP' && (
        <div>
          <button
            onClick={() => setActiveView('OVERVIEW')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Recover Your Account
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Enter your SJ Tutor AI ID or registered email address.
            </p>
          </div>

          <form onSubmit={handleLookupRecovery} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SJ Tutor AI ID or Email
              </label>
              <input
                type="text"
                required
                placeholder="SJTA-XXXXXX or student@example.com"
                value={recoverIdentifier}
                onChange={(e) => setRecoverIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue Recovery</span>}
            </button>

            {recoverIdentifier.includes('@') && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSendEmailReset}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 underline"
                >
                  Send a password reset link to this email instead
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: ACCOUNT RECOVERY - ANSWER & NEW CREDENTIALS
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'RECOVER_ANSWER' && (
        <div>
          <button
            onClick={() => setActiveView('RECOVER_LOOKUP')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="text-center mb-5">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Answer Security Question
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Verify your identity to reset your password and PIN.
            </p>
          </div>

          <form onSubmit={handleVerifyRecovery} className="space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block mb-0.5">
                Security Question:
              </span>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {recoverQuestion}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Answer
              </label>
              <input
                type="text"
                required
                placeholder="Enter answer"
                value={recoverAnswer}
                onChange={(e) => setRecoverAnswer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New 2-Step Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={recoverNewPassword}
                onChange={(e) => setRecoverNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New Security PIN ({recoverPinLength} Digits)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setRecoverPinLength(4); setRecoverNewPin(''); }}
                    className={`text-[11px] px-2 py-0.5 rounded ${recoverPinLength === 4 ? 'bg-amber-500 text-white' : 'text-slate-400'}`}
                  >
                    4 Digits
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecoverPinLength(6); setRecoverNewPin(''); }}
                    className={`text-[11px] px-2 py-0.5 rounded ${recoverPinLength === 6 ? 'bg-amber-500 text-white' : 'text-slate-400'}`}
                  >
                    6 Digits
                  </button>
                </div>
              </div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={recoverPinLength}
                placeholder={'•'.repeat(recoverPinLength)}
                value={recoverNewPin}
                onChange={(e) => setRecoverNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Update Credentials & Recover</span>}
            </button>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: RECOVERY SUCCESS
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'RECOVER_SUCCESS' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Recovery Successful
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs mx-auto">
            {recoverSuccessMsg || 'Your account credentials have been updated.'}
          </p>
          <button
            onClick={() => setActiveView('OVERVIEW')}
            className="w-full mt-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all shadow-sm shadow-amber-500/20"
          >
            Return to Log In
          </button>
        </div>
      )}
    </div>
  );
};
