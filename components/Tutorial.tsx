
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, CheckCircle } from 'lucide-react';

interface TutorialStep {
  targetId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onClose: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ steps, onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const updateSpotlight = () => {
      const target = document.getElementById(steps[currentStep].targetId);
      if (target) {
        const rect = target.getBoundingClientRect();
        setSpotlight({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        });
        
        // Scroll target into view if needed
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [currentStep, steps]);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* SVG Mask for Spotlight */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect 
              x={spotlight.x - 8} 
              y={spotlight.y - 8} 
              width={spotlight.width + 16} 
              height={spotlight.height + 16} 
              rx="12" 
              fill="black" 
            />
          </mask>
        </defs>
        <rect 
          width="100%" 
          height="100%" 
          fill="rgba(0,0,0,0.7)" 
          mask="url(#spotlight-mask)" 
        />
      </svg>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            left: spotlight.x + spotlight.width / 2,
            top: step.position === 'bottom' ? spotlight.y + spotlight.height + 20 : spotlight.y - 20
          }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          style={{ 
            position: 'absolute', 
            transform: `translateX(-50%) ${step.position === 'top' ? 'translateY(-100%)' : ''}` 
          }}
          className="pointer-events-auto w-[280px] bg-white rounded-2xl shadow-2xl p-5 border border-slate-100 z-[110]"
        >
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="mb-4">
            <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full uppercase tracking-wider">
              Step {currentStep + 1} of {steps.length}
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-2">{step.title}</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{step.description}</p>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button 
              onClick={prev}
              disabled={currentStep === 0}
              className={`p-2 rounded-lg transition-all ${currentStep === 0 ? 'text-slate-200' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button 
              onClick={next}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all active:scale-95 shadow-lg shadow-primary-500/20"
            >
              {currentStep === steps.length - 1 ? (
                <>Finish <CheckCircle className="w-4 h-4" /></>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Tutorial;
