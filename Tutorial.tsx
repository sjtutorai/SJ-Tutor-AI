import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './components/ui/button';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
}

interface TutorialProps {
  steps: TutorialStep[];
  onFinish: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ steps, onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      const element = document.getElementById(steps[currentStep].targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
        element.classList.add('spotlight-active');
      }
    };

    // Cleanup previous step
    if (currentStep > 0) {
      const prevElement = document.getElementById(steps[currentStep - 1].targetId);
      if (prevElement) prevElement.classList.remove('spotlight-active');
    }
    if (currentStep < steps.length - 1) {
       const nextElement = document.getElementById(steps[currentStep + 1].targetId);
       if (nextElement) nextElement.classList.remove('spotlight-active');
    }

    updateRect();
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      const element = document.getElementById(steps[currentStep].targetId);
      if (element) element.classList.remove('spotlight-active');
    };
  }, [currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  if (!targetRect) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className="absolute inset-0 bg-black/70 pointer-events-auto" onClick={onFinish} />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            top: targetRect.bottom + 20,
            left: Math.max(20, Math.min(window.innerWidth - 340, targetRect.left + (targetRect.width / 2) - 160))
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="absolute w-[320px] bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto z-[110]"
          style={{ position: 'fixed' }}
        >
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-bold text-lg text-primary-700">{steps[currentStep].title}</h4>
            <button onClick={onFinish} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            {steps[currentStep].description}
          </p>
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-400">
              Step {currentStep + 1} of {steps.length}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack} 
                disabled={currentStep === 0}
                className="h-8 px-3 rounded-lg"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button 
                size="sm" 
                onClick={handleNext}
                className="h-8 px-4 rounded-lg bg-primary-600 hover:bg-primary-700"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
          
          {/* Arrow pointing up */}
          <div 
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45"
            style={{ left: '50%' }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
