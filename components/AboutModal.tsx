import React, { useEffect } from 'react';
import { Target, Zap, Mail, Phone, Lightbulb, Award, Sparkles, X, CheckCircle2, Shield } from 'lucide-react';
import Logo from './Logo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToLegal?: (mode: 'PRIVACY' | 'TERMS') => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onNavigateToLegal }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary-500 shadow-sm flex items-center justify-center bg-white dark:bg-slate-800">
              <Logo className="w-full h-full" iconOnly noBorder />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                About SJ Tutor AI
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-amber-300 dark:border-amber-800">
                  Creators Showcase
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Empowering Students with Intelligent Learning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1">
          
          {/* Creators Section */}
          <div className="bg-gradient-to-br from-amber-500/10 via-primary-500/10 to-indigo-500/10 dark:from-amber-500/20 dark:via-primary-500/20 dark:to-indigo-500/20 rounded-2xl p-6 sm:p-8 border border-amber-500/20 dark:border-amber-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Project Creators &amp; Innovators
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">The visionary minds behind the architecture and creation of SJ Tutor AI</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Sadanand Jyoti */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                      SJ
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider mb-1">
                        <Award className="w-3 h-3" /> Lead Innovator &amp; Founder
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">Sadanand Jyoti</h4>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Project Architect &amp; Core Visionary</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <p className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Architected adaptive AI tutoring engines and intelligent learning frameworks.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Designed real-time study group collaboration &amp; student engagement workflows.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Pioneered personalized student study plans and progress tracking systems.</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> sadanandj2011@gmail.com
                    </span>
                    <span>India</span>
                  </div>
                </div>
              </div>

              {/* Samanyu S Patil */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                      SP
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider mb-1">
                        <Award className="w-3 h-3" /> Co-Developer &amp; Systems Engineer
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">Samanyu S Patil</h4>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Systems Engineer &amp; Co-Inventor</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <p className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Pioneered interactive quiz generation algorithms and instant grading modules.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Engineered smart homework problem-solving tools &amp; step-by-step insight engines.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>Created Student ID Card verification system &amp; digital credential tools.</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> sjtutorai@gmail.com
                    </span>
                    <span>India</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Public Developer Verification Link */}
            <div className="mt-4 p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                Public developer credentials verified for web indexes and academic research.
              </span>
              <span className="font-mono text-primary-600 dark:text-primary-400 flex items-center gap-2">
                <a href="/humans.txt" target="_blank" rel="noopener noreferrer" className="hover:underline">humans.txt</a>
                <span>•</span>
                <a href="/developers.json" target="_blank" rel="noopener noreferrer" className="hover:underline">developers.json</a>
              </span>
            </div>
          </div>

          {/* Mission & What We Do */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-500 mb-4">
                <Target className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Our Mission</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                To democratize access to quality personalized education. Every student deserves an intelligent study companion that adapts to their unique learning pace, anytime and anywhere.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Key Features</h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Instant AI Summaries &amp; Key Concept Extraction
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Custom Quiz Creation with Explanations
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Collaborative Study Groups &amp; Peer Messaging
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-xs text-amber-400 font-extrabold uppercase tracking-widest">Get In Touch With The Creators</p>
              <h4 className="text-xl font-bold">Have feedback or suggestions?</h4>
              <p className="text-xs text-slate-300">We continuously improve SJ Tutor AI based on student and educator feedback.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <a 
                href="mailto:sadanandj2011@gmail.com" 
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Mail className="w-4 h-4 text-amber-600" />
                sadanandj2011@gmail.com
              </a>
              <a 
                href="tel:+918105423488" 
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                +91 8105423488
              </a>
            </div>
          </div>

        </div>

        {/* Footer Bar */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            © {new Date().getFullYear()} SJ Tutor AI. Innovated by <strong className="text-slate-800 dark:text-white">Sadanand Jyoti</strong> &amp; <strong className="text-slate-800 dark:text-white">Samanyu S Patil</strong>.
          </div>
          <div className="flex items-center gap-4 font-semibold">
            <button 
              onClick={() => { onClose(); onNavigateToLegal?.('PRIVACY'); }}
              className="hover:text-primary-600 transition cursor-pointer"
            >
              Privacy
            </button>
            <button 
              onClick={() => { onClose(); onNavigateToLegal?.('TERMS'); }}
              className="hover:text-primary-600 transition cursor-pointer"
            >
              Terms
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
