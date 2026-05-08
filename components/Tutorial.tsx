
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Sparkles, BookOpen, BrainCircuit, MessageCircle, LayoutDashboard } from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to SJ Tutor AI",
      description: "Your ultimate AI-powered study companion. Let&apos;s take a quick tour of how you can boost your learning journey.",
      icon: <Sparkles className="w-12 h-12 text-primary-500" />,
      color: "from-amber-500 to-orange-500"
    },
    {
      title: "Smart Summarizer",
      description: "Generate concise, structured summaries from any topic. Perfect for quick revisions and grasping core concepts.",
      icon: <BookOpen className="w-12 h-12 text-blue-500" />,
      color: "from-blue-500 to-indigo-500"
    },
    {
      title: "AI Quiz Creator",
      description: "Test your knowledge with custom quizzes. Earn credits for mastering hard challenges and track your progress.",
      icon: <BrainCircuit className="w-12 h-12 text-emerald-500" />,
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Intelligent AI Tutor",
      description: "Need help? Our 24/7 AI Tutor is here to explain complex topics, solve doubts, and guide you through your curriculum.",
      icon: <MessageCircle className="w-12 h-12 text-violet-500" />,
      color: "from-violet-500 to-purple-500"
    },
    {
      title: "Dashboard & History",
      description: "Access all your previous generations, track your credits, and manage your student ID card from one central hub.",
      icon: <LayoutDashboard className="w-12 h-12 text-rose-500" />,
      color: "from-rose-500 to-pink-500"
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full relative border border-white/10"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-20 text-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`h-2 h-gradient bg-gradient-to-r ${steps[currentStep].color} transition-all duration-500`} style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center space-y-6 pt-4"
            >
              <div className={`p-6 rounded-2xl bg-gradient-to-br ${steps[currentStep].color} bg-opacity-10 text-white shadow-lg`}>
                {steps[currentStep].icon}
              </div>
              
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                  {steps[currentStep].title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                  {steps[currentStep].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-12">
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-primary-600' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={nextStep}
                className={`py-3 px-8 rounded-xl text-white font-bold transition-all shadow-lg shadow-primary-600/20 flex items-center gap-2 bg-gradient-to-r ${steps[currentStep].color}`}
              >
                {currentStep === steps.length - 1 ? "Let&apos;s Get Started" : "Next"}
                {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Tutorial;
