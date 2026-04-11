import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  FileText, 
  BrainCircuit, 
  MessageCircle, 
  Calendar, 
  Languages, 
  CheckCircle2, 
  Users, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import Logo from './Logo';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="bg-white dark:bg-slate-900 overflow-hidden">
      {/* 1. Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24">
        {/* Background blobs for depth */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary-100/50 dark:bg-primary-900/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-96 h-96 bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 rounded-full text-primary-700 dark:text-primary-400 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-3.5 h-3.5" />
            SJ Tutor AI
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Learn Smarter and <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-amber-500">Finish Homework Faster</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Your friendly AI study buddy that helps you understand every subject easily and prepares you for your exams.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary-500/20 transition-all hover:-translate-y-1 flex items-center gap-2 group"
            >
              Start Learning for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-sm text-slate-400 font-medium">No credit card required</p>
          </div>
        </div>
      </section>

      {/* 2. About Section */}
      <section className="py-20 bg-slate-50/50 dark:bg-slate-800/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">What is SJ Tutor AI?</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            SJ Tutor AI is an intelligent study assistant built specifically for school students. It acts like a private teacher that is available to you at any time. Whether you are stuck on a difficult math problem or need a short summary for a long history chapter, SJ Tutor AI makes learning simple and stress-free.
          </p>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Smart Features for Smart Students</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Everything you need to excel in your academics, all in one place.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: "Summary Generator", desc: "Turn long textbook chapters into short, easy-to-read notes in seconds.", color: "bg-blue-50 text-blue-600" },
              { icon: BrainCircuit, title: "Quick Quiz Creator", desc: "Practice for your upcoming tests with custom quizzes that challenge your knowledge.", color: "bg-emerald-50 text-emerald-600" },
              { icon: BookOpen, title: "Essay Writer", desc: "Get help organizing your thoughts and writing better essays with clear structure.", color: "bg-purple-50 text-purple-600" },
              { icon: MessageCircle, title: "24/7 AI Tutor", desc: "Ask any question about your studies and get an instant, simple explanation.", color: "bg-amber-50 text-amber-600" },
              { icon: Calendar, title: "Personal Study Planner", desc: "Create a study timetable that helps you stay organized and finish your syllabus on time.", color: "bg-rose-50 text-rose-600" },
              { icon: Languages, title: "Multi-Language Support", desc: "Get study help and explanations in the language you understand best.", color: "bg-indigo-50 text-indigo-600" }
            ].map((f, i) => (
              <div key={i} className="p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works */}
      <section className="py-24 bg-slate-50/50 dark:bg-slate-800/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Simple Steps to Success</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Pick a Subject", desc: "Choose the subject and the class you are currently studying." },
              { step: "02", title: "Enter Your Topic", desc: "Type in the name of the chapter or the specific question you have." },
              { step: "03", title: "Generate Results", desc: "Click a button to get an instant summary, a practice quiz, or an essay." },
              { step: "04", title: "Study and Master", desc: "Use the AI-generated materials to learn the topic and ace your exams." }
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-black text-slate-100 dark:text-slate-800 absolute -top-4 -left-2 z-0">{s.step}</div>
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Who Can Use This App */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Who Can Use This App</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Students", desc: "Use it to clear doubts, finish homework, and study effectively for school tests.", icon: BookOpen },
              { title: "Teachers", desc: "Use it to quickly create quizzes, lesson summaries, and extra reading material for the classroom.", icon: Users },
              { title: "Parents", desc: "Use it to support your child's learning journey and help them understand difficult concepts at home.", icon: ShieldCheck }
            ].map((u, i) => (
              <div key={i} className="text-center p-8">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/20 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <u.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{u.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Why Choose SJ Tutor AI */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8">Why Choose SJ Tutor AI?</h2>
              <p className="text-slate-400 mb-8">The best way to study in the modern age.</p>
              
              <ul className="space-y-4">
                {[
                  "We use very simple English that is easy for every student to follow.",
                  "We provide step-by-step solutions just like a real teacher in a classroom.",
                  "The app is completely safe and focused strictly on school education.",
                  "It saves you hours of time by picking out the most important parts of a chapter.",
                  "It helps you build confidence and makes difficult subjects feel easy."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/10 blur-3xl rounded-full"></div>
              <div className="relative bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-2xl">
                 <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">SJ</div>
                   <div>
                     <p className="font-bold">SJ Tutor AI</p>
                     <p className="text-xs text-slate-500 uppercase tracking-widest">Active Assistant</p>
                   </div>
                 </div>
                 <div className="space-y-4">
                    <div className="p-3 bg-slate-900/50 rounded-lg text-sm text-slate-300">
                      Hi! How can I help with your studies today?
                    </div>
                    <div className="p-3 bg-primary-600 rounded-lg text-sm text-white ml-8">
                      Can you explain the Water Cycle simply?
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-lg text-sm text-slate-300">
                      Of course! Think of it like a giant recycling system for Earth's water...
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Call to Action */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">Ready to Become a Top Student?</h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
            Join thousands of students who are making their studies easier and getting better grades every day.
          </p>
          <button 
            onClick={onGetStarted}
            className="px-10 py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-primary-500/30 transition-all hover:-translate-y-1"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-12 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" iconOnly />
            <span className="font-bold text-slate-900 dark:text-white">SJ Tutor AI</span>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">Copyright 2026 SJ Tutor AI. All rights reserved.</p>
            <p className="text-xs text-primary-600 font-bold uppercase tracking-widest mt-1">Your smart path to better grades and easier learning.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;