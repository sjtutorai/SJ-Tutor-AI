
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialSpotlightProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onClose: () => void;
}

const TutorialSpotlight: React.FC<TutorialSpotlightProps> = ({ steps, onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      const element = document.getElementById(steps[currentStep].targetId);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [currentStep, steps]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!targetRect) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Overlay with hole */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect 
              x={targetRect.left - 8} 
              y={targetRect.top - 8} 
              width={targetRect.width + 16} 
              height={targetRect.height + 16} 
              rx="12" 
              fill="black" 
            />
          </mask>
        </defs>
        <rect 
          x="0" 
          y="0" 
          width="100%" 
          height="100%" 
          fill="rgba(0,0,0,0.7)" 
          mask="url(#spotlight-mask)" 
          onClick={onClose}
        />
      </svg>

      {/* Tooltip */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="absolute pointer-events-auto bg-white rounded-2xl shadow-2xl p-6 w-72 z-[201]"
        style={{
          left: step.position === 'right' 
            ? targetRect.right + 20 
            : step.position === 'left' 
              ? targetRect.left - 308 
              : targetRect.left + (targetRect.width / 2) - 144,
          top: step.position === 'bottom' 
            ? targetRect.bottom + 20 
            : step.position === 'top' 
              ? targetRect.top - 180 
              : targetRect.top + (targetRect.height / 2) - 90,
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-slate-800">{step.title}</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-6">{step.description}</p>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentStep ? 'bg-primary-600 w-4' : 'bg-slate-200'}`} 
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button 
                onClick={prevStep}
                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={nextStep}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold text-sm flex items-center gap-1 hover:bg-primary-700 transition-all"
            >
              {currentStep === steps.length - 1 ? (
                <>Finish <Check className="w-4 h-4" /></>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        {/* Arrow */}
        <div 
          className={`absolute w-4 h-4 bg-white rotate-45 ${
            step.position === 'bottom' ? '-top-2 left-1/2 -translate-x-1/2' :
            step.position === 'top' ? '-bottom-2 left-1/2 -translate-x-1/2' :
            step.position === 'right' ? '-left-2 top-1/2 -translate-y-1/2' :
            '-right-2 top-1/2 -translate-y-1/2'
          }`}
        />
      </motion.div>
    </div>
  );
};

export default TutorialSpotlight;
