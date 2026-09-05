import React, { useState } from 'react';
import {
  Loader2,
  Mail,
  Github,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  Camera,
  HelpCircle,
  Lock,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { GoogleIcon, AppleIcon, YahooIcon } from './AuthIcons';
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
  onSwitchToLogin: () => void;
}

type StepType =
  | 'AUTH_METHOD'
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
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
  'Class 11', 'Class 12', 'College', 'Other'
];

const SUBJECT_OPTIONS = [
  'Mathematics', 'Science', 'English', 'Kannada', 'Hindi',
  'Social Science', 'Computer Science', 'Physics', 'Chemistry',
  'Biology', 'Other'
];

const LEARNING_PREFERENCES = [
  'Step-by-step explanations',
  'Examples',
  'Practice questions',
  'Quizzes',
  'Visual explanations',
  'Short explanations',
  'Detailed explanations',
  'Revision'
];

const PRESET_SECURITY_QUESTIONS = [
  'What was the name of your first school?',
  'What was your childhood nickname?',
  'What was the name of your first teacher?',
  'What is your favorite subject?',
  'Create my own question'
];

export const SignUpFlow: React.FC<SignUpFlowProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [currentStep, setCurrentStep] = useState<StepType>('AUTH_METHOD');
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Auth Identity captured from Social popup or Email step
  const [authIdentity, setAuthIdentity] = useState<any>(null);

  // Email form fields
  const [emailMode, setEmailMode] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [showEmailConfirmPw, setShowEmailConfirmPw] = useState(false);

  // Profile Setup fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ checked: boolean; available?: boolean; message?: string }>({ checked: false });
  const [photoURL, setPhotoURL] = useState('');

  // Learning Profile fields
  const [classGrade, setClassGrade] = useState('Class 10');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Mathematics', 'Science']);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>(['Step-by-step explanations', 'Examples']);
  const [preferredLanguage, setPreferredLanguage] = useState('English');

  // Generated SJ Tutor AI ID & Account
  const [generatedSjTutorId, setGeneratedSjTutorId] = useState('');
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Security Setup: 2-Step Password
  const [twoStepPassword, setTwoStepPassword] = useState('');
  const [twoStepConfirmPassword, setTwoStepConfirmPassword] = useState('');
  const [showTwoStepPw, setShowTwoStepPw] = useState(false);
  const [showTwoStepConfirmPw, setShowTwoStepConfirmPw] = useState(false);

  // Security Setup: PIN
  const [pinLength, setPinLength] = useState<4 | 6>(6);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Security Setup: Question & Answer
  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [confirmSecurityAnswer, setConfirmSecurityAnswer] = useState('');

  // Progress Bar Helper
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
    }
  };

  const stageNumber = getProgressStage();

  // -------------------------------------------------------------
  // 1. Social Sign Up
  // -------------------------------------------------------------
  const handleSocialSignUp = async (provider: 'google' | 'apple' | 'yahoo' | 'github') => {
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await handleSocialAuth(provider, 'signup');
      if (res.status === 'ACCOUNT_ALREADY_EXISTS') {
        setCurrentStep('ACCOUNT_EXISTS');
        return;
      }
      if (res.status === 'PENDING_PROFILE') {
        setAuthIdentity(res.authIdentity);
        // Pre-fill profile
        if (res.authIdentity?.displayName) {
          const parts = res.authIdentity.displayName.split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
        if (res.authIdentity?.photoURL) {
          setPhotoURL(res.authIdentity.photoURL);
        }
        if (res.authIdentity?.email) {
          const baseUser = res.authIdentity.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
          setUsername(baseUser);
        }
        setCurrentStep('PROFILE_SETUP');
      } else if (res.status === 'ERROR') {
        setErrorAlert(res.message || 'Authentication error. Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Unable to connect to authentication provider.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. Email + Password Sign Up Init
  // -------------------------------------------------------------
  const handleEmailSignUpInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorAlert(null);
    try {
      const res = await initEmailSignUp(emailInput, emailPassword, emailConfirmPassword);
      if (res.status === 'ACCOUNT_ALREADY_EXISTS') {
        setCurrentStep('ACCOUNT_EXISTS');
        return;
      }
      if (res.status === 'PENDING_PROFILE') {
        setAuthIdentity(res.authIdentity);
        const baseUser = emailInput.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
        setUsername(baseUser);
        setCurrentStep('PROFILE_SETUP');
      } else if (res.status === 'ERROR') {
        setErrorAlert(res.message || 'Validation error');
      }
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Error validating email.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Username Availability Check
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 4. Create Account & Generate SJ Tutor AI ID
  // -------------------------------------------------------------
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
        // Pre-fill 2-step password with email password if available, else empty
        if (authIdentity?.password) {
          setTwoStepPassword(authIdentity.password);
          setTwoStepConfirmPassword(authIdentity.password);
        }
        setCurrentStep('SHOW_ID');
      } else {
        setErrorAlert(res.message || 'Account creation encountered an issue.');
        setCurrentStep('LEARNING_PROFILE');
      }
    } catch (err: any) {
      console.error(err);
      setErrorAlert('Network error creating account. Please try again.');
      setCurrentStep('LEARNING_PROFILE');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 5. Save Security Setup
  // -------------------------------------------------------------
  const handleSaveSecuritySetup = async () => {
    setCurrentStep('SAVING_SECURITY');
    setLoading(true);
    setErrorAlert(null);

    const activeQuestion = selectedQuestion === 'Create my own question' ? customQuestion : selectedQuestion;

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
    } catch (err: any) {
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
    "0123456789012345".includes(pin.trim()) ||
    "9876543210987654".includes(pin.trim());
  const isPinValid = pinDigitsOnly && pinMatchesLength && pinsMatch && !isSequentialOrRepeated;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* ── Progress Indicator ── */}
      {currentStep !== 'ACCOUNT_EXISTS' && currentStep !== 'COMPLETE' && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
            <span className={stageNumber >= 1 ? 'text-amber-500' : 'text-slate-400'}>1. Account</span>
            <span className={stageNumber >= 2 ? 'text-amber-500' : 'text-slate-400'}>2. Profile</span>
            <span className={stageNumber >= 3 ? 'text-amber-500' : 'text-slate-400'}>3. SJ Tutor ID</span>
            <span className={stageNumber >= 4 ? 'text-amber-500' : 'text-slate-400'}>4. Security</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
              style={{ width: `${(stageNumber / 4) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Global Error Notice */}
      {errorAlert && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span>{errorAlert}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 1: INITIAL SIGN UP (AUTH_METHOD)
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'AUTH_METHOD' && !emailMode && (
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create Your SJ Tutor AI Account
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Start your personalized learning journey.
            </p>
          </div>

          {/* Social Auth Options */}
          <div className="space-y-3">
            <button
              onClick={() => handleSocialSignUp('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm disabled:opacity-50"
            >
              <GoogleIcon className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>

            <button
              onClick={() => handleSocialSignUp('apple')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-xl font-medium hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
            >
              <AppleIcon className="w-5 h-5" />
              <span>Continue with Apple</span>
            </button>

            <button
              onClick={() => handleSocialSignUp('yahoo')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#6001D2] text-white rounded-xl font-medium hover:bg-[#5200b3] transition-colors shadow-sm disabled:opacity-50"
            >
              <YahooIcon className="w-5 h-5" />
              <span>Continue with Yahoo</span>
            </button>

            <button
              onClick={() => handleSocialSignUp('github')}
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

          {/* Email Option Button */}
          <button
            onClick={() => setEmailMode(true)}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-all shadow-sm shadow-amber-500/20"
          >
            <Mail className="w-5 h-5" />
            <span>Sign up with Email & Password</span>
          </button>

          <div className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* ── Email & Password Form ── */}
      {currentStep === 'AUTH_METHOD' && emailMode && (
        <div>
          <button
            onClick={() => setEmailMode(false)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All sign up options</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create your account
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Enter your email and password to begin.
            </p>
          </div>

          <form onSubmit={handleEmailSignUpInit} className="space-y-4">
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
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showEmailPw ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPw(!showEmailPw)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showEmailPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showEmailConfirmPw ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={emailConfirmPassword}
                  onChange={(e) => setEmailConfirmPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailConfirmPw(!showEmailConfirmPw)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showEmailConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Continue</span>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          EXISTING ACCOUNT CHECK -> ACCOUNT ALREADY EXISTS
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'ACCOUNT_EXISTS' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Account Already Exists
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xs mx-auto">
            This account is already registered with SJ Tutor AI. Please try logging in instead.
          </p>
          <div className="mt-6 space-y-3">
            <button
              onClick={onSwitchToLogin}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all shadow-sm shadow-amber-500/20"
            >
              Log In
            </button>
            <button
              onClick={() => setCurrentStep('AUTH_METHOD')}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 2: PROFILE SETUP
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'PROFILE_SETUP' && (
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Complete Your Profile
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Let&apos;s personalize your SJ Tutor AI experience.
            </p>
          </div>

          {/* Profile Photo Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white text-2xl font-bold border-2 border-white dark:border-slate-800 shadow-md">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{firstName ? firstName[0].toUpperCase() : 'S'}</span>
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-1.5 bg-slate-800 text-white rounded-full cursor-pointer hover:bg-slate-700 shadow-sm transition-colors"
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
            <span className="text-xs text-slate-500 mt-2">Add or customize your profile picture</span>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Username Field with Live Availability Check */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                className="w-full pl-8 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              {usernameStatus.checked && (
                <span className="absolute right-3.5 top-3">
                  {usernameStatus.available ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </span>
              )}
            </div>
            {usernameStatus.message && (
              <p className={`text-xs mt-1 ${usernameStatus.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {usernameStatus.message}
              </p>
            )}
          </div>

          <button
            onClick={() => {
              if (!firstName.trim()) {
                setErrorAlert('Please enter your first name.');
                return;
              }
              setErrorAlert(null);
              setCurrentStep('LEARNING_PROFILE');
            }}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20"
          >
            <span>Next: Learning Preferences</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 3: LEARNING PROFILE ("Tell Us About Yourself")
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'LEARNING_PROFILE' && (
        <div>
          <div className="text-center mb-5">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tell Us About Yourself
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Help SJ Tutor AI tailor every explanation to you.
            </p>
          </div>

          <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
            {/* Class / Grade Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Class / Grade
              </label>
              <select
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Subjects Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Subjects (Select your core subjects)
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
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Learning Preferences */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pref}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferred Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="English">English</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Hindi">Hindi (हिन्दी)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleProceedToCreateAccount}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleProceedToCreateAccount}
              className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CREATING ACCOUNT LOADING STATE
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'CREATING_ACCOUNT' && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Creating Your SJ Tutor AI Account...
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Generating your unique SJ Tutor AI ID and setting up your workspace.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 4: SHOW GENERATED SJ TUTOR AI ID
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'SHOW_ID' && (
        <div className="text-center py-2">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            🎉 Your SJ Tutor AI ID
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Your SJ Tutor AI ID has been created!
          </p>

          {/* Distinct ID Badge Card */}
          <div className="my-6 p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-400/60 dark:border-amber-500/40 rounded-2xl shadow-md">
            <span className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-extrabold">
              Official SJ Tutor AI ID
            </span>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-amber-300 tracking-wider my-2">
              {generatedSjTutorId}
            </div>
            <button
              onClick={copyIdToClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SJ Tutor AI ID</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            This is your unique SJ Tutor AI ID. Keep it safe. You can use it to identify and access your SJ Tutor AI account.
          </p>

          <button
            onClick={() => setCurrentStep('SECURITY_PASSWORD')}
            className="w-full mt-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20"
          >
            <span>Continue to Security Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 5: SECURITY SETUP - 2-STEP VERIFICATION PASSWORD
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'SECURITY_PASSWORD' && (
        <div>
          <div className="text-center mb-5">
            <div className="inline-flex p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Secure Your SJ Tutor AI Account
            </h2>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-1">
              Create Your 2-Step Verification Password
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs mx-auto">
              This password will be used as an additional security credential when signing in with your SJ Tutor AI ID.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                2-Step Verification Password
              </label>
              <div className="relative">
                <input
                  type={showTwoStepPw ? 'text' : 'password'}
                  placeholder="Enter secure password"
                  value={twoStepPassword}
                  onChange={(e) => setTwoStepPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowTwoStepPw(!showTwoStepPw)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showTwoStepPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showTwoStepConfirmPw ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={twoStepConfirmPassword}
                  onChange={(e) => setTwoStepConfirmPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowTwoStepConfirmPw(!showTwoStepConfirmPw)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showTwoStepConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirement Checklist */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl space-y-1.5 text-xs">
              <div className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>At least 8 characters in length</span>
              </div>
              <div className={`flex items-center gap-2 ${hasUpper && hasLower ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Uppercase & lowercase letters</span>
              </div>
              <div className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>At least one number (0-9)</span>
              </div>
              <div className={`flex items-center gap-2 ${hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>At least one special character (!@#$%^&*)</span>
              </div>
            </div>

            <button
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
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              <span>Next: Security PIN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 6: SECURITY SETUP - 4 OR 6 DIGIT PIN
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'SECURITY_PIN' && (
        <div>
          <div className="text-center mb-5">
            <div className="inline-flex p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 mb-2">
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create Your Security PIN
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Choose a 4 or 6-digit PIN.
            </p>
          </div>

          {/* Length Toggle: 4 Digits vs 6 Digits */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setPinLength(4);
                  setPin('');
                  setConfirmPin('');
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  pinLength === 4
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
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
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  pinLength === 6
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                6 Digits
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Enter {pinLength}-Digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={pinLength}
                placeholder={'•'.repeat(pinLength)}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] text-lg font-bold py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm {pinLength}-Digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={pinLength}
                placeholder={'•'.repeat(pinLength)}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] text-lg font-bold py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono"
              />
            </div>

            {isSequentialOrRepeated && (
              <p className="text-xs text-red-500">
                Weak PIN detected. Avoid repetitive (e.g. 1111) or sequential numbers (e.g. 1234).
              </p>
            )}

            <button
              onClick={() => {
                if (!isPinValid) {
                  setErrorAlert(`Please enter a valid, non-sequential ${pinLength}-digit PIN.`);
                  return;
                }
                setErrorAlert(null);
                setCurrentStep('SECURITY_QUESTION');
              }}
              disabled={!isPinValid}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              <span>Next: Security Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 7: SECURITY QUESTION & ANSWER
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'SECURITY_QUESTION' && (
        <div>
          <div className="text-center mb-5">
            <div className="inline-flex p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 mb-2">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Set Up Your Security Question
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Choose a security question that you can remember.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Security Question
              </label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {PRESET_SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            {selectedQuestion === 'Create my own question' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Question
                </label>
                <input
                  type="text"
                  placeholder="Enter your custom question"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Security Answer
              </label>
              <input
                type="text"
                placeholder="Enter answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Security Answer
              </label>
              <input
                type="text"
                placeholder="Confirm answer"
                value={confirmSecurityAnswer}
                onChange={(e) => setConfirmSecurityAnswer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Answers are normalized and encrypted. They are never stored in plaintext.
              </p>
            </div>

            <button
              onClick={() => {
                const finalQ = selectedQuestion === 'Create my own question' ? customQuestion : selectedQuestion;
                if (!finalQ.trim()) {
                  setErrorAlert('Please provide a valid security question.');
                  return;
                }
                if (!securityAnswer.trim() || securityAnswer.trim().length < 2) {
                  setErrorAlert('Security answer must be at least 2 characters.');
                  return;
                }
                if (securityAnswer.trim().toLowerCase() !== confirmSecurityAnswer.trim().toLowerCase()) {
                  setErrorAlert('Security answers do not match.');
                  return;
                }
                setErrorAlert(null);
                setCurrentStep('REVIEW_SECURITY');
              }}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-amber-500/20"
            >
              <span>Next: Review Security</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 8: REVIEW SECURITY SETTINGS
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'REVIEW_SECURITY' && (
        <div>
          <div className="text-center mb-5">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Review Your Security Setup
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Verify your security credentials before finalizing.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 mb-6">
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500">SJ Tutor AI ID</span>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{generatedSjTutorId}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500">2-Step Verification Password</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                Configured <Check className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500">Security PIN</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                {pinLength} Digits Configured <Check className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500">Security Question</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                Configured <Check className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-slate-500">Security Answer</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                Encrypted & Saved <Check className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          <button
            onClick={handleSaveSecuritySetup}
            disabled={loading}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Secure My Account</span>}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SAVING CREDENTIALS LOADING
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'SAVING_SECURITY' && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Securing Your Account...
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Hashing your 2-step verification credentials and applying protection.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 9: SECURITY SETUP SUCCESS / COMPLETE (DISPLAY SJ TUTOR AI CARD)
         ══════════════════════════════════════════════════════════ */}
      {currentStep === 'COMPLETE' && (
        <div className="py-2 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>Security Setup Complete • Account Active</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome to SJ Tutor AI! 🎉
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Your 2-step verification and PIN protection are active. Here is your official <span className="font-bold text-amber-500">SJ Tutor AI Card</span>:
            </p>
          </div>

          {/* Quick ID Badge */}
          <div className="flex items-center justify-between p-4 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400">
                Your Official SJ Tutor AI ID
              </span>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {generatedSjTutorId}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedSjTutorId);
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 2000);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all flex items-center gap-1.5 shadow-sm"
            >
              {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
            </button>
          </div>

          {/* Official SJ Tutor AI Card Display */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden shadow-inner">
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

          {/* Action to enter app */}
          <div className="pt-2">
            <button
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
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-base transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>Enter SJ Tutor AI & Start Learning</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
