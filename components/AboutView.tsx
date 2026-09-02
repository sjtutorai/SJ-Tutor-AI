
import React from 'react';
import { Target, Zap, Shield, Heart, Mail, Phone, Globe, Lock, Lightbulb, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import Logo from './Logo';

interface AboutViewProps {
  onNavigateToLegal?: (mode: 'PRIVACY' | 'TERMS') => void;
}

const AboutView: React.FC<AboutViewProps> = ({ onNavigateToLegal }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-8 pb-4">
        <div className="flex justify-center mb-6">
           <div className="relative">
             <div className="absolute inset-0 bg-primary-200 blur-2xl opacity-20 rounded-full"></div>
             <div className="w-28 h-28 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden relative z-10">
                <Logo className="w-full h-full" iconOnly noBorder />
             </div>
           </div>
        </div>
        
        <div className="space-y-2">
           <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white tracking-tight">
             SJ Tutor <span className="text-primary-600">AI</span>
           </h1>
           <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Empowering Students with Intelligent Learning</p>
        </div>

        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
          An all-in-one AI study companion designed to simplify complex concepts, generate study materials, and provide 24/7 academic support.
        </p>
      </div>

      {/* Innovators, Inventors & Public Developer Information */}
      <div className="bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-blue-500/10 dark:from-amber-500/20 dark:via-primary-500/20 dark:to-blue-500/20 rounded-3xl p-8 border border-amber-500/20 dark:border-amber-500/30 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                Public Developer &amp; Founder Information
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Official verified creators &amp; engineers behind SJ Tutor AI</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full w-fit">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Publicly Listed &amp; Verified
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Innovator 1 */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                SJ
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider mb-1">
                  <Award className="w-3 h-3" /> Founder &amp; Lead Architect
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sadanand Jyoti</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Visionary architect behind SJ Tutor AI&apos;s intelligent learning frameworks, adaptive tutoring models, and personalized student study workflows.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-mono text-amber-600 dark:text-amber-400">
                <Mail className="w-3.5 h-3.5" /> sadanandj2011@gmail.com
              </span>
              <span>India</span>
            </div>
          </div>

          {/* Innovator 2 */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                SP
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider mb-1">
                  <Award className="w-3 h-3" /> Co-Developer &amp; Systems Engineer
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Samanyu S Patil</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Co-developer pioneering smart learning algorithms, automated study aids, and interactive student success tools.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400">
                <Mail className="w-3.5 h-3.5" /> sjtutorai@gmail.com
              </span>
              <span>India</span>
            </div>
          </div>
        </div>

        {/* Machine readable transparency link */}
        <div className="mt-6 p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-500 shrink-0" />
            <span>Public developer credentials verified for web indexes and academic research.</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-primary-600 dark:text-primary-400">
            <a href="/humans.txt" target="_blank" rel="noopener noreferrer" className="hover:underline">humans.txt</a>
            <span>•</span>
            <a href="/developers.json" target="_blank" rel="noopener noreferrer" className="hover:underline">developers.json</a>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Mission Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group">
           <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-500 mb-6 group-hover:scale-110 transition-transform">
              <Target className="w-6 h-6" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Our Mission</h2>
           <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
             To democratize access to quality personalized education. We believe every student deserves a tutor that understands their learning style and pace, available whenever inspiration strikes.
           </p>
        </div>

        {/* What We Do Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group">
           <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">What We Do</h2>
           <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
             We combine advanced AI with proven pedagogical methods to create tools that help students:
           </p>
           <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Generate instant summaries &amp; essays
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Create practice quizzes from any topic
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Get personalized answers to doubts
              </li>
           </ul>
        </div>

        {/* Values Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group md:col-span-2 lg:col-span-1">
           <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Our Core Values</h2>
           <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                 <p className="font-bold text-slate-800 dark:text-white text-sm mb-1">Student First</p>
                 <p className="text-xs text-slate-500">Every feature is designed to improve learning outcomes.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                 <p className="font-bold text-slate-800 dark:text-white text-sm mb-1">Integrity</p>
                 <p className="text-xs text-slate-500">Promoting honest learning, not shortcuts.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                 <p className="font-bold text-slate-800 dark:text-white text-sm mb-1">Innovation</p>
                 <p className="text-xs text-slate-500">Constantly evolving with new AI capabilities.</p>
              </div>
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                 <p className="font-bold text-slate-800 dark:text-white text-sm mb-1">Accessibility</p>
                 <p className="text-xs text-slate-500">Quality education should be available to all.</p>
              </div>
           </div>
        </div>

        {/* Privacy Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group md:col-span-2 lg:col-span-1">
           <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Privacy Promise</h2>
           <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
             We understand that students (and parents) care about data privacy. We are committed to:
           </p>
           <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2 bg-white dark:bg-slate-900 rounded-lg">
                 <Lock className="w-4 h-4 text-emerald-500" />
                 <span>Data is encrypted and securely stored.</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2 bg-white dark:bg-slate-900 rounded-lg">
                 <Lock className="w-4 h-4 text-emerald-500" />
                 <span>We never sell personal information to advertisers.</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2 bg-white dark:bg-slate-900 rounded-lg">
                 <Lock className="w-4 h-4 text-emerald-500" />
                 <span>You have full control to delete your data anytime.</span>
              </li>
           </ul>
        </div>

      </div>

      {/* Contact Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Globe className="w-64 h-64" />
         </div>

         <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm border border-white/10">
                  <Mail className="w-3 h-3" /> Get in touch
               </div>
               <h2 className="text-3xl font-bold mb-4">We&apos;d love to hear from you</h2>
               <p className="text-slate-300 mb-8 leading-relaxed">
                  Have a suggestion, found a bug, or just want to say hi? 
                  We are constantly improving and your feedback shapes the future of SJ Tutor AI.
               </p>
               
               <div className="space-y-3">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Innovators &amp; Inventors</p>
                  <p className="text-lg font-bold text-amber-400">Sadanand Jyoti <span className="text-white font-normal">&amp;</span> Samanyu S Patil</p>
               </div>
            </div>

            <div className="space-y-4">
               <a href="mailto:sadanandj2011@gmail.com" className="flex items-center gap-4 p-5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5 group backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Mail className="w-5 h-5" />
                  </div>
                  <div>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-0.5">Email Us</p>
                     <p className="font-mono text-lg break-all">sadanandj2011@gmail.com</p>
                  </div>
               </a>

               <a href="tel:+918105423488" className="flex items-center gap-4 p-5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5 group backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Phone className="w-5 h-5" />
                  </div>
                  <div>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-0.5">Call Us</p>
                     <p className="font-mono text-lg">+91 8105423488</p>
                  </div>
               </a>
            </div>
         </div>
      </div>
      
      <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
         <div className="flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            <button 
              onClick={() => onNavigateToLegal?.('PRIVACY')}
              className="hover:text-primary-600 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => onNavigateToLegal?.('TERMS')}
              className="hover:text-primary-600 transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
         </div>
         <p className="text-slate-400 text-xs text-center leading-relaxed max-w-md">
            © {new Date().getFullYear()} SJ Tutor AI. Innovated by Sadanand Jyoti &amp; Samanyu S Patil. All rights reserved. <br/>
            Designed to empower students through intelligent AI-driven learning experiences.
         </p>
      </div>
    </div>
  );
};

export default AboutView;
