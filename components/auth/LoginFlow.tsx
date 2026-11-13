import React, { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Mail,
  Github,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  QrCode,
  ScanLine,
  Camera,
  UploadCloud,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Search,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { GoogleIcon, AppleIcon, YahooIcon } from './AuthIcons';
import { UnauthorizedDomainModal } from './UnauthorizedDomainModal';
import {
  handleSocialAuth,
  loginWithEmail,
  loginSjTutorIdStep1,
  verifySjTutorIdStep2Pin,
  recoverAccountStep1,
  recoverAccountStep2Verify,
  sendPasswordReset,
  findAccountAndLoginWithIdCard,
} from '../../services/authService';
import { SecurityPinService } from '../../services/securityPinService';

const REMEMBER_EMAIL_KEY = 'sjtutor_remembered_email';

interface LoginFlowProps {
  onSuccess: (userData: any) => void;
  onSwitchToSignUp: (prefilledEmail?: string) => void;
  prefilledIdentifier?: string;
}

type LoginView =
  | 'OVERVIEW'
  | 'ID_CARD_LOGIN'
  | 'ACCOUNT_NOT_FOUND'
  | 'EMAIL'
  | 'SJTUTOR_ID'
  | 'PIN_VERIFY'
  | 'RECOVER_LOOKUP'
  | 'RECOVER_ANSWER'
  | 'RECOVER_SUCCESS';

export const LoginFlow: React.FC<LoginFlowProps> = ({
  onSuccess,
  onSwitchToSignUp,
  prefilledIdentifier,
}) => {
  const isPrefilledEmail = prefilledIdentifier?.includes('@');
  const initialView: LoginView = prefilledIdentifier
    ? isPrefilledEmail
      ? 'OVERVIEW'
      : 'SJTUTOR_ID'
    : 'OVERVIEW';

  const [activeView, setActiveView] = useState<LoginView>(initialView);
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [unauthorizedDomainData, setUnauthorizedDomainData] = useState<{
    domain?: string;
    provider?: string;
  } | null>(null);

  // Email + Password form (with Remember Me)
  const [email, setEmail] = useState(() => {
    if (isPrefilledEmail && prefilledIdentifier) return prefilledIdentifier;
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(REMEMBER_EMAIL_KEY));
    } catch {
      return true;
    }
  });

  // SJ Tutor AI ID login
  const [sjTutorIdInput, setSjTutorIdInput] = useState(
    !isPrefilledEmail && prefilledIdentifier ? prefilledIdentifier : ''
  );
  const [sjTutorPassword, setSjTutorPassword] = useState('');
  const [showSjTutorPw, setShowSjTutorPw] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(6);
  const [pin, setPin] = useState('');

  // ID Card Login states
  const [idCardInput, setIdCardInput] = useState('');
  const [idCardMode, setIdCardMode] = useState<'scan' | 'upload' | 'manual'>('scan');
  const [foundStudentAccount, setFoundStudentAccount] = useState<any | null>(null);
  const [isSearchingFirestore, setIsSearchingFirestore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live QR camera scanner lifecycle
  useEffect(() => {
    if (activeView !== 'ID_CARD_LOGIN' || idCardMode !== 'scan' || foundStudentAccount) return;

    let scanner: Html5QrcodeScanner | null = null;
    const timer = setTimeout(() => {
      try {
        const el = document.getElementById('login-id-card-qr-reader');
        if (el) {
          scanner = new Html5QrcodeScanner(
            'login-id-card-qr-reader',
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
              aspectRatio: 1.0,
            },
            false
          );
          scanner.render(
            (decodedText) => {
              handleProcessIdCard(decodedText);
            },
            () => {}
          );
        }
      } catch (err) {
        console.warn('Scanner initialization warning:', err);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [activeView, idCardMode, foundStudentAccount]);

  const handleIdCardFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSearchingFirestore(true);
    setErrorAlert(null);
    try {
      const html5QrCode = new Html5Qrcode('hidden-file-qr-reader');
      const decodedText = await html5QrCode.scanFile(file, false);
      html5QrCode.clear();
      await handleProcessIdCard(decodedText);
    } catch (err) {
      console.warn('Could not scan QR code from image:', err);
      setErrorAlert(
        'Could not detect a valid QR code in this image. Please enter the ID card number directly.'
      );
      setIdCardMode('manual');
    } finally {
      setIsSearchingFirestore(false);
    }
  };

  const handleProcessIdCard = async (val: string) => {
    const target = val.trim();
    if (!target) return;
    setIsSearchingFirestore(true);
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await findAccountAndLoginWithIdCard(target);
      if (!res.success || !res.user) {
        setErrorAlert(
          res.message ||
            'No student account found in Firestore for this registration number / ID card.'
        );
        return;
      }
      setFoundStudentAccount(res.user);
      setSuccessNotice('Student identity verified from Firestore!');
      if (res.user?.uid) {
        SecurityPinService.markLoginAttempt(res.user.uid);
      }
      setTimeout(() => {
        onSuccess(res.user);
      }, 950);
    } catch (err: any) {
      console.error(err);
      setErrorAlert('An error occurred while finding your account from Firestore.');
    } finally {
      setIsSearchingFirestore(false);
      setLoading(false);
    }
  };

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
    setSuccessNotice(null);
    try {
      const res = await handleSocialAuth(provider, 'signin');
      if (res.status === 'ACCOUNT_NOT_FOUND') {
        setActiveView('ACCOUNT_NOT_FOUND');
        return;
      }
      if (res.status === 'UNAUTHORIZED_DOMAIN') {
        setUnauthorizedDomainData({
          domain: res.domain || (typeof window !== 'undefined' ? window.location.hostname : ''),
          provider,
        });
        return;
      }
      if (res.status === 'SUCCESS') {
        setSuccessNotice('Authenticated! Launching your student dashboard...');
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
    setSuccessNotice(null);

    try {
      if (rememberMe && email.trim()) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch { /* ignore storage unavailable */ }

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
        setSuccessNotice('Welcome back! Opening your study workspace...');
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
  // 4. SJ Tutor AI ID Login - Step 2 (PIN Verification)
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
        setSuccessNotice('PIN verified! Entering dashboard...');
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

  const fieldClasses =
    'w-full pl-10 pr-4 py-3 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/35 focus:shadow-[0_0_20px_rgba(37,99,235,0.22)] outline-none transition-all';

  return (
    <div className="w-full max-w-md mx-auto text-slate-100">
      {/* Animated Success / Error Notifications */}
      <AnimatePresence>
        {errorAlert && (
          <motion.div
            key="login-error-alert"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-200 shadow-lg"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorAlert}</span>
          </motion.div>
        )}
        {successNotice && (
          <motion.div
            key="login-success-alert"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          VIEW: OVERVIEW (PRIMARY EMAIL/PASSWORD + GOOGLE + PROVIDERS + ID CARD)
         ══════════════════════════════════════════════════════════ */}
      {(activeView === 'OVERVIEW' || activeView === 'EMAIL') && (
        <div>
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">
              Sign in to SJ Tutor AI
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter your student credentials or continue with a connected account.
            </p>
          </div>

          <form onSubmit={handleEmailLoginSubmit} className="space-y-4">
            {/* Sequential Field 1: Email */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04 }}
            >
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-400/80" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClasses}
                />
              </div>
            </motion.div>

            {/* Sequential Field 2: Password with Animated Show/Hide */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorAlert(null);
                    setRecoverIdentifier(email);
                    setActiveView('RECOVER_LOOKUP');
                  }}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-400/80" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/35 focus:shadow-[0_0_20px_rgba(37,99,235,0.22)] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <motion.span
                    key={showPassword ? 'eye-off' : 'eye'}
                    initial={{ scale: 0.75, rotate: -15, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    className="inline-flex"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </motion.span>
                </button>
              </div>
            </motion.div>

            {/* Sequential Field 3: Remember Me */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="flex items-center justify-between text-xs"
            >
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-blue-400/40 bg-[#060D28] text-blue-500 focus:ring-blue-500/40 cursor-pointer"
                />
                <span>Remember me on this device</span>
              </label>
            </motion.div>

            {/* Primary Liquid-Glow Login CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
            >
              <button
                type="submit"
                disabled={loading}
                className="btn-liquid w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/45 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Log In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-blue-400/15" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-[#0B1437] px-3 text-slate-400 font-semibold tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* Primary Google Sign-In + Other Providers & Student ID Methods */}
          <div className="space-y-3">
            <motion.button
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-semibold transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>Continue with Google</span>
            </motion.button>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-black/90 hover:bg-black border border-white/10 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                title="Continue with Apple"
              >
                <AppleIcon className="w-4 h-4" />
                <span>Apple</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('yahoo')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#6001D2] hover:bg-[#5200b3] text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                title="Continue with Yahoo"
              >
                <YahooIcon className="w-4 h-4" />
                <span>Yahoo</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('github')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                title="Continue with GitHub"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </button>
            </div>

            {/* Fast Student ID & QR Scan Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorAlert(null);
                  setActiveView('SJTUTOR_ID');
                }}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#060D28] hover:bg-[#101C48] border border-blue-400/20 text-blue-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-blue-400" />
                <span>SJ Tutor ID & PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorAlert(null);
                  setFoundStudentAccount(null);
                  setActiveView('ID_CARD_LOGIN');
                }}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Scan ID Card QR</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => onSwitchToSignUp(email || undefined)}
              className="text-blue-400 hover:text-blue-300 font-semibold hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: SJ TUTOR AI ID CARD LOGIN (FIRESTORE SYNCED)
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'ID_CARD_LOGIN' && (
        <div>
          <button
            type="button"
            onClick={() => {
              setFoundStudentAccount(null);
              setErrorAlert(null);
              setActiveView('OVERVIEW');
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to login</span>
          </button>

          <div className="text-center mb-5">
            <div className="inline-flex p-2.5 bg-emerald-500/15 rounded-2xl text-emerald-400 mb-2 border border-emerald-400/25">
              <ScanLine className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Log in with ID Card
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Scan your SJ Tutor AI Student ID card or enter your Card ID to locate and restore your account.
            </p>
          </div>

          <div id="hidden-file-qr-reader" className="hidden" />

          {foundStudentAccount ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center border-2 border-emerald-400/40">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Account Verified</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  {foundStudentAccount.displayName || foundStudentAccount.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {foundStudentAccount.sjTutorId || foundStudentAccount.registrationNumber || foundStudentAccount.uid}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-left bg-[#060D28]/90 p-3 rounded-xl border border-emerald-500/20 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Plan Tier</span>
                  <span className="font-bold text-blue-400 flex items-center gap-1 truncate">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    {foundStudentAccount.planType || 'Scholar'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Credits</span>
                  <span className="font-bold text-white tabular-nums">
                    {(foundStudentAccount.credits ?? 2000).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Streak</span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    {foundStudentAccount.streak ?? foundStudentAccount.currentStreak ?? 0}d
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSuccess(foundStudentAccount)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#060D28] rounded-xl border border-blue-400/20">
                <button
                  type="button"
                  onClick={() => setIdCardMode('scan')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    idCardMode === 'scan'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdCardMode('upload')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    idCardMode === 'upload'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdCardMode('manual')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    idCardMode === 'manual'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Reg No / ID</span>
                </button>
              </div>

              {idCardMode === 'scan' && (
                <div className="space-y-3">
                  <div
                    id="login-id-card-qr-reader"
                    className="overflow-hidden rounded-2xl border-2 border-dashed border-emerald-500/40 bg-[#060D28] p-1"
                  />
                  <p className="text-center text-xs text-slate-400">
                    Align the QR code from your SJ Tutor AI ID card in front of your camera.
                  </p>
                </div>
              )}

              {idCardMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-[#060D28]/70 rounded-2xl p-8 text-center cursor-pointer transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdCardFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Click or Drag to Upload ID Card</h4>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP screenshot of your ID card</p>
                  {isSearchingFirestore && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reading QR & checking account...</span>
                    </div>
                  )}
                </div>
              )}

              {idCardMode === 'manual' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!idCardInput.trim()) {
                      setErrorAlert('Please enter your SJ Tutor AI ID Card number or email.');
                      return;
                    }
                    handleProcessIdCard(idCardInput.trim());
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Registration Number or Student Card ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="e.g. SJTA-ACHIEVER01"
                        value={idCardInput}
                        onChange={(e) => setIdCardInput(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-3 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm font-medium text-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase placeholder:normal-case font-mono"
                      />
                      <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isSearchingFirestore}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {loading || isSearchingFirestore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching Account...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Find Account & Log In</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: ACCOUNT NOT FOUND
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'ACCOUNT_NOT_FOUND' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400 border border-blue-400/25">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Account Not Registered</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            <strong className="text-white">{email || sjTutorIdInput || 'This account'}</strong> is not yet registered with SJ Tutor AI.
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => onSwitchToSignUp(email || sjTutorIdInput)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Register (Sign Up) Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveView('OVERVIEW')}
              className="w-full py-2.5 bg-[#060D28] text-slate-300 font-medium rounded-xl hover:bg-[#101C48] transition-colors border border-blue-400/20 cursor-pointer"
            >
              Try Another Account
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
            type="button"
            onClick={() => {
              setErrorAlert(null);
              setActiveView('OVERVIEW');
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Email & Google login</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Log in with SJ Tutor AI ID
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter your unique student ID and 2-step verification password.
            </p>
          </div>

          <form onSubmit={handleSjTutorIdStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SJ Tutor AI ID
              </label>
              <input
                type="text"
                required
                placeholder="SJTA-XXXXXX"
                value={sjTutorIdInput}
                onChange={(e) => setSjTutorIdInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-3 font-mono uppercase bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  2-Step Verification Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverIdentifier(sjTutorIdInput);
                    setActiveView('RECOVER_LOOKUP');
                  }}
                  className="text-xs text-blue-400 hover:underline cursor-pointer"
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
                  className="w-full pl-4 pr-10 py-3 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSjTutorPw(!showSjTutorPw)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showSjTutorPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-liquid w-full mt-2 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue to PIN</span>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setActiveView('RECOVER_LOOKUP')}
              className="text-xs text-slate-400 hover:text-blue-400 cursor-pointer"
            >
              Forgot your SJ Tutor AI ID or PIN? Recover account
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: SJ TUTOR AI ID LOGIN - STEP 2 (PIN VERIFICATION)
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'PIN_VERIFY' && (
        <div>
          <button
            type="button"
            onClick={() => setActiveView('SJTUTOR_ID')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex p-2.5 bg-blue-500/15 rounded-xl text-blue-400 mb-2 border border-blue-400/25">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Enter Your Security PIN
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter your {pinLength}-digit security PIN to unlock your workspace.
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
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== pinLength}
              className="btn-liquid w-full py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
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
              className="text-xs text-blue-400 font-semibold hover:underline cursor-pointer"
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
            type="button"
            onClick={() => {
              setErrorAlert(null);
              setActiveView('OVERVIEW');
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Recover Your Account
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Enter your SJ Tutor AI ID or registered email address.
            </p>
          </div>

          <form onSubmit={handleLookupRecovery} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SJ Tutor AI ID or Email
              </label>
              <input
                type="text"
                required
                placeholder="SJTA-XXXXXX or student@example.com"
                value={recoverIdentifier}
                onChange={(e) => setRecoverIdentifier(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-liquid w-full py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue Recovery</span>}
            </button>

            {recoverIdentifier.includes('@') && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSendEmailReset}
                  className="text-xs text-slate-400 hover:text-blue-400 underline cursor-pointer"
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
            type="button"
            onClick={() => setActiveView('RECOVER_LOOKUP')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="text-center mb-5">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Answer Security Question
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Verify your identity to reset your password and PIN.
            </p>
          </div>

          <form onSubmit={handleVerifyRecovery} className="space-y-4">
            <div className="p-3 bg-blue-500/10 border border-blue-400/25 rounded-xl">
              <span className="text-xs text-blue-400 font-semibold block mb-0.5">
                Security Question:
              </span>
              <p className="text-sm font-medium text-white">{recoverQuestion}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Answer</label>
              <input
                type="text"
                required
                placeholder="Enter answer"
                value={recoverAnswer}
                onChange={(e) => setRecoverAnswer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/40 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                New 2-Step Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={recoverNewPassword}
                onChange={(e) => setRecoverNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/40 outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  New Security PIN ({recoverPinLength} Digits)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverPinLength(4);
                      setRecoverNewPin('');
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded cursor-pointer ${
                      recoverPinLength === 4 ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    4 Digits
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverPinLength(6);
                      setRecoverNewPin('');
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded cursor-pointer ${
                      recoverPinLength === 6 ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
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
                className="w-full px-3.5 py-2.5 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500/40 outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-liquid w-full py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
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
          <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-400/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Recovery Successful</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
            {recoverSuccessMsg || 'Your account credentials have been updated.'}
          </p>
          <button
            type="button"
            onClick={() => setActiveView('OVERVIEW')}
            className="btn-liquid w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl transition-all cursor-pointer"
          >
            Return to Log In
          </button>
        </div>
      )}

      {/* Unauthorized Domain Guidance Modal */}
      <UnauthorizedDomainModal
        isOpen={!!unauthorizedDomainData}
        onClose={() => setUnauthorizedDomainData(null)}
        domain={unauthorizedDomainData?.domain}
        provider={unauthorizedDomainData?.provider || 'Google'}
        onRetry={() => {
          if (unauthorizedDomainData?.provider) {
            handleSocialLogin(unauthorizedDomainData.provider as any);
          }
        }}
        onSwitchToEmail={() => setActiveView('OVERVIEW')}
        onSwitchToId={() => setActiveView('SJTUTOR_ID')}
      />
    </div>
  );
};
