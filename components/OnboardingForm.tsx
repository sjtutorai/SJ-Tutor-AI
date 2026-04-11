
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  User, 
  Calendar, 
  Users, 
  Share2, 
  ShieldCheck, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  GraduationCap,
  AlertCircle
} from 'lucide-react';

interface OnboardingFormProps {
  profile: UserProfile;
  email: string | null;
  onComplete: (updatedProfile: UserProfile) => void;
}

const STEPS = [
  { id: 1, title: 'Identity', icon: User },
  { id: 2, title: 'Education', icon: Calendar },
  { id: 3, title: 'Parent Info', icon: Users },
  { id: 4, title: 'Discovery', icon: Share2 },
  { id: 5, title: 'Recovery', icon: ShieldCheck },
  { id: 6, title: 'Review', icon: CheckCircle },
];

const SOURCES = ['YouTube', 'Friends', 'School', 'Instagram', 'Google', 'Others'];

const OnboardingForm: React.FC<OnboardingFormProps> = ({ profile, email, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<UserProfile>({
    ...profile,
    displayName: profile.displayName || '',
    dob: profile.dob || '',
    parentName: profile.parentName || '',
    parentPhone: profile.parentPhone || '',
    parentEmail: profile.parentEmail || '',
    source: profile.source || '',
    recoveryEmail: profile.recoveryEmail || '',
    recoveryPhone: profile.recoveryPhone || '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Indian System Auto-detection (approximate)
      let detectedGrade = '';
      if (age === 11) detectedGrade = '6th Grade';
      else if (age === 12) detectedGrade = '7th Grade';
      else if (age === 13) detectedGrade = '8th Grade';
      else if (age === 14) detectedGrade = '9th Grade';
      else if (age === 15) detectedGrade = '10th Grade';
      else if (age === 16) detectedGrade = '11th Grade';
      else if (age >= 17) detectedGrade = '12th Grade';
      else if (age < 11) detectedGrade = '6th Grade';

      if (detectedGrade && formData.grade !== detectedGrade) {
        setFormData(prev => ({ ...prev, grade: detectedGrade }));
      }
    }
  }, [formData.dob]);

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && !formData.displayName) {
      setError("Please enter your name.");
      return;
    }
    if (currentStep === 2 && !formData.dob) {
      setError("Please select your date of birth.");
      return;
    }
    if (currentStep === 3) {
      if (!formData.parentName || !formData.parentPhone || !formData.parentEmail) {
        setError("Please fill in all parent details.");
        return;
      }
    }
    if (currentStep === 4 && !formData.source) {
      setError("Please select how you found us.");
      return;
    }
    if (currentStep === 5) {
      if (!formData.recoveryEmail || !formData.recoveryPhone) {
        setError("Please fill in recovery details.");
        return;
      }
      if (formData.recoveryEmail === email || formData.recoveryEmail === formData.parentEmail) {
        setError("Recovery email must be different from your primary and parent email.");
        return;
      }
      if (formData.recoveryPhone === formData.phoneNumber || formData.recoveryPhone === formData.parentPhone) {
        setError("Recovery phone must be different from your primary and parent phone.");
        return;
      }
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete({ ...formData, hasCompletedOnboarding: true });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">What&apos;s your name?</h2>
              <p className="text-slate-500">Let&apos;s start with how we should address you.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">When were you born?</h2>
              <p className="text-slate-500">We&apos;ll use this to personalize your learning path.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
              </div>
              {formData.grade && (
                <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex items-center gap-3">
                  <GraduationCap className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="text-xs text-primary-600 font-bold uppercase">Detected Grade</p>
                    <p className="text-lg font-bold text-primary-900">{formData.grade}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Parent Details</h2>
              <p className="text-slate-500">Required for academic coordination and safety.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Name</label>
                <input
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Parent's Full Name"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Phone</label>
                <input
                  type="tel"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, parentPhone: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="+91 00000 00000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Parent Email</label>
                <input
                  type="email"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, parentEmail: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="parent@example.com"
                />
              </div>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">How did you find us?</h2>
              <p className="text-slate-500">Help us grow our community.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SOURCES.map(source => (
                <button
                  key={source}
                  onClick={() => setFormData(prev => ({ ...prev, source }))}
                  className={`p-4 rounded-xl border-2 transition-all font-medium ${
                    formData.source === source 
                      ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' 
                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Recovery Details</h2>
              <p className="text-slate-500">In case you lose access to your account.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recovery Email</label>
                <input
                  type="email"
                  value={formData.recoveryEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, recoveryEmail: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Alternative email"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recovery Phone</label>
                <input
                  type="tel"
                  value={formData.recoveryPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, recoveryPhone: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Alternative phone"
                />
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-[10px] text-amber-700">
                  Recovery details must be different from your primary and parent contact information.
                </p>
              </div>
            </div>
          </motion.div>
        );
      case 6:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Review & Confirm</h2>
              <p className="text-slate-500">Please verify your details before we begin.</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Name</p>
                  <p className="font-semibold text-slate-800">{formData.displayName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Grade</p>
                  <p className="font-semibold text-slate-800">{formData.grade}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Parent</p>
                  <p className="font-semibold text-slate-800">{formData.parentName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Source</p>
                  <p className="font-semibold text-slate-800">{formData.source}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Recovery Email</p>
                <p className="font-semibold text-slate-800">{formData.recoveryEmail}</p>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 w-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-primary-600"
        />
      </div>

      <div className="p-8">
        {/* Step Indicators */}
        <div className="flex justify-between mb-10">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 
                  isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-primary-600' : 'text-slate-400'
                }`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        {/* Navigation */}
        <div className="mt-10 flex gap-4">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`flex-[2] py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2`}
          >
            {currentStep === STEPS.length ? 'Get Started' : 'Continue'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;
