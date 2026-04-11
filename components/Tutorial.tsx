
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, ChevronLeft, X, CheckCircle2 } from 'lucide-react';

interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialProps {
  onComplete: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TutorialStep[] = [
    {
      targetId: 'nav-DASHBOARD',
      title: 'Your Command Center',
      content: 'Access all your summaries, quizzes, and essays from here. It is your personalized learning hub.',
      position: 'right'
    },
    {
      targetId: 'nav-QUIZ',
      title: 'Test Your Knowledge',
      content: 'Create interactive quizzes from any chapter. Challenge yourself and track your progress!',
      position: 'right'
    },
    {
      targetId: 'nav-SUMMARY',
      title: 'Quick Revisions',
      content: 'Generate smart summaries of complex topics in seconds. Perfect for last-minute revisions.',
      position: 'right'
    }
  ];

  useEffect(() => {
    const updateTargetRect = () => {
      const element = document.getElementById(steps[currentStep].targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    return () => window.removeEventListener('resize', updateTargetRect);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!targetRect) return null;

  const padding = 8;
  const spotlightStyle = {
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
    borderRadius: '12px',
  };

  const tooltipPosition = () => {
    const step = steps[currentStep];
    const offset = 20;
    
    switch (step.position) {
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + offset,
          transform: 'translateY(-50%)'
        };
      case 'bottom':
        return {
          top: targetRect.bottom + offset,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)'
        };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Backdrop with hole */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] pointer-events-auto" />
      
      {/* Spotlight */}
      <motion.div 
        layoutId="spotlight"
        className="absolute bg-white shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] z-10 pointer-events-none"
        style={spotlightStyle}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          className="absolute z-20 w-72 bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto border border-slate-100"
          style={tooltipPosition()}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-slate-800">{steps[currentStep].title}</h4>
          </div>
          
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {steps[currentStep].content}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentStep ? 'w-4 bg-primary-500' : 'bg-slate-200'
                  }`} 
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button 
                  onClick={handleBack}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    Finish
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <button 
            onClick={onComplete}
            className="absolute -top-10 right-0 text-white/60 hover:text-white flex items-center gap-1 text-sm font-medium transition-all"
          >
            Skip Tutorial
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Tutorial;
