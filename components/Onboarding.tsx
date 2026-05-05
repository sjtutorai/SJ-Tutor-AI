
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  BrainCircuit, 
  BookOpen, 
  Zap, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const ONBOARDING_STEPS = [
  {
    title: "Welcome to SJ Tutor AI",
    subtitle: "Your Personal AI Study Companion. From summaries to quizzes, we've got you covered for every subject.",
    icon: Sparkles,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
  },
  {
    title: "Master Your Exams",
    subtitle: "Generate custom quizzes based on your CBSE/ICSE board and chapters. Practice with 1000+ AI-generated questions.",
    icon: BrainCircuit,
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
  },
  {
    title: "Learn Your Way",
    subtitle: "Get smart summaries, sample essays, and 1:1 tutoring. Our AI understands your curriculum perfectly.",
    icon: BookOpen,
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
  },
  {
    title: "Earn Extra Credit",
    subtitle: "Stay consistent, maintain daily streaks, and earn points. Unlock premium features by being a top student!",
    icon: Zap,
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-amber-200/20 dark:bg-amber-900/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-md w-full relative">
        {/* Skip button */}
        <button 
          onClick={onComplete}
          className="absolute top-0 right-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold tracking-wider uppercase transition-colors"
        >
          Skip
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className={`w-24 h-24 ${step.color} rounded-3xl flex items-center justify-center mb-8 shadow-xl transform rotate-3`}>
              <Icon size={48} strokeWidth={1.5} />
            </div>

            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
              {step.title}
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-12 leading-relaxed">
              {step.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress Indicators */}
        <div className="flex justify-center gap-2 mb-12">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep ? 'w-8 bg-amber-500 shadow-sm' : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            ></div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-4">
          {currentStep > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 flex items-center justify-center h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          
          <button
            onClick={nextStep}
            className="flex-[2] flex items-center justify-center h-14 rounded-2xl bg-amber-500 text-white font-bold text-lg shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all active:scale-95"
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight size={20} className="ml-2" />
          </button>
        </div>
      </div>
      
      {/* Branding */}
      <div className="absolute bottom-8 flex items-center gap-2 opacity-50 grayscale">
        <div className="w-6 h-6 rounded bg-amber-500"></div>
        <span className="text-sm font-black tracking-tighter dark:text-white">SJ TUTOR AI</span>
      </div>
    </div>
  );
};

export default Onboarding;
