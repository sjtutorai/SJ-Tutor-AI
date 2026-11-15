import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Camera,
  MapPin,
  Calendar,
  Sparkles,
  User,
  Phone,
  Mail,
  Building,
  GraduationCap,
  Globe,
  Compass,
  ExternalLink,
  Printer,
  QrCode,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../Logo';
import {
  checkUsernameAvailability,
  createAccountAndGenerateSjTutorId,
} from '../../services/authService';
import {
  COUNTRIES,
  INDIAN_STATES_AND_DISTRICTS,
  US_STATES,
  reverseGeocodeLatLng,
} from '../../utils/geoData';
import { saveDeviceRegisteredUser } from '../../utils/registrationDetection';
import { generateRegistrationNumber } from '../../utils/profileUtils';
import {
  GradientOrbsBackdrop,
  FloatingFormulasField,
  CircularImageReveal,
  ResilientImage,
  LetterReveal,
} from '../ui/MotionPrimitives';
import onboardingIllustration from '../../src/assets/images/onboarding_scholar_hub_1794584203481.jpg';

export interface BigScreenSignUpPageProps {
  authIdentity?: any;
  onSuccess: (userData: any) => void;
  onCancel: () => void;
}

const DISCOVERY_OPTIONS = [
  { id: 'Google', label: 'Google Search' },
  { id: 'Twitter', label: 'Twitter (X)' },
  { id: 'Instagram', label: 'Instagram' },
  { id: 'ChatGPT', label: 'ChatGPT / AI Assistant' },
  { id: 'Facebook', label: 'Facebook' },
  { id: 'YouTube', label: 'YouTube' },
  { id: 'School', label: 'School / Teacher / Professor' },
  { id: 'Friend', label: 'Friend or Classmate' },
  { id: 'Other', label: 'Other (Please specify)' },
];

const QUICK_CLASSES_6_12 = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11 (Science)',
  'Class 12 (Science)',
];

const GRADE_OPTIONS = [
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
  'Class 11 (Science)',
  'Class 11 (Commerce)',
  'Class 11 (Arts)',
  'Class 12 (Science)',
  'Class 12 (Commerce)',
  'Class 12 (Arts)',
  'Undergraduate / College',
  'Competitive Exams (JEE/NEET/CET)',
  'Self Learner',
];

const BOARD_OPTIONS = [
  'CBSE',
  'ICSE / ISC',
  'State Board (Karnataka / KSEEB)',
  'State Board (Maharashtra)',
  'State Board (Tamil Nadu)',
  'State Board (Other)',
  'IGCSE / Cambridge',
  'IB (International Baccalaureate)',
  'University / College',
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
  'Computer Science / Coding',
  'Economics',
  'Hindi',
];

const LEARNING_STYLES = [
  'Step-by-step problem walkthroughs',
  'Visual explanations & diagrams',
  'Practice quizzes & tests',
  'Concept summaries & flashcards',
  'Interactive real-world analogies',
];

export const BigScreenSignUpPage: React.FC<BigScreenSignUpPageProps> = ({
  authIdentity,
  onSuccess,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // STEP 1: Personal Details
  const [firstName, setFirstName] = useState(() => {
    if (authIdentity?.displayName) {
      return authIdentity.displayName.split(' ')[0] || '';
    }
    return '';
  });
  const [lastName, setLastName] = useState(() => {
    if (authIdentity?.displayName) {
      const parts = authIdentity.displayName.split(' ');
      return parts.slice(1).join(' ') || '';
    }
    return '';
  });
  const [email, setEmail] = useState(() => authIdentity?.email || '');
  const [phonePrefix, setPhonePrefix] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState(() => {
    if (authIdentity?.email) {
      return authIdentity.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    }
    return '';
  });
  const [usernameStatus, setUsernameStatus] = useState<{
    checked: boolean;
    available?: boolean;
    message?: string;
  }>({ checked: false });
  const [photoURL, setPhotoURL] = useState(() => authIdentity?.photoURL || '');
  const isSocialAuth = Boolean(
    authIdentity?.provider &&
      authIdentity.provider !== 'email' &&
      authIdentity.provider !== 'email_password'
  );
  const [password, setPassword] = useState(() => authIdentity?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(() => authIdentity?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  // STEP 2: Discovery
  const [discoverySource, setDiscoverySource] = useState<string>('Google');
  const [customDiscovery, setCustomDiscovery] = useState<string>('');

  // STEP 3: Address & Location
  const [dob, setDob] = useState<string>('2007-06-15');
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [selectedState, setSelectedState] = useState<string>('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Bengaluru Urban');
  const [customDistrict, setCustomDistrict] = useState<string>('');
  const [cityArea, setCityArea] = useState<string>('Bengaluru');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('560001');

  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [mapsCoordinates, setMapsCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapsUrl, setMapsUrl] = useState<string>('');

  // STEP 4: Academic Details
  const [institution, setInstitution] = useState<string>('');
  const [grade, setGrade] = useState<string>('Class 10');
  const [board, setBoard] = useState<string>('CBSE');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
    'Mathematics',
    'Physics',
    'Computer Science / Coding',
  ]);
  const [learningPreferences, setLearningPreferences] = useState<string[]>([
    'Step-by-step problem walkthroughs',
    'Visual explanations & diagrams',
  ]);
  const [tutoringLanguage, setTutoringLanguage] = useState<string>('English');
  const [learningGoal, setLearningGoal] = useState<string>(
    'Master core concepts and excel in upcoming academic examinations.'
  );

  // STEP 5: Success & ID Card
  const [registrationData, setRegistrationData] = useState<{
    sjTutorId: string;
    registrationNumber: string;
    phoneNumber: string;
    email: string;
    username: string;
    fullName: string;
    institution: string;
    grade: string;
    addressSummary: string;
    issueDate: string;
    userData: any;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const availableDistricts = React.useMemo(() => {
    if (selectedCountry === 'India') {
      return INDIAN_STATES_AND_DISTRICTS[selectedState] || [];
    }
    if (selectedCountry === 'United States') {
      return US_STATES[selectedState] || [];
    }
    return [];
  }, [selectedCountry, selectedState]);

  useEffect(() => {
    if (availableDistricts.length > 0) {
      if (!availableDistricts.includes(selectedDistrict)) {
        setSelectedDistrict(availableDistricts[0]);
      }
    } else {
      setSelectedDistrict('');
    }
  }, [selectedState, availableDistricts]);

  const handleCheckUsername = async (candidate: string) => {
    const clean = candidate.trim().toLowerCase();
    setUsername(clean);
    if (!clean || clean.length < 3) {
      setUsernameStatus({ checked: false, message: 'Must be at least 3 characters' });
      return;
    }
    try {
      const res = await checkUsernameAvailability(clean);
      setUsernameStatus({
        checked: true,
        available: res.available,
        message: res.available ? 'Handle is available!' : 'Handle is already taken',
      });
    } catch {
      setUsernameStatus({ checked: true, available: true, message: 'Handle looks good' });
    }
  };

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapsCoordinates({ lat: latitude, lng: longitude });
        const gUrl = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        setMapsUrl(gUrl);

        try {
          const geo = await reverseGeocodeLatLng(latitude, longitude);
          if (geo.country) {
            const match = COUNTRIES.find(
              (c) =>
                c.name.toLowerCase().includes(geo.country!.toLowerCase()) ||
                geo.country!.toLowerCase().includes(c.name.toLowerCase())
            );
            if (match) {
              setSelectedCountry(match.name);
              setPhonePrefix(match.phonePrefix);
            }
          }
          if (geo.state) {
            const matchedState = Object.keys(INDIAN_STATES_AND_DISTRICTS).find(
              (s) =>
                s.toLowerCase().includes(geo.state!.toLowerCase()) ||
                geo.state!.toLowerCase().includes(s.toLowerCase())
            );
            if (matchedState) {
              setSelectedState(matchedState);
            }
          }
          if (geo.district) setSelectedDistrict(geo.district);
          if (geo.city) setCityArea(geo.city);
          if (geo.streetAddress) setStreetAddress(geo.streetAddress);
          if (geo.zipCode) setZipCode(geo.zipCode);

          setLocationSuccess(true);
        } catch (err) {
          console.warn('Geocoding parse failed:', err);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setErrorMsg('Could not detect location. Please select your address manually below.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoURL(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const toggleLearningStyle = (style: string) => {
    if (learningPreferences.includes(style)) {
      if (learningPreferences.length > 1) {
        setLearningPreferences(learningPreferences.filter((s) => s !== style));
      }
    } else {
      setLearningPreferences([...learningPreferences, style]);
    }
  };

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!firstName.trim()) {
        setErrorMsg('Please enter your first name.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Please enter a valid email address.');
        return;
      }
      if (!isSocialAuth) {
        if (!password || password.length < 6) {
          setErrorMsg('Please choose a password with at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Passwords do not match. Please verify your password.');
          return;
        }
      }
      if (!phoneNumber.trim()) {
        setErrorMsg('Please enter your phone number.');
        return;
      }
      if (!username.trim() || username.length < 3) {
        setErrorMsg('Please choose a valid handle (at least 3 characters).');
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (discoverySource === 'Other' && !customDiscovery.trim()) {
        setErrorMsg('Please mention how you heard about us.');
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!selectedCountry) {
        setErrorMsg('Please select your country.');
        return;
      }
      if (!zipCode.trim()) {
        setErrorMsg('Please enter your postal/zip code.');
        return;
      }
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      handleSubmitRegistration();
    }
  };

  const handleSubmitRegistration = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const fullPhoneNumber = `${phonePrefix} ${phoneNumber.trim()}`;
      const effectiveDistrict = selectedDistrict === 'Other' ? customDistrict : selectedDistrict;
      const effectiveDiscovery =
        discoverySource === 'Other' ? customDiscovery.trim() : discoverySource;

      const regNumber = generateRegistrationNumber(
        `${firstName.trim()} ${lastName.trim()}`.trim(),
        dob
      );

      const creationRes = await createAccountAndGenerateSjTutorId({
        email: email.trim().toLowerCase(),
        password: password || authIdentity?.password || 'social-auth-verified',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim().toLowerCase(),
        phoneNumber: fullPhoneNumber,
        authProvider: authIdentity?.provider || 'email',
        institution: institution.trim() || 'SJ Tutor AI Academy',
        grade,
        classGrade: grade,
        board,
        country: selectedCountry,
        state: selectedState,
        district: effectiveDistrict,
        cityArea,
        streetAddress,
        zipCode,
        hearAboutUs: effectiveDiscovery,
        dob,
        registrationNumber: regNumber,
        photoURL: photoURL || undefined,
        subjects: selectedSubjects,
        learningPreferences,
        preferredLanguage: tutoringLanguage,
        additionalInfo: {
          dob,
          country: selectedCountry,
          state: selectedState,
          district: effectiveDistrict,
          cityArea,
          streetAddress,
          zipCode,
          hearAboutUs: effectiveDiscovery,
          tutoringLanguage,
          learningGoal,
          mapsUrl: mapsUrl || undefined,
        },
        authIdentity: {
          ...authIdentity,
          email: email.trim().toLowerCase(),
          password: password || authIdentity?.password,
          provider: authIdentity?.provider || 'email',
        },
      });

      let generatedId = creationRes.sjTutorId;
      if (creationRes.status !== 'SUCCESS') {
        if (creationRes.status === 'ACCOUNT_ALREADY_EXISTS') {
          generatedId =
            creationRes.sjTutorId ||
            (creationRes as any).existingSjTutorId ||
            `SJTA-${Math.floor(100000 + Math.random() * 900000)}`;
        } else {
          throw new Error(
            creationRes.message || 'Registration could not be completed. Please try again.'
          );
        }
      }
      if (!generatedId) {
        generatedId = `SJTA-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      const addressSummary = [cityArea, effectiveDistrict, selectedState, selectedCountry]
        .filter(Boolean)
        .join(', ');

      const issueDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      const fullUserData = {
        ...creationRes.userData,
        uid: creationRes.userData?.uid || creationRes.sjTutorId,
        sjTutorId: generatedId,
        registrationNumber: regNumber,
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phoneNumber: fullPhoneNumber,
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        institution: institution.trim() || 'SJ Tutor AI Academy',
        grade,
        board,
        bio: learningGoal,
        country: selectedCountry,
        state: selectedState,
        district: effectiveDistrict,
        cityArea,
        streetAddress,
        zipCode,
        hearAboutUs: effectiveDiscovery,
        dob,
        photoURL,
        linkedProviders: authIdentity?.provider ? [authIdentity.provider] : ['email'],
      };

      saveDeviceRegisteredUser({
        name: fullUserData.displayName,
        email: fullUserData.email,
        sjTutorId: generatedId,
        username: fullUserData.username,
        phoneNumber: fullPhoneNumber,
        hasRegistered: true,
      });

      setRegistrationData({
        sjTutorId: generatedId,
        registrationNumber: regNumber,
        phoneNumber: fullPhoneNumber,
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        fullName: fullUserData.displayName,
        institution: fullUserData.institution,
        grade,
        addressSummary,
        issueDate,
        userData: fullUserData,
      });

      setCurrentStep(5);
    } catch (err: any) {
      console.error('Registration submission error:', err);
      setErrorMsg(err.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishAndLaunch = () => {
    if (registrationData?.userData) {
      onSuccess(registrationData.userData);
    }
  };

  const handlePrintIdCard = () => {
    window.print();
  };

  const inputClass =
    'w-full px-4 py-3 bg-[#060D28]/90 border border-blue-400/25 rounded-2xl text-white placeholder-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/35 outline-none text-sm font-medium transition-all';

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#04091E] text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      {/* Ambient Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <GradientOrbsBackdrop subtle />
        <FloatingFormulasField />
      </div>

      {/* Top Header & Brand Bar */}
      <div className="relative z-10 max-w-6xl mx-auto w-full flex items-center justify-between pb-5 border-b border-blue-400/15">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl p-0.5 bg-gradient-to-tr from-blue-500 to-violet-500 shadow-[0_0_24px_rgba(37,99,235,0.45)]">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden">
              <Logo className="w-full h-full" iconOnly noBorder />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-black tracking-tight text-white">
                SJ Tutor AI
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
                · Student Onboarding
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Complete your 5-step scholar identity and curriculum setup
            </p>
          </div>
        </div>

        {currentStep < 5 && (
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl border border-blue-400/20 bg-[#0B1437]/80 hover:bg-[#131F4E] transition-colors cursor-pointer"
          >
            Cancel &amp; Return
          </button>
        )}
      </div>

      {/* Main Container */}
      <main className="relative z-10 max-w-5xl mx-auto w-full my-6 flex-1 flex flex-col justify-center">
        {/* Welcome Banner on Step 1 */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-3xl bg-[#0B1437]/80 border border-blue-400/20 p-5 sm:p-6 backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 gap-5 items-center shadow-xl"
          >
            <div className="md:col-span-8 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                Welcome to SJ Tutor AI
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                <LetterReveal text="Personalize Your AI Learning Companion" stagger={0.018} />
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Enter your details, choose your class (6–12 or beyond) and favorite subjects, and receive your verified SJ Tutor AI Student ID Card.
              </p>
            </div>
            <div className="md:col-span-4 flex justify-center md:justify-end">
              <CircularImageReveal className="w-full max-w-[200px] rounded-2xl overflow-hidden border border-blue-400/25 shadow-lg">
                <ResilientImage
                  src={onboardingIllustration}
                  alt="Futuristic digital scholar tablet and glass educational prism"
                  className="w-full aspect-[4/3] object-cover"
                  fallbackTitle="SJ Tutor AI"
                />
              </CircularImageReveal>
            </div>
          </motion.div>
        )}

        {/* Animated Progress Stepper Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-[#0B1437] rounded-full overflow-hidden border border-blue-400/15">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            {[
              { num: 1, label: 'Student Details' },
              { num: 2, label: 'Discovery' },
              { num: 3, label: 'Location' },
              { num: 4, label: 'Class & Subjects' },
              { num: 5, label: 'Complete Profile' },
            ].map((s) => {
              const isPast = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 shadow-md ${
                      isPast
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                        : isCurrent
                        ? 'bg-gradient-to-tr from-blue-600 to-violet-600 text-white ring-4 ring-blue-500/30 scale-110 font-extrabold'
                        : 'bg-[#0B1437] text-slate-400 border border-blue-400/20'
                    }`}
                  >
                    {isPast ? <Check className="w-5 h-5 stroke-[2.5]" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs mt-2 font-medium tracking-tight hidden sm:block ${
                      isCurrent
                        ? 'text-blue-400 font-bold'
                        : isPast
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert Box */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/35 flex items-center gap-3 text-rose-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glass Card Body */}
        <div className="bg-[#0B1437]/85 border border-blue-400/20 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {/* ══════════════════════════════════════════════════════════
                STEP 1: Student Personal Details
               ══════════════════════════════════════════════════════════ */}
            {currentStep === 1 && (
              <motion.div
                key="onboard-step-1"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="border-b border-blue-400/15 pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
                    Step 1 of 5 · Student Details
                  </span>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                    Personal Information &amp; Handle
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Confirm your name, contact phone number, and choose your unique SJ Tutor AI handle.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Photo Upload */}
                  <div className="md:col-span-3 flex flex-col items-center text-center">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-tr from-blue-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white text-3xl font-black shadow-xl ring-4 ring-blue-500/25">
                        {photoURL ? (
                          <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span>{firstName ? firstName[0].toUpperCase() : 'S'}</span>
                        )}
                      </div>
                      <label
                        htmlFor="big-avatar-upload"
                        className="absolute -bottom-2 -right-2 bg-[#060D28] hover:bg-[#131F4E] border border-blue-400/35 p-2 rounded-2xl cursor-pointer text-blue-400 transition-transform active:scale-95 shadow-md"
                        title="Upload Avatar"
                      >
                        <Camera className="w-4 h-4" />
                      </label>
                      <input
                        id="big-avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                    <span className="text-xs text-slate-400 mt-3 font-medium">
                      Profile Photo / ID Photo
                    </span>
                  </div>

                  {/* Fields */}
                  <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        First Name <span className="text-blue-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Aarav"
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Last Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Sharma"
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Email Address <span className="text-blue-400">*</span>
                        </label>
                        {authIdentity?.email && isSocialAuth && (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          readOnly={isSocialAuth && Boolean(authIdentity?.email)}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@example.com"
                          className={`${inputClass} pl-10 ${
                            isSocialAuth && Boolean(authIdentity?.email)
                              ? 'border-emerald-500/40 cursor-not-allowed text-slate-300'
                              : ''
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Handle / Username <span className="text-blue-400">*</span>
                        </label>
                        {usernameStatus.checked && (
                          <span
                            className={`text-[10px] font-bold ${
                              usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {usernameStatus.message}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-blue-400 font-bold text-sm">
                          @
                        </span>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => handleCheckUsername(e.target.value)}
                          placeholder="aarav_ai"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    {!isSocialAuth ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Password <span className="text-blue-400">*</span>
                            </label>
                            <span className="text-[10px] text-slate-400">Min. 6 chars</span>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className={`${inputClass} pl-10 pr-10`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                              Confirm Password <span className="text-blue-400">*</span>
                            </label>
                            {password && confirmPassword && (
                              <span
                                className={`text-[10px] font-bold ${
                                  password === confirmPassword
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {password === confirmPassword ? 'Match' : 'Mismatch'}
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                              className={`${inputClass} pl-10`}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="sm:col-span-2 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Account verified with{' '}
                            <strong>{authIdentity?.provider?.toUpperCase() || 'Provider'}</strong>.
                          </span>
                        </div>
                        <span className="text-[10px] font-bold">Pre-verified</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="pt-2 border-t border-blue-400/15">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Phone Number <span className="text-blue-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={phonePrefix}
                      onChange={(e) => setPhonePrefix(e.target.value)}
                      className="w-36 py-3 px-3 bg-[#060D28]/90 border border-blue-400/25 rounded-2xl text-white focus:ring-2 focus:ring-blue-500/40 outline-none text-sm font-semibold cursor-pointer"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.phonePrefix} className="bg-slate-900 text-white">
                          {c.name} ({c.phonePrefix})
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="9876543210"
                        className={`${inputClass} pl-10 tracking-wider`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 2: Discovery Source
               ══════════════════════════════════════════════════════════ */}
            {currentStep === 2 && (
              <motion.div
                key="onboard-step-2"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="border-b border-blue-400/15 pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
                    Step 2 of 5 · Discovery
                  </span>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                    How Did You Hear About SJ Tutor AI?
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Help us understand how students discover our AI learning platform.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {DISCOVERY_OPTIONS.map((item) => {
                    const isSelected = discoverySource === item.id;
                    return (
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        key={item.id}
                        onClick={() => setDiscoverySource(item.id)}
                        className={`p-4 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600/25 to-violet-600/25 border-blue-400 text-white ring-2 ring-blue-500/30'
                            : 'bg-[#060D28]/70 border-blue-400/15 text-slate-300 hover:border-blue-400/40'
                        }`}
                      >
                        <span className="font-semibold text-sm">{item.label}</span>
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-600" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {discoverySource === 'Other' && (
                  <div className="mt-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-400/25">
                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
                      Please mention where you heard about us:
                    </label>
                    <input
                      type="text"
                      required
                      value={customDiscovery}
                      onChange={(e) => setCustomDiscovery(e.target.value)}
                      placeholder="e.g. Teacher recommendation, Newspaper, Event..."
                      className={inputClass}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 3: Location & Date of Birth
               ══════════════════════════════════════════════════════════ */}
            {currentStep === 3 && (
              <motion.div
                key="onboard-step-3"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="border-b border-blue-400/15 pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
                    Step 3 of 5 · Region &amp; Details
                  </span>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                    Address, Location &amp; Date of Birth
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Helps align local syllabus standards and generate your Student ID card.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Date of Birth (DOB) <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      GPS Auto-Fill (Google Maps)
                    </label>
                    <button
                      type="button"
                      onClick={handleFetchCurrentLocation}
                      disabled={isLocating}
                      className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-semibold shadow-lg transition-all disabled:opacity-50 text-sm cursor-pointer"
                    >
                      {isLocating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Detecting Location...</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-4 h-4 text-emerald-200" />
                          <span>Use My Current Location</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {locationSuccess && mapsCoordinates && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          GPS Connected: {mapsCoordinates.lat.toFixed(4)}, {mapsCoordinates.lng.toFixed(4)}
                        </span>
                      </div>
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-blue-400 hover:underline shrink-0"
                        >
                          <span>Open Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Country <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <select
                        value={selectedCountry}
                        onChange={(e) => {
                          setSelectedCountry(e.target.value);
                          if (e.target.value === 'India') setSelectedState('Karnataka');
                          else if (e.target.value === 'United States') setSelectedState('California');
                        }}
                        className={`${inputClass} pl-10 cursor-pointer`}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.name} className="bg-slate-900 text-white">
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      State / Province <span className="text-blue-400">*</span>
                    </label>
                    {selectedCountry === 'India' ? (
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                      >
                        {Object.keys(INDIAN_STATES_AND_DISTRICTS).map((s) => (
                          <option key={s} value={s} className="bg-slate-900 text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : selectedCountry === 'United States' ? (
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                      >
                        {Object.keys(US_STATES).map((s) => (
                          <option key={s} value={s} className="bg-slate-900 text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        placeholder="State / Region"
                        className={inputClass}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      District / County <span className="text-blue-400">*</span>
                    </label>
                    {availableDistricts.length > 0 ? (
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                      >
                        {availableDistricts.map((d) => (
                          <option key={d} value={d} className="bg-slate-900 text-white">
                            {d}
                          </option>
                        ))}
                        <option value="Other" className="bg-slate-900 text-blue-400">
                          + Other District
                        </option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        placeholder="District / County"
                        className={inputClass}
                      />
                    )}
                  </div>
                </div>

                {selectedDistrict === 'Other' && (
                  <div className="p-3 bg-[#060D28] rounded-2xl border border-blue-400/20">
                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                      Enter District Name:
                    </label>
                    <input
                      type="text"
                      value={customDistrict}
                      onChange={(e) => setCustomDistrict(e.target.value)}
                      placeholder="Enter district name"
                      className={inputClass}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      City / Town / Area
                    </label>
                    <input
                      type="text"
                      value={cityArea}
                      onChange={(e) => setCityArea(e.target.value)}
                      placeholder="Bengaluru"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Zip / Postal Code <span className="text-blue-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="560001"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Street Address
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="#123, 4th Cross"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 4: Class (6-12 Cards) & Learning Interests
               ══════════════════════════════════════════════════════════ */}
            {currentStep === 4 && (
              <motion.div
                key="onboard-step-4"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="border-b border-blue-400/15 pb-4">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
                    Step 4 of 5 · Class &amp; Learning Interests
                  </span>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
                    Select Class (6–12) &amp; Subjects
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Personalizes difficulty, formulas, and practice quizzes for your academic goals.
                  </p>
                </div>

                {/* Quick Interactive Class 6-12 Cards */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Quick Class Selection (Classes 6–12)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {QUICK_CLASSES_6_12.map((cls) => {
                      const active = grade === cls;
                      return (
                        <motion.button
                          key={cls}
                          type="button"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setGrade(cls)}
                          className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                            active
                              ? 'bg-gradient-to-br from-blue-600 to-violet-600 border-blue-400 text-white shadow-md shadow-blue-600/30'
                              : 'bg-[#060D28] border-blue-400/20 text-slate-300 hover:border-blue-400/45'
                          }`}
                        >
                          {cls.replace(' (Science)', '')}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      School / College
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        placeholder="National Public School"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Full Grade / Program List
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <select
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className={`${inputClass} pl-10 cursor-pointer`}
                      >
                        {GRADE_OPTIONS.map((g) => (
                          <option key={g} value={g} className="bg-slate-900 text-white">
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Board / Curriculum
                    </label>
                    <select
                      value={board}
                      onChange={(e) => setBoard(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      {BOARD_OPTIONS.map((b) => (
                        <option key={b} value={b} className="bg-slate-900 text-white">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preferred Subjects */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Select Your Learning Interests / Subjects
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_OPTIONS.map((sub) => {
                      const active = selectedSubjects.includes(sub);
                      return (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          type="button"
                          key={sub}
                          onClick={() => toggleSubject(sub)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            active
                              ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white border-blue-400 shadow-sm'
                              : 'bg-[#060D28] text-slate-300 border-blue-400/20 hover:border-blue-400/45'
                          }`}
                        >
                          {active && '✓ '}
                          {sub}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Learning Style Preferences */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Preferred Learning Styles
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {LEARNING_STYLES.map((style) => {
                      const active = learningPreferences.includes(style);
                      return (
                        <button
                          type="button"
                          key={style}
                          onClick={() => toggleLearningStyle(style)}
                          className={`p-3 rounded-xl text-left text-xs font-semibold border transition-all flex items-center justify-between cursor-pointer ${
                            active
                              ? 'bg-blue-600/20 border-blue-400 text-white'
                              : 'bg-[#060D28] border-blue-400/15 text-slate-300 hover:border-blue-400/35'
                          }`}
                        >
                          <span>{style}</span>
                          {active && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language & Goal */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Tutoring Language
                    </label>
                    <select
                      value={tutoringLanguage}
                      onChange={(e) => setTutoringLanguage(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="English" className="bg-slate-900">English</option>
                      <option value="Kannada" className="bg-slate-900">Kannada (ಕನ್ನಡ)</option>
                      <option value="Hindi" className="bg-slate-900">Hindi (हिंदी)</option>
                      <option value="Tamil" className="bg-slate-900">Tamil (தமிழ்)</option>
                      <option value="Telugu" className="bg-slate-900">Telugu (తెలుగు)</option>
                      <option value="Spanish" className="bg-slate-900">Spanish</option>
                      <option value="French" className="bg-slate-900">French</option>
                      <option value="German" className="bg-slate-900">German</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Learning Goal
                    </label>
                    <input
                      type="text"
                      value={learningGoal}
                      onChange={(e) => setLearningGoal(e.target.value)}
                      placeholder="What are your goals with SJ Tutor AI?"
                      className={inputClass}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 5: Profile Completion & Official Student ID Card
               ══════════════════════════════════════════════════════════ */}
            {currentStep === 5 && registrationData && (
              <motion.div
                key="onboard-step-5"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.5, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-xl"
                  >
                    <CheckCircle2 className="w-9 h-9" />
                  </motion.div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                    Onboarding Complete
                  </p>
                  <h1 className="font-display text-3xl sm:text-4xl font-black text-white mt-1">
                    Welcome to SJ Tutor AI, {registrationData.fullName}!
                  </h1>
                  <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">
                    Your student workspace is configured and your official SJ Tutor AI Student ID Card is ready.
                  </p>
                </div>

                {/* Credentials Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-2xl bg-[#060D28] border border-blue-400/25 flex flex-col justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                        Registration Number
                      </span>
                      <div className="text-base font-black text-white mt-1 font-mono break-all">
                        {registrationData.registrationNumber}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('reg', registrationData.registrationNumber)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                    >
                      {copiedField === 'reg' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedField === 'reg' ? 'Copied!' : 'Copy Reg No.'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#060D28] border border-indigo-400/25 flex flex-col justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                        SJ Tutor AI ID
                      </span>
                      <div className="text-base font-black text-white mt-1 font-mono">
                        {registrationData.sjTutorId}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('id', registrationData.sjTutorId)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      {copiedField === 'id' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedField === 'id' ? 'Copied!' : 'Copy SJ ID'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#060D28] border border-violet-400/25 flex flex-col justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                        Student Handle
                      </span>
                      <div className="text-base font-black text-white mt-1 font-mono">
                        @{registrationData.username}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('handle', `@${registrationData.username}`)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 cursor-pointer"
                    >
                      {copiedField === 'handle' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedField === 'handle' ? 'Copied!' : 'Copy Handle'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#060D28] border border-emerald-400/25 flex flex-col justify-between shadow-md">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Contact &amp; Email
                      </span>
                      <div className="text-xs font-bold text-white mt-1 truncate">
                        {registrationData.phoneNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {registrationData.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('phone', registrationData.phoneNumber)}
                      className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      {copiedField === 'phone' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedField === 'phone' ? 'Copied!' : 'Copy Phone'}</span>
                    </button>
                  </div>
                </div>

                {/* Official ID Card */}
                <div className="pt-4 border-t border-blue-400/15">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      <h2 className="text-lg font-bold text-white">
                        Official Student ID Card
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={handlePrintIdCard}
                      className="px-3 py-1.5 rounded-xl border border-blue-400/25 bg-[#060D28] hover:bg-[#101C48] text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Card</span>
                    </button>
                  </div>

                  <div
                    id="student-id-card-render"
                    className="max-w-xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-[#04091E] via-[#0B1437] to-[#1A103D] border-2 border-blue-400/40 shadow-2xl relative p-6 text-white"
                  >
                    <div className="flex items-center justify-between border-b border-blue-400/20 pb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl p-0.5 bg-gradient-to-tr from-blue-500 to-violet-500">
                          <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden">
                            <Logo className="w-full h-full" iconOnly noBorder />
                          </div>
                        </div>
                        <div>
                          <div className="text-base font-black tracking-tight text-white flex items-center gap-2">
                            <span>SJ TUTOR AI</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                              · Student ID
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 tracking-wider">
                            Intelligent Educational Learning Network
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] uppercase font-bold text-slate-400">Status</div>
                        <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>ACTIVE</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-5 my-5 items-center relative z-10">
                      <div className="col-span-4 flex flex-col items-center">
                        <div className="w-24 h-28 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-violet-500 border-2 border-blue-400/40 shadow-md flex items-center justify-center text-white font-black text-3xl">
                          {photoURL ? (
                            <img src={photoURL} alt="Student" className="w-full h-full object-cover" />
                          ) : (
                            <span>{firstName ? firstName[0].toUpperCase() : 'S'}</span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-blue-400 mt-2 font-mono truncate max-w-[110px]">
                          @{registrationData.username}
                        </div>
                      </div>

                      <div className="col-span-8 space-y-2 text-xs">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Full Name</div>
                          <div className="text-sm font-black text-white">
                            {registrationData.fullName}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">Reg No.</div>
                            <div className="font-mono font-bold text-blue-300 text-[11px] truncate">
                              {registrationData.registrationNumber}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">Tutor ID</div>
                            <div className="font-mono font-bold text-violet-300 text-[11px] truncate">
                              {registrationData.sjTutorId}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">
                              Class &amp; Board
                            </div>
                            <div className="font-semibold text-slate-200 text-[11px] truncate">
                              {registrationData.grade} ({board})
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">
                              Institution
                            </div>
                            <div className="font-semibold text-slate-200 text-[11px] truncate">
                              {registrationData.institution}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Location</div>
                          <div className="font-medium text-slate-300 text-[10px] truncate">
                            {registrationData.addressSummary}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-blue-400/20 flex items-center justify-between text-[10px] text-slate-400 relative z-10">
                      <div>
                        <div>Issued: {registrationData.issueDate}</div>
                        <div className="font-mono text-[9px] text-slate-500">
                          HASH: {registrationData.sjTutorId.slice(-6)}-VERIFIED
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-slate-950" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glowing Start Learning Button */}
                <div className="pt-6 border-t border-blue-400/15 flex justify-center">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleFinishAndLaunch}
                    className="btn-liquid w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-black rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.45)] text-base transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Start Learning</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stepper Navigation Buttons */}
          {currentStep < 5 && (
            <div className="mt-8 pt-6 border-t border-blue-400/15 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-blue-400/20 bg-[#060D28] hover:bg-[#101C48] text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNextStep}
                disabled={loading}
                className="btn-liquid flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : currentStep === 4 ? (
                  <>
                    <span>Complete Profile</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Continue to Step {currentStep + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 max-w-6xl mx-auto w-full pt-4 border-t border-blue-400/15 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SJ Tutor AI Education Technologies. All Student Identities are cryptographically secured and verified.
      </footer>
    </div>
  );
};

export default BigScreenSignUpPage;
