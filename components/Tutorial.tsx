
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles, 
  BookOpen, 
  BrainCircuit, 
  MessageCircle, 
  LayoutDashboard,
  PenTool,
  ClipboardCheck,
  Library,
  Flame,
  Timer,
  IdCard
} from 'lucide-react';

interface TutorialProps {
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to SJ Tutor AI",
      description: "Your ultimate AI-powered personalized study companion. Let's take a quick tour of how you can boost your learning journey.",
      icon: <Sparkles className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Student Dashboard",
      description: "Manage your credits, review your academic dashboard statistics, track completion statuses, and stay on top of live notifications.",
      icon: <LayoutDashboard className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Smart Summarizer",
      description: "Convert any educational topic or textbook chapter into structured, concise summaries. Perfect for quick exam revision.",
      icon: <BookOpen className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Interactive AI Quizzes",
      description: "Test yourself with dynamic, curriculum-customized quizzes. Beat hard questions to earn bonus student credits!",
      icon: <BrainCircuit className="w-12 h-12 text-primary-500" />
    },
    {
      title: "AI Homework Assistant",
      description: "Get targeted, step-by-step math, science, and humanities feedback to master tough homework questions and assignments.",
      icon: <ClipboardCheck className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Essay Genius",
      description: "Compose elegant responses and receive instant grammar checkup, grading evaluation, and guidance on style improvements.",
      icon: <PenTool className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Custom 24/7 AI Tutor",
      description: "Engage with your virtual tutor at any hour to clarify course doubts, discuss complex problems, or learn novel material.",
      icon: <MessageCircle className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Smart Study Notes",
      description: "Keep structured notes, organize chapters by subject, and search or revision-query your notebooks continuously.",
      icon: <Library className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Draggable Daily Streaks",
      description: "Drag and place your streak tracker anywhere on-screen! Complete 1 study action daily to level up, build streaks, and rule the leaderboards.",
      icon: <Flame className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Pomodoro Study Timer",
      description: "Boost focus and reach ultimate flow state using the integrated study trainer timer. Track your active focus minutes seamlessly.",
      icon: <Timer className="w-12 h-12 text-primary-500" />
    },
    {
      title: "Virtual Student ID Card",
      description: "Generate a premium digital student badge with an integrated barcode. Scan profile QR codes instantly to share credentials.",
      icon: <IdCard className="w-12 h-12 text-primary-500" />
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#0f172a] rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full relative border border-slate-800"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full transition-colors z-20 text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="h-1.5 bg-slate-800 w-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary-600" 
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <div className="p-8 rounded-3xl bg-slate-800/50 text-white shadow-2xl border border-slate-700/50">
                {steps[currentStep].icon}
              </div>
              
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
                  {steps[currentStep].title}
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed max-w-sm mx-auto">
                  {steps[currentStep].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-14">
            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 rounded-full transition-all duration-500 ${idx === currentStep ? 'w-8 bg-primary-600' : 'w-2 bg-slate-800'}`}
                />
              ))}
            </div>

            <div className="flex gap-4">
              {currentStep > 0 && (
                <button 
                  onClick={prevStep}
                  className="p-3.5 bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={nextStep}
                className="py-3.5 px-10 rounded-2xl text-white font-bold transition-all shadow-xl shadow-primary-600/20 flex items-center gap-2 bg-primary-600 hover:bg-primary-500 active:scale-95"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Continue"}
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
