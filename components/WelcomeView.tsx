
import React from 'react';
import { Sparkles, BrainCircuit, Calendar, TrendingUp, ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import Logo from './Logo';

interface WelcomeViewProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center relative overflow-hidden font-sans selection:bg-primary-100 selection:text-primary-900">
      
      {/* Background Decorative Blobs - Soft & Calm */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary-50/80 to-transparent dark:from-slate-800/50 pointer-events-none z-0"></div>
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-[10%] left-[-5%] w-72 h-72 bg-purple-100/50 dark:bg-purple-900/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

      <div className="flex-1 w-full max-w-md px-6 py-8 flex flex-col items-center relative z-10 overflow-y-auto custom-scrollbar">
        
        {/* 1. Header Section */}
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="mb-4 transform hover:scale-105 transition-transform duration-300 shadow-sm rounded-full">
            <Logo className="w-16 h-16" iconOnly />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight text-center mb-2">
            SJ Tutor <span className="text-primary-600">AI</span>
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] text-center">
            Learn Smart. Stay Consistent. Succeed.
          </p>
        </div>

        {/* 2. Hero Illustration */}
        <div className="w-full aspect-[4/3] mb-8 rounded-3xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 relative animate-in zoom-in-95 duration-700 delay-150 group">
          <img 
            src="https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg" 
            alt="Confident Student Studying"
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-1000"
          />
          {/* Subtle Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
          
          {/* Floating Badge */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="inline-flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/50 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary-500 fill-primary-500" />
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                Your Personal AI Mentor
              </span>
            </div>
          </div>
        </div>

        {/* 3. Welcome Text */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
            Welcome to SJ Tutor AI <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed px-2">
            Your personal AI mentor for <span className="font-semibold text-primary-600 dark:text-primary-400">smart study</span>, concept clarity, daily motivation, and exam-focused learning.
          </p>
        </div>

        {/* 4. Feature Highlights */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          {[
            { icon: BrainCircuit, label: "AI Tutor Support", sub: "Instant help anytime", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/30" },
            { icon: Calendar, label: "Daily Discipline", sub: "Build consistency", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/30" },
            { icon: BookOpen, label: "Exam Focus", sub: "Learn what matters", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
            { icon: TrendingUp, label: "Motivation", sub: "Progress, not pressure", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/30" }
          ].map((feature, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center gap-2 transition-transform hover:-translate-y-1">
              <div className={`p-2 rounded-lg ${feature.bg} ${feature.color}`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{feature.label}</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{feature.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 5. Call to Action Buttons */}
        <div className="w-full space-y-3 mt-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-700">
          <button 
            onClick={onGetStarted}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-base shadow-lg shadow-primary-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={onSignIn}
            className="w-full py-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
          >
            Sign In
          </button>
        </div>

        {/* 6. Footer */}
        <div className="mt-8 mb-2 text-center animate-in fade-in duration-700 delay-1000">
          <p className="text-[10px] font-medium text-slate-400 mb-2">Made for students by SJ Tutor AI</p>
          <div className="flex gap-4 justify-center text-[10px] text-slate-300 dark:text-slate-600">
            <span className="hover:text-primary-500 cursor-pointer transition-colors">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-primary-500 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default WelcomeView;
