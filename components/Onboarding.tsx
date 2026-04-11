
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
  Mail,
  Phone,
  GraduationCap,
  Youtube,
  Instagram,
  Globe,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';
import { UserProfile } from '../types';

interface OnboardingProps {
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    providerId?: string;
  };
  onComplete: (data: Partial<UserProfile>) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    dob: '',
    grade: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    source: '',
    recoveryEmail: '',
    recoveryPhone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect class based on DOB (Indian system 6-12)
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // Approximate mapping: 11-12 -> 6th, 12-13 -> 7th, ..., 17-18 -> 12th
      let detectedClass = '';
      if (age >= 11 && age <= 18) {
        const gradeNum = age - 5;
        if (gradeNum >= 6 && gradeNum <= 12) {
          detectedClass = `${gradeNum}th Grade`;
        }
      }
      
      if (detectedClass && !formData.grade) {
        setFormData(prev => ({ ...prev, grade: detectedClass }));
      }
    }
  }, [formData.dob]);

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.displayName) newErrors.displayName = "Name is required";
      if (!formData.dob) newErrors.dob = "Date of birth is required";
    } else if (step === 2) {
      if (!formData.parentName) newErrors.parentName = "Parent name is required";
      if (!formData.parentPhone) newErrors.parentPhone = "Parent phone is required";
      if (!formData.parentEmail) newErrors.parentEmail = "Parent email is required";
    } else if (step === 3) {
      if (!formData.source) newErrors.source = "Please select how you found us";
    } else if (step === 4) {
      if (!formData.recoveryEmail) newErrors.recoveryEmail = "Recovery email is required";
      if (!formData.recoveryPhone) newErrors.recoveryPhone = "Recovery phone is required";
      
      if (formData.recoveryEmail === formData.email) {
        newErrors.recoveryEmail = "Recovery email must be different from your email";
      }
      if (formData.recoveryEmail === formData.parentEmail) {
        newErrors.recoveryEmail = "Recovery email must be different from parent email";
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

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

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
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Tell us about yourself</h2>
              <p className="text-slate-500">Let&apos;s get your basic details sorted.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.displayName ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                    placeholder="Your full name"
                  />
                </div>
                {errors.displayName && <p className="text-xs text-red-500">{errors.displayName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleInputChange('dob', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.dob ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                    />
                  </div>
                  {errors.dob && <p className="text-xs text-red-500">{errors.dob}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Class / Grade</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <select 
                      value={formData.grade}
                      onChange={(e) => handleInputChange('grade', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all appearance-none"
                    >
                      <option value="">Select Grade</option>
                      {[6, 7, 8, 9, 10, 11, 12].map(g => (
                        <option key={g} value={`${g}th Grade`}>{g}th Grade</option>
                      ))}
                    </select>
                  </div>
                </div>
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
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Parent Details</h2>
              <p className="text-slate-500">For academic updates and support.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Parent / Guardian Name</label>
                <input 
                  type="text"
                  value={formData.parentName}
                  onChange={(e) => handleInputChange('parentName', e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border ${errors.parentName ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                  placeholder="Parent's full name"
                />
                {errors.parentName && <p className="text-xs text-red-500">{errors.parentName}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Parent Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      type="tel"
                      value={formData.parentPhone}
                      onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.parentPhone ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  {errors.parentPhone && <p className="text-xs text-red-500">{errors.parentPhone}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Parent Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.parentEmail ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                      placeholder="parent@example.com"
                    />
                  </div>
                  {errors.parentEmail && <p className="text-xs text-red-500">{errors.parentEmail}</p>}
                </div>
              </div>
            </div>
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
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">How did you find us?</h2>
              <p className="text-slate-500">We&apos;d love to know where you heard about SJ Tutor AI.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: 'YouTube', icon: Youtube, color: 'text-red-600 bg-red-50' },
                { id: 'Instagram', icon: Instagram, color: 'text-pink-600 bg-pink-50' },
                { id: 'Google', icon: Globe, color: 'text-blue-600 bg-blue-50' },
                { id: 'Friends', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
                { id: 'School', icon: GraduationCap, color: 'text-purple-600 bg-purple-50' },
                { id: 'Others', icon: MoreHorizontal, color: 'text-slate-600 bg-slate-50' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleInputChange('source', item.id)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    formData.source === item.id 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{item.id}</span>
                </button>
              ))}
            </div>
            
            {formData.source === 'Others' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <input 
                  type="text"
                  onChange={(e) => handleInputChange('source', `Other: ${e.target.value}`)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Tell us more..."
                />
              </motion.div>
            )}
            {errors.source && <p className="text-center text-xs text-red-500">{errors.source}</p>}
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
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Recovery Details</h2>
              <p className="text-slate-500">In case you lose access to your account.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Recovery Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type="email"
                    value={formData.recoveryEmail}
                    onChange={(e) => handleInputChange('recoveryEmail', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.recoveryEmail ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                    placeholder="recovery@example.com"
                  />
                </div>
                {errors.recoveryEmail && <p className="text-xs text-red-500">{errors.recoveryEmail}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Recovery Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type="tel"
                    value={formData.recoveryPhone}
                    onChange={(e) => handleInputChange('recoveryPhone', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.recoveryPhone ? 'border-red-500' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all`}
                    placeholder="+91 98765 43210"
                  />
                </div>
                {errors.recoveryPhone && <p className="text-xs text-red-500">{errors.recoveryPhone}</p>}
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Review & Confirm</h2>
              <p className="text-slate-500">Please check your details before finishing.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Name</p>
                  <p className="text-slate-800 font-semibold">{formData.displayName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Class</p>
                  <p className="text-slate-800 font-semibold">{formData.grade}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">DOB</p>
                  <p className="text-slate-800 font-semibold">{formData.dob}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Source</p>
                  <p className="text-slate-800 font-semibold">{formData.source}</p>
                </div>
                <div className="col-span-2 border-t border-slate-200 pt-3">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Parent Details</p>
                  <p className="text-slate-800 font-semibold">{formData.parentName}</p>
                  <p className="text-slate-600 text-xs">{formData.parentEmail} | {formData.parentPhone}</p>
                </div>
                <div className="col-span-2 border-t border-slate-200 pt-3">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Recovery Details</p>
                  <p className="text-slate-800 font-semibold">{formData.recoveryEmail}</p>
                  <p className="text-slate-600 text-xs">{formData.recoveryPhone}</p>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Progress Bar */}
        <div className="h-2 bg-slate-100 flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className={`flex-1 transition-all duration-500 ${i <= step ? 'bg-primary-500' : 'bg-transparent'}`}
            />
          ))}
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          {step > 1 ? (
            <button 
              onClick={prevStep}
              className="flex items-center gap-2 px-6 py-3 text-slate-600 font-bold hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button 
              onClick={nextStep}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => onComplete(formData)}
              className="flex items-center gap-2 px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              Register
              <CheckCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
