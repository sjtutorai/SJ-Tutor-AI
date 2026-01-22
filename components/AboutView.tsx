
import React from 'react';
import { Target, Bot, Users, Sprout, Lock, Mail, Phone } from 'lucide-react';
import Logo from './Logo';

const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
           <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-primary-100 dark:border-primary-900/30 shadow-xl overflow-hidden">
              <Logo className="w-full h-full" iconOnly />
           </div>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 dark:text-white tracking-tight">SJ Tutor AI</h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-sm">Founded by Sadanand Jyoti</p>
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
          SJ Tutor AI is an AI-powered learning platform created to help students learn smarter, understand concepts better, and study with confidence.
        </p>
      </div>

      {/* Mission */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
           <Target className="w-32 h-32" />
        </div>
        <div className="relative z-10">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500">
                 <Target className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Our Mission</h2>
           </div>
           <p className="text-slate-600 dark:text-slate-300 mb-6 text-lg">
             Our mission is to make quality learning accessible, simple, and personalized for every student using AI technology.
           </p>
           <div className="grid sm:grid-cols-3 gap-4">
             <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-white mb-1">Simple</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Learning should be easy to understand</p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-white mb-1">Confident</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Students should feel confident asking questions</p>
             </div>
             <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-white mb-1">Supportive</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Technology should support teachers, not replace them</p>
             </div>
           </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
         {/* What We Do */}
         <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500">
                 <Bot className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">What SJ Tutor AI Does</h2>
            </div>
            <ul className="space-y-3">
               {[
                 "Explaining topics in simple language",
                 "Answering study-related questions",
                 "Adapting to different learning levels",
                 "Supporting multiple subjects",
                 "Saving learning preferences for better help"
               ].map((item, idx) => (
                 <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    {item}
                 </li>
               ))}
            </ul>
         </div>

         {/* Who Can Use */}
         <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-500">
                 <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Who Can Use It</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 h-full content-start">
               {["School students", "College students", "Self-learners", "Anyone looking for academic support"].map((item, idx) => (
                 <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-center font-medium text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 flex items-center justify-center min-h-[60px]">
                    {item}
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Values */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-500">
               <Sprout className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Our Values</h2>
         </div>
         <div className="flex flex-wrap gap-3">
            {["Student-first approach", "Privacy & safety", "Honest learning (no cheating)", "Continuous improvement", "Responsible AI usage"].map((val, idx) => (
               <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{val}</span>
               </div>
            ))}
         </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
         {/* Privacy */}
         <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
                 <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Privacy Promise</h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6 flex-1">We respect user privacy above all else.</p>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
               <li className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Lock className="w-4 h-4 text-emerald-500" /> 
                  Your data stays under your control
               </li>
               <li className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Lock className="w-4 h-4 text-emerald-500" /> 
                  No selling of personal data
               </li>
               <li className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <Lock className="w-4 h-4 text-emerald-500" /> 
                  Clear privacy and security settings
               </li>
            </ul>
         </div>

         {/* Contact */}
         <div className="bg-gradient-to-br from-primary-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 border border-primary-100 dark:border-slate-700 shadow-sm flex flex-col justify-center text-center">
            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-primary-600 border border-primary-50 dark:border-slate-700">
               <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Contact Us</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Questions, feedback, or suggestions? We'd love to hear from you.</p>
            <div className="space-y-3 w-full max-w-xs mx-auto">
               <a href="mailto:sadanandj2011@gmail.com" className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 text-primary-600 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm hover:shadow text-sm">
                  <Mail className="w-4 h-4" />
                  sadanandj2011@gmail.com
               </a>
               <a href="tel:+918105423488" className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm hover:shadow text-sm">
                  <Phone className="w-4 h-4" />
                  +91 8105423488
               </a>
               <p className="text-xs text-slate-400">Or check Settings → Help & Support</p>
            </div>
         </div>
      </div>

      <div className="text-center pt-8 pb-4 border-t border-slate-100 dark:border-slate-800">
         <p className="text-slate-500 dark:text-slate-400 italic font-medium">
           "SJ Tutor AI is built to support your learning journey — one question at a time."
         </p>
      </div>
    </div>
  );
};

export default AboutView;
