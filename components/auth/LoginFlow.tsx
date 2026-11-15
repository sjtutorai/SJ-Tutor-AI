import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
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

const REMEMBER_EMAIL_KEY = 'sjtutor_remember_email';

interface LoginFlowProps {
  onSuccess: (userData: any) => void;
  onSwitchToSignUp: (prefilledEmail?: string) => void;
  prefilledIdentifier?: string;
}

type LoginView =
  | 'OVERVIEW'
  | 'ID_CARD_LOGIN'
  | 'ACCOUNT_NOT_FOUND'
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
  const initialView: LoginView =
    prefilledIdentifier && !isPrefilledEmail ? 'SJTUTOR_ID' : 'OVERVIEW';

  const [activeView, setActiveView] = useState<LoginView>(initialView);
  const [loading, setLoading] = useState(false);
  const [authMethodPending, setAuthMethodPending] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [unauthorizedDomainData, setUnauthorizedDomainData] = useState<{
    domain?: string;
    provider?: string;
  } | null>(null);

  // Email + Password + Remember Me form (featured directly on primary panel)
  const [email, setEmail] = useState(() => {
    if (isPrefilledEmail && prefilledIdentifier) return prefilledIdentifier;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  // Account Recovery states
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverQuestion, setRecoverQuestion] = useState('');
  const [recoverSjTutorId, setRecoverSjTutorId] = useState('');
  const [recoverAnswer, setRecoverAnswer] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [recoverNewPin, setRecoverNewPin] = useState('');
  const [recoverPinLength, setRecoverPinLength] = useState<4 | 6>(6);
  const [recoverSuccessMsg, setRecoverSuccessMsg] = useState('');

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

  // -------------------------------------------------------------
  // 1. Social Log In
  // -------------------------------------------------------------
  const handleSocialLogin = async (provider: 'google' | 'apple' | 'yahoo' | 'github') => {
    setLoading(true);
    setAuthMethodPending(provider);
    setErrorAlert(null);
    try {
      const res = await handleSocialAuth(provider, 'signin', rememberMe);
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
      setAuthMethodPending(null);
    }
  };

  // -------------------------------------------------------------
  // 2. Email + Password Log In
  // -------------------------------------------------------------
  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthMethodPending('email');
    setErrorAlert(null);
    try {
      if (typeof window !== 'undefined') {
        if (rememberMe && email.trim()) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
      }

      const res = await loginWithEmail(email, password, rememberMe);
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
      setAuthMethodPending(null);
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

  // Animated border style helper for glass inputs
  const getInputShellClass = (fieldName: string) =>
    `relative rounded-xl p-[1px] transition-all duration-300 ${
      focusedField === fieldName
        ? 'bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-500 shadow-[0_0_24px_rgba(37,99,235,0.38)]'
        : 'bg-white/15 hover:bg-white/25'
    }`;

  return (
    <div className="w-full max-w-md mx-auto text-white">
      {/* Global Error Notice */}
      {errorAlert && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-200 backdrop-blur-md"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
          <span>{errorAlert}</span>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: OVERVIEW (EMAIL + PASSWORD + GOOGLE + PROVIDERS)
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'OVERVIEW' && (
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="text-center mb-5"
          >
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Sign in to resume your personalized study workspace.
            </p>
          </motion.div>

          {/* Sequential Animated Email + Password Form */}
          <form onSubmit={handleEmailLoginSubmit} className="space-y-4">
            {/* Field 1: Email */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
            >
              <label
                htmlFor="login-email-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className={getInputShellClass('email')}>
                <div className="relative flex items-center rounded-[11px] bg-slate-950/90">
                  <Mail
                    className={`absolute left-3.5 w-4 h-4 transition-colors ${
                      focusedField === 'email' ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="student@example.com"
                    value={email}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-transparent text-sm text-white placeholder-slate-500 outline-none rounded-[11px]"
                  />
                </div>
              </div>
            </motion.div>

            {/* Field 2: Password with Show/Hide */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
            >
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="login-password-input"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorAlert(null);
                    setRecoverIdentifier(email);
                    setActiveView('RECOVER_LOOKUP');
                  }}
                  className="text-xs font-semibold text-blue-300 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className={getInputShellClass('password')}>
                <div className="relative flex items-center rounded-[11px] bg-slate-950/90">
                  <Lock
                    className={`absolute left-3.5 w-4 h-4 transition-colors ${
                      focusedField === 'password' ? 'text-violet-400' : 'text-slate-400'
                    }`}
                  />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-transparent text-sm text-white placeholder-slate-500 outline-none rounded-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Field 3: Remember Me */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.27 }}
              className="flex items-center justify-between pt-0.5"
            >
              <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/25 bg-slate-900 text-blue-500 focus:ring-blue-500/40 focus:ring-offset-0 accent-blue-500 cursor-pointer"
                />
                <span className="group-hover:text-white transition-colors">Remember me</span>
              </label>
              <span className="text-[11px] text-slate-400">Encrypted Firebase Session</span>
            </motion.div>

            {/* Field 4: Glowing Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.33 }}
            >
              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 shadow-[0_8px_28px_rgba(37,99,235,0.42)] hover:shadow-[0_0_36px_rgba(99,102,241,0.75)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] cursor-pointer"
              >
                {loading && authMethodPending === 'email' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.38 }}
            className="relative my-5"
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-[#091128] px-3 text-slate-400 font-semibold tracking-widest">
                OR CONTINUE WITH
              </span>
            </div>
          </motion.div>

          {/* Google Sign-In + Existing Auth Providers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.43 }}
            className="space-y-2.5"
          >
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading && authMethodPending === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <GoogleIcon className="w-5 h-5" />
              )}
              <span>Continue with Google</span>
            </button>

            {/* Secondary OAuth providers preserved */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading && authMethodPending === 'apple' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AppleIcon className="w-4 h-4" />
                )}
                <span>Apple</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('yahoo')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#6001D2]/30 hover:bg-[#6001D2]/50 border border-violet-400/25 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading && authMethodPending === 'yahoo' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <YahooIcon className="w-4 h-4" />
                )}
                <span>Yahoo</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('github')}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading && authMethodPending === 'github' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                <span>GitHub</span>
              </button>
            </div>

            {/* SJ Tutor AI ID & QR Student Card shortcuts preserved */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorAlert(null);
                  setActiveView('SJTUTOR_ID');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/25 text-blue-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                <span>Tutor ID &amp; PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorAlert(null);
                  setFoundStudentAccount(null);
                  setActiveView('ID_CARD_LOGIN');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/25 text-violet-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 text-violet-400" />
                <span>Scan ID Card</span>
              </button>
            </div>
          </motion.div>

          {/* Signup Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.48 }}
            className="mt-6 text-center text-sm text-slate-300"
          >
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => onSwitchToSignUp(email || undefined)}
              className="text-blue-300 hover:text-cyan-300 font-bold hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </motion.div>
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
            <span>Back to Log In</span>
          </button>

          <div className="text-center mb-5">
            <div className="inline-flex p-2.5 bg-blue-500/15 rounded-2xl text-blue-400 mb-2 border border-blue-400/25">
              <ScanLine className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Log in with ID Card
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
              Scan your SJ Tutor AI Student ID card or enter your Card ID to locate your account in Firestore.
            </p>
          </div>

          <div id="hidden-file-qr-reader" className="hidden" />

          {foundStudentAccount ? (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-900/50 mx-auto flex items-center justify-center border-2 border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/25 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Account Verified</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  {foundStudentAccount.displayName || foundStudentAccount.name}
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  ID: {foundStudentAccount.sjTutorId || foundStudentAccount.registrationNumber || foundStudentAccount.uid}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-left bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Plan Tier</span>
                  <span className="font-extrabold text-blue-300 flex items-center gap-1 truncate">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                    {foundStudentAccount.planType || 'Scholar'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Credits</span>
                  <span className="font-extrabold text-slate-100">
                    {(foundStudentAccount.credits ?? 2000).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Streak</span>
                  <span className="font-extrabold text-violet-300">
                    {foundStudentAccount.streak ?? foundStudentAccount.currentStreak ?? 0}d
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-300 py-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading your study workspace...</span>
              </div>

              <button
                type="button"
                onClick={() => onSuccess(foundStudentAccount)}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setIdCardMode('scan')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    idCardMode === 'scan'
                      ? 'bg-blue-600 text-white shadow-sm'
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
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdCardMode('manual')}
                  className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    idCardMode === 'manual'
                      ? 'bg-blue-600 text-white shadow-sm'
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
                    className="overflow-hidden rounded-2xl border-2 border-dashed border-blue-400/40 bg-slate-900/60 p-1"
                  />
                  <p className="text-center text-xs text-slate-400">
                    Align the QR code from your SJ Tutor AI ID card in front of your camera.
                  </p>
                </div>
              )}

              {idCardMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-blue-400/40 hover:border-blue-400 bg-slate-900/50 hover:bg-blue-950/20 rounded-2xl p-8 text-center cursor-pointer transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdCardFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Click to Upload ID Card</h4>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, or WEBP QR card image</p>
                  {isSearchingFirestore && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-blue-300">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reading QR &amp; checking Firestore...</span>
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
                    <div className={getInputShellClass('idcard')}>
                      <div className="relative rounded-[11px] bg-slate-950/90">
                        <input
                          type="text"
                          required
                          autoFocus
                          placeholder="e.g. SJTA-XXXXXX"
                          value={idCardInput}
                          onFocus={() => setFocusedField('idcard')}
                          onBlur={() => setFocusedField(null)}
                          onChange={(e) => setIdCardInput(e.target.value)}
                          className="w-full pl-3.5 pr-10 py-3 bg-transparent text-sm font-medium text-white placeholder-slate-500 outline-none uppercase placeholder:normal-case font-mono rounded-[11px]"
                        />
                        <Search className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isSearchingFirestore}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {loading || isSearchingFirestore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching Firestore...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Find Account &amp; Log In</span>
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
          <div className="w-16 h-16 bg-blue-950/60 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Account Not Registered</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed">
            We couldn&apos;t find a registered account for{' '}
            <strong className="text-white">{email || sjTutorIdInput || 'this account'}</strong>.
            Create your free student account to get started.
          </p>
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() => onSwitchToSignUp(email || sjTutorIdInput)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Create Student Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveView('OVERVIEW')}
              className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 font-medium rounded-xl transition-colors cursor-pointer"
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
            onClick={() => setActiveView('OVERVIEW')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Log In</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Log in with SJ Tutor AI ID
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Enter your unique ID and 2-step verification password.
            </p>
          </div>

          <form onSubmit={handleSjTutorIdStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SJ Tutor AI ID
              </label>
              <div className={getInputShellClass('sjid')}>
                <input
                  type="text"
                  required
                  placeholder="SJTA-XXXXXX"
                  value={sjTutorIdInput}
                  onFocus={() => setFocusedField('sjid')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setSjTutorIdInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-3 font-mono uppercase bg-slate-950/90 rounded-[11px] text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>
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
                  className="text-xs text-blue-300 hover:text-cyan-300 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className={getInputShellClass('sjpw')}>
                <div className="relative rounded-[11px] bg-slate-950/90">
                  <input
                    type={showSjTutorPw ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={sjTutorPassword}
                    onFocus={() => setFocusedField('sjpw')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setSjTutorPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-transparent rounded-[11px] text-sm text-white placeholder-slate-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSjTutorPw(!showSjTutorPw)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showSjTutorPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue to PIN</span>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setActiveView('RECOVER_LOOKUP')}
              className="text-xs text-slate-400 hover:text-blue-300 cursor-pointer"
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
            <div className="inline-flex p-2.5 bg-blue-500/15 border border-blue-400/25 rounded-xl text-blue-400 mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Enter Your Security PIN
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Enter your {pinLength}-digit security PIN to unlock your account.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-5">
            <div className={getInputShellClass('pin')}>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                maxLength={pinLength}
                placeholder={'•'.repeat(pinLength)}
                value={pin}
                onFocus={() => setFocusedField('pin')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 bg-slate-950/90 rounded-[11px] text-white outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== pinLength}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Verify PIN &amp; Log In</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setRecoverIdentifier(sjTutorIdInput);
                setActiveView('RECOVER_LOOKUP');
              }}
              className="text-xs text-blue-300 font-semibold hover:underline cursor-pointer"
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
            onClick={() => setActiveView('OVERVIEW')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Log In</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Recover Your Account
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Enter your SJ Tutor AI ID or registered email address.
            </p>
          </div>

          <form onSubmit={handleLookupRecovery} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SJ Tutor AI ID or Email
              </label>
              <div className={getInputShellClass('recover')}>
                <input
                  type="text"
                  required
                  placeholder="SJTA-XXXXXX or student@example.com"
                  value={recoverIdentifier}
                  onFocus={() => setFocusedField('recover')}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setRecoverIdentifier(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-950/90 rounded-[11px] text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue Recovery</span>}
            </button>

            {recoverIdentifier.includes('@') && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleSendEmailReset}
                  className="text-xs text-blue-300 hover:text-cyan-300 underline cursor-pointer"
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
            <p className="text-sm text-slate-300 mt-1">
              Verify your identity to reset your password and PIN.
            </p>
          </div>

          <form onSubmit={handleVerifyRecovery} className="space-y-4">
            <div className="p-3 bg-blue-950/50 border border-blue-400/25 rounded-xl">
              <span className="text-xs text-blue-300 font-semibold block mb-0.5">
                Security Question:
              </span>
              <p className="text-sm font-medium text-white">{recoverQuestion}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Answer
              </label>
              <input
                type="text"
                required
                placeholder="Enter answer"
                value={recoverAnswer}
                onChange={(e) => setRecoverAnswer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-white/15 focus:border-blue-400 rounded-xl text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New 2-Step Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={recoverNewPassword}
                onChange={(e) => setRecoverNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-white/15 focus:border-blue-400 rounded-xl text-sm text-white outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
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
                className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-white/15 focus:border-blue-400 rounded-xl text-sm text-white outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Update Credentials &amp; Recover</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: RECOVERY SUCCESS
         ══════════════════════════════════════════════════════════ */}
      {activeView === 'RECOVER_SUCCESS' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-950/60 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Recovery Successful</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xs mx-auto">
            {recoverSuccessMsg || 'Your account credentials have been updated.'}
          </p>
          <button
            type="button"
            onClick={() => setActiveView('OVERVIEW')}
            className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl transition-all shadow-lg cursor-pointer"
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
