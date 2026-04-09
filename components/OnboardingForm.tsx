
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Calendar, 
  Users, 
  Search, 
  ShieldCheck, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  GraduationCap,
  Phone,
  Mail,
  Instagram,
  Youtube,
  Users2,
  School,
  Globe,
  MoreHorizontal
} from 'lucide-react';
import { UserProfile } from '../types';

interface OnboardingFormProps {
  initialData: Partial<UserProfile>;
  onComplete: (data: UserProfile) => void;
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({ initialData, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: initialData.displayName || '',
    email: initialData.email || '',
    provider: initialData.provider || 'Email',
    dob: '',
    class: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    source: '',
    recoveryEmail: '',
    recoveryPhone: '',
    hasCompletedOnboarding: false,
    createdAt: Date.now(),
    credits: 100, // Starting credits
    points: 0,
    streak: 0,
    badges: [],
    role: 'user',
    bio: '',
    institution: '',
    phoneNumber: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect class based on DOB (Simplified Indian system logic)
  useEffect(() => {
    if (formData.dob) {
      const birthYear = new Date(formData.dob).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      
      let detectedClass = '';
      if (age >= 11 && age <= 18) {
        detectedClass = (age - 5).toString() + 'th';
      }
      
      if (detectedClass && !formData.class) {
        setFormData(prev => ({ ...prev, class: detectedClass }));
      }
    }
  }, [formData.dob]);

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.displayName) newErrors.displayName = "Name is required";
    } else if (step === 2) {
      if (!formData.dob) newErrors.dob = "Date of Birth is required";
      if (!formData.class) newErrors.class = "Class is required";
    } else if (step === 3) {
      if (!formData.parentName) newErrors.parentName = "Parent Name is required";
      if (!formData.parentPhone) newErrors.parentPhone = "Parent Phone is required";
      if (!formData.parentEmail) newErrors.parentEmail = "Parent Email is required";
    } else if (step === 4) {
      if (!formData.source) newErrors.source = "Please select how you found us";
    } else if (step === 5) {
      if (!formData.recoveryEmail) newErrors.recoveryEmail = "Recovery Email is required";
      if (!formData.recoveryPhone) newErrors.recoveryPhone = "Recovery Phone is required";
      
      if (formData.recoveryEmail === formData.email || formData.recoveryEmail === formData.parentEmail) {
        newErrors.recoveryEmail = "Recovery email must be different from student/parent email";
      }
      if (formData.recoveryPhone === formData.parentPhone) {
        newErrors.recoveryPhone = "Recovery phone must be different from parent phone";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    if (validateStep()) {
      onComplete({ ...formData, hasCompletedOnboarding: true } as UserProfile);
    }
  };

  const progress = (step / 6) * 100;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">What&apos;s your name?</h3>
              <p className="text-slate-500">Let&apos;s start with the basics</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <input 
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border ${errors.displayName ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                placeholder="Enter your full name"
              />
              {errors.displayName && <p className="text-xs text-red-500">{errors.displayName}</p>}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Tell us about yourself</h3>
              <p className="text-slate-500">We&apos;ll help you find the right content</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                <input 
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.dob ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                />
                {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Class / Grade</label>
                <select 
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.class ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                >
                  <option value="">Select Class</option>
                  {[6, 7, 8, 9, 10, 11, 12].map(c => (
                    <option key={c} value={`${c}th`}>{c}th Grade</option>
                  ))}
                </select>
                {errors.class && <p className="text-xs text-red-500">{errors.class}</p>}
              </div>
            </div>
            <p className="text-xs text-slate-400 italic text-center">We auto-detected your class based on your age, but you can change it!</p>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Parent / Guardian Details</h3>
              <p className="text-slate-500">For safety and progress updates</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Parent Name</label>
                <input 
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Enter parent&apos;s name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                  <input 
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Parent&apos;s phone"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input 
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Parent's email"
                  />
                </div>
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
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">How did you find us?</h3>
              <p className="text-slate-500">We&apos;d love to know our community better</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { id: 'YouTube', icon: Youtube, color: 'text-red-500' },
                { id: 'Friends', icon: Users2, color: 'text-blue-500' },
                { id: 'School', icon: School, color: 'text-emerald-500' },
                { id: 'Instagram', icon: Instagram, color: 'text-pink-500' },
                { id: 'Google', icon: Globe, color: 'text-blue-400' },
                { id: 'Others', icon: MoreHorizontal, color: 'text-slate-400' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setFormData({ ...formData, source: item.id })}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    formData.source === item.id 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                  <span className="text-sm font-medium text-slate-700">{item.id}</span>
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
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Recovery Details</h3>
              <p className="text-slate-500">Keep your account safe and accessible</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Recovery Email</label>
                <input 
                  type="email"
                  value={formData.recoveryEmail}
                  onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.recoveryEmail ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                  placeholder="Different from your login email"
                />
                {errors.recoveryEmail && <p className="text-xs text-red-500">{errors.recoveryEmail}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Recovery Phone</label>
                <input 
                  type="tel"
                  value={formData.recoveryPhone}
                  onChange={(e) => setFormData({ ...formData, recoveryPhone: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.recoveryPhone ? 'border-red-500' : 'border-slate-200'} focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                  placeholder="Different from parent's phone"
                />
                {errors.recoveryPhone && <p className="text-xs text-red-500">{errors.recoveryPhone}</p>}
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
            className="space-y-6"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Review & Confirm</h3>
              <p className="text-slate-500">Almost there! Check your details</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <span className="text-slate-400 block">Name</span>
                  <span className="font-semibold text-slate-700">{formData.displayName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Class</span>
                  <span className="font-semibold text-slate-700">{formData.class}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Parent</span>
                  <span className="font-semibold text-slate-700">{formData.parentName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Source</span>
                  <span className="font-semibold text-slate-700">{formData.source}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Recovery Email</span>
                  <span className="font-semibold text-slate-700">{formData.recoveryEmail}</span>
                </div>
              </div>
              <button 
                onClick={() => setStep(1)}
                className="text-primary-600 text-xs font-bold hover:underline"
              >
                Edit Details
              </button>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
      >
        {/* Progress Bar */}
        <div className="h-2 bg-slate-100 w-full">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-primary-500"
          />
        </div>

        <div className="p-8 flex-1 overflow-y-auto max-h-[80vh]">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          {step > 1 ? (
            <button 
              onClick={prevStep}
              className="px-6 py-3 text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-200 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          ) : <div />}

          {step < 6 ? (
            <button 
              onClick={nextStep}
              className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 flex items-center gap-2 hover:bg-primary-700 transition-all"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-700 transition-all"
            >
              Complete Registration
              <CheckCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingForm;
