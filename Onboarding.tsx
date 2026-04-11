import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, User, Calendar, Users, Search, ShieldCheck } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Progress } from './components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: auth.currentUser?.displayName || '',
    dob: '',
    class: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    source: '',
    customSource: '',
    recoveryEmail: '',
    recoveryPhone: '',
  });

  const totalSteps = 6;
  const progress = (step / totalSteps) * 100;

  // Auto-calculate class based on DOB (Indian system)
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

      if (detectedClass && !formData.class) {
        setFormData(prev => ({ ...prev, class: detectedClass }));
      }
    }
  }, [formData.dob]);

  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const finalData = {
        ...formData,
        email: auth.currentUser.email || '',
        provider: auth.currentUser.providerData[0]?.providerId || 'password',
        source: formData.source === 'Others' ? formData.customSource : formData.source,
        hasCompletedOnboarding: true,
        createdAt: serverTimestamp(),
      };
      // Remove customSource from final object
      delete (finalData as any).customSource;

      await setDoc(doc(db, 'users', auth.currentUser.uid), finalData);
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen bg-primary-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Welcome to SJ Tutor AI</h2>
              <p className="text-slate-500">Let's get your profile ready</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-primary-600">Step {step} of {totalSteps}</span>
              <Progress value={progress} className="w-32 h-2 mt-2" />
            </div>
          </div>

          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" {...stepVariants} className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <User className="text-primary-600" />
                    </div>
                    <h3 className="text-xl font-semibold">What&apos;s your name?</h3>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" {...stepVariants} className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Calendar className="text-primary-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Tell us about yourself</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={formData.dob}
                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="class">Class</Label>
                      <Select value={formData.class} onValueChange={val => setFormData({ ...formData, class: val })}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select your class" />
                        </SelectTrigger>
                        <SelectContent>
                          {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400">Auto-detected based on age, but you can override.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" {...stepVariants} className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Users className="text-primary-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Parent/Guardian Details</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pname">Parent Name</Label>
                      <Input
                        id="pname"
                        placeholder="Enter parent&apos;s name"
                        value={formData.parentName}
                        onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pphone">Phone Number</Label>
                        <Input
                          id="pphone"
                          placeholder="Parent&apos;s phone"
                          value={formData.parentPhone}
                          onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pemail">Email Address</Label>
                        <Input
                          id="pemail"
                          type="email"
                          placeholder="Parent&apos;s email"
                          value={formData.parentEmail}
                          onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                          className="h-12 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" {...stepVariants} className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Search className="text-primary-600" />
                    </div>
                    <h3 className="text-xl font-semibold">How did you find us?</h3>
                  </div>
                  <div className="space-y-4">
                    <Select value={formData.source} onValueChange={val => setFormData({ ...formData, source: val })}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {['YouTube', 'Friends', 'School', 'Instagram', 'Google', 'Others'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.source === 'Others' && (
                      <Input
                        placeholder="Please specify"
                        value={formData.customSource}
                        onChange={e => setFormData({ ...formData, customSource: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" {...stepVariants} className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="text-primary-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Recovery Details</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Must be different from your main and parent details.</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="remail">Recovery Email</Label>
                      <Input
                        id="remail"
                        type="email"
                        placeholder="Recovery email"
                        value={formData.recoveryEmail}
                        onChange={e => setFormData({ ...formData, recoveryEmail: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rphone">Recovery Phone</Label>
                      <Input
                        id="rphone"
                        placeholder="Recovery phone"
                        value={formData.recoveryPhone}
                        onChange={e => setFormData({ ...formData, recoveryPhone: e.target.value })}
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 6 && (
                <motion.div key="step6" {...stepVariants} className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Check className="text-primary-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Review & Confirm</h3>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-6 space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Name</span>
                      <span className="font-semibold">{formData.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">DOB / Class</span>
                      <span className="font-semibold">{formData.dob} / {formData.class}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Parent</span>
                      <span className="font-semibold">{formData.parentName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Source</span>
                      <span className="font-semibold">{formData.source === 'Others' ? formData.customSource : formData.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Recovery</span>
                      <span className="font-semibold">{formData.recoveryEmail}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-between mt-12">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || loading}
              className="rounded-xl h-12 px-6"
            >
              <ChevronLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            {step < totalSteps ? (
              <Button
                onClick={handleNext}
                className="btn-primary rounded-xl h-12 px-8"
              >
                Next <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary rounded-xl h-12 px-8 bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Registering...' : 'Register Now'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
