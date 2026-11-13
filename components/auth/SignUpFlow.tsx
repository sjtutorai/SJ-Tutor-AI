import React, { useState } from 'react';
import {
  Loader2,
  Mail,
  Github,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  Camera,
  HelpCircle,
  Lock,
  KeyRound,
  Sparkles,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleIcon, AppleIcon, YahooIcon } from './AuthIcons';
import { UnauthorizedDomainModal } from './UnauthorizedDomainModal';
import { BigScreenSignUpPage } from './BigScreenSignUpPage';
import IdCardView from '../IdCardView';
import {
  handleSocialAuth,
  initEmailSignUp,
  checkUsernameAvailability,
  createAccountAndGenerateSjTutorId,
  saveAccountSecurity,
} from '../../services/authService';

interface SignUpFlowProps {
  onSuccess: (userData: any) => void;
  onSwitchToLogin: (prefilledEmail?: string) => void;
  prefilledIdentifier?: string;
  onRedirectToBigScreen?: (authIdentity: any) => void;
}

type StepType =
  | 'AUTH_METHOD'
  | 'BIG_SCREEN_ONBOARDING'
  | 'ACCOUNT_EXISTS'
  | 'PROFILE_SETUP'
  | 'LEARNING_PROFILE'
  | 'CREATING_ACCOUNT'
  | 'SHOW_ID'
  | 'SECURITY_PASSWORD'
  | 'SECURITY_PIN'
  | 'SECURITY_QUESTION'
  | 'REVIEW_SECURITY'
  | 'SAVING_SECURITY'
  | 'COMPLETE';

const CLASS_OPTIONS = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
  'College',
  'Other',
];

const SUBJECT_OPTIONS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Geography',
  'Civics',
  'English',
  'Kannada',
  'Computer Science',
  'Hindi',
];

const LEARNING_PREFERENCES = [
  'Step-by-step explanations',
  'Examples',
  'Practice questions',
  'Quizzes',
  'Visual explanations',
  'Short explanations',
  'Detailed explanations',
  'Revision',
];

const PRESET_SECURITY_QUESTIONS = [
  'What was the name of your first school?',
  'What was your childhood nickname?',
  'What was the name of your first teacher?',
  'What is your favorite subject?',
  'Create my own question',
];

function computePasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (!pw) return { score: 0, label: 'Enter a password', barClass: 'bg-slate-600', width: '0%' };
  if (score <= 1) return { score: 1, label: 'Weak', barClass: 'bg-rose-500', width: '25%' };
  if (score === 2) return { score: 2, label: 'Fair', barClass: 'bg-amber-400', width: '50%' };
  if (score === 3) return { score: 3, label: 'Strong', barClass: 'bg-blue-400', width: '75%' };
  return { score: 4, label: 'Very Strong', barClass: 'bg-emerald-400', width: '100%' };
}

export const SignUpFlow: React.FC<SignUpFlowProps> = ({
  onSuccess,
  onSwitchToLogin,
  prefilledIdentifier,
  onRedirectToBigScreen,
}) => {
  const isPrefilledEmail = prefilledIdentifier?.includes('@');
  const [currentStep, setCurrentStep] = useState<StepType>('AUTH_METHOD');
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [unauthorizedDomainData, setUnauthorizedDomainData] = useState<{
    domain?: string;
    provider?: string;
  } | null>(null);

  const [authIdentity, setAuthIdentity] = useState<any>(null);

  // Interactive Registration Form Fields
  const [fullName, setFullName] = useState('');
  const [emailInput, setEmailInput] = useState(
    isPrefilledEmail && prefilledIdentifier ? prefilledIdentifier : ''
  );
  const [emailPassword, setEmailPassword] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [showEmailConfirmPw, setShowEmailConfirmPw] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);

  // Profile Setup fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    checked: boolean;
    available?: boolean;
    message?: string;
  }>({ checked: false });
  const [photoURL, setPhotoURL] = useState('');

  // Learning Profile fields
  const [classGrade, setClassGrade] = useState('Class 10');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Mathematics', 'Physics']);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([
    'Step-by-step explanations',
    'Examples',
  ]);
  const [preferredLanguage, setPreferredLanguage] = useState('English');

  // Generated SJ Tutor AI ID & Account
  const [generatedSjTutorId, setGeneratedSjTutorId] = useState('');
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Security Setup
  const [twoStepPassword, setTwoStepPassword] = useState('');
  const [twoStepConfirmPassword, setTwoStepConfirmPassword] = useState('');
  const [showTwoStepPw, setShowTwoStepPw] = useState(false);
  const [showTwoStepConfirmPw, setShowTwoStepConfirmPw] = useState(false);

  const [pinLength, setPinLength] = useState<4 | 6>(6);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [confirmSecurityAnswer, setConfirmSecurityAnswer] = useState('');

  const pwStrength = computePasswordStrength(emailPassword);

  const getProgressStage = () => {
    switch (currentStep) {
      case 'AUTH_METHOD':
      case 'ACCOUNT_EXISTS':
        return 1;
      case 'PROFILE_SETUP':
      case 'LEARNING_PROFILE':
        return 2;
      case 'CREATING_ACCOUNT':
      case 'SHOW_ID':
        return 3;
      case 'SECURITY_PASSWORD':
      case 'SECURITY_PIN':
      case 'SECURITY_QUESTION':
      case 'REVIEW_SECURITY':
      case 'SAVING_SECURITY':
        return 4;
      case 'COMPLETE':
        return 5;
      default:
        return 1;
    }
  };

  const stageNumber = getProgressStage();

  // 1. Social Sign Up
  const handleSocialSignUp = async (provider: 'google' | 'apple' | 'yahoo' | 'github') => {
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await handleSocialAuth(provider, 'signup');
      if (res.status === 'ACCOUNT_ALREADY_EXISTS') {
        setCurrentStep('ACCOUNT_EXISTS');
        return;
      }
      if (res.status === 'UNAUTHORIZED_DOMAIN') {
        setUnauthorizedDomainData({
          domain: res.domain || (typeof window !== 'undefined' ? window.location.hostname : ''),
          provider,
        });
        return;
      }
      if (res.status === 'PENDING_PROFILE') {
        const fullIdentity = { ...res.authIdentity, provider };
        setAuthIdentity(fullIdentity);
        if (onRedirectToBigScreen) {
          onRedirectToBigScreen(fullIdentity);
          return;
        }
        setCurrentStep('BIG_SCREEN_ONBOARDING');
        return;
      }

      const fallbackIdentity = {
        provider,
        email: prefilledIdentifier || '',
        displayName: fullName.trim() || '',
      };
      setAuthIdentity(fallbackIdentity);
      if (onRedirectToBigScreen) {
        onRedirectToBigScreen(fallbackIdentity);
        return;
      }
      setCurrentStep('BIG_SCREEN_ONBOARDING');
    } catch (err) {
      console.warn('Social auth catch fallback to big screen:', err);
      const fallbackIdentity = {
        provider,
        email: prefilledIdentifier || '',
        displayName: fullName.trim() || '',
      };
      setAuthIdentity(fallbackIdentity);
      if (onRedirectToBigScreen) {
        onRedirectToBigScreen(fallbackIdentity);
        return;
      }
      setCurrentStep('BIG_SCREEN_ONBOARDING');
    } finally {
      setLoading(false);
    }
  };

  // 2. Email + Password Sign Up Init
  const handleEmailSignUpInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert(null);

    if (!fullName.trim()) {
      setErrorAlert('Please enter your full name.');
      return;
    }
    if (!agreedToTerms) {
      setErrorAlert('Please agree to the Terms and Conditions to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await initEmailSignUp(emailInput.trim(), emailPassword, emailConfirmPassword);
      if (res.status === 'ACCOUNT_ALREADY_EXISTS') {
        setCurrentStep('ACCOUNT_EXISTS');
        return;
      }
      if (res.status === 'PENDING_PROFILE') {
        const fullIdentity = {
          ...res.authIdentity,
          displayName: fullName.trim(),
          email: emailInput.trim(),
          password: emailPassword,
          provider: 'email',
        };
        setAuthIdentity(fullIdentity);
        if (onRedirectToBigScreen) {
          onRedirectToBigScreen(fullIdentity);
          return;
        }
        setCurrentStep('BIG_SCREEN_ONBOARDING');
        return;
      } else if (res.status === 'ERROR') {
        setErrorAlert(res.message || 'Validation error');
      }
    } catch (err) {
      console.error(err);
      setErrorAlert('Error validating email registration.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Username Availability Check
  const handleCheckUsername = async (val: string) => {
    const clean = val.trim().toLowerCase().replace(/^@/, '');
    setUsername(clean);
    if (clean.length < 3) {
      setUsernameStatus({ checked: true, available: false, message: 'Must be at least 3 characters' });
      return;
    }
    const res = await checkUsernameAvailability(clean);
    setUsernameStatus({ checked: true, available: res.available, message: res.message });
  };

  // 4. Create Account & Generate SJ Tutor AI ID
  const handleProceedToCreateAccount = async () => {
    setCurrentStep('CREATING_ACCOUNT');
    setLoading(true);
    setErrorAlert(null);

    try {
      const res = await createAccountAndGenerateSjTutorId({
        authIdentity,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim().toLowerCase().replace(/^@/, ''),
        photoURL,
        classGrade,
        subjects: selectedSubjects,
        learningPreferences: selectedPreferences,
        preferredLanguage,
      });

      if (res.status === 'ACCOUNT_ALREADY_EXISTS') {
        setCurrentStep('ACCOUNT_EXISTS');
        return;
      }

      if (res.status === 'SUCCESS' && res.sjTutorId) {
        setGeneratedSjTutorId(res.sjTutorId);
        setCreatedUser(res.user);
        if (authIdentity?.password) {
          setTwoStepPassword(authIdentity.password);
          setTwoStepConfirmPassword(authIdentity.password);
        }
        setCurrentStep('SHOW_ID');
      } else {
        setErrorAlert(res.message || 'Account creation encountered an issue.');
        setCurrentStep('LEARNING_PROFILE');
      }
    } catch (err) {
      console.error(err);
      setErrorAlert('Network error creating account. Please try again.');
      setCurrentStep('LEARNING_PROFILE');
    } finally {
      setLoading(false);
    }
  };

  // 5. Save Security Setup
  const handleSaveSecuritySetup = async () => {
    setCurrentStep('SAVING_SECURITY');
    setLoading(true);
    setErrorAlert(null);

    const activeQuestion =
      selectedQuestion === 'Create my own question' ? customQuestion : selectedQuestion;

    try {
      const res = await saveAccountSecurity({
        sjTutorId: generatedSjTutorId,
        twoStepPassword,
        securityPin: pin.trim(),
        pinLength,
        securityQuestion: activeQuestion,
        securityAnswer: securityAnswer.trim(),
      });

      if (res.status === 'SUCCESS') {
        setCurrentStep('COMPLETE');
      } else {
        setErrorAlert(res.message || 'Failed to save security credentials.');
        setCurrentStep('REVIEW_SECURITY');
      }
    } catch (err) {
      console.error(err);
      setErrorAlert('Error securing account credentials.');
      setCurrentStep('REVIEW_SECURITY');
    } finally {
      setLoading(false);
    }
  };

  const copyIdToClipboard = () => {
    if (!generatedSjTutorId) return;
    navigator.clipboard.writeText(generatedSjTutorId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Password validation criteria for 2-step password
  const hasMinLength = twoStepPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(twoStepPassword);
  const hasLower = /[a-z]/.test(twoStepPassword);
  const hasNumber = /[0-9]/.test(twoStepPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(twoStepPassword);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
  const passwordsMatch = twoStepPassword === twoStepConfirmPassword && twoStepPassword.length > 0;

  // PIN validation
  const pinDigitsOnly = /^\d+$/.test(pin.trim());
  const pinMatchesLength = pin.trim().length === pinLength;
  const pinsMatch = pin.trim() === confirmPin.trim() && pinMatchesLength;
  const isSequentialOrRepeated =
    /^(\d)\1+$/.test(pin.trim()) ||
    '0123456789012345'.includes(pin.trim()) ||
    '9876543210987654'.includes(pin.trim());
  const isPinValid = pinDigitsOnly && pinMatchesLength && pinsMatch && !isSequentialOrRepeated;

  if (currentStep === 'BIG_SCREEN_ONBOARDING') {
    return (
      <BigScreenSignUpPage
        authIdentity={authIdentity}
        onSuccess={onSuccess}
        onCancel={() => setCurrentStep('AUTH_METHOD')}
      />
    );
  }

  const darkInputClass =
    'w-full px-3.5 py-2.5 bg-[#060D28]/90 border border-blue-400/25 rounded-xl text-sm text-white placeholder-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/35 focus:shadow-[0_0_18px_rgba(37,99,235,0.22)] outline-none transition-all';

  return (
    <div className="w-full max-w-md mx-auto text-slate-100">
      {/* Smooth Animated Progress Indicator */}
      {currentStep !== 'ACCOUNT_EXISTS' && currentStep !== 'COMPLETE' && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider mb-2">
            <span className={stageNumber >= 1 ? 'text-blue-400' : 'text-slate-500'}>1. Account</span>
            <span className={stageNumber >= 2 ? 'text-blue-400' : 'text-slate-500'}>2. Profile</span>
            <span className={stageNumber >= 3 ? 'text-blue-400' : 'text-slate-500'}>3. Student ID</span>
            <span className={stageNumber >= 4 ? 'text-blue-400' : 'text-slate-500'}>4. Security</span>
          </div>
          <div className="h-1.5 w-full bg-[#060D28] border border-blue-400/15 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
              initial={{ width: '25%' }}
              animate={{ width: `${(stageNumber / 4) * 100}%` }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      )}

      {/* Global Error Notice */}
      <AnimatePresence>
        {errorAlert && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-200"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ══════════════════════════════════════════════════════════
            STEP 1: INTERACTIVE REGISTRATION FORM + PROVIDERS
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'AUTH_METHOD' && (
          <motion.div
            key="step-auth-method"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-5">
              <h2 className="font-display text-2xl font-extrabold text-white tracking-tight">
                Create Your Student Account
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Start your personalized AI learning experience today.
              </p>
            </div>

            <form onSubmit={handleEmailSignUpInit} className="space-y-3.5">
              {/* Full Name */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
              >
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-blue-400/80" />
                  <input
                    type="text"
                    required
                    placeholder="Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`${darkInputClass} pl-10`}
                  />
                </div>
              </motion.div>

              {/* Email Address */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
              >
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-blue-400/80" />
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className={`${darkInputClass} pl-10`}
                  />
                </div>
              </motion.div>

              {/* Password + Animated Strength Bar */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  {emailPassword && (
                    <span className="text-[11px] font-semibold text-slate-300">
                      Strength: <strong className="text-white">{pwStrength.label}</strong>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-blue-400/80" />
                  <input
                    type={showEmailPw ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className={`${darkInputClass} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPw(!showEmailPw)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showEmailPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Animated Password Strength Meter */}
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#060D28] overflow-hidden border border-blue-400/10">
                  <motion.div
                    className={`h-full ${pwStrength.barClass}`}
                    initial={{ width: '0%' }}
                    animate={{ width: pwStrength.width }}
                    transition={{ duration: 0.25 }}
                  />
                </div>
              </motion.div>

              {/* Confirm Password */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
                  {emailPassword && emailConfirmPassword && (
                    <span
                      className={`text-[11px] font-semibold ${
                        emailPassword === emailConfirmPassword ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {emailPassword === emailConfirmPassword ? 'Matches' : 'Mismatch'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-blue-400/80" />
                  <input
                    type={showEmailConfirmPw ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={emailConfirmPassword}
                    onChange={(e) => setEmailConfirmPassword(e.target.value)}
                    className={`${darkInputClass} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailConfirmPw(!showEmailConfirmPw)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showEmailConfirmPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Agree to Terms and Conditions */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-blue-400/40 bg-[#060D28] text-blue-500 focus:ring-blue-500/40 cursor-pointer"
                  />
                  <span>
                    I agree to the{' '}
                    <span className="text-blue-400 font-semibold">Terms &amp; Conditions</span> and{' '}
                    <span className="text-blue-400 font-semibold">Student Privacy Policy</span>.
                  </span>
                </label>
              </motion.div>

              <button
                type="submit"
                disabled={loading}
                className="btn-liquid w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Continue to Onboarding</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-blue-400/15" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-[#0B1437] px-3 text-slate-400 font-semibold tracking-wider">
                  Or sign up with
                </span>
              </div>
            </div>

            {/* Social Sign Up Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleSocialSignUp('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 rounded-xl font-semibold text-slate-900 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                <GoogleIcon className="w-5 h-5" />
                <span>Continue with Google</span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSocialSignUp('apple')}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-black/90 hover:bg-black border border-white/10 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <AppleIcon className="w-4 h-4" />
                  <span>Apple</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialSignUp('yahoo')}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#6001D2] hover:bg-[#5200b3] text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <YahooIcon className="w-4 h-4" />
                  <span>Yahoo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialSignUp('github')}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchToLogin(emailInput || undefined)}
                className="text-blue-400 hover:text-blue-300 font-semibold hover:underline cursor-pointer"
              >
                Log In
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            ACCOUNT ALREADY EXISTS
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'ACCOUNT_EXISTS' && (
          <motion.div
            key="step-exists"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center py-4"
          >
            <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-400/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Account Already Registered
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
              <strong className="text-white">{emailInput || authIdentity?.email || 'This account'}</strong> is already registered with SJ Tutor AI.
            </p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => onSwitchToLogin(emailInput || authIdentity?.email)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Log In to Your Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('AUTH_METHOD')}
                className="w-full py-2.5 bg-[#060D28] text-slate-300 font-medium rounded-xl hover:bg-[#101C48] border border-blue-400/20 transition-colors cursor-pointer"
              >
                Register with Another Email
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 2: PROFILE SETUP
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'PROFILE_SETUP' && (
          <motion.div
            key="step-profile"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Complete Your Profile
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Let&apos;s personalize your SJ Tutor AI experience.
              </p>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-violet-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-blue-400/40 shadow-md">
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{firstName ? firstName[0].toUpperCase() : 'S'}</span>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-1.5 bg-slate-800 text-white rounded-full cursor-pointer hover:bg-slate-700 border border-blue-400/30 shadow-sm"
                  title="Change Photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setPhotoURL(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
              <span className="text-xs text-slate-400 mt-2">Add profile picture</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  placeholder="Aarav"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={darkInputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                <input
                  type="text"
                  placeholder="Sharma"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={darkInputClass}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Choose a unique username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">@</span>
                <input
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={(e) => handleCheckUsername(e.target.value)}
                  className={`${darkInputClass} pl-8 pr-10`}
                />
                {usernameStatus.checked && (
                  <span className="absolute right-3.5 top-3">
                    {usernameStatus.available ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </span>
                )}
              </div>
              {usernameStatus.message && (
                <p
                  className={`text-xs mt-1 ${
                    usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {usernameStatus.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!firstName.trim()) {
                  setErrorAlert('Please enter your first name.');
                  return;
                }
                setErrorAlert(null);
                setCurrentStep('LEARNING_PROFILE');
              }}
              className="btn-liquid w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Next: Learning Preferences</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 3: LEARNING PROFILE
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'LEARNING_PROFILE' && (
          <motion.div
            key="step-learning"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-5">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Select Class & Interests
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Help SJ Tutor AI tailor every explanation to your syllabus.
              </p>
            </div>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Class / Grade
                </label>
                <select
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value)}
                  className={darkInputClass}
                >
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subjects
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECT_OPTIONS.map((sub) => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          setSelectedSubjects(
                            isSelected
                              ? selectedSubjects.filter((s) => s !== sub)
                              : [...selectedSubjects, sub]
                          );
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-[#060D28] text-slate-300 border border-blue-400/20 hover:border-blue-400/40'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Learning Preferences
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LEARNING_PREFERENCES.map((pref) => {
                    const isSelected = selectedPreferences.includes(pref);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => {
                          setSelectedPreferences(
                            isSelected
                              ? selectedPreferences.filter((p) => p !== pref)
                              : [...selectedPreferences, pref]
                          );
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600 text-white'
                            : 'bg-[#060D28] text-slate-400 border border-blue-400/15 hover:text-white'
                        }`}
                      >
                        {pref}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preferred Language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className={darkInputClass}
                >
                  <option value="English" className="bg-slate-900">English</option>
                  <option value="Kannada" className="bg-slate-900">Kannada (ಕನ್ನಡ)</option>
                  <option value="Hindi" className="bg-slate-900">Hindi (हिन्दी)</option>
                  <option value="Spanish" className="bg-slate-900">Spanish (Español)</option>
                  <option value="French" className="bg-slate-900">French (Français)</option>
                  <option value="German" className="bg-slate-900">German (Deutsch)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleProceedToCreateAccount}
                className="btn-liquid flex-1 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleProceedToCreateAccount}
                className="px-4 py-3 bg-[#060D28] text-slate-400 border border-blue-400/20 rounded-xl text-xs font-semibold hover:text-white transition-colors cursor-pointer"
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            CREATING ACCOUNT LOADING STATE
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'CREATING_ACCOUNT' && (
          <motion.div
            key="step-creating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Creating Your SJ Tutor AI Account...</h2>
            <p className="text-sm text-slate-400 mt-2">
              Generating your unique SJ Tutor AI ID and setting up your workspace.
            </p>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 4: SHOW GENERATED SJ TUTOR AI ID
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'SHOW_ID' && (
          <motion.div
            key="step-show-id"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center py-2"
          >
            <div className="w-14 h-14 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400 border border-blue-400/30">
              <Sparkles className="w-7 h-7" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">Your SJ Tutor AI ID</h2>
            <p className="text-sm text-slate-400 mt-1">Your official student identity is active.</p>

            <div className="my-6 p-5 bg-[#060D28] border border-blue-400/35 rounded-2xl shadow-md">
              <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">
                Official SJ Tutor AI ID
              </span>
              <div className="text-3xl font-black font-mono text-white tracking-wider my-2">
                {generatedSjTutorId}
              </div>
              <button
                type="button"
                onClick={copyIdToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-lg hover:bg-blue-500/30 transition-colors cursor-pointer"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep('SECURITY_PASSWORD')}
              className="btn-liquid w-full mt-4 py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Continue to Security Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 5: SECURITY SETUP - 2-STEP PASSWORD
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'SECURITY_PASSWORD' && (
          <motion.div
            key="step-sec-pw"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-center mb-5">
              <div className="inline-flex p-2 bg-blue-500/15 rounded-xl text-blue-400 mb-2">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                2-Step Verification Password
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Protect sign-ins when using your SJ Tutor AI ID.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  2-Step Verification Password
                </label>
                <div className="relative">
                  <input
                    type={showTwoStepPw ? 'text' : 'password'}
                    placeholder="Enter secure password"
                    value={twoStepPassword}
                    onChange={(e) => setTwoStepPassword(e.target.value)}
                    className={`${darkInputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTwoStepPw(!showTwoStepPw)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showTwoStepPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showTwoStepConfirmPw ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={twoStepConfirmPassword}
                    onChange={(e) => setTwoStepConfirmPassword(e.target.value)}
                    className={`${darkInputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTwoStepConfirmPw(!showTwoStepConfirmPw)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showTwoStepConfirmPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[#060D28] border border-blue-400/15 rounded-xl space-y-1.5 text-xs">
                <div
                  className={`flex items-center gap-2 ${
                    hasMinLength ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>At least 8 characters in length</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasUpper && hasLower ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Uppercase &amp; lowercase letters</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasNumber ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>At least one number (0-9)</span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    hasSpecial ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>At least one special character (!@#$%^&*)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isPasswordValid) {
                    setErrorAlert('Please fulfill all password security requirements.');
                    return;
                  }
                  if (!passwordsMatch) {
                    setErrorAlert('Passwords do not match.');
                    return;
                  }
                  setErrorAlert(null);
                  setCurrentStep('SECURITY_PIN');
                }}
                disabled={!isPasswordValid || !passwordsMatch}
                className="btn-liquid w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>Next: Security PIN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 6: SECURITY PIN
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'SECURITY_PIN' && (
          <motion.div
            key="step-sec-pin"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-center mb-5">
              <div className="inline-flex p-2 bg-blue-500/15 rounded-xl text-blue-400 mb-2">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Create Your Security PIN
              </h2>
              <p className="text-sm text-slate-400 mt-1">Choose a 4 or 6-digit PIN.</p>
            </div>

            <div className="flex justify-center mb-5">
              <div className="inline-flex p-1 bg-[#060D28] rounded-xl border border-blue-400/20">
                <button
                  type="button"
                  onClick={() => {
                    setPinLength(4);
                    setPin('');
                    setConfirmPin('');
                  }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                    pinLength === 4 ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  4 Digits
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinLength(6);
                    setPin('');
                    setConfirmPin('');
                  }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                    pinLength === 6 ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  6 Digits
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter {pinLength}-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={pinLength}
                  placeholder={'•'.repeat(pinLength)}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className={`${darkInputClass} text-center tracking-[0.5em] text-lg font-bold font-mono`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm {pinLength}-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={pinLength}
                  placeholder={'•'.repeat(pinLength)}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className={`${darkInputClass} text-center tracking-[0.5em] text-lg font-bold font-mono`}
                />
              </div>

              {isSequentialOrRepeated && (
                <p className="text-xs text-rose-400">
                  Weak PIN detected. Avoid repetitive or sequential numbers.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!isPinValid) {
                    setErrorAlert(`Please enter a valid, non-sequential ${pinLength}-digit PIN.`);
                    return;
                  }
                  setErrorAlert(null);
                  setCurrentStep('SECURITY_QUESTION');
                }}
                disabled={!isPinValid}
                className="btn-liquid w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>Next: Security Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 7: SECURITY QUESTION
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'SECURITY_QUESTION' && (
          <motion.div
            key="step-sec-q"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-center mb-5">
              <div className="inline-flex p-2 bg-blue-500/15 rounded-xl text-blue-400 mb-2">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Security Question
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Used only if you ever need to recover your student ID.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Security Question
                </label>
                <select
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  className={darkInputClass}
                >
                  {PRESET_SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q} className="bg-slate-900">
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {selectedQuestion === 'Create my own question' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Custom Question
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your custom question"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    className={darkInputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Security Answer
                </label>
                <input
                  type="text"
                  placeholder="Enter answer"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className={darkInputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Security Answer
                </label>
                <input
                  type="text"
                  placeholder="Confirm answer"
                  value={confirmSecurityAnswer}
                  onChange={(e) => setConfirmSecurityAnswer(e.target.value)}
                  className={darkInputClass}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const finalQ =
                    selectedQuestion === 'Create my own question'
                      ? customQuestion
                      : selectedQuestion;
                  if (!finalQ.trim()) {
                    setErrorAlert('Please provide a valid security question.');
                    return;
                  }
                  if (!securityAnswer.trim() || securityAnswer.trim().length < 2) {
                    setErrorAlert('Security answer must be at least 2 characters.');
                    return;
                  }
                  if (
                    securityAnswer.trim().toLowerCase() !==
                    confirmSecurityAnswer.trim().toLowerCase()
                  ) {
                    setErrorAlert('Security answers do not match.');
                    return;
                  }
                  setErrorAlert(null);
                  setCurrentStep('REVIEW_SECURITY');
                }}
                className="btn-liquid w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Next: Review Security</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            STEP 8: REVIEW SECURITY SETTINGS
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'REVIEW_SECURITY' && (
          <motion.div
            key="step-sec-review"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-center mb-5">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Review Your Security Setup
              </h2>
              <p className="text-sm text-slate-400 mt-1">Verify your credentials before finalizing.</p>
            </div>

            <div className="p-4 bg-[#060D28] border border-blue-400/20 rounded-2xl space-y-3 mb-6">
              <div className="flex justify-between items-center py-1 border-b border-blue-400/10">
                <span className="text-xs text-slate-400">SJ Tutor AI ID</span>
                <span className="text-xs font-mono font-bold text-white">{generatedSjTutorId}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-blue-400/10">
                <span className="text-xs text-slate-400">2-Step Verification</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  Configured <Check className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-blue-400/10">
                <span className="text-xs text-slate-400">Security PIN</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  {pinLength} Digits Configured <Check className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-slate-400">Security Question</span>
                <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  Encrypted &amp; Saved <Check className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSecuritySetup}
              disabled={loading}
              className="btn-liquid w-full py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Secure My Account</span>}
            </button>
          </motion.div>
        )}

        {currentStep === 'SAVING_SECURITY' && (
          <motion.div
            key="step-saving-sec"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Securing Your Account...</h2>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════
            COMPLETE: OFFICIAL CARD
           ══════════════════════════════════════════════════════════ */}
        {currentStep === 'COMPLETE' && (
          <motion.div
            key="step-complete"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-2 space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Setup Complete · Account Active</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome to SJ Tutor AI!
              </h2>
            </div>

            <div className="border border-blue-400/20 rounded-3xl p-4 sm:p-6 bg-[#060D28] overflow-hidden shadow-inner">
              <IdCardView
                userProfile={{
                  displayName: createdUser?.displayName || `${firstName} ${lastName}`.trim(),
                  email: createdUser?.email || authIdentity?.email || '',
                  photoURL,
                  grade: classGrade,
                  institution: 'SJ Tutor AI Academy',
                  phoneNumber: '+91 8105423488',
                  state: 'Karnataka',
                  district: 'Dharwad',
                  board: 'CBSE',
                  planType: 'Scholar',
                  sjTutorId: generatedSjTutorId,
                  registrationNumber: generatedSjTutorId,
                  credits: 100,
                  hasCompletedOnboarding: true,
                  isRegisteredInFirestore: true,
                } as any}
                email={createdUser?.email || authIdentity?.email}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess({
                  uid: createdUser?.uid,
                  sjTutorId: generatedSjTutorId,
                  displayName: createdUser?.displayName || `${firstName} ${lastName}`.trim(),
                  email: createdUser?.email || authIdentity?.email,
                  photoURL,
                  classGrade,
                  subjects: selectedSubjects,
                  learningPreferences: selectedPreferences,
                  preferredLanguage,
                  hasCompletedOnboarding: true,
                  isRegisteredInFirestore: true,
                });
              }}
              className="btn-liquid w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-2xl font-black text-base transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Learning</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unauthorized Domain Guidance Modal */}
      <UnauthorizedDomainModal
        isOpen={!!unauthorizedDomainData}
        onClose={() => setUnauthorizedDomainData(null)}
        domain={unauthorizedDomainData?.domain}
        provider={unauthorizedDomainData?.provider || 'Google'}
        onRetry={() => {
          if (unauthorizedDomainData?.provider) {
            handleSocialSignUp(unauthorizedDomainData.provider as any);
          }
        }}
        onSwitchToEmail={() => setUnauthorizedDomainData(null)}
      />
    </div>
  );
};
