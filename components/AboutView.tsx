
import React from 'react';
import { Target, Zap, Shield, Heart, Mail, Phone, Globe, Lock } from 'lucide-react';
import Logo from './Logo';

const AboutView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-16 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-8 pb-4">
        <div className="flex justify-center mb-6">
           <div className="relative">
             <div className="absolute inset-0 bg-primary-200 blur-2xl opacity-20 rounded-full"></div>
             <div className="w-28 h-28 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden relative z-10">
                <Logo className="w-full h-full" iconOnly />
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
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Generate instant summaries & essays
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
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                 <p className="font-bold text-slate-800 dark:text-white text-sm mb-1">Student First</p>
                 <p className="text-xs text-slate-500">Every feature is designed to improve learning outcomes.</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                 <p className="font-bold text-slate-800 dark:text-white text-sm mb-1">Integrity</p>
                 <p className="text-xs text-slate-500">Promoting honest learning, not shortcuts.</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                 <p className="font-bold text-slate-800 dark:text-white text-sm mb-1">Innovation</p>
                 <p className="text-xs text-slate-500">Constantly evolving with new AI capabilities.</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
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
              <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                 <Lock className="w-4 h-4 text-emerald-500" />
                 <span>Data is encrypted and securely stored.</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                 <Lock className="w-4 h-4 text-emerald-500" />
                 <span>We never sell personal information to advertisers.</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
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
               <h2 className="text-3xl font-bold mb-4">We'd love to hear from you</h2>
               <p className="text-slate-300 mb-8 leading-relaxed">
                  Have a suggestion, found a bug, or just want to say hi? 
                  We are constantly improving and your feedback shapes the future of SJ Tutor AI.
               </p>
               
               <div className="space-y-4">
                  <div>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Founder</p>
                     <p className="text-xl font-semibold">Sadanand Jyoti</p>
                  </div>
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
      
      <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
         <p className="text-slate-400 text-sm">© {new Date().getFullYear()} SJ Tutor AI. All rights reserved.</p>
      </div>
    </div>
  );
};

export default AboutView;
