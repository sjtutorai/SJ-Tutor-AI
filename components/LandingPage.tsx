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
  Camera as CameraIcon,
  Users, 
  ArrowRight,
  ShieldCheck,
  Target,
  Zap,
  Shield,
  Mail,
  Phone,
  Globe,
  Menu,
  X
} from 'lucide-react';
import Logo from './Logo';

interface LandingPageProps {
  onGetStarted: () => void;
  countryCode?: string | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, countryCode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-slate-100 min-h-screen">
      
      {/* Sticky High-Res Professional Header */}
      <nav id="header-nav" className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo className="w-10 h-10" iconOnly />
            <div className="flex flex-col select-none">
              <span className="font-extrabold text-xl tracking-tight text-slate-800 dark:text-white">SJ Tutor <span className="text-primary-600">AI</span></span>
              <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Your Study Buddy</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Home</button>
            <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">How It Works</button>
            <button onClick={() => scrollToSection('about')} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">About Us</button>
            <button onClick={() => scrollToSection('mission')} className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer">Our Mission</button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={onGetStarted}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm tracking-wide shadow-sm hover:shadow transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              Sign In / Get Started
            </button>
          </div>

          {/* Mobile Menu Action */}
          <button className="md:hidden p-2 text-slate-700 dark:text-slate-300 cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-xl flex flex-col animate-in slide-in-from-top duration-300">
            <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-left py-2 font-semibold text-slate-600 dark:text-slate-300">Home</button>
            <button onClick={() => scrollToSection('features')} className="text-left py-2 font-semibold text-slate-600 dark:text-slate-300">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-left py-2 font-semibold text-slate-600 dark:text-slate-300">How It Works</button>
            <button onClick={() => scrollToSection('about')} className="text-left py-2 font-semibold text-slate-600 dark:text-slate-300">About Us</button>
            <button onClick={() => scrollToSection('mission')} className="text-left py-2 font-semibold text-slate-600 dark:text-slate-300">Our Mission</button>
            <button onClick={onGetStarted} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-center">Get Started Free</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-28 md:pb-24">
        {/* Background decorative fields */}
        <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-96 h-96 bg-primary-100/40 dark:bg-primary-900/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-96 h-96 bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          
          {/* SJ Tutor badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-150 dark:border-primary-800 rounded-full text-primary-750 dark:text-primary-400 text-xs font-extrabold uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            SJ Tutor AI Academic Portal
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
            Learn Smarter & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-amber-500">Master Homework Instantly</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Your custom-paced interactive academic buddy. Solve tasks, generate detailed chapter summaries, build custom test cards, and accelerate your confidence.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary-500/25 transition-all hover:-translate-y-1 flex items-center gap-2 group cursor-pointer"
            >
              Start Learning for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wide">No Card Required</p>
          </div>

          {/* Verified Google Integration Banner */}
          <div className="mt-14 inline-flex items-center gap-2.5 px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm text-slate-600 dark:text-slate-300">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-xs font-bold tracking-wide uppercase">Empowered by official Google Gemini AI</span>
          </div>

        </div>
      </section>

      {/* Features Platform Grid */}
      <section id="features" className="py-24 bg-slate-50 dark:bg-slate-800/30 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-bold text-xs uppercase tracking-widest">Platform Core</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 mb-4">
              Smart Features for {countryCode === 'IN' ? 'Indian Students' : 'Global Scholars'}
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm">
              {countryCode === 'IN' 
                ? 'Tailored custom models supporting CBSE, Board Exams, and NCERT curriculums natively.' 
                : 'Rigorous tools optimized for personalized learning metrics and syllabus preparation.'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: "Instant Summaries", desc: "Convert long chapters into elegant, digestible, easy-to-read cards in seconds.", color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" },
              { icon: BrainCircuit, title: "Quiz Creators", desc: "Build challenge cards customized around your notes or chapters for test prep.", color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" },
              { icon: CameraIcon, title: "Homework Solvers", desc: "Provide detailed solutions instantly by snapping images or typing complex concepts.", color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" },
              { icon: MessageCircle, title: "24/7 Scholar Tutor", desc: "Engage in friendly academic conversations to clear concepts completely.", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" },
              { icon: Calendar, title: "Personal Planners", desc: "Keep track of active schedules, school sessions, and daily streaks easily.", color: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" },
              { icon: Languages, title: "Multi-Language Support", desc: "Receive native explanations instantly in the language you are comfortable in.", color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" }
            ].map((f, i) => (
              <div key={i} className="p-8 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-amber-500 font-bold text-xs uppercase tracking-widest">Workflow</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 mb-2">Academic Success Blueprint</h2>
            <p className="text-slate-500 text-sm">Four simple steps to absolute conceptual mastery.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Select Subject", desc: "Choose your active class syllabus and the subject you are working on." },
              { step: "02", title: "Submit Material", desc: "Upload a snapshot of your notebook or enter a simple concept query." },
              { step: "03", title: "Process Instantly", desc: "Generate bullet-proof summary guidelines or challenge questions automatically." },
              { step: "04", title: "Download & Share", desc: "Engage with your verified student profile and save shared public links." }
            ].map((s, i) => (
              <div key={i} className="relative p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="text-4xl font-black text-slate-200 dark:text-slate-700 absolute top-4 right-4 leading-none select-none">{s.step}</div>
                <div className="relative pr-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrated Elegant "About Us" & Founder Section */}
      <section id="about" className="py-24 bg-slate-50 dark:bg-slate-800/30 border-t border-b border-slate-100 dark:border-slate-800 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-primary-600 font-bold text-xs uppercase tracking-widest">Our Story & Core Profile</span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mt-1 mb-4">About Us & Inspiration</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              SJ Tutor AI is a secure learning ecosystem built to democratize customized educational support. We combine state-of-the-art parameters with verified pedagogy to make concepts accessible to everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Value Card: Mission */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-700 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center text-red-500 mb-6 font-bold">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Our Core Goal</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Provide secure academic support cards to everyone. We believe every child deserves access to customized guides that conform to their precise learning style.
              </p>
            </div>

            {/* Value Card: Values */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-700 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center text-blue-500 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Safe Learning</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                SJ Tutor AI promotes actual study comprehension and real knowledge construction. We offer steps and insights that help students discover solutions themselves rather than utilizing easy hacks.
              </p>
            </div>

            {/* Privacy Promise */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-700 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/30 rounded-2xl flex items-center justify-center text-purple-400 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Your Privacy Promise</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                All records uploaded are completely encrypted and locked off. Your student coordinates are fully yours, and you retain control to purge databases instantly.
              </p>
            </div>

          </div>

          {/* Founder Profile Details Board */}
          <div id="mission" className="mt-16 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Globe className="w-64 h-64" />
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-wider mb-6 border border-white/10 text-amber-400">
                  <Mail className="w-3.5 h-3.5" /> Founder & Institutional Directives
                </div>
                <h3 className="text-3xl font-extrabold mb-4">Message from the Founder</h3>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  &quot;Our platform is dedicated to simplifying learning and helping students master complex subjects on their own terms. If you have any inquiries, proposals, or direct suggestions, please reach out to us. We read every message carefully.&quot;
                </p>
                
                <div>
                  <p className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest leading-none mb-1">FOUNDER</p>
                  <p className="text-xl font-black">Sadanand Jyoti</p>
                  <p className="text-xs text-slate-500 font-bold">SJ Tutor AI Circle</p>
                </div>
              </div>

              {/* Founder Contact Links */}
              <div className="space-y-4">
                <a href="mailto:sadanandj2011@gmail.com" className="flex items-center gap-4 p-5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group backdrop-blur-sm cursor-pointer">
                  <div className="w-11 h-11 rounded-xl bg-white text-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Mail className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Email Direct Line</p>
                    <p className="font-mono text-sm break-all text-slate-200">sadanandj2011@gmail.com</p>
                  </div>
                </a>

                <a href="tel:+918105423488" className="flex items-center gap-4 p-5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 group backdrop-blur-sm cursor-pointer">
                  <div className="w-11 h-11 rounded-xl bg-white text-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Phone className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Founder Primary Phone</p>
                    <p className="font-mono text-sm text-slate-200">+91 8105423488</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Target Audiences */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-bold text-xs uppercase tracking-widest">Support Circle</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mt-1 mb-2">Designed for the Entire Circle</h2>
            <p className="text-slate-500 text-sm">Empowering partners in the academic growth journey.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Students", desc: "Clear complex concepts, solve tough Homework, and prepare effectively for school tests.", icon: BookOpen },
              { title: "Teachers", desc: "Create rich homework quiz lists, simplified chapter outlines, and extra-curricular files.", icon: Users },
              { title: "Parents", desc: "A reliable academic companion that tracks growth patterns and strengthens active metrics.", icon: ShieldCheck }
            ].map((u, i) => (
              <div key={i} className="text-center p-8 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/20 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <u.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{u.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose SJ Tutor AI */}
      <section className="py-24 bg-slate-950 text-white relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-amber-500 font-bold text-xs uppercase tracking-widest">Aesthetic Craft</span>
              <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">Why Choose SJ Tutor AI?</h2>
              <p className="text-slate-400 mb-8 max-w-sm">Elevate your baseline. Build regular daily streaking, save study credits, and simplify long textbooks.</p>
              
              <ul className="space-y-4">
                {[
                  "Clear, friendly language matched to individual class grades.",
                  "Step-by-step descriptive guides that mimic classroom instruction.",
                  "Zero distracting logs, telemetry, or third-party ads.",
                  "Unlocks certified Student Identity ID passports containing individual QR codes.",
                  "Build progress memory to generate tailored study lists over time."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
                    <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/10 blur-3xl rounded-full pointer-events-none"></div>
              <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
                 <div className="flex items-center gap-4 mb-6">
                   <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center text-white font-extrabold select-none">SJ</div>
                   <div>
                     <p className="font-extrabold tracking-tight">SJ Tutor Academic Companion</p>
                     <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black">AI Study Terminal Activated</p>
                   </div>
                 </div>
                 <div className="space-y-4">
                    <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300">
                      Hi there! Which topic or science concept are we analyzing together today?
                    </div>
                    <div className="p-3 bg-primary-600 rounded-xl text-xs text-white ml-8">
                      Could you summarize Newton&apos;s First Law of Motion with examples?
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl text-xs text-slate-300 leading-normal">
                      Absolutely! Think of it like a lazy book sitting still on your desk. It won&apos;t move a single inch unless you push it...
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Callout */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-6">Ready to Master Your Exams?</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
          Create questions, generate key summary lists, and build your certified scholar identity. Get started today.
        </p>
        <button 
          onClick={onGetStarted}
          className="px-10 py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-xl shadow-2xl shadow-primary-500/25 transition-all hover:-translate-y-1 hover:shadow-primary-550 cursor-pointer"
        >
          Initialize Academy Passport
        </button>
      </section>

      {/* Modern High-Craft Footer */}
      <footer className="py-16 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo className="w-10 h-10" iconOnly />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white leading-none">SJ Tutor AI</span>
              <span className="text-[8px] uppercase tracking-widest font-black text-slate-400 mt-1">Authorized Academic System</span>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">© {new Date().getFullYear()} SJ Tutor AI Circle. All rights reserved.</p>
            <p className="text-xs text-primary-600 font-bold uppercase tracking-widest mt-1.5 flex items-center justify-center md:justify-end gap-1.5">
              <span>Securely powered by Google Cloud & Gemini</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
