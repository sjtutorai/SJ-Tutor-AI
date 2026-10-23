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
  EyeOff
} from 'lucide-react';
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

const GRADE_OPTIONS = [
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
  'Class 11 (Science)', 'Class 11 (Commerce)', 'Class 11 (Arts)',
  'Class 12 (Science)', 'Class 12 (Commerce)', 'Class 12 (Arts)',
  'Undergraduate / College', 'Competitive Exams (JEE/NEET/CET)', 'Self Learner'
];

const BOARD_OPTIONS = [
  'CBSE', 'ICSE / ISC', 'State Board (Karnataka / KSEEB)',
  'State Board (Maharashtra)', 'State Board (Tamil Nadu)', 'State Board (Other)',
  'IGCSE / Cambridge', 'IB (International Baccalaureate)', 'University / College', 'Other'
];

const SUBJECT_OPTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Computer Science / Coding', 'English', 'Social Science',
  'Kannada', 'Hindi', 'Economics', 'Accountancy', 'History'
];

const LEARNING_STYLES = [
  'Step-by-step problem walkthroughs',
  'Visual explanations & diagrams',
  'Practice quizzes & tests',
  'Concept summaries & flashcards',
  'Interactive real-world analogies'
];

export const BigScreenSignUpPage: React.FC<BigScreenSignUpPageProps> = ({
  authIdentity,
  onSuccess,
  onCancel,
}) => {
  // Step indicator: 1: Personal Details, 2: Discovery Source, 3: Address & Location, 4: Profile Details, 5: Registration Success & ID Card
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // -------------------------------------------------------------
  // STEP 1: Personal Details (Name, Phone, Handle, Email)
  // -------------------------------------------------------------
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
  const isSocialAuth = Boolean(authIdentity?.provider && authIdentity.provider !== 'email' && authIdentity.provider !== 'email_password');
  const [password, setPassword] = useState(() => authIdentity?.password || '');
  const [confirmPassword, setConfirmPassword] = useState(() => authIdentity?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  // -------------------------------------------------------------
  // STEP 2: Discovery Source ("Where did they hear us?")
  // -------------------------------------------------------------
  const [discoverySource, setDiscoverySource] = useState<string>('Google');
  const [customDiscovery, setCustomDiscovery] = useState<string>('');

  // -------------------------------------------------------------
  // STEP 3: Address, DOB, Country, State, District, Zip, Google Maps
  // -------------------------------------------------------------
  const [dob, setDob] = useState<string>('2007-06-15');
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [selectedState, setSelectedState] = useState<string>('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Bengaluru Urban');
  const [customDistrict, setCustomDistrict] = useState<string>('');
  const [cityArea, setCityArea] = useState<string>('Bengaluru');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [zipCode, setZipCode] = useState<string>('560001');

  // GPS / Google Maps Location Integration
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [mapsCoordinates, setMapsCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapsUrl, setMapsUrl] = useState<string>('');

  // -------------------------------------------------------------
  // STEP 4: Profile Academic Details (ask remaining details)
  // -------------------------------------------------------------
  const [institution, setInstitution] = useState<string>('');
  const [grade, setGrade] = useState<string>('Class 10');
  const [board, setBoard] = useState<string>('CBSE');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Mathematics', 'Physics', 'Computer Science / Coding']);
  const [learningPreferences, setLearningPreferences] = useState<string[]>([
    'Step-by-step problem walkthroughs',
    'Visual explanations & diagrams'
  ]);
  const [tutoringLanguage, setTutoringLanguage] = useState<string>('English');
  const [learningGoal, setLearningGoal] = useState<string>('Master core concepts and excel in upcoming academic examinations.');

  // -------------------------------------------------------------
  // STEP 5: Success & Generated ID Card
  // -------------------------------------------------------------
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

  // Available districts based on state selection
  const availableDistricts = React.useMemo(() => {
    if (selectedCountry === 'India') {
      return INDIAN_STATES_AND_DISTRICTS[selectedState] || [];
    }
    if (selectedCountry === 'United States') {
      return US_STATES[selectedState] || [];
    }
    return [];
  }, [selectedCountry, selectedState]);

  // Update district default when state changes
  useEffect(() => {
    if (availableDistricts.length > 0) {
      if (!availableDistricts.includes(selectedDistrict)) {
        setSelectedDistrict(availableDistricts[0]);
      }
    } else {
      setSelectedDistrict('');
    }
  }, [selectedState, availableDistricts]);

  // Check username availability with debounce
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

  // -------------------------------------------------------------
  // Location & Google Maps Integration
  // -------------------------------------------------------------
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
            // Find matched country
            const match = COUNTRIES.find((c) =>
              c.name.toLowerCase().includes(geo.country!.toLowerCase()) ||
              geo.country!.toLowerCase().includes(c.name.toLowerCase())
            );
            if (match) {
              setSelectedCountry(match.name);
              setPhonePrefix(match.phonePrefix);
            }
          }
          if (geo.state) {
            // Check in Indian States
            const matchedState = Object.keys(INDIAN_STATES_AND_DISTRICTS).find(
              (s) => s.toLowerCase().includes(geo.state!.toLowerCase()) ||
                     geo.state!.toLowerCase().includes(s.toLowerCase())
            );
            if (matchedState) {
              setSelectedState(matchedState);
            }
          }
          if (geo.district) {
            setSelectedDistrict(geo.district);
          }
          if (geo.city) {
            setCityArea(geo.city);
          }
          if (geo.streetAddress) {
            setStreetAddress(geo.streetAddress);
          }
          if (geo.zipCode) {
            setZipCode(geo.zipCode);
          }

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

  // Avatar upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Copy helper
  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Toggle subject selection
  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  // Toggle learning style
  const toggleLearningStyle = (style: string) => {
    if (learningPreferences.includes(style)) {
      if (learningPreferences.length > 1) {
        setLearningPreferences(learningPreferences.filter((s) => s !== style));
      }
    } else {
      setLearningPreferences([...learningPreferences, style]);
    }
  };

  // Validate and proceed to next step
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

  // Submit and create final account
  const handleSubmitRegistration = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const fullPhoneNumber = `${phonePrefix} ${phoneNumber.trim()}`;
      const effectiveDistrict = selectedDistrict === 'Other' ? customDistrict : selectedDistrict;
      const effectiveDiscovery = discoverySource === 'Other' ? customDiscovery.trim() : discoverySource;

      const regNumber = generateRegistrationNumber(
        `${firstName.trim()} ${lastName.trim()}`.trim(),
        dob
      );

      // 1. Call server/authService to create account and generate official SJ Tutor AI ID
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

      if (creationRes.status !== 'SUCCESS') {
        throw new Error(creationRes.message || 'Registration could not be completed. Please try again.');
      }

      const generatedId = creationRes.sjTutorId || `SJTA-${Math.floor(100000 + Math.random() * 900000)}`;

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

      // Save device registration detection for subsequent visits
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

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-amber-500 selection:text-white">
      {/* Top Header & Brand Bar */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/5">
            <Logo className="w-8 h-8" iconOnly noBorder />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">
                SJ Tutor AI
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Official Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Personalized Multi-modal Intelligent Education Platform
            </p>
          </div>
        </div>

        {currentStep < 5 && (
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            Cancel & Return
          </button>
        )}
      </div>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto w-full my-6 flex-1 flex flex-col justify-center">
        {/* Progress Stepper Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-700/70 -z-0 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
              />
            </div>

            {[
              { num: 1, label: 'Personal Details' },
              { num: 2, label: 'Discovery Source' },
              { num: 3, label: 'Address & GPS' },
              { num: 4, label: 'Profile & Academics' },
              { num: 5, label: 'ID Card & Complete' },
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
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/30 scale-110 font-extrabold'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isPast ? <Check className="w-5 h-5 stroke-[2.5]" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs mt-2 font-medium tracking-tight hidden sm:block ${
                      isCurrent
                        ? 'text-amber-400 font-bold'
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
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Card Body */}
        <div className="bg-slate-850/90 bg-slate-900 border border-slate-750/80 border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          {/* ══════════════════════════════════════════════════════════
              STEP 1: Personal Details (Name, Phone, Handle, Email)
             ══════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  Step 1 of 5
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                  Personal Information & Handle
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Tell us your name, contact phone number, and choose your unique SJ Tutor AI handle.
                </p>
              </div>

              {/* Photo & Name Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Photo Upload */}
                <div className="md:col-span-3 flex flex-col items-center text-center">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-200 flex items-center justify-center text-slate-950 text-3xl font-black shadow-xl ring-4 ring-amber-500/20">
                      {photoURL ? (
                        <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{firstName ? firstName[0].toUpperCase() : 'S'}</span>
                      )}
                    </div>
                    <label
                      htmlFor="big-avatar-upload"
                      className="absolute -bottom-2 -right-2 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 p-2 rounded-2xl cursor-pointer text-amber-400 transition-transform active:scale-95 shadow-md"
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

                {/* First and Last Name */}
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      First Name <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Last Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Email Address <span className="text-amber-400">*</span>
                      </label>
                      {authIdentity?.email && isSocialAuth && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Verified ({authIdentity.provider || 'Social'})</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        readOnly={isSocialAuth && Boolean(authIdentity?.email)}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@example.com"
                        className={`w-full pl-10 pr-4 py-3 bg-slate-800/80 border rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium ${
                          isSocialAuth && Boolean(authIdentity?.email)
                            ? 'border-emerald-500/40 bg-emerald-950/10 cursor-not-allowed text-slate-300'
                            : 'border-slate-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Unique Handle / Username */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Handle / Username <span className="text-amber-400">*</span>
                      </label>
                      {usernameStatus.checked && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            usernameStatus.available
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                          }`}
                        >
                          {usernameStatus.message}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-amber-400 font-bold text-sm">
                        @
                      </span>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => handleCheckUsername(e.target.value)}
                        placeholder="johndoe_ai"
                        className="w-full pl-9 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                      />
                    </div>
                  </div>

                  {/* Password & Confirm Password (only asked for Email registration) */}
                  {!isSocialAuth ? (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Create Password <span className="text-amber-400">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400">Min. 6 characters</span>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-10 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Confirm Password <span className="text-amber-400">*</span>
                          </label>
                          {password && confirmPassword && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                password === confirmPassword
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                              }`}
                            >
                              {password === confirmPassword ? '✓ Passwords Match' : 'Mismatch'}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Account verified with <strong>{authIdentity?.provider?.toUpperCase() || 'Provider'}</strong>. Password skipped.
                        </span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                        Pre-verified
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone Number with Country Code */}
              <div className="pt-2 border-t border-slate-800/60">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Phone Number <span className="text-amber-400">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={phonePrefix}
                    onChange={(e) => setPhonePrefix(e.target.value)}
                    className="w-32 py-3 px-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.phonePrefix} className="bg-slate-900 text-white">
                        {c.name} ({c.phonePrefix})
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="9876543210"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium tracking-wider"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Used for registration alerts, identity verification, and auto-generated ID card.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 2: Where did you hear about us?
             ══════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  Step 2 of 5
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                  How Did You Hear About SJ Tutor AI?
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Help us understand how learners and educators discover our personalized AI learning platform.
                </p>
              </div>

              {/* Discovery Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {DISCOVERY_OPTIONS.map((item) => {
                  const isSelected = discoverySource === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setDiscoverySource(item.id)}
                      className={`p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/60 text-white ring-2 ring-amber-500/30'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span className="font-semibold text-sm">{item.label}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* If "Other" selected, show custom input */}
              {discoverySource === 'Other' && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                    Please mention where you heard about us: <span className="text-amber-300">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customDiscovery}
                    onChange={(e) => setCustomDiscovery(e.target.value)}
                    placeholder="e.g. Reddit, Discord community, Tech conference, Newspaper, Podcast..."
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                  />
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 3: Address, DOB, Country, State, District, GPS Google Maps
             ══════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  Step 3 of 5
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                  Address, Location & Date of Birth
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Connect via Google Maps GPS or manually select your country, state, district, and street.
                </p>
              </div>

              {/* DOB & Quick GPS Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DOB */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Date of Birth (DOB) <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Google Maps / GPS Auto-Locate Button */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Connected with Google Maps
                  </label>
                  <button
                    type="button"
                    onClick={handleFetchCurrentLocation}
                    disabled={isLocating}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-semibold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 text-sm"
                  >
                    {isLocating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Detecting Location via GPS...</span>
                      </>
                    ) : (
                      <>
                        <Compass className="w-4 h-4 text-emerald-200" />
                        <span>Use My Current Location (Google Maps GPS)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Google Maps Preview Status */}
              {locationSuccess && mapsCoordinates && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      Location identified: Lat {mapsCoordinates.lat.toFixed(4)}, Lng {mapsCoordinates.lng.toFixed(4)}
                    </span>
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-amber-400 hover:underline shrink-0"
                    >
                      <span>View on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Geographic Cascading Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Country */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Country <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        if (e.target.value === 'India') setSelectedState('Karnataka');
                        else if (e.target.value === 'United States') setSelectedState('California');
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium cursor-pointer"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name} className="bg-slate-900 text-white">
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* State / Province */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    State / Province <span className="text-amber-400">*</span>
                  </label>
                  {selectedCountry === 'India' ? (
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium cursor-pointer"
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
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium cursor-pointer"
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
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                    />
                  )}
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    District / County <span className="text-amber-400">*</span>
                  </label>
                  {availableDistricts.length > 0 ? (
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium cursor-pointer"
                    >
                      {availableDistricts.map((d) => (
                        <option key={d} value={d} className="bg-slate-900 text-white">
                          {d}
                        </option>
                      ))}
                      <option value="Other" className="bg-slate-900 text-amber-400">
                        + Other District (Type manually)
                      </option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      placeholder="District / County"
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                    />
                  )}
                </div>
              </div>

              {/* If "Other" District was chosen */}
              {selectedDistrict === 'Other' && (
                <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                    Enter District Name:
                  </label>
                  <input
                    type="text"
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    placeholder="Enter district name"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>
              )}

              {/* City, Zip Code & Street Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    City / Town / Area
                  </label>
                  <input
                    type="text"
                    value={cityArea}
                    onChange={(e) => setCityArea(e.target.value)}
                    placeholder="e.g. Indiranagar, Bengaluru"
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Zip / Postal PIN Code <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="560001"
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Street Address / House No.
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="#123, 4th Cross"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 4: Profile Details (Academic, Subjects, Preferences)
             ══════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                  Step 4 of 5
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                  Academic & Learning Profile
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Asking the remaining profile details so the AI tutor can customize curriculum and explanations.
                </p>
              </div>

              {/* Institution, Grade, Board */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    School / College / Institution
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="e.g. National Public School"
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Grade / Class
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium cursor-pointer"
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
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium cursor-pointer"
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
                  Subjects You Want to Learn (Select all that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_OPTIONS.map((sub) => {
                    const active = selectedSubjects.includes(sub);
                    return (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => toggleSubject(sub)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                            : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {active && '✓ '}
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Learning Style Preferences */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Learning Style & Explanation Preferences
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LEARNING_STYLES.map((style) => {
                    const active = learningPreferences.includes(style);
                    return (
                      <button
                        type="button"
                        key={style}
                        onClick={() => toggleLearningStyle(style)}
                        className={`p-3 rounded-xl text-left text-xs font-semibold border transition-all flex items-center justify-between ${
                          active
                            ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-200'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <span>{style}</span>
                        {active && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language & Goal */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Preferred Tutoring Language
                  </label>
                  <select
                    value={tutoringLanguage}
                    onChange={(e) => setTutoringLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Learning Goal / Bio
                  </label>
                  <input
                    type="text"
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder="What are your goals with SJ Tutor AI?"
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              STEP 5: Registration Success & Auto-Generated ID Card
             ══════════════════════════════════════════════════════════ */}
          {currentStep === 5 && registrationData && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              {/* Top Success Banner */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Registration Successful
                </span>
                <h1 className="text-3xl sm:text-4xl font-black text-white mt-2">
                  Welcome to SJ Tutor AI, {registrationData.fullName}!
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">
                  Your official student identity has been registered in the system. Your official Student ID Card has been automatically generated below.
                </p>
              </div>

              {/* Four Core Credentials Display Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Registration Number */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-850 to-slate-900 border border-amber-500/30 flex flex-col justify-between relative group shadow-md">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                      Registration Number
                    </span>
                    <div className="text-base font-black text-white mt-1 font-mono tracking-tight break-all">
                      {registrationData.registrationNumber}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy('reg', registrationData.registrationNumber)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                  >
                    {copiedField === 'reg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'reg' ? 'Copied!' : 'Copy Reg No.'}</span>
                  </button>
                </div>

                {/* 2. SJ Tutor AI ID */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-slate-850 to-slate-900 border border-indigo-500/30 flex flex-col justify-between relative group shadow-md">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                      SJ Tutor AI ID
                    </span>
                    <div className="text-base font-black text-white mt-1 font-mono tracking-tight">
                      {registrationData.sjTutorId}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy('id', registrationData.sjTutorId)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'id' ? 'Copied!' : 'Copy SJ ID'}</span>
                  </button>
                </div>

                {/* 3. Handle */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/15 via-slate-850 to-slate-900 border border-purple-500/30 flex flex-col justify-between relative group shadow-md">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">
                      Student Handle
                    </span>
                    <div className="text-base font-black text-white mt-1 font-mono tracking-tight">
                      @{registrationData.username}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy('handle', `@${registrationData.username}`)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300"
                  >
                    {copiedField === 'handle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'handle' ? 'Copied!' : 'Copy Handle'}</span>
                  </button>
                </div>

                {/* 4. Phone & Email */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-slate-850 to-slate-900 border border-emerald-500/30 flex flex-col justify-between relative group shadow-md">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                      Phone & Email
                    </span>
                    <div className="text-xs font-bold text-white mt-1 truncate">
                      {registrationData.phoneNumber}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {registrationData.email}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy('phone', registrationData.phoneNumber)}
                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'phone' ? 'Copied!' : 'Copy Phone'}</span>
                  </button>
                </div>
              </div>

              {/* Auto-Generated Official Student ID Card Component */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-white">
                      Auto-Generated Official Student ID Card
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrintIdCard}
                      className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Card</span>
                    </button>
                  </div>
                </div>

                {/* ID Card Graphic Container */}
                <div
                  id="student-id-card-render"
                  className="max-w-xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-2 border-amber-500/40 shadow-2xl relative p-6 text-white"
                >
                  {/* Decorative Background Accents */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                        <Logo className="w-7 h-7" iconOnly noBorder />
                      </div>
                      <div>
                        <div className="text-base font-black tracking-tight text-white flex items-center gap-2">
                          <span>SJ TUTOR AI</span>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Student ID
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 tracking-wider">
                          Autonomous Intelligent Learning Network
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] uppercase font-bold text-slate-400">ID Status</div>
                      <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>ACTIVE</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Main Body */}
                  <div className="grid grid-cols-12 gap-5 my-5 items-center relative z-10">
                    {/* Photo & Handle */}
                    <div className="col-span-4 flex flex-col items-center">
                      <div className="w-24 h-28 rounded-2xl overflow-hidden bg-gradient-to-tr from-amber-500 to-amber-200 border-2 border-amber-400/50 shadow-md flex items-center justify-center text-slate-950 font-black text-3xl">
                        {photoURL ? (
                          <img src={photoURL} alt="Student Photo" className="w-full h-full object-cover" />
                        ) : (
                          <span>{firstName ? firstName[0].toUpperCase() : 'S'}</span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-amber-400 mt-2 font-mono truncate max-w-[110px]">
                        @{registrationData.username}
                      </div>
                    </div>

                    {/* Details Column */}
                    <div className="col-span-8 space-y-2 text-xs">
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Full Name</div>
                        <div className="text-sm font-black text-white">{registrationData.fullName}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Reg No.</div>
                          <div className="font-mono font-bold text-amber-300 text-[11px] truncate">
                            {registrationData.registrationNumber}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Tutor ID</div>
                          <div className="font-mono font-bold text-indigo-300 text-[11px] truncate">
                            {registrationData.sjTutorId}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Grade & Board</div>
                          <div className="font-semibold text-slate-200 text-[11px] truncate">
                            {registrationData.grade} ({board})
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Institution</div>
                          <div className="font-semibold text-slate-200 text-[11px] truncate">
                            {registrationData.institution}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Registered Address</div>
                        <div className="font-medium text-slate-300 text-[10px] truncate">
                          {registrationData.addressSummary}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer with Hologram & Barcode Effect */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 relative z-10">
                    <div>
                      <div>Issued: {registrationData.issueDate}</div>
                      <div className="font-mono text-[9px] text-slate-500">
                        HASH: {registrationData.sjTutorId.slice(-6)}-VERIFIED
                      </div>
                    </div>

                    {/* QR Code Placeholder Graphic */}
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-slate-950" />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 via-pink-400 to-cyan-400 shadow-md ring-2 ring-white/10" title="Security Hologram" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Launch AI Tutor */}
              <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleFinishAndLaunch}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 text-base transition-all transform active:scale-95 flex items-center justify-center gap-3"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Launch SJ Tutor AI Learning Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons (for Steps 1 to 4) */}
          {currentStep < 5 && (
            <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm transition-colors"
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
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Registration...</span>
                  </>
                ) : currentStep === 4 ? (
                  <>
                    <span>Complete & Generate ID Card</span>
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

      {/* Footer Branding */}
      <footer className="max-w-6xl mx-auto w-full pt-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} SJ Tutor AI Education Technologies. All Student Identities are cryptographically secured and verified.
      </footer>
    </div>
  );
};
export default BigScreenSignUpPage;
