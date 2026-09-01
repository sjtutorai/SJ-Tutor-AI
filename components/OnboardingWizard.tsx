import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  googleProvider, 
  githubProvider,
  appleProvider,
  yahooProvider
} from '../firebaseConfig';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
  User
} from 'firebase/auth';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  School, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Layers, 
  Briefcase, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Target, 
  Lightbulb, 
  Eye, 
  EyeOff, 
  CheckCircle,
  Plus,
  CreditCard,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import Logo from './Logo';
import { IdLoginView } from './IdLoginView';
import { 
  STATE_DISTRICT_MAPPING, 
  INDIAN_STATES, 
  INDIAN_SCHOOL_BOARDS, 
  GRADES_LIST, 
  COMMON_SCHOOL_TYPES, 
  LEARNING_GOALS_LIST, 
  LEARNING_STYLES_LIST 
} from '../data/academicData';
import { 
  generateSjTutorId, 
  calculateGradeFromAge 
} from '../utils/profileUtils';
import { validateAndParsePhone, COUNTRY_PHONE_CODES } from '../utils/phoneUtils';
import { SettingsService } from '../services/settingsService';
import { SecurityPinService } from '../services/securityPinService';
import { checkUserRegistrationStatus, getCurrentUserProfile } from '../utils/userService';

interface OnboardingWizardProps {
  initialUser?: User | null;
  initialProfile?: Partial<UserProfile>;
  initialStep?: number;
  initialMode?: 'signin' | 'signup';
  onComplete: (profile: UserProfile) => void;
  onClose?: () => void;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

const GoogleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const GithubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const AppleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.61 1.34-.55.63-1.03 1.68-.9 2.7 1 .08 2.03-.5 2.59-1.19z"/>
  </svg>
);

const YahooIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      fill="#6001D2"
      d="M12 0C5.372 0 0 5.373 0 12c0 6.627 5.372 12 12 12 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"
    />
    <path
      fill="#FFFFFF"
      d="M6.2 6h2.7l2.8 5.6L14.5 6h2.7l-4.3 8.3v4.7h-2.2v-4.7L6.2 6zm10.7 7.7a1.4 1.4 0 110 2.8 1.4 1.4 0 010-2.8z"
    />
  </svg>
);

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialUser = null,
  initialProfile = {},
  initialStep = 1,
  initialMode = 'signup',
  onComplete,
  onClose,
  onNavigateToTerms,
  onNavigateToPrivacy
}) => {
  // Step tracker: 1 = Auth, 2 = Personal Info, 3 = Academic & Contact, 4 = Learning Preferences, 5 = Success Screen
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (initialUser) return Math.max(2, initialStep);
    return initialStep;
  });

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);
  const [authSubView, setAuthSubView] = useState<'menu' | 'email' | 'id_login'>('menu');
  const [notRegisteredNotice, setNotRegisteredNotice] = useState<{
    email: string;
    name?: string;
    provider?: string;
  } | null>(null);

  // Form states
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile data
  const [displayName, setDisplayName] = useState(initialProfile.displayName || initialUser?.displayName || '');
  const [dob, setDob] = useState(initialProfile.dob || '');
  const [state, setState] = useState(initialProfile.state || 'Delhi');
  const [district, setDistrict] = useState(initialProfile.district || 'New Delhi');
  const [bio, setBio] = useState(initialProfile.bio || '');

  // Academic & Contact data
  const [institution, setInstitution] = useState(initialProfile.institution || '');
  const [schoolSearchQuery, setSchoolSearchQuery] = useState(initialProfile.institution || '');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [grade, setGrade] = useState(initialProfile.grade || '10th Grade');
  const [board, setBoard] = useState(initialProfile.board || 'CBSE (Central Board of Secondary Education)');
  const [phoneNumber, setPhoneNumber] = useState(initialProfile.phoneNumber || '');
  const [contactCountryCode, setContactCountryCode] = useState('+91');

  // Learning Preferences
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    if (initialProfile.learningGoals && initialProfile.learningGoals.length > 0) return initialProfile.learningGoals;
    if (initialProfile.learningGoal) return [initialProfile.learningGoal];
    return ['Understand difficult topics', 'Prepare for exams'];
  });
  const [customGoal, setCustomGoal] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(() => {
    if (initialProfile.learningStyles && initialProfile.learningStyles.length > 0) return initialProfile.learningStyles;
    if (initialProfile.learningStyle) return [initialProfile.learningStyle];
    return ['Step-by-step learning', 'Examples & illustrations'];
  });

  // Generated unique ID
  const [sjTutorId, setSjTutorId] = useState<string>(() => {
    return initialProfile.sjTutorId || initialProfile.registrationNumber || generateSjTutorId();
  });
  const [copiedId, setCopiedId] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const schoolDropdownRef = useRef<HTMLDivElement>(null);

  // Sync user if prop changes
  useEffect(() => {
    if (initialUser && !currentUser) {
      setCurrentUser(initialUser);
      if (initialUser.displayName && !displayName) {
        setDisplayName(initialUser.displayName);
      }
      if (currentStep === 1) {
        setCurrentStep(2);
      }
    }
  }, [initialUser]);

  // Click outside to close school dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target as Node)) {
        setShowSchoolDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update district options when state changes
  useEffect(() => {
    if (state && STATE_DISTRICT_MAPPING[state]) {
      const districts = STATE_DISTRICT_MAPPING[state];
      if (!districts.includes(district)) {
        setDistrict(districts[0] || '');
      }
    }
  }, [state]);

  // Auto-calculate grade from DOB if user fills DOB
  const handleDobChange = (val: string) => {
    setDob(val);
    if (val) {
      const calculated = calculateGradeFromAge(val);
      if (calculated && GRADES_LIST.includes(calculated)) {
        setGrade(calculated);
      }
    }
  };

  // Helper for school list filtering
  const filteredSchools = COMMON_SCHOOL_TYPES.filter(s => 
    s.toLowerCase().includes(schoolSearchQuery.toLowerCase())
  );

  // Validation functions
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!displayName.trim() || displayName.trim().length < 2) {
      errors.displayName = 'Full Name is required (at least 2 characters).';
    }
    if (!dob) {
      errors.dob = 'Date of Birth is required.';
    }
    if (!state) {
      errors.state = 'State is required.';
    }
    if (!district) {
      errors.district = 'District is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!institution.trim()) {
      errors.institution = 'School Name/School Selection is REQUIRED. Please search or add your school.';
    }
    if (!grade) {
      errors.grade = 'Class/Grade is required.';
    }
    if (!board) {
      errors.board = 'Academic Board is required.';
    }
    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Phone Number is required.';
    } else {
      const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `${contactCountryCode}${phoneNumber}`;
      const phoneVal = validateAndParsePhone(fullPhone);
      if (!phoneVal.isValid) {
        errors.phoneNumber = phoneVal.error || 'Please enter a valid phone number.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep4 = (): boolean => {
    const errors: Record<string, string> = {};
    if (selectedGoals.length === 0) {
      errors.learningGoals = 'Please select at least one learning goal.';
    }
    if (selectedStyles.length === 0) {
      errors.learningStyles = 'Please select at least one preferred learning style.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Auth Handlers
  const handleProviderSignIn = async (provider: any, providerName: string) => {
    setLoading(true);
    setError(null);
    setNotRegisteredNotice(null);
    try {
      const result = await signInWithPopup(auth, provider);
      if (!result.user) {
        throw new Error("No user returned from authentication provider.");
      }

      // Check whether this user/Google account is already registered in Firestore
      const regStatus = await checkUserRegistrationStatus(result.user);

      if (authMode === 'signin') {
        // User clicked "Sign In / Log In"
        if (!regStatus.isRegistered) {
          // Account NOT registered in Firestore: ask user to register first
          const unregisteredEmail = result.user.email || 'Your account';
          const unregisteredName = result.user.displayName || '';

          try {
            await signOut(auth);
          } catch (e) {
            console.warn("Sign-out warning:", e);
          }

          if (unregisteredName) setDisplayName(unregisteredName);
          if (unregisteredEmail) setEmail(unregisteredEmail);

          setAuthMode('signup');
          setNotRegisteredNotice({
            email: unregisteredEmail,
            name: unregisteredName,
            provider: providerName,
          });
          setError(`The ${providerName} account (${unregisteredEmail}) is not registered in SJ Tutor AI yet. Please register your student profile first, then sign in.`);
          setLoading(false);
          return;
        }

        // Account IS registered in Firestore: complete sign in directly
        if (result.user?.uid) {
          SecurityPinService.clearTwoStepVerified(result.user.uid);
          SecurityPinService.lockSession(result.user.uid);
        }
        const fullProf = regStatus.profile || await getCurrentUserProfile(result.user);
        onComplete(fullProf);
        return;
      } else {
        // User clicked "Sign Up / New (Register)"
        if (regStatus.isRegistered) {
          // Already registered, automatically log in
          if (result.user?.uid) {
            SecurityPinService.clearTwoStepVerified(result.user.uid);
            SecurityPinService.lockSession(result.user.uid);
          }
          const fullProf = regStatus.profile || await getCurrentUserProfile(result.user);
          onComplete(fullProf);
          return;
        }

        // Unregistered new account: proceed with onboarding steps 2-5
        if (result.user?.uid) {
          SecurityPinService.clearTwoStepVerified(result.user.uid);
          SecurityPinService.lockSession(result.user.uid);
        }
        setCurrentUser(result.user);
        if (result.user.displayName && !displayName) {
          setDisplayName(result.user.displayName);
        }
        if (result.user.email && !email) {
          setEmail(result.user.email);
        }
        setCurrentStep(2);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email but different sign-in credentials.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing.');
      } else {
        setError(`Failed to sign in with ${providerName}. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    if (authMode === 'signup' && !displayName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotRegisteredNotice(null);

    try {
      if (authMode === 'signin') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const regStatus = await checkUserRegistrationStatus(userCredential.user);
        
        if (!regStatus.isRegistered) {
          try {
            await signOut(auth);
          } catch (err) {
            console.warn("Sign-out warning:", err);
          }
          setAuthMode('signup');
          setNotRegisteredNotice({
            email,
            name: displayName || '',
            provider: 'Email',
          });
          setError(`The email account (${email}) is not registered in SJ Tutor AI yet. Please register your account first, then sign in.`);
          setLoading(false);
          return;
        }

        if (userCredential.user?.uid) {
          SecurityPinService.clearTwoStepVerified(userCredential.user.uid);
          SecurityPinService.lockSession(userCredential.user.uid);
        }
        const fullProf = regStatus.profile || await getCurrentUserProfile(userCredential.user);
        onComplete(fullProf);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user?.uid) {
          SecurityPinService.clearTwoStepVerified(userCredential.user.uid);
          SecurityPinService.lockSession(userCredential.user.uid);
        }
        await updateProfile(userCredential.user, { displayName: displayName.trim() });
        setCurrentUser(userCredential.user);
        setCurrentStep(2);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. If you do not have an account yet, please click "Sign Up / New" to register.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email. Please switch to "Sign In / Log In" to sign in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for SJ Tutor AI ID Card & Registration Number Login
  const handleIdLoginSuccess = (profile: UserProfile, bypass2Step: boolean, uid: string) => {
    if (bypass2Step) {
      SecurityPinService.setTwoStepVerified(uid);
      SecurityPinService.setSessionUnlocked(uid);
    } else {
      SecurityPinService.clearTwoStepVerified(uid);
    }

    // Populate state fields
    if (profile.displayName) setDisplayName(profile.displayName);
    if (profile.dob) setDob(profile.dob);
    if (profile.state) setState(profile.state);
    if (profile.district) setDistrict(profile.district);
    if (profile.institution) setInstitution(profile.institution);
    if (profile.grade) setGrade(profile.grade);
    if (profile.board) setBoard(profile.board);
    if (profile.phoneNumber) setPhoneNumber(profile.phoneNumber);
    if (profile.bio) setBio(profile.bio);
    if (profile.sjTutorId || profile.registrationNumber) {
      setSjTutorId(profile.registrationNumber || profile.sjTutorId || generateSjTutorId());
    }
    if (profile.learningGoals && profile.learningGoals.length > 0) {
      setSelectedGoals(profile.learningGoals);
    }
    if (profile.learningStyles && profile.learningStyles.length > 0) {
      setSelectedStyles(profile.learningStyles);
    }

    // Mock user object for session state
    const mockUser: any = {
      uid: uid,
      displayName: profile.displayName || 'Scholar Member',
      email: profile.email || `${uid}@sjtutor.ai`,
      photoURL: profile.photoURL || '',
    };
    setCurrentUser(mockUser);

    const fullProfile = {
      ...profile,
      uid: uid,
    };

    // If profile is already complete, finish directly into the dashboard
    if (profile.isRegisteredInFirestore || profile.hasCompletedOnboarding) {
      onComplete(fullProfile);
    } else {
      // Allow user to confirm profile steps if incomplete
      setCurrentStep(2);
    }
  };

  // Finish Onboarding & Save
  const handleFinalSubmit = () => {
    if (!validateStep4()) return;

    setLoading(true);
    const finalId = sjTutorId || generateSjTutorId();

    try {
      SettingsService.updateSettings({
        learning: {
          ...SettingsService.getSettings().learning,
          preferredSubject: 'General Studies',
          grade: grade,
        }
      });
      window.dispatchEvent(new Event('settings-changed'));
    } catch (err) {
      console.error(err);
    }

    setSjTutorId(finalId);
    setCurrentStep(5);
    setLoading(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(sjTutorId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleFinishToApp = () => {
    const finalId = sjTutorId || generateSjTutorId();
    const finalGoal = selectedGoals.includes('Other') && customGoal.trim() 
      ? customGoal.trim() 
      : selectedGoals[0] || 'Understand difficult topics';
    const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `${contactCountryCode}${phoneNumber}`;

    const completeProfile: UserProfile = {
      ...initialProfile,
      displayName: displayName.trim() || 'Scholar User',
      phoneNumber: fullPhone,
      institution: institution.trim(),
      grade: grade,
      board: board,
      dob: dob,
      state: state,
      district: district,
      bio: bio.trim() || `Student at ${institution.trim()}`,
      learningGoal: finalGoal,
      learningGoals: selectedGoals,
      learningStyle: selectedStyles[0] || 'Step-by-step learning',
      learningStyles: selectedStyles,
      sjTutorId: finalId,
      registrationNumber: finalId,
      credits: initialProfile.credits ?? 100,
      hasCompletedOnboarding: true,
      isRegisteredInFirestore: true,
      createdAt: initialProfile.createdAt || Date.now(),
      lastProfileUpdate: Date.now()
    };

    onComplete(completeProfile);
  };

  // Step Progress calculation
  const getStepProgress = () => {
    switch (currentStep) {
      case 1: return { label: 'Authentication', pct: 0, stepNum: 1 };
      case 2: return { label: 'Personal Information', pct: 25, stepNum: 2 };
      case 3: return { label: 'Academic & Contact', pct: 50, stepNum: 3 };
      case 4: return { label: 'Learning Preferences', pct: 75, stepNum: 4 };
      case 5: return { label: 'Profile Ready', pct: 100, stepNum: 5 };
      default: return { label: 'Onboarding', pct: 0, stepNum: 1 };
    }
  };

  const progress = getStepProgress();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-300">
      <div id="recaptcha-container"></div>

      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Header & Progress Bar */}
        <div className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Logo className="w-9 h-9" iconOnly />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                SJ Tutor AI
              </span>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {currentStep === 1 ? 'Authentication' : `Step ${progress.stepNum - 1} of 4 • ${progress.label}`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentStep > 1 && currentStep < 5 && (
              <div className="hidden sm:flex items-center gap-2 bg-primary-50 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-800 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                <span className="text-xs font-bold text-primary-700 dark:text-primary-300">
                  {progress.pct}% Completed
                </span>
              </div>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Visual Progress Bar Track */}
        {currentStep > 1 && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 shrink-0">
            <div 
              className="bg-primary-600 dark:bg-primary-500 h-1.5 transition-all duration-500 ease-out rounded-r-full"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        )}

        {/* Scrollable Content Container */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            
            {/* ================= STEP 1: AUTHENTICATION ================= */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {authMode === 'signup' ? 'Create your SJ Tutor AI Account' : 'Welcome Back to SJ Tutor AI'}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {authMode === 'signup'
                      ? "Choose how you'd like to get started."
                      : 'Sign in to continue your personalized AI learning journey.'}
                  </p>
                </div>

                {/* Sign In vs Sign Up Tab Switcher */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setError(null);
                      setNotRegisteredNotice(null);
                      setAuthSubView('menu');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      authMode === 'signup'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Sign Up / New
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setError(null);
                      setNotRegisteredNotice(null);
                      setAuthSubView('menu');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      authMode === 'signin'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    Sign In / Log In
                  </button>
                </div>

                {notRegisteredNotice && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl text-left space-y-2.5 max-w-md mx-auto shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                      <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Registration Required First</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      The account <strong className="font-semibold text-slate-900 dark:text-white">{notRegisteredNotice.email}</strong> is not registered yet with SJ Tutor AI. Please complete the one-time registration below to create your student account, and then you can sign in anytime.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          handleProviderSignIn(googleProvider, 'Google');
                        }}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Register with Google Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 max-w-md mx-auto">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Primary Auth Options: Google, GitHub, Apple, Yahoo, Email, ID Card / Reg Number */}
                {authSubView === 'menu' && (
                  <div className="space-y-3 max-w-md mx-auto">
                    
                    {/* 1. Google */}
                    <button
                      type="button"
                      onClick={() => handleProviderSignIn(googleProvider, 'Google')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs text-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <GoogleIcon className="w-5 h-5 shrink-0" />
                      <span>{authMode === 'signup' ? 'Continue with Google' : 'Sign in with Google'}</span>
                    </button>

                    {/* 2. GitHub */}
                    <button
                      type="button"
                      onClick={() => handleProviderSignIn(githubProvider, 'GitHub')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs text-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <GithubIcon className="w-5 h-5 shrink-0 text-slate-900 dark:text-white" />
                      <span>{authMode === 'signup' ? 'Continue with GitHub' : 'Sign in with GitHub'}</span>
                    </button>

                    {/* 3. Apple */}
                    <button
                      type="button"
                      onClick={() => handleProviderSignIn(appleProvider, 'Apple')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs text-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <AppleIcon className="w-5 h-5 shrink-0 text-slate-900 dark:text-white" />
                      <span>{authMode === 'signup' ? 'Continue with Apple' : 'Sign in with Apple'}</span>
                    </button>

                    {/* 4. Yahoo */}
                    <button
                      type="button"
                      onClick={() => handleProviderSignIn(yahooProvider, 'Yahoo')}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs text-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <YahooIcon className="w-5 h-5 shrink-0" />
                      <span>{authMode === 'signup' ? 'Continue with Yahoo' : 'Sign in with Yahoo'}</span>
                    </button>

                    {/* 5. Email */}
                    <button
                      type="button"
                      onClick={() => setAuthSubView('email')}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-xs text-sm hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Mail className="w-5 h-5 text-primary-500 shrink-0" />
                      <span>{authMode === 'signup' ? 'Continue with Email' : 'Sign in with Email'}</span>
                    </button>

                    {/* 6. ID Card & Registration Number Login */}
                    <button
                      type="button"
                      onClick={() => setAuthSubView('id_login')}
                      className="w-full flex items-center justify-between py-3.5 px-4 bg-gradient-to-r from-primary-50/80 to-amber-50/60 dark:from-primary-950/40 dark:to-slate-800 border-2 border-dashed border-primary-300/80 dark:border-primary-700/60 hover:border-primary-500 rounded-2xl font-semibold text-slate-800 dark:text-slate-100 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all shadow-xs text-sm hover:scale-[1.01] active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-300 flex items-center justify-center">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <span className="block font-bold text-xs text-slate-900 dark:text-white">
                            Login with ID Card / Reg. Number
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                            Scan ID QR or enter Registration ID &amp; 2-Step Password
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-primary-100 dark:bg-primary-900/70 text-primary-700 dark:text-primary-300 font-bold px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                        Direct Auth
                      </span>
                    </button>
                  </div>
                )}

                {/* Inline Email Form */}
                {authSubView === 'email' && (
                  <form onSubmit={handleEmailAuth} className="space-y-4 max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={() => setAuthSubView('menu')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to all sign-in options
                    </button>

                    {authMode === 'signup' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Full Name *</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your full name"
                            required={authMode === 'signup'}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="scholar@example.com"
                          required
                          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>
                          <span>{authMode === 'signup' ? 'Create Account & Continue' : 'Sign In'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Inline ID Card & Registration Number Login Form */}
                {authSubView === 'id_login' && (
                  <IdLoginView
                    onSuccess={handleIdLoginSuccess}
                    onBack={() => setAuthSubView('menu')}
                  />
                )}

                {/* Terms and Privacy Footer */}
                <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto pt-2">
                  By continuing, you agree to SJ Tutor AI&apos;s{' '}
                  <button 
                    type="button" 
                    onClick={onNavigateToTerms}
                    className="underline text-slate-600 dark:text-slate-400 hover:text-primary-600"
                  >
                    Terms of Service
                  </button>{' '}
                  and acknowledge our{' '}
                  <button 
                    type="button" 
                    onClick={onNavigateToPrivacy}
                    className="underline text-slate-600 dark:text-slate-400 hover:text-primary-600"
                  >
                    Privacy Policy
                  </button>.
                </div>
              </motion.div>
            )}

            {/* ================= STEP 2: PERSONAL INFORMATION ================= */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    Step 1 of 3 Profile Details
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Tell us about yourself
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Help us personalize your SJ Tutor AI experience.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Full Name */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span>Full Name *</span>
                      {fieldErrors.displayName && (
                        <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.displayName}</span>
                      )}
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          if (fieldErrors.displayName) setFieldErrors(prev => ({ ...prev, displayName: '' }));
                        }}
                        placeholder="Enter your full name"
                        className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all ${
                          fieldErrors.displayName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span>Date of Birth *</span>
                      {fieldErrors.dob && (
                        <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.dob}</span>
                      )}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => {
                          handleDobChange(e.target.value);
                          if (fieldErrors.dob) setFieldErrors(prev => ({ ...prev, dob: '' }));
                        }}
                        className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all ${
                          fieldErrors.dob ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">Used to recommend the most suitable grade curriculum.</p>
                  </div>

                  {/* State Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span>State *</span>
                      {fieldErrors.state && (
                        <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.state}</span>
                      )}
                    </label>
                    <div className="relative">
                      <Layers className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        value={state}
                        onChange={(e) => {
                          setState(e.target.value);
                          if (fieldErrors.state) setFieldErrors(prev => ({ ...prev, state: '' }));
                        }}
                        className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
                      >
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* District Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span>District *</span>
                      {fieldErrors.district && (
                        <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.district}</span>
                      )}
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        value={district}
                        onChange={(e) => {
                          setDistrict(e.target.value);
                          if (fieldErrors.district) setFieldErrors(prev => ({ ...prev, district: '' }));
                        }}
                        className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
                      >
                        {state && STATE_DISTRICT_MAPPING[state] ? (
                          STATE_DISTRICT_MAPPING[state].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))
                        ) : (
                          <option value="">Select State First</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* About Me (Bio) */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span>About Me (Bio)</span>
                      <span className="text-[11px] text-slate-400 font-normal">Optional</span>
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us a little about yourself, your interests or dreams..."
                      className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                    />
                  </div>

                </div>

                {/* Bottom Navigation */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep2()) {
                        setCurrentStep(3);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 3: ACADEMIC & CONTACT ================= */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    Step 2 of 3 Academic Profile
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Your Academic Information
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tell us about your school and academic journey.
                  </p>
                </div>

                <div className="space-y-4">
                  
                  {/* REQUIRED SCHOOL SELECTION */}
                  <div className="space-y-1.5 relative" ref={schoolDropdownRef}>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        School Selection <strong className="text-rose-500">*</strong>
                        <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-200/50">Required</span>
                      </span>
                      {fieldErrors.institution && (
                        <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.institution}</span>
                      )}
                    </label>

                    <div className="relative">
                      <School className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={schoolSearchQuery}
                        onFocus={() => setShowSchoolDropdown(true)}
                        onChange={(e) => {
                          setSchoolSearchQuery(e.target.value);
                          setInstitution(e.target.value);
                          setShowSchoolDropdown(true);
                          if (fieldErrors.institution) setFieldErrors(prev => ({ ...prev, institution: '' }));
                        }}
                        placeholder="Search school by name (e.g. DPS, Kendriya Vidyalaya...)"
                        className={`w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all ${
                          fieldErrors.institution ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                      {institution && (
                        <div className="absolute right-3 top-3 text-emerald-500">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    {/* School Dropdown Suggestions */}
                    {showSchoolDropdown && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-2">
                        {filteredSchools.length > 0 ? (
                          filteredSchools.map((s, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setInstitution(s);
                                setSchoolSearchQuery(s);
                                setShowSchoolDropdown(false);
                                if (fieldErrors.institution) setFieldErrors(prev => ({ ...prev, institution: '' }));
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors"
                            >
                              <span>{s}</span>
                              {institution === s && <Check className="w-4 h-4 text-primary-500" />}
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-500">
                            No listed match found for &ldquo;{schoolSearchQuery}&rdquo;.
                          </div>
                        )}

                        {schoolSearchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setInstitution(schoolSearchQuery.trim());
                              setShowSchoolDropdown(false);
                              if (fieldErrors.institution) setFieldErrors(prev => ({ ...prev, institution: '' }));
                            }}
                            className="w-full mt-1 p-2.5 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-primary-200/50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Use &ldquo;{schoolSearchQuery.trim()}&rdquo; as my School
                          </button>
                        )}
                      </div>
                    )}

                    {institution && (
                      <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Selected: <strong>{institution}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Class / Grade & Board Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Class / Grade */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                        <span>Class / Grade *</span>
                        {fieldErrors.grade && (
                          <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.grade}</span>
                        )}
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                          value={grade}
                          onChange={(e) => {
                            setGrade(e.target.value);
                            if (fieldErrors.grade) setFieldErrors(prev => ({ ...prev, grade: '' }));
                          }}
                          className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
                        >
                          {GRADES_LIST.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Academic Board */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                        <span>Academic Board *</span>
                        {fieldErrors.board && (
                          <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.board}</span>
                        )}
                      </label>
                      <div className="relative">
                        <BookOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                          value={board}
                          onChange={(e) => {
                            setBoard(e.target.value);
                            if (fieldErrors.board) setFieldErrors(prev => ({ ...prev, board: '' }));
                          }}
                          className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
                        >
                          {INDIAN_SCHOOL_BOARDS.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number with Country Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      <span>Phone Number *</span>
                      {fieldErrors.phoneNumber && (
                        <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.phoneNumber}</span>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={contactCountryCode}
                        onChange={(e) => setContactCountryCode(e.target.value)}
                        className="w-24 px-2 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                      >
                        {COUNTRY_PHONE_CODES.map((c) => (
                          <option key={c.code} value={c.dialCode}>
                            {c.flag} {c.dialCode}
                          </option>
                        ))}
                      </select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => {
                            setPhoneNumber(e.target.value);
                            if (fieldErrors.phoneNumber) setFieldErrors(prev => ({ ...prev, phoneNumber: '' }));
                          }}
                          placeholder="98765 43210"
                          className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all ${
                            fieldErrors.phoneNumber ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">Used for important notifications, login alerts, and study groups.</p>
                  </div>

                </div>

                {/* Bottom Navigation */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-1.5 px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep3()) {
                        setCurrentStep(4);
                      }
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 4: LEARNING PREFERENCES ================= */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    Step 3 of 3 AI Personalization
                  </span>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Customize Your AI Experience
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Tell SJ Tutor AI how you prefer to learn.
                  </p>
                </div>

                {/* Preference Incomplete Top Banner (+5% Gain Available) */}
                <div className="bg-gradient-to-r from-amber-50 to-primary-50 dark:from-amber-950/30 dark:to-primary-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Preference Incomplete
                        </span>
                        <span className="text-[10px] font-extrabold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-full">
                          +5% Gain available
                        </span>
                      </div>
                      <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                        Selecting your learning style tailors instant answers and quiz difficulty.
                      </p>
                    </div>
                  </div>
                </div>

                {/* FIELD 1: Main Learning Goal */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-primary-500" />
                      Main Learning Goal * (Select all that apply)
                    </span>
                    {fieldErrors.learningGoals && (
                      <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.learningGoals}</span>
                    )}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {LEARNING_GOALS_LIST.map((goal) => {
                      const isSelected = selectedGoals.includes(goal);
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => {
                            setSelectedGoals(prev => 
                              isSelected ? prev.filter(g => g !== goal) : [...prev, goal]
                            );
                            if (fieldErrors.learningGoals) setFieldErrors(p => ({ ...p, learningGoals: '' }));
                          }}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-900 dark:text-primary-200 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <span>{goal}</span>
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-md bg-primary-600 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedGoals.includes('Other') && (
                    <input
                      type="text"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder="Specify your custom learning goal..."
                      className="w-full mt-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                </div>

                {/* FIELD 2: Preferred Learning Style */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      Preferred Learning Style * (Select all that apply)
                    </span>
                    {fieldErrors.learningStyles && (
                      <span className="text-rose-500 text-[11px] font-normal">{fieldErrors.learningStyles}</span>
                    )}
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {LEARNING_STYLES_LIST.map((style) => {
                      const isSelected = selectedStyles.includes(style);
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => {
                            setSelectedStyles(prev => 
                              isSelected ? prev.filter(s => s !== style) : [...prev, style]
                            );
                            if (fieldErrors.learningStyles) setFieldErrors(p => ({ ...p, learningStyles: '' }));
                          }}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <span>{style}</span>
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Navigation */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-1.5 px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Complete Setup</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 5: ACCOUNT CREATION SUCCESS ================= */}
            {currentStep === 5 && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-6 text-center"
              >
                {/* Celebration Header */}
                <div className="space-y-2">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    🎉 Welcome to SJ Tutor AI!
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your account is ready and fully personalized for you.
                  </p>
                </div>

                {/* Profile Summary Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 text-left space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Name</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{displayName || 'Scholar User'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Email</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold truncate block">
                        {email || currentUser?.email || 'Registered User'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">School</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{institution}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Class / Board</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-semibold">{grade} • {board.split(' ')[0]}</strong>
                    </div>
                  </div>
                </div>

                {/* Prominent Unique SJ Tutor AI ID Card */}
                <div className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl p-6 text-white text-center shadow-xl shadow-primary-600/20 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary-100">
                    Your SJ Tutor AI ID
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-wider bg-white/10 backdrop-blur-sm py-3 px-4 rounded-xl border border-white/20 select-all">
                    {sjTutorId}
                  </div>
                  
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-700 hover:bg-primary-50 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-primary-100/90 leading-relaxed max-w-md mx-auto">
                    This unique ID identifies your SJ Tutor AI account and can be used when logging in, taking tests, or sharing with study groups.
                  </p>
                </div>

                {/* Continue to SJ Tutor AI Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleFinishToApp}
                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-extrabold shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2 text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Continue to SJ Tutor AI</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default OnboardingWizard;
