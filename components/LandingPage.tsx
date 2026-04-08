import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  FileText, 
  BrainCircuit, 
  MessageCircle, 
  Calendar, 
  CheckCircle2, 
  Users, 
  ArrowRight,
  ShieldCheck,
  Star,
  GraduationCap,
  Zap,
  Clock,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import Logo from './Logo';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 overflow-x-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[600px] h-[600px] bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[500px] h-[500px] bg-purple-100/40 dark:bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="text-left"
            >
              <motion.div 
                variants={itemVariants}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-full text-blue-700 dark:text-blue-400 text-sm font-semibold mb-8"
              >
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>The Future of Learning is Here</span>
              </motion.div>
              
              <motion.h1 
                variants={itemVariants}
                className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 leading-[1.1] tracking-tight font-display"
              >
                Master Your Studies with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">SJ Tutor AI</span>
              </motion.h1>
              
              <motion.p 
                variants={itemVariants}
                className="text-xl text-slate-600 dark:text-slate-400 max-w-xl mb-10 leading-relaxed"
              >
                The ultimate AI study companion for students in Classes 6-10. Get instant summaries, practice quizzes, and expert tutoring 24/7.
              </motion.p>
              
              <motion.div 
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center gap-4"
              >
                <button 
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group"
                >
                  Start Learning Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Free to get started
                </div>
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="mt-12 flex items-center gap-4"
              >
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-950 bg-slate-200 overflow-hidden">
                      <img 
                        src={`https://picsum.photos/seed/student${i}/100/100`} 
                        alt="Student" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-amber-500 mb-0.5">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">Trusted by 10,000+ students & parents</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10 bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800">
                <img 
                  src="https://picsum.photos/seed/education/800/600" 
                  alt="SJ Tutor AI Dashboard" 
                  className="rounded-[2rem] w-full h-auto shadow-inner"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating UI elements */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-6 -right-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quiz Score</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white">95% Mastery</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-8 -left-8 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Tutor</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">&quot;Great job on Chapter 4!&quot;</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Features / Benefits */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-blue-600 font-bold uppercase tracking-[0.2em] text-sm mb-4">Features</h2>
            <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 font-display">Designed for Modern Learning</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              We&apos;ve combined advanced AI with educational psychology to create tools that actually help you learn better.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: "Instant Summaries", desc: "Convert 20-page chapters into scannable notes in under 10 seconds.", color: "blue" },
              { icon: BrainCircuit, title: "Smart Quizzes", desc: "AI-generated practice tests that adapt to your specific learning gaps.", color: "purple" },
              { icon: BookOpen, title: "Essay Assistant", desc: "Structure your thoughts and write compelling essays with AI guidance.", color: "indigo" },
              { icon: MessageCircle, title: "24/7 AI Tutor", desc: "Get instant, simple explanations for any doubt, anytime, anywhere.", color: "pink" },
              { icon: Calendar, title: "Study Planner", desc: "Automated schedules that help you cover your entire syllabus efficiently.", color: "amber" },
              { icon: Globe, title: "Multilingual Support", desc: "Learn in your preferred language for better conceptual clarity.", color: "emerald" }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className={`w-14 h-14 bg-${f.color}-50 dark:bg-${f.color}-900/20 text-${f.color}-600 dark:text-${f.color}-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Courses Offered (6th–10th) */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-blue-600 font-bold uppercase tracking-[0.2em] text-sm mb-4">Curriculum</h2>
              <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white font-display">Courses for Every Grade</h3>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Comprehensive support for all major subjects from Class 6 to 10.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((grade, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.05 }}
                className="relative aspect-[4/5] bg-gradient-to-br from-blue-600 to-purple-700 rounded-[2rem] p-6 flex flex-col justify-between text-white overflow-hidden group cursor-pointer"
              >
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <GraduationCap className="w-10 h-10 opacity-50" />
                <div>
                  <h4 className="text-2xl font-black mb-1">{grade}</h4>
                  <p className="text-xs font-bold text-blue-100 uppercase tracking-widest">Full Syllabus</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 p-8 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] border border-blue-100 dark:border-blue-800 flex flex-wrap justify-center gap-8 md:gap-16">
            {['Mathematics', 'Science', 'Social Studies', 'English', 'Hindi', 'Computer Science'].map((subject, i) => (
              <div key={i} className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                {subject}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why Choose Us */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-blue-400 font-bold uppercase tracking-[0.2em] text-sm mb-6">Why SJ Tutor AI?</h2>
              <h3 className="text-3xl md:text-5xl font-black mb-8 leading-tight font-display">The Best Way to Study in the Digital Age</h3>
              
              <div className="space-y-8">
                {[
                  { icon: Zap, title: "Instant Results", desc: "No more waiting for tutors. Get help exactly when you need it." },
                  { icon: ShieldCheck, title: "Safe & Focused", desc: "A distraction-free environment dedicated strictly to school education." },
                  { icon: Clock, title: "Save 10+ Hours Weekly", desc: "Focus on understanding concepts rather than tedious note-taking." },
                  { icon: Users, title: "Personalized for You", desc: "The AI learns your style and adapts its explanations to your level." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                      <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-[3rem] border border-white/10 p-8 flex items-center justify-center">
                <div className="relative w-full max-w-sm">
                  <motion.div 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="bg-slate-800 border border-slate-700 p-6 rounded-3xl shadow-2xl"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">SJ</div>
                      <div>
                        <p className="font-bold text-sm">SJ Tutor AI</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Smart Assistant</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-900/50 rounded-2xl text-xs text-slate-300">
                        &quot;I&apos;ve summarized Chapter 5 for you. Would you like to take a quick quiz now?&quot;
                      </div>
                      <div className="p-3 bg-blue-600 rounded-2xl text-xs text-white ml-8">
                        &quot;Yes, please! Focus on the chemical reactions part.&quot;
                      </div>
                      <div className="p-3 bg-slate-900/50 rounded-2xl text-xs text-slate-300">
                        &quot;Great choice! Generating 5 questions on Chemical Reactions...&quot;
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Testimonials */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-blue-600 font-bold uppercase tracking-[0.2em] text-sm mb-4">Success Stories</h2>
            <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 font-display">Loved by Students & Parents</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Rahul Sharma", role: "Class 10 Student", text: "SJ Tutor AI helped me finish my Science syllabus 2 weeks before exams. The summaries are a lifesaver!", avatar: "1" },
              { name: "Mrs. Priya Patel", role: "Parent", text: "My daughter's confidence in Math has improved significantly. She loves the interactive AI tutor sessions.", avatar: "2" },
              { name: "Ananya Gupta", role: "Class 8 Student", text: "The quiz feature is so fun! It feels like playing a game while I'm actually studying for school.", avatar: "3" }
            ].map((t, i) => (
              <div key={i} className="p-8 bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm relative">
                <div className="flex items-center gap-1 text-amber-500 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-slate-600 dark:text-slate-400 italic mb-8 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                    <img 
                      src={`https://picsum.photos/seed/user${t.avatar}/100/100`} 
                      alt={t.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-500 font-medium">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Call to Action */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-[100px]"></div>
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-300 rounded-full blur-[100px]"></div>
            </div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight font-display">Ready to Ace Your Exams?</h2>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-12 leading-relaxed">
                Join thousands of students who are already learning faster and smarter with SJ Tutor AI.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                  onClick={onGetStarted}
                  className="w-full sm:w-auto px-10 py-5 bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-bold text-xl shadow-xl transition-all hover:-translate-y-1"
                >
                  Get Started for Free
                </button>
                <p className="text-blue-100 font-medium">No credit card required</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="py-20 border-t border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Logo className="w-10 h-10" iconOnly />
                <span className="font-black text-2xl text-slate-900 dark:text-white tracking-tight">SJ Tutor AI</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Empowering students with AI-driven educational tools to make learning accessible, engaging, and effective for everyone.
              </p>
            </div>
            
            <div>
              <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-xs">Quick Links</h5>
              <ul className="space-y-4 text-slate-500 dark:text-slate-400 font-medium">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Home</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">About Us</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-xs">Legal</h5>
              <ul className="space-y-4 text-slate-500 dark:text-slate-400 font-medium">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">© 2026 SJ Tutor AI. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors"><Globe className="w-5 h-5" /></a>
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors"><Users className="w-5 h-5" /></a>
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors"><ShieldCheck className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
