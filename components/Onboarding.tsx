
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Calendar, Users, Search, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, Loader2, GraduationCap } from 'lucide-react';
import { UserProfile } from '../types';

interface OnboardingProps {
  initialData: Partial<UserProfile>;
  onComplete: (data: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ initialData, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    displayName: initialData.displayName || '',
    email: initialData.email || '',
    dob: '',
    grade: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    source: '',
    recoveryEmail: '',
    recoveryPhone: '',
    hasCompletedOnboarding: false,
    credits: 100,
    planType: 'Free',
    createdAt: Date.now(),
    ...initialData
  });

  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 1, title: 'Name', icon: User },
    { id: 2, title: 'Class', icon: GraduationCap },
    { id: 3, title: 'Parent', icon: Users },
    { id: 4, title: 'Source', icon: Search },
    { id: 5, title: 'Recovery', icon: ShieldCheck },
    { id: 6, title: 'Confirm', icon: CheckCircle2 },
  ];

  // Auto-detect class based on DOB (Indian System)
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      let detectedClass = '';
      if (age === 11 || age === 12) detectedClass = 'Class 6';
      else if (age === 12 || age === 13) detectedClass = 'Class 7';
      else if (age === 13 || age === 14) detectedClass = 'Class 8';
      else if (age === 14 || age === 15) detectedClass = 'Class 9';
      else if (age === 15 || age === 16) detectedClass = 'Class 10';
      else if (age === 16 || age === 17) detectedClass = 'Class 11';
      else if (age === 17 || age === 18) detectedClass = 'Class 12';

      if (detectedClass && !formData.grade) {
        setFormData(prev => ({ ...prev, grade: detectedClass }));
      }
    }
  }, [formData.dob]);

  const handleNext = () => {
    setError(null);
    if (step === 1 && !formData.displayName) {
      setError("Please enter your name.");
      return;
    }
    if (step === 2 && (!formData.dob || !formData.grade)) {
      setError("Please enter your DOB and Class.");
      return;
    }
    if (step === 3 && (!formData.parentName || !formData.parentPhone || !formData.parentEmail)) {
      setError("Please fill in all parent details.");
      return;
    }
    if (step === 4 && !formData.source) {
      setError("Please select how you found us.");
      return;
    }
    if (step === 5) {
      if (!formData.recoveryEmail || !formData.recoveryPhone) {
        setError("Please enter recovery details.");
        return;
      }
      if (formData.recoveryEmail === formData.email || formData.recoveryEmail === formData.parentEmail) {
        setError("Recovery email must be unique.");
        return;
      }
      if (formData.recoveryPhone === formData.parentPhone) {
        setError("Recovery phone must be unique.");
        return;
      }
    }
    
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const finalData = {
        ...formData,
        hasCompletedOnboarding: true,
      } as UserProfile;
      onComplete(finalData);
    } catch (_err) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">What&apos;s your full name?</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="John Doe"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Class (Detected/Manual)</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                >
                  <option value="">Select Class</option>
                  {[6, 7, 8, 9, 10, 11, 12].map(c => (
                    <option key={c} value={`Class ${c}`}>Class {c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Parent Name"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="tel"
                placeholder="Parent Phone"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Parent Email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">How did you find us?</label>
            {['YouTube', 'Friends', 'School', 'Instagram', 'Google', 'Others'].map(opt => (
              <button
                key={opt}
                onClick={() => setFormData({ ...formData, source: opt })}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                  formData.source === opt 
                    ? 'bg-primary-50 border-primary-500 text-primary-700 font-bold' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300'
                }`}
              >
                {opt}
              </button>
            ))}
            {formData.source === 'Others' && (
              <input
                type="text"
                placeholder="Please specify"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                onChange={(e) => setFormData({ ...formData, source: `Others: ${e.target.value}` })}
              />
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 mb-2">Used for account recovery. Must be different from your main details.</p>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Recovery Email"
                value={formData.recoveryEmail}
                onChange={(e) => setFormData({ ...formData, recoveryEmail: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="tel"
                placeholder="Recovery Phone"
                value={formData.recoveryPhone}
                onChange={(e) => setFormData({ ...formData, recoveryPhone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Name:</span> <span className="font-bold">{formData.displayName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">DOB:</span> <span className="font-bold">{formData.dob}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Class:</span> <span className="font-bold">{formData.grade}</span></div>
              <div className="border-t border-slate-200 my-2"></div>
              <div className="flex justify-between"><span className="text-slate-500">Parent:</span> <span className="font-bold">{formData.parentName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Parent Phone:</span> <span className="font-bold">{formData.parentPhone}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Source:</span> <span className="font-bold">{formData.source}</span></div>
              <div className="border-t border-slate-200 my-2"></div>
              <div className="flex justify-between"><span className="text-slate-500">Recovery Email:</span> <span className="font-bold">{formData.recoveryEmail}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Recovery Phone:</span> <span className="font-bold">{formData.recoveryPhone}</span></div>
            </div>
            <p className="text-xs text-center text-slate-400">By clicking Register, you confirm all details are correct.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Progress Header */}
        <div className="bg-slate-50 p-6 border-b border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Welcome to SJ Tutor AI</h2>
              <p className="text-slate-500 text-sm">Complete your profile to get started</p>
            </div>
            <div className="bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-xs font-bold">
              Step {step} of 6
            </div>
          </div>
          
          <div className="flex gap-2">
            {steps.map(s => (
              <div 
                key={s.id}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  step >= s.id ? 'bg-primary-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8 min-h-[350px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl">
                  {React.createElement(steps[step-1].icon, { className: "w-6 h-6" })}
                </div>
                <h3 className="text-xl font-bold text-slate-800">{steps[step-1].title}</h3>
              </div>

              {renderStep()}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 font-medium"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={step === 1 || loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          {step < 6 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-all hover:-translate-y-0.5"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-70"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Register
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
