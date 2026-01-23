import React, { useState, useEffect } from 'react';
import { AppMode } from '../types';
import { Sparkles } from 'lucide-react';
import { SJTUTOR_AVATAR } from '../App';

interface LoadingStateProps {
  mode: AppMode;
}

const LoadingState: React.FC<LoadingStateProps> = ({ mode }) => {
  const [message, setMessage] = useState('');
  
  // Specific messages based on the mode
  const messages = {
    [AppMode.SUMMARY]: [
      "Analyzing key concepts...",
      "Synthesizing main points...",
      "Structuring summary...",
      "Finalizing study notes..."
    ],
    [AppMode.QUIZ]: [
      "Designing challenging questions...",
      "Randomizing options...",
      "Drafting explanations...",
      "Calibrating difficulty..."
    ],
    [AppMode.ESSAY]: [
      "Brainstorming thesis...",
      "Structuring arguments...",
      "Drafting body paragraphs...",
      "Polishing conclusion..."
    ],
    [AppMode.NOTES]: [
      "Analyzing exam date...",
      "Evaluating syllabus...",
      "Allocating study slots...",
      "Optimizing your schedule..."
    ],
    [AppMode.TUTOR]: ["Connecting to AI Tutor..."],
    [AppMode.DASHBOARD]: ["Loading..."],
    [AppMode.PROFILE]: ["Saving..."]
  };

  useEffect(() => {
    const modeMessages = messages[mode] || ["Processing..."];
    let i = 0;
    setMessage(modeMessages[0]);
    
    const interval = setInterval(() => {
      i = (i + 1) % modeMessages.length;
      setMessage(modeMessages[i]);
    }, 2000);

    return () => clearInterval(interval);
  }, [mode]);

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
      <div className="relative mb-8">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 bg-primary-100 rounded-full blur-xl animate-pulse"></div>
        
        <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl">
           <img 
            src={SJTUTOR_AVATAR} 
            alt="Thinking..." 
            className="w-full h-full object-cover animate-pulse" 
           />
        </div>
        
        {/* Orbiting Sparkle */}
        <div className="absolute -top-2 -right-2 animate-spin duration-3000">
           <Sparkles className="w-8 h-8 text-amber-400 fill-amber-400" />
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-2 animate-pulse">
        {mode === AppMode.NOTES ? 'SJ Tutor AI is Planning' : 
         `SJ Tutor AI is Creating your ${mode === AppMode.SUMMARY ? 'Summary' : mode === AppMode.QUIZ ? 'Quiz' : 'Essay'}`
        }
      </h3>
      
      <p className="text-slate-500 text-sm font-medium bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 transition-all duration-300">
        {message}
      </p>

      <div className="mt-8 flex gap-2">
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
};

export default LoadingState;