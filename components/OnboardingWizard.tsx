import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  User, 
  Phone, 
  School, 
  Camera, 
  Calendar, 
  Mail, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  LogOut, 
  ArrowLeft, 
  ShieldCheck, 
  Compass, 
  CheckSquare,
  Loader2
} from 'lucide-react';
import { UserProfile } from '../types';
import Logo from './Logo';
import { generateRegistrationNumber } from '../utils/profileUtils';

// Web Audio API Synth sound for success celebration!
const playSuccessSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Play a lovely major chord sequence (C4 - E4 - G4 - C5)
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.12);
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + index * 0.12 + 0.6);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + index * 0.12);
      osc.stop(audioCtx.currentTime + index * 0.12 + 0.6);
    });
  } catch (err) {
    console.warn("Audio context not allowed or failed:", err);
  }
};

interface OnboardingWizardProps {
  profile: UserProfile;
  email: string | null;
  onSave: (profile: UserProfile, redirect?: boolean) => void;
  onLogout: () => void;
}

const COMMON_BOARDS = [
  'CBSE',
  'ICSE',
  'State Board',
  'Other'
];

const SCHOOL_SUGGESTIONS = [
  'Kendriya Vidyalaya (KV)',
  'Jawahar Navodaya Vidyalaya (JNV)',
  'Delhi Public School (DPS)',
  'DAV Public School',
  'Army Public School',
  'Ryan International School',
  'St. Xavier\'s School',
  'Don Bosco School',
  'Podar International School',
  'Sainik School'
];

const REFERRALS = [
  { id: 'Google', label: 'Google Search' },
  { id: 'Teacher', label: 'My School Teacher' },
  { id: 'Friend', label: 'A Friend or Classmate' },
  { id: 'Instagram', label: 'Instagram Post' },
  { id: 'YouTube', label: 'YouTube Video' },
  { id: 'School', label: 'School Announcement' },
  { id: 'Advertisement', label: 'Online Advertisement' },
  { id: 'Other', label: 'Other Source' }
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ profile, email, onSave, onLogout }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Local state initialized with profile details or defaults
  const [fullName, setFullName] = useState(profile.displayName || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [gender, setGender] = useState<string>(profile.bio ? profile.bio.split('Gender: ')[1]?.split('\n')[0] || '' : '');
  const [schoolName, setSchoolName] = useState(profile.institution || '');
  const [board, setBoard] = useState(profile.board || 'CBSE');
  const [currentClass, setCurrentClass] = useState<string>(profile.grade || '10');
  const [favoriteSubject, setFavoriteSubject] = useState('');
  const [learningGoal, setLearningGoal] = useState(profile.learningGoal || 'Daily Study');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState(email || '');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill Full Name if Google account provides it
  useEffect(() => {
    if (!fullName && profile.displayName) {
      setFullName(profile.displayName);
    }
  }, [profile.displayName]);

  // Auto calculate age and auto detect Indian Class based on DOB
  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Map age to Indian classes 6 to 12
      let calculatedClass = '';
      if (age === 11) calculatedClass = '6';
      else if (age === 12) calculatedClass = '7';
      else if (age === 13) calculatedClass = '8';
      else if (age === 14) calculatedClass = '9';
      else if (age === 15) calculatedClass = '10';
      else if (age === 16) calculatedClass = '11';
      else if (age === 17) calculatedClass = '12';
      else if (age < 11) calculatedClass = '6'; // Floor
      else calculatedClass = '12'; // Cap

      setCurrentClass(calculatedClass);
    }
  }, [dob]);

  const validateStep = (step: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (step === 1) {
      if (!fullName.trim()) stepErrors.fullName = 'Full Name is required.';
      if (!dob) stepErrors.dob = 'Date of Birth is required.';
    } else if (step === 2) {
      if (!schoolName.trim()) stepErrors.schoolName = 'School Name is required.';
    } else if (step === 4) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!recoveryEmail.trim()) {
        stepErrors.recoveryEmail = 'Recovery email is required.';
      } else if (!emailRegex.test(recoveryEmail)) {
        stepErrors.recoveryEmail = 'Invalid email address format.';
      }

      if (!recoveryPhone.trim()) {
        stepErrors.recoveryPhone = 'Recovery phone is required.';
      } else if (recoveryPhone.length < 8) {
        stepErrors.recoveryPhone = 'Invalid phone number length.';
      }
    } else if (step === 5) {
      if (!referralSource) {
        stepErrors.referralSource = 'Please select one option.';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFinish = () => {
    if (!termsAccepted) {
      setErrors({ terms: 'You must accept the Terms and Conditions and Privacy Policy to proceed.' });
      return;
    }

    // Build the bio and final profiles
    const bioText = `Onboarding Details:
Class: ${currentClass}
Board: ${board}
School: ${schoolName}
Fav Subject: ${favoriteSubject || 'N/A'}
Gender: ${gender || 'Not specified'}
Goal: ${learningGoal}
Referral: ${referralSource}
Parent details: Name: ${parentName || 'N/A'}, Phone: ${parentPhone || 'N/A'}, Email: ${parentEmail || 'N/A'}`;

    const updatedProfile: UserProfile = {
      ...profile,
      displayName: fullName,
      dob: dob,
      institution: schoolName,
      board: board,
      grade: currentClass,
      learningGoal: learningGoal,
      bio: bioText,
      photoURL: photoURL,
      phoneNumber: recoveryPhone || profile.phoneNumber || '',
      hasCompletedOnboarding: true,
      registrationNumber: generateRegistrationNumber({
        ...profile,
        displayName: fullName,
        dob: dob
      })
    };

    setIsCompleted(true);
    playSuccessSound();
    
    // Confetti effect
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    // Save profile to database
    onSave(updatedProfile, false);
  };

  // Skip step 3 (Parent Info is optional)
  const handleSkipParentInfo = () => {
    setParentName('');
    setParentPhone('');
    setParentEmail('');
    setCurrentStep(4);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans relative overflow-hidden flex items-center justify-center p-4">
      {/* Immersive background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <AnimatePresence mode="wait">
        {!isCompleted ? (
          <motion.div 
            key="wizard-card"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-2xl bg-slate-800/80 border border-slate-700/60 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10"
          >
            {/* Header / Logo / Logout */}
            <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-5">
              <div className="flex items-center gap-3">
                <Logo className="w-9 h-9" iconOnly />
                <div>
                  <h1 className="text-md font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">
                    SJ Tutor AI
                  </h1>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                    Smart Study Setup
                  </p>
                </div>
              </div>
              
              <button 
                onClick={onLogout}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 rounded-xl transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2 text-xs text-slate-400 font-bold font-mono">
                <span>STEP {currentStep} OF 6</span>
                <span className="text-blue-400">{Math.round((currentStep / 6) * 100)}% COMPLETE</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '16.66%' }}
                  animate={{ width: `${(currentStep / 6) * 100}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 rounded-full"
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[320px] flex flex-col justify-between">
              <div>
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div>
                        <h2 className="text-2xl font-black text-white">Welcome to SJ Tutor AI!</h2>
                        <p className="text-sm text-slate-400 mt-1">Let&apos;s start by setting up your basic profile details.</p>
                      </div>

                      {/* Profile Picture */}
                      <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-900/40 p-4 border border-slate-700/30 rounded-2xl">
                        <div className="relative w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 overflow-hidden">
                          {uploading ? (
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                          ) : photoURL ? (
                            <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-slate-500" />
                          )}
                          <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition shadow-lg"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-center sm:text-left">
                          <h3 className="text-sm font-bold text-white">Upload Profile Picture (Optional)</h3>
                          <p className="text-xs text-slate-400 mt-0.5">JPEG or PNG. Max size 2MB.</p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs text-blue-400 font-semibold mt-2 hover:underline inline-block"
                          >
                            Browse files
                          </button>
                          <input 
                            ref={fileInputRef} 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageChange} 
                            className="hidden" 
                          />
                        </div>
                      </div>

                      {/* Full Name & DOB */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            FULL NAME
                          </label>
                          <input 
                            type="text" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white"
                          />
                          {errors.fullName && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.fullName}</p>}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            DATE OF BIRTH
                          </label>
                          <input 
                            type="date" 
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white"
                          />
                          {errors.dob && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.dob}</p>}
                        </div>
                      </div>

                      {/* Gender Choice */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300 font-mono">GENDER (OPTIONAL)</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['Male', 'Female', 'Other', 'Skip'].map((g) => {
                            const isSelected = (g === 'Skip' && !gender) || gender === g;
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setGender(g === 'Skip' ? '' : g)}
                                className={`py-2.5 rounded-xl border font-semibold text-sm transition ${
                                  isSelected 
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-300' 
                                    : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                {g}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                          <GraduationCap className="w-6 h-6 text-purple-400 animate-bounce" />
                          Academic Information
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">SJ Tutor AI personalizes your curriculum around Indian Board systems.</p>
                      </div>

                      {/* School Name with smart search suggestion */}
                      <div className="space-y-1.5 relative">
                        <label className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-blue-400" />
                          SCHOOL / INSTITUTION NAME
                        </label>
                        <input 
                          type="text" 
                          value={schoolName}
                          onChange={(e) => setSchoolName(e.target.value)}
                          placeholder="Search or enter your school"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white"
                        />
                        {schoolName.length > 0 && schoolName.length < 5 && (
                          <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-40 overflow-y-auto p-2 space-y-1">
                            {SCHOOL_SUGGESTIONS.filter(s => s.toLowerCase().includes(schoolName.toLowerCase())).map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => setSchoolName(item)}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg"
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        )}
                        {errors.schoolName && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.schoolName}</p>}
                      </div>

                      {/* Board Selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 font-mono">EDUCATIONAL BOARD</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {COMMON_BOARDS.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setBoard(b)}
                              className={`py-2.5 rounded-xl border font-semibold text-xs transition ${
                                board === b
                                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                                  : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Class Class Selector 6 to 12 */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 font-mono flex justify-between">
                          <span>CURRENT CLASS (GRADE)</span>
                          <span className="text-[10px] text-blue-400 font-semibold">Indian Standard</span>
                        </label>
                        <div className="grid grid-cols-7 gap-1.5">
                          {['6', '7', '8', '9', '10', '11', '12'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setCurrentClass(c)}
                              className={`py-2 rounded-lg border font-black text-sm transition ${
                                currentClass === c
                                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                                  : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Favorite Subject */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 font-mono">FAVORITE SUBJECT (OPTIONAL)</label>
                          <input 
                            type="text" 
                            value={favoriteSubject}
                            onChange={(e) => setFavoriteSubject(e.target.value)}
                            placeholder="e.g. Mathematics"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white text-sm"
                          />
                        </div>

                        {/* Goal */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 font-mono">LEARNING GOAL</label>
                          <select 
                            value={learningGoal}
                            onChange={(e) => setLearningGoal(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white text-sm outline-none"
                          >
                            <option value="Improve Marks">Improve Marks</option>
                            <option value="Exam Preparation">Exam Preparation</option>
                            <option value="Competitive Exams">Competitive Exams</option>
                            <option value="Homework Help">Homework Help</option>
                            <option value="Daily Study">Daily Study</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-2xl font-black text-white">Parent / Guardian Information</h2>
                          <p className="text-sm text-slate-400 mt-1">Keep parents in the loop about your study progress.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSkipParentInfo}
                          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1 bg-slate-700/40 border border-slate-600/40 rounded-xl transition"
                        >
                          Skip Step
                        </button>
                      </div>

                      <div className="space-y-4 bg-slate-900/30 p-5 border border-slate-700/30 rounded-2xl">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 font-mono">PARENT NAME</label>
                          <input 
                            type="text" 
                            value={parentName}
                            onChange={(e) => setParentName(e.target.value)}
                            placeholder="e.g. Ramesh Sharma"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-300 font-mono">PHONE NUMBER</label>
                            <input 
                              type="tel" 
                              value={parentPhone}
                              onChange={(e) => setParentPhone(e.target.value)}
                              placeholder="e.g. +91 9876543210"
                              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-300 font-mono">EMAIL ADDRESS</label>
                            <input 
                              type="email" 
                              value={parentEmail}
                              onChange={(e) => setParentEmail(e.target.value)}
                              placeholder="parent@example.com"
                              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                          <ShieldCheck className="w-6 h-6 text-cyan-400" />
                          Account Recovery
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Used to verify and restore access to your account securely.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-cyan-400" />
                            RECOVERY EMAIL
                          </label>
                          <input 
                            type="email" 
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            placeholder="recovery@example.com"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white"
                          />
                          {errors.recoveryEmail && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.recoveryEmail}</p>}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            RECOVERY PHONE NUMBER
                          </label>
                          <input 
                            type="tel" 
                            value={recoveryPhone}
                            onChange={(e) => setRecoveryPhone(e.target.value)}
                            placeholder="e.g. +91 9999999999"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 transition text-white"
                          />
                          {errors.recoveryPhone && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.recoveryPhone}</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {currentStep === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-2xl font-black text-white">How did you hear about us?</h2>
                        <p className="text-sm text-slate-400 mt-1">Help us share SJ Tutor AI with other student scholars.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {REFERRALS.map((ref) => {
                          const isSelected = referralSource === ref.id;
                          return (
                            <button
                              key={ref.id}
                              type="button"
                              onClick={() => setReferralSource(ref.id)}
                              className={`p-4 rounded-2xl border-2 text-left font-bold transition flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-blue-600/20 border-blue-500 text-blue-300' 
                                  : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              <span>{ref.label}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      {errors.referralSource && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.referralSource}</p>}
                    </motion.div>
                  )}

                  {currentStep === 6 && (
                    <motion.div
                      key="step6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-5"
                    >
                      <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-1.5">
                          <CheckSquare className="w-6 h-6 text-emerald-400" />
                          Review & Finalize
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Please double check your details before starting your learning journey.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
                        {/* Card 1: Welcome Details */}
                        <div className="bg-slate-900/40 p-3.5 border border-slate-700/40 rounded-2xl relative">
                          <button onClick={() => setCurrentStep(1)} className="absolute top-2.5 right-2.5 text-[10px] bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-lg border border-slate-700">Edit</button>
                          <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Personal Details</h3>
                          <p className="text-sm font-bold text-white mt-1.5">{fullName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">DOB: {dob}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Gender: {gender || 'Not specified'}</p>
                        </div>

                        {/* Card 2: Academic Details */}
                        <div className="bg-slate-900/40 p-3.5 border border-slate-700/40 rounded-2xl relative">
                          <button onClick={() => setCurrentStep(2)} className="absolute top-2.5 right-2.5 text-[10px] bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-lg border border-slate-700">Edit</button>
                          <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Academics</h3>
                          <p className="text-sm font-bold text-white mt-1.5">Class {currentClass} ({board})</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{schoolName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Goal: {learningGoal}</p>
                        </div>

                        {/* Card 3: Parent details */}
                        <div className="bg-slate-900/40 p-3.5 border border-slate-700/40 rounded-2xl relative">
                          <button onClick={() => setCurrentStep(3)} className="absolute top-2.5 right-2.5 text-[10px] bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-lg border border-slate-700">Edit</button>
                          <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Parent Contact</h3>
                          <p className="text-sm font-bold text-white mt-1.5">{parentName || 'Skipped'}</p>
                          {parentPhone && <p className="text-xs text-slate-400 mt-0.5">{parentPhone}</p>}
                          {parentEmail && <p className="text-xs text-slate-400 mt-0.5">{parentEmail}</p>}
                        </div>

                        {/* Card 4: Recovery details */}
                        <div className="bg-slate-900/40 p-3.5 border border-slate-700/40 rounded-2xl relative">
                          <button onClick={() => setCurrentStep(4)} className="absolute top-2.5 right-2.5 text-[10px] bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded-lg border border-slate-700">Edit</button>
                          <h3 className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Recovery Contacts</h3>
                          <p className="text-sm font-bold text-white mt-1.5 truncate">{recoveryEmail}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{recoveryPhone}</p>
                        </div>
                      </div>

                      {/* Terms and conditions checkbox */}
                      <div className="space-y-2 mt-4 pt-4 border-t border-slate-700/40">
                        <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-400 select-none">
                          <input 
                            type="checkbox" 
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="w-4.5 h-4.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 shrink-0 mt-0.5"
                          />
                          <span>
                            I agree to the <a href="#/terms" className="text-blue-400 hover:underline font-bold">Terms of Service</a> and <a href="#/privacy" className="text-blue-400 hover:underline font-bold">Privacy Policy</a> of SJ Tutor AI.
                          </span>
                        </label>
                        {errors.terms && <p className="text-xs text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.terms}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation Actions */}
              <div className="flex justify-between items-center mt-8 border-t border-slate-700/50 pt-5">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-700/40 disabled:opacity-30 disabled:pointer-events-none transition font-bold text-sm flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-4 h-4 animate-pulse" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="px-8 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white rounded-xl font-black text-sm transition flex items-center gap-2 shadow-xl shadow-emerald-500/10 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Create Account</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Full Screen Success Screen */
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 sm:p-12 text-center shadow-2xl backdrop-blur-xl relative z-10"
          >
            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl relative">
              <span className="text-5xl animate-bounce">🎉</span>
              <div className="absolute inset-x-[-10px] inset-y-[-10px] w-[calc(100%+20px)] h-[calc(100%+20px)] border-2 border-emerald-500/20 rounded-full animate-ping pointer-events-none"></div>
            </div>

            <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
              Welcome to SJ Tutor AI!
            </h2>
            <p className="text-sm text-slate-300 mt-3 font-medium">
              Hello, <span className="text-emerald-400 font-black">{fullName}</span>! <br/>
              Your academic profile and learning schedule have been fully generated.
            </p>

            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60 text-left mt-6 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-bold font-mono">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>YOUR DISCOVER PLAN</span>
              </div>
              <div className="text-white text-sm font-black flex justify-between">
                <span>Academic Plan</span>
                <span className="text-emerald-400 font-mono">Active - Grade {currentClass}</span>
              </div>
              <div className="text-slate-400 text-xs">
                Enjoy 100 free monthly credits, personalized AI brain mapping, interactive quizzes, and customized worksheets.
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  onSave({
                    ...profile,
                    displayName: fullName,
                    dob: dob,
                    institution: schoolName,
                    board: board,
                    grade: currentClass,
                    learningGoal: learningGoal,
                    bio: `Class: ${currentClass}\nBoard: ${board}\nSchool: ${schoolName}\nReferral: ${referralSource}`,
                    photoURL: photoURL,
                    phoneNumber: recoveryPhone || profile.phoneNumber || '',
                    hasCompletedOnboarding: true,
                    registrationNumber: generateRegistrationNumber({
                      ...profile,
                      displayName: fullName,
                      dob: dob
                    })
                  }, true);
                }}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-sm transition-all shadow-lg active:scale-95"
              >
                Start Learning
              </button>

              <button
                type="button"
                onClick={() => {
                  onSave({
                    ...profile,
                    displayName: fullName,
                    dob: dob,
                    institution: schoolName,
                    board: board,
                    grade: currentClass,
                    learningGoal: learningGoal,
                    bio: `Class: ${currentClass}\nBoard: ${board}\nSchool: ${schoolName}\nReferral: ${referralSource}`,
                    photoURL: photoURL,
                    phoneNumber: recoveryPhone || profile.phoneNumber || '',
                    hasCompletedOnboarding: true,
                    registrationNumber: generateRegistrationNumber({
                      ...profile,
                      displayName: fullName,
                      dob: dob
                    })
                  }, true);
                }}
                className="w-full py-3 bg-slate-700/60 hover:bg-slate-700/80 text-slate-200 border border-slate-600/40 rounded-xl font-bold text-xs transition"
              >
                Take Product Tour
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
