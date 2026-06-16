import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  BrainCircuit, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Zap,
  Check,
  Star,
  Award,
  ChevronRight,
  Play,
  RotateCcw,
  GraduationCap
} from 'lucide-react';
import Logo from './Logo';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onGetStarted: () => void;
  countryCode?: string | null;
}

// 1. High-Performance Particle Network Background
const TutorParticlesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      glow: boolean;
      pulseRate: number;
      pulseVal: number;
    }> = [];

    const mouse = { x: -1000, y: -1000 };

    const colors = [
      '#2563EB', // Primary: Electric Blue
      '#7C3AED', // Secondary: Purple
      '#06B6D4', // Accent: Cyan
    ];

    // Responsive particle count
    const particleCount = Math.min(80, Math.floor((width * height) / 15000));
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        glow: Math.random() > 0.75,
        pulseRate: Math.random() * 0.02 + 0.005,
        pulseVal: Math.random() * Math.PI,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.15)';
      ctx.lineWidth = 0.5;
      const gridSize = 100;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.14;
            ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Draw mouse lines
        const mdx = p1.x - mouse.x;
        const mdy = p1.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 160) {
          const mAlpha = (1 - mDist / 160) * 0.28;
          ctx.strokeStyle = `rgba(6, 182, 212, ${mAlpha})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();

          // Mouse attraction
          p1.vx += (mdx / mDist) * -0.007;
          p1.vy += (mdy / mDist) * -0.007;
        }

        // Move
        p1.x += p1.vx;
        p1.y += p1.vy;

        // Bounce
        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        // Pulse
        p1.pulseVal += p1.pulseRate;
        const radius = p1.radius + Math.sin(p1.pulseVal) * 0.5;

        // Render point
        ctx.fillStyle = p1.color;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (p1.glow) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = p1.color;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, radius * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

// 2. Animated Counter Component
const AnimatedCounter: React.FC<{ value: number; limitText: string; speed?: number }> = ({ value, limitText, speed = 40 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalDuration = 1800; // ms
    const increment = Math.ceil(end / (totalDuration / speed));
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [value, speed]);

  return (
    <span className="font-sans font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
      {count.toLocaleString()}{limitText}
    </span>
  );
};

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('Mathematics');
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);
  const [demoSelectedOption, setDemoSelectedOption] = useState<string | null>(null);
  const [demoShowCorrectFeedback, setDemoShowCorrectFeedback] = useState<boolean | null>(null);

  // Smooth scroll logic helper
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const subjectTabs = [
    { name: 'Mathematics', desc: 'Algebra, Geometry, Calculus, Trigonometry', color: 'from-cyan-500 to-blue-600', code: 'solve quadratic formulas with custom factoring' },
    { name: 'Physics', desc: 'Thermodynamics, Electromagnetism, Quantum theory', color: 'from-blue-500 to-indigo-600', code: 'derive Newton laws and frictional forces' },
    { name: 'Chemistry', desc: 'Organic compounds, stoichiometry, atomic bonds', color: 'from-indigo-500 to-violet-600', code: 'balance redox reactions with noble states' },
    { name: 'Biology', desc: 'Cell biology, genetics, ecology, cellular cycle', color: 'from-violet-500 to-purple-600', code: 'trace DNA transcription and RNA loops' },
    { name: 'Computer Science', desc: 'Algorithms, data structures, loops, functions', color: 'from-purple-500 to-pink-600', code: 'optimize binary trees and recursive counts' },
    { name: 'English', desc: 'Literature, logical analysis, essays, style', color: 'from-pink-500 to-rose-600', code: 'analyze syntax in Shakespearean works' },
    { name: 'History', desc: 'French Revolution, Industrialization, Civil movements', color: 'from-rose-500 to-amber-500', code: 'explain core triggers of major treaties' },
    { name: 'Economics', desc: 'Supply & demand, monetary rules, fiscal structures', color: 'from-amber-400 to-orange-600', code: 'calculate market equilibrium coordinates' }
  ];

  const testimonials = [
    {
      name: "Tanishq Mehta",
      school: "DPS RK Puram",
      improvement: "Physics went from 68% to 96%",
      achievement: "CBSE Topper Prep State Rank 14",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80",
      content: "SJ Tutor AI has completely simplified my Physics preparations. Whenever I am working late at night, I get instant step-by-step explanations for numerical questions. Simply unbelievable experience!"
    },
    {
      name: "Sophia Vance",
      school: "Leland High School",
      improvement: "Mastered AP Calculus in 3 weeks",
      achievement: "Perfect Score 5/5 on AP Calc Exam",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80",
      content: "Getting stuck on calculus was extremely stressful before this. Standard textbook answers did not explain the 'why'. Having SJ Tutor AI explain everything in plain English built my confidence entirely."
    },
    {
      name: "Arya Sen",
      school: "Vidya Mandir School",
      improvement: "Chemistry solved doubt rate is zero",
      achievement: "Chemistry Olympiad Qualifier",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80",
      content: "The custom mock tests and quizzes created by the platform are highly targeted. I saved so much tuition fee, and the learning maps are incredibly adaptive to my style."
    },
    {
      name: "Devon Richardson",
      school: "Eton International",
      improvement: "CS Project efficiency boosted 2.5x",
      achievement: "Completed full syllabus 2 months early",
      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80",
      content: "The homework assistant didn't just give answers, it generated code visualizers. My parents are extremely happy seeing me code and understand complex concepts so deeply."
    }
  ];

  const handleTestimonialNext = () => {
    setCurrentTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handleTestimonialPrev = () => {
    setCurrentTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleDemoOptionSelect = (option: string) => {
    setDemoSelectedOption(option);
    if (option === 'B') {
      setDemoShowCorrectFeedback(true);
    } else {
      setDemoShowCorrectFeedback(false);
    }
  };

  const handleDemoReset = () => {
    setDemoSelectedOption(null);
    setDemoShowCorrectFeedback(null);
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-[#F8FAFC] selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      {/* Cinematic Starfield Backdrop */}
      <TutorParticlesBackground />

      {/* 75% Dark layer for high readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/95 via-[#020617]/75 to-[#020617]/95 pointer-events-none z-0"></div>

      {/* Main Container */}
      <div className="relative z-10 w-full">
        
        {/* Floating Custom Header Navigation */}
        <header className="sticky top-0 w-full z-50 backdrop-blur-md bg-[#020617]/40 border-b border-slate-900 leading-none">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-10" />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer">Why Us</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer">How It Works</button>
              <button onClick={() => scrollToSection('interactive-demo')} className="text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer">Live Demo</button>
              <button onClick={() => scrollToSection('subjects')} className="text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer">Subjects</button>
              <button onClick={() => scrollToSection('pricing')} className="text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer">Plans</button>
            </nav>

            {/* Action Group */}
            <div className="flex items-center gap-4">
              <button 
                onClick={onGetStarted}
                className="px-4 py-2 text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button 
                onClick={onGetStarted}
                className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-white rounded-xl group bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 group-hover:from-blue-600 group-hover:to-cyan-500 hover:text-white focus:ring-4 focus:outline-none focus:ring-indigo-800 cursor-pointer shadow-indigo-500/20 shadow-lg"
              >
                <span className="relative px-4 py-2.5 transition-all ease-in duration-75 bg-[#020617] rounded-xl group-hover:bg-opacity-0 font-bold">
                  Start Learning Free
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* 1. HERO SECTION */}
        <section className="relative pt-8 pb-16 md:pt-20 md:pb-28">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Context details */}
            <div className="lg:col-span-6 space-y-8 text-left">
              {/* Premium Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-900/60 border border-indigo-500/30 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(124,58,237,0.1)] text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                🚀 Next Generation AI Learning Platform
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.1] tracking-tight">
                Your Personal <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
                  AI Tutor
                </span>
                ,<br />
                Available 24/7
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-xl">
                Master any subject with personalized AI-powered learning, instant explanations, adaptive practice, real-time feedback, and intelligent study guidance.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button 
                  onClick={onGetStarted}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl font-bold text-base shadow-xl shadow-indigo-600/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  Start Learning Free
                  <ArrowRight className="w-5 h-5 text-indigo-200" />
                </button>
                <button 
                  onClick={() => scrollToSection('interactive-demo')}
                  className="px-8 py-4 bg-[#0F172A]/70 hover:bg-[#0F172A]/90 border border-slate-800 rounded-2xl font-bold text-base text-[#F8FAFC] transition-all hover:border-slate-600 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
                  Watch Live Demo
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 border-t border-slate-900 grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((star) => (
                      <Star key={star} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs font-bold text-[#F8FAFC]">Rated by Students</p>
                </div>
                <div>
                  <h4 className="text-lg font-black text-blue-400">10,000+</h4>
                  <p className="text-xs text-[#94A3B8]">Active Learners</p>
                </div>
                <div>
                  <h4 className="text-lg font-black text-teal-400">95%</h4>
                  <p className="text-xs text-[#94A3B8]">Success Rate</p>
                </div>
              </div>
            </div>

            {/* Right Column: Premium Interactive Mockup Dashboard */}
            <div className="lg:col-span-6 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 blur-3xl opacity-60 rounded-full"></div>
              
              {/* Outer Glow container */}
              <div className="relative border border-slate-800/80 bg-[#0F172A]/70 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.12)] space-y-6">
                
                {/* Dashboard top segment */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-[#94A3B8] font-mono ml-2">student-dashboard_v2.0_live</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 rounded-lg text-xs font-bold tracking-wider uppercase">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                    SYNCED
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left inner side: Subject cards and Analytics */}
                  <div className="space-y-4">
                    {/* Progress Card */}
                    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-sm text-left relative group hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[#94A3B8]">Overall Completion</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h4 className="text-2xl font-black text-[#F8FAFC]">85.4%</h4>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-3">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[85%] rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">Daily Streak milestone reached: 14 Days</p>
                    </div>

                    {/* Performance Tracking Chart */}
                    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-left">
                      <h5 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider mb-3">Weekly Study Hours</h5>
                      <div className="flex items-end justify-between h-20 pt-4 px-2">
                        {[
                          { day: "M", height: "h-[30%]" },
                          { day: "T", height: "h-[50%]" },
                          { day: "W", height: "h-[75%]" },
                          { day: "T", height: "h-[45%]" },
                          { day: "F", height: "h-[90%]" },
                          { day: "S", height: "h-[65%]" },
                          { day: "S", height: "h-[85%]" }
                        ].map((bar, i) => (
                          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                            <div className="w-2.5 bg-indigo-500/35 rounded-t-sm h-full flex flex-col justify-end">
                              <div className={`w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-sm ${bar.height} transition-all duration-1000`}></div>
                            </div>
                            <span className="text-[9px] font-mono text-slate-600">{bar.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right inner side: Chat mockup with responsive interactive layout */}
                  <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 text-left flex flex-col justify-between h-full min-h-[220px]">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 text-[10px] font-bold text-white flex items-center justify-center">
                        SJ
                      </div>
                      <div>
                        <h6 className="text-[11px] font-bold text-white leading-none">SJ AI Tutor</h6>
                        <span className="text-[9px] text-[#94A3B8]">Active AI Expert</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2.5 overflow-hidden">
                      <div className="bg-slate-950/60 p-2.5 rounded-lg rounded-tl-none border border-slate-800 text-[11px] leading-relaxed text-[#94A3B8] max-w-[90%]">
                        Explain quadratic equations simply?
                      </div>
                      <div className="bg-blue-600/10 p-2.5 rounded-lg rounded-tr-none border border-blue-500/20 text-[11px] leading-relaxed text-[#F8FAFC] max-w-[95%] ml-auto text-left">
                        A quadratic is of the form <span className="font-mono font-bold text-cyan-300">ax² + bx + c = 0</span>. {"Let's"} find real roots!
                      </div>
                      <div className="p-2 bg-slate-950/40 rounded-lg text-[10px] text-slate-500 flex items-center gap-1.5 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full"></div>
                        Generating concept quiz cards...
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-[#94A3B8] border-t border-slate-800 pt-2 bg-slate-950/40 p-1.5 rounded-lg flex items-center justify-between">
                      <span>💡 Try Physics or Math!</span>
                      <span className="text-xs text-blue-400">✨ Click App</span>
                    </div>
                  </div>
                </div>

                {/* Floating Glassmorphic Overlay elements */}
                <div className="absolute -bottom-6 -right-6 md:-right-8 p-3 px-4 bg-slate-950/90 border border-indigo-500/40 shadow-xl rounded-2xl flex items-center gap-3 animate-bounce">
                  <div className="w-8 h-8 rounded-full bg-indigo-950 flex items-center justify-center border border-indigo-500/20">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="text-left leading-none">
                    <span className="text-[10px] text-slate-400 block font-semibold">Adaptive Mastery</span>
                    <span className="text-[11px] text-teal-400 font-bold font-mono">Streak: 12 Days (Unlocked)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. TRUSTED BY / STATS SECTION (With animated counters) */}
        <section className="relative py-16 border-y border-slate-950/80 bg-slate-950/40">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-[0.25em] mb-12">
              ACADEMIC STATISTICS & PERFORMANCE TRACKING
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center space-y-2 border-r border-slate-900 last:border-0">
                <p className="text-3xl md:text-5xl font-black">
                  <AnimatedCounter value={10000} limitText="+" />
                </p>
                <p className="text-xs md:text-sm text-[#94A3B8]">Students Learning</p>
              </div>

              <div className="text-center space-y-2 border-r border-slate-900 last:border-0 md:border-r">
                <p className="text-3xl md:text-5xl font-black">
                  <AnimatedCounter value={1000000} limitText="+" speed={30} />
                </p>
                <p className="text-xs md:text-sm text-[#94A3B8]">Questions Solved</p>
              </div>

              <div className="text-center space-y-2 border-r border-slate-900 last:border-0">
                <p className="text-3xl md:text-5xl font-black">
                  <AnimatedCounter value={95} limitText="%" />
                </p>
                <p className="text-xs md:text-sm text-[#94A3B8]">Success rate</p>
              </div>

              <div className="text-center space-y-2">
                <p className="text-3xl md:text-5xl font-black">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">24/7</span>
                </p>
                <p className="text-xs md:text-sm text-[#94A3B8]">AI Tutor Availability</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. FEATURES SECTION (Premium Glass cards with animated glowing borders) */}
        <section id="features" className="relative py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-4 mb-20">
              <span className="px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider rounded-full">
                UNMATCHED SAAS CAPABILITIES
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
                Why Students Choose SJ Tutor AI
              </h2>
              <p className="text-[#94A3B8] max-w-2xl mx-auto text-sm sm:text-base">
                Everything you need to excel in your school, college, and competitive exams, custom-built for modern active learners.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { 
                  icon: BookOpen, 
                  title: "AI Homework Assistance", 
                  desc: "Scan pictures of chemistry equations, geometry formulas, or coding puzzles. Get detailed explanatory guidance in seconds.",
                  color: "from-blue-600 to-cyan-400",
                  shadow: "shadow-blue-500/5"
                },
                { 
                  icon: BrainCircuit, 
                  title: "Personalized Learning Paths", 
                  desc: "The core engine adapts speed and explanation depth based on your past quiz performance, ensuring concepts stick with zero confusion.",
                  color: "from-purple-600 to-pink-500",
                  shadow: "shadow-purple-500/5"
                },
                { 
                  icon: MessageSquare, 
                  title: "Instant Doubt Resolution", 
                  desc: "No more waiting hours for private tutors. SJ Tutor AI breaks down any academic query 24 hours a day with complete logic.",
                  color: "from-indigo-600 to-blue-500",
                  shadow: "shadow-indigo-500/5"
                },
                { 
                  icon: Award, 
                  title: "Exam Preparation Tools", 
                  desc: "Practice with timed simulations, real board sample papers, high-stakes testing layouts, and detailed error revision reviews.",
                  color: "from-amber-500 to-orange-600",
                  shadow: "shadow-amber-500/5"
                },
                { 
                  icon: TrendingUp, 
                  title: "Performance Analytics", 
                  desc: "Track subject-wise completion, confidence indices, daily streaks, academic milestones, and areas needing immediate study reviews.",
                  color: "from-teal-500 to-emerald-600",
                  shadow: "shadow-teal-500/5"
                },
                { 
                  icon: Sparkles, 
                  title: "Multi-Subject Support", 
                  desc: "One single platform for Math, Physics, Chemistry, Biology, History, English, Economics, and Computer Science studies.",
                  color: "from-rose-500 to-indigo-500",
                  shadow: "shadow-rose-500/5"
                }
              ].map((f, i) => (
                <div 
                  key={i} 
                  className={`relative p-8 bg-[#0F172A]/40 border border-slate-800/80 rounded-3xl overflow-hidden group hover:border-slate-700/80 transition-all duration-300 hover:-translate-y-1 ${f.shadow}`}
                >
                  <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform"></div>
                  
                  {/* Icon wrapper inside glowing box */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 relative">
                    <div className={`absolute inset-0 bg-gradient-to-tr ${f.color} rounded-2xl blur opacity-0 group-hover:opacity-40 transition-opacity`}></div>
                    <f.icon className="w-5 h-5 text-white relative z-10" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200 transition-colors">
                    {f.title}
                  </h3>
                  
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {f.desc}
                  </p>

                  <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-indigo-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all">
                    Explore This Module
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS SECTION (Timelines with connectors) */}
        <section id="how-it-works" className="relative py-24 bg-slate-950/40 border-y border-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-4 mb-20">
              <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] font-bold uppercase tracking-wider rounded-full">
                OPTIMIZED STUDY LOOP
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
                Learn Smarter in Four Simple Steps
              </h2>
              <p className="text-[#94A3B8] max-w-xl mx-auto text-sm sm:text-base">
                Our platform streamlines active knowledge acquisition into a fast, iterative learning loop.
              </p>
            </div>

            <div className="relative">
              {/* Connector timeline line */}
              <div className="hidden lg:block absolute left-[12%] right-[12%] top-20 h-0.5 bg-slate-800">
                <div className="absolute left-0 top-0 h-full w-[40%] bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { 
                    step: "01", 
                    title: "Ask Any Question", 
                    desc: "Type in a confusing board assignment, upload chemical formula photos, or ask for simple summaries." 
                  },
                  { 
                    step: "02", 
                    title: "Receive Explanation", 
                    desc: "Our model generates highly descriptive breakdown explanations, removing academic terminology confusion instantly." 
                  },
                  { 
                    step: "03", 
                    title: "Practice Exercises", 
                    desc: "The AI immediately drafts micro-practice quizzes customized to the exact gaps identified in study concepts." 
                  },
                  { 
                    step: "04", 
                    title: "Track & Master", 
                    desc: "Earn user streak points, complete performance milestones, unlock badges, and monitor historic stats." 
                  }
                ].map((s, i) => (
                  <div key={i} className="text-left relative space-y-4 group">
                    <div className="relative">
                      {/* Step index badge with floating effect */}
                      <div className="w-16 h-16 rounded-2xl bg-[#0F172A] border-2 border-slate-800/80 group-hover:border-indigo-500/60 shadow-lg text-2xl font-black text-white flex items-center justify-center transition-all group-hover:-translate-y-1 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] select-none">
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 group-hover:from-indigo-400 group-hover:to-cyan-400">
                          {s.step}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors pt-2 select-none">
                      {s.title}
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed select-none">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 5. INTERACTIVE LIVE AI TUTOR DEMO SECTION */}
        <section id="interactive-demo" className="relative py-24 md:py-32">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center space-y-4 mb-16">
              <span className="px-3.5 py-1.5 bg-violet-600/15 border border-violet-500/25 text-violet-400 text-[11px] font-bold uppercase tracking-wider rounded-full">
                INTERACTIVE SANDBOX
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Experience SJ Tutor AI Live
              </h2>
              <p className="text-[#94A3B8] text-sm sm:text-base">
                Try out an actual automated study module. Interact with the study questions below to experience the real-time feedback.
              </p>
            </div>

            {/* Simulated Live Chat Client Frame */}
            <div className="border border-slate-800/80 bg-[#0F172A]/75 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
              {/* Header bar */}
              <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center border border-indigo-400/20">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-sm text-white">SJ AI Tutor</h3>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 leading-none mt-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                      Interactive Demo Active
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Topic: Mathematics</span>
                  {demoSelectedOption && (
                    <button 
                      onClick={handleDemoReset}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 border border-slate-800 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="p-6 space-y-6 text-left min-h-[350px] flex flex-col justify-between">
                
                <div className="space-y-6">
                  {/* Student Bubble */}
                  <div className="flex items-start gap-3 justify-end">
                    <div className="bg-[#2563EB]/15 border border-blue-500/20 text-[#F8FAFC] text-sm p-3.5 rounded-2xl rounded-tr-none max-w-[85%] font-medium">
                      Explain quadratic equations simply.
                    </div>
                    <div className="w-8 h-8 rounded-full bg-indigo-950 flex items-center justify-center border border-indigo-500/20 text-xs font-bold font-mono text-[#F8FAFC]">
                      U
                    </div>
                  </div>

                  {/* AI Tutor breakdown message */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold select-none text-xs">
                      SJ
                    </div>
                    
                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl rounded-tl-none max-w-[85%] space-y-3.5 text-sm leading-relaxed text-[#F8FAFC]">
                      <p>
                        A <strong className="text-blue-400">quadratic equation</strong> is a mathematical formula that can be rearranged into a standard form:
                      </p>
                      
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center font-mono text-cyan-300 select-all tracking-wider text-base">
                        ax² + bx + c = 0 &nbsp; (where a ≠ 0)
                      </div>

                      <p className="text-xs text-[#94A3B8]">
                        To solve for <code className="text-white px-1">x</code>, we find factors or use the quadratic formula. Let&apos;s complete a practice question to master this in 10 seconds:
                      </p>

                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                        <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold block mb-1">PRACTICE CHALLENGE:</span>
                        <p className="font-bold text-white">Solve the equation: x² - 5x + 6 = 0</p>
                        <p className="text-xs text-[#94A3B8]">Tip: We factorize this into <code className="text-indigo-300">(x - 2)(x - 3) = 0</code>. Solve for both factors.</p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic interactive selector feedback state */}
                  <AnimatePresence>
                    {demoSelectedOption && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 font-bold text-[#F8FAFC] flex items-center justify-center text-xs select-none">
                          ✓
                        </div>
                        <div className={`p-4 rounded-2xl rounded-tl-none text-sm max-w-[85%] border leading-relaxed ${
                          demoShowCorrectFeedback 
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                            : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                        }`}>
                          {demoShowCorrectFeedback ? (
                            <div className="space-y-1 text-left">
                              <p className="font-bold text-white flex items-center gap-1.5">
                                🎉 Correct! Outstanding choice!
                              </p>
                              <p className="text-xs text-emerald-400/80">
                                Placing <code className="text-white bg-slate-900/60 px-1 py-0.5 rounded">x - 2 = 0</code> gives <code className="text-white bg-slate-900/60 px-1 py-0.5 rounded">x = 2</code>, and placing <code className="text-white bg-slate-900/60 px-1 py-0.5 rounded">x - 3 = 0</code> gives <code className="text-white bg-slate-900/60 px-1 py-0.5 rounded">x = 3</code>. You just earned 15 study coins!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1 text-left">
                              <p className="font-bold text-white">Not quite correct. Try again!</p>
                              <p className="text-xs text-rose-400/80">
                                Think of numbers that multiply to $+6$ and add up to $-5$. That is $-2$ and $-3$. Since the factors are $(x - 2)(x - 3) = 0$, we find the roots by setting each factor to zero.
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Option selector buttons in absolute pristine alignment */}
                <div className="mt-8 pt-4 border-t border-slate-800">
                  <p className="text-xs text-slate-500 mb-3 text-left">Select your response to answer:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'A', text: "x = 1 or x = 6" },
                      { key: 'B', text: "x = 2 or x = 3" },
                      { key: 'C', text: "x = -2 or x = -3" },
                      { key: 'D', text: "x = 0 or x = 5" }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => handleDemoOptionSelect(opt.key)}
                        className={`p-3.5 px-4 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all relative overflow-hidden flex items-center gap-3 cursor-pointer ${
                          demoSelectedOption === opt.key
                            ? opt.key === 'B'
                              ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-950/20'
                              : 'bg-rose-950/50 border-rose-500 text-white shadow-lg shadow-rose-950/20'
                            : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 text-[#94A3B8] hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg text-[11px] font-black font-mono flex items-center justify-center border ${
                          demoSelectedOption === opt.key
                            ? opt.key === 'B'
                              ? 'bg-emerald-900 text-emerald-400 border-emerald-500'
                              : 'bg-rose-900 text-rose-400 border-rose-500'
                            : 'bg-slate-950 text-[#94A3B8] border-slate-800'
                        }`}>
                          {opt.key}
                        </span>
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 6. SUBJECTS CATEGORY SECTION */}
        <section id="subjects" className="relative py-24 bg-slate-950/40 border-y border-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-4 mb-16">
              <span className="px-3 py-1 bg-teal-500/10 border border-teal-500/25 text-teal-400 text-[11px] font-bold uppercase tracking-wider rounded-full">
                UNIVERSAL KNOWLEDGE
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                Comprehensive Multi-Subject Architecture
              </h2>
              <p className="text-[#94A3B8] max-w-xl mx-auto text-sm sm:text-base">
                Click on any primary subject to see simulated academic query examples handled easily by our AI system.
              </p>
            </div>

            {/* Horizontal Scroll navigation tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
              {subjectTabs.map((sub) => (
                <button
                  key={sub.name}
                  onClick={() => setActiveSubjectTab(sub.name)}
                  className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                    activeSubjectTab === sub.name
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/35'
                      : 'bg-[#0F172A]/70 text-[#94A3B8] border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>

            {/* Display active tab detail card */}
            <AnimatePresence mode="wait">
              {subjectTabs.map((sub) => sub.name === activeSubjectTab && (
                <motion.div
                  key={sub.name}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="p-8 sm:p-12 bg-[#0F172A]/50 border border-slate-800/80 rounded-3xl text-left relative overflow-hidden"
                >
                  <div className={`absolute -right-24 -bottom-24 w-72 h-72 bg-gradient-to-tr ${sub.color} rounded-full blur-3xl opacity-10 pointer-events-none`}></div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-7 space-y-6">
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Active Curriculum Module</span>
                        <h3 className="text-2xl sm:text-3xl font-black text-white">{sub.name}</h3>
                      </div>
                      <p className="text-[#94A3B8] text-sm sm:text-base leading-relaxed">
                        Mastering {sub.name.toLowerCase()} involves adaptive testing on keys like <span className="text-[#F8FAFC] font-semibold">{sub.desc}</span>. SJ Tutor AI explains core derivations without needing heavy guide book lookups.
                      </p>

                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                        <span className="text-xs text-slate-400 font-mono">Example: &ldquo;Hey SJ, please {sub.code}&rdquo;</span>
                      </div>
                    </div>

                    <div className="lg:col-span-5">
                      <div className="p-6 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <span className="text-xs font-bold font-mono text-slate-500">CURRICULUM_ALIGNMENT</span>
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase">CBSE / IB / AP</span>
                        </div>
                        
                        <div className="space-y-2.5">
                          {[
                            "Concept Revision Cheat-Sheets",
                            "High-Speed Formulas Breakdown Guides",
                            "Multi-Choice Question Sets Generation"
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-xs text-[#94A3B8]">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                        
                        <button 
                          onClick={onGetStarted}
                          className="w-full py-3 bg-[#0F172A] hover:bg-[#0F172A]/80 border border-slate-800 hover:border-slate-600 rounded-xl text-xs font-bold text-white transition-colors"
                        >
                          Unlock {sub.name} Sandbox
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* 7. TESTIMONIALS SECTION */}
        <section className="relative py-24 md:py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-4 mb-20">
              <span className="px-3.5 py-1.5 bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[11px] font-bold uppercase tracking-wider rounded-full">
                TESTIMONIALS & TRUST
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
                Student Success Stories
              </h2>
              <p className="text-[#94A3B8] max-w-xl mx-auto text-sm sm:text-base">
                See how school and college students are transforming their grades and understanding complex topics effortlessly.
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              {/* Carousel navigation arrow - Prev */}
              <button 
                onClick={handleTestimonialPrev}
                className="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-slate-700 transition-colors z-10 cursor-pointer hidden sm:flex"
              >
                &larr;
              </button>
              
              {/* Active Testimonial Card */}
              <div className="p-8 sm:p-12 bg-[#0F172A]/40 border border-slate-800/80 rounded-3xl text-left select-none relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 p-8 text-7xl font-sans text-slate-800 pointer-events-none">&ldquo;</div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 border-b border-slate-800 pb-8">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500/30">
                    <img 
                      src={testimonials[currentTestimonialIndex].avatar} 
                      alt={testimonials[currentTestimonialIndex].name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="text-left space-y-1">
                    <h4 className="font-extrabold text-lg text-white leading-none">{testimonials[currentTestimonialIndex].name}</h4>
                    <p className="text-xs text-slate-400 font-medium">{testimonials[currentTestimonialIndex].school}</p>
                    
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] bg-emerald-950/50 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-900/30 font-bold uppercase">{testimonials[currentTestimonialIndex].improvement}</span>
                      <span className="text-[10px] bg-indigo-950/50 text-indigo-400 px-2.5 py-0.5 rounded border border-indigo-900/30 font-bold uppercase">{testimonials[currentTestimonialIndex].achievement}</span>
                    </div>
                  </div>
                </div>

                <p className="text-base sm:text-lg italic text-[#94A3B8] leading-relaxed relative z-10 font-medium">
                  &ldquo;{testimonials[currentTestimonialIndex].content}&rdquo;
                </p>

                {/* Star rating bottom */}
                <div className="mt-8 flex items-center gap-1">
                  {[1,2,3,4,5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs text-slate-500 font-bold ml-2">Verified Academic Record</span>
                </div>
              </div>

              {/* Carousel navigation arrow - Next */}
              <button 
                onClick={handleTestimonialNext}
                className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[#94A3B8] hover:text-white hover:border-slate-700 transition-colors z-10 cursor-pointer hidden sm:flex"
              >
                &rarr;
              </button>

              {/* Dot Indicators */}
              <div className="flex items-center justify-center gap-2.5 mt-8">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTestimonialIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                      currentTestimonialIndex === idx ? 'bg-indigo-500 w-6' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 8. PRICING PLANS SECTION (Glow borders and highlights) */}
        <section id="pricing" className="relative py-24 bg-slate-950/40 border-y border-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-4 mb-20">
              <span className="px-3.5 py-1.5 bg-blue-600/10 border border-blue-500/25 text-blue-400 text-[11px] font-bold uppercase tracking-wider rounded-full">
                TRANSPARENT VALUE
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
                Choose Your Learning Plan
              </h2>
              <p className="text-[#94A3B8] max-w-xl mx-auto text-sm sm:text-base">
                Upgrade packages easily as your study goals evolve. No hidden contracts, cancel at any time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
              
              {/* PLAN 1: Free */}
              <div className="p-8 bg-[#0F172A]/30 border border-slate-850 rounded-3xl text-left flex flex-col justify-between space-y-8 hover:border-slate-800 transition-colors relative">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Foundation Tier</span>
                  <h3 className="text-2xl font-extrabold text-white">Free Plan</h3>
                  <p className="text-xs text-slate-400">Excellent package for quick homework help and syllabus previews.</p>
                  
                  <div className="pt-2">
                    <span className="text-4xl font-extrabold text-white">$0</span>
                    <span className="text-xs text-slate-500 font-bold ml-1">USD / Month</span>
                  </div>
                  
                  <hr className="border-slate-850" />
                  
                  <ul className="space-y-3">
                    {[
                      "10 AI Questions Monthly Limit",
                      "Basic concept explanation tools",
                      "Standard 2D Dashboard tracker",
                      "E-mail resolution support"
                    ].map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-xs text-[#94A3B8]">
                        <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={onGetStarted}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Start Studying Free
                </button>
              </div>

              {/* PLAN 2: Pro (Highlighted with gorgeous neon flow borders) */}
              <div className="p-8 bg-[#0F172A]/90 border-2 border-indigo-500/80 rounded-3xl text-left flex flex-col justify-between space-y-8 relative overflow-hidden shadow-2xl shadow-indigo-500/10">
                {/* Popular recommended badge banner */}
                <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-[9px] font-black uppercase text-white px-2.5 py-1 rounded-full tracking-wider animate-pulse">
                  RECOMMENDED
                </div>

                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Scholar Tier</span>
                  <h3 className="text-2xl font-black text-white flex items-center gap-2">
                    Pro Plan
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" />
                  </h3>
                  <p className="text-xs text-slate-300">Complete curriculum mastery with premium analytics and interactive testing.</p>
                  
                  <div className="pt-2">
                    <span className="text-4xl font-black text-white">$9.99</span>
                    <span className="text-xs text-slate-300 font-bold ml-1">USD / Month</span>
                  </div>
                  
                  <hr className="border-slate-800" />
                  
                  <ul className="space-y-3">
                    {[
                      "Unlimited AI Homework Tutoring",
                      "Adaptive Study Analytics Panels",
                      "High-Sketches Exams Preparation Set",
                      "Custom Personalized Study Plans",
                      "Priority Response Queue 24/7",
                      "100 Bonus Learning Credits Monthly"
                    ].map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-xs text-white">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 font-bold" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={onGetStarted}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:scale-[1.02]"
                >
                  Upgrade to Scholar Pro
                </button>
              </div>

              {/* PLAN 3: School */}
              <div className="p-8 bg-[#0F172A]/30 border border-slate-850 rounded-3xl text-left flex flex-col justify-between space-y-8 hover:border-slate-800 transition-colors relative">
                <div className="space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Institution Tier</span>
                  <h3 className="text-2xl font-extrabold text-white">School Plan</h3>
                  <p className="text-xs text-slate-400">For classrooms, high schools, universities and academic teachers.</p>
                  
                  <div className="pt-2">
                    <span className="text-4xl font-extrabold text-white">Enterprise</span>
                  </div>
                  
                  <hr className="border-slate-850" />
                  
                  <ul className="space-y-3">
                    {[
                      "Interactive School Teacher Dashboard",
                      "Student Performance Reports Export",
                      "Bulk account user management",
                      "Deep Institution Analytics Insights",
                      "Custom Board Syllabus Integration",
                      "Single Sign-On (SSO) Support"
                    ].map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-xs text-[#94A3B8]">
                        <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={onGetStarted}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Contact School Licensing
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* 9. FINAL CTA SECTION (With floating particles and effects) */}
        <section className="relative py-28 md:py-36 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/10 to-indigo-700/10 opacity-40 blur-3xl rounded-full"></div>
          
          <div className="relative max-w-4xl mx-auto px-6 text-center space-y-8">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight">
              Ready to Learn Smarter?
            </h2>
            <p className="text-[#94A3B8] text-base sm:text-lg max-w-xl mx-auto">
              Join thousands of students transforming their education through adaptive, high-performance AI-powered learning.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onGetStarted}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-600/30 transition-all hover:-translate-y-1"
              >
                Start Free Today
              </button>
              <span className="text-slate-500 font-semibold text-sm">No credit card required • Instant dashboard sync</span>
            </div>
          </div>
        </section>

        {/* 10. PREMIUM MINIMALIST FOOTER */}
        <footer className="relative border-t border-slate-900/80 bg-slate-950/80 py-16">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-8 pb-12 border-b border-slate-900">
              
              <div className="col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <Logo className="w-8 h-8" />
                  <span className="font-extrabold text-base tracking-tight text-white uppercase select-none">SJ Tutor AI</span>
                </div>
                <p className="text-xs text-[#94A3B8] leading-relaxed max-w-xs select-none">
                  Advanced personal AI study buddy designed for school, boards, examinations, and university concept revision tracking.
                </p>

                {/* Powered by Google credentials */}
                <div className="pt-4 flex flex-col items-start gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block select-none">Core Technology Integration</span>
                  <div className="flex items-center gap-2 text-[#94A3B8] bg-slate-900/40 p-2 rounded-xl border border-slate-800/80">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="text-[10px] font-bold text-[#F8FAFC]">Gemini & Google AI Models</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4 select-none">Product</h4>
                <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                  <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                  <li><button onClick={onGetStarted} className="hover:text-white transition-colors">Dashboard</button></li>
                  <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pricing Plans</button></li>
                  <li><button onClick={() => scrollToSection('subjects')} className="hover:text-white transition-colors">Curriculum</button></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4 select-none">Features</h4>
                <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                  <li><button onClick={onGetStarted} className="hover:text-white transition-colors">Homework Solver</button></li>
                  <li><button onClick={onGetStarted} className="hover:text-white transition-colors">Instant Summarizer</button></li>
                  <li><button onClick={onGetStarted} className="hover:text-white transition-colors">Active Quiz Maker</button></li>
                  <li><button onClick={onGetStarted} className="hover:text-white transition-colors">Interactive AI Chat</button></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4 select-none">Pricing</h4>
                <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                  <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Free Plan</button></li>
                  <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">Pro Scholar</button></li>
                  <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors">School Package</button></li>
                  <li><button onClick={onGetStarted} className="hover:text-white transition-colors">Billing Settings</button></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4 select-none">Support & Info</h4>
                <ul className="space-y-2.5 text-xs text-[#94A3B8]">
                  <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="mailto:support@sjtutorai.com" className="hover:text-white transition-colors">Contact Support</a></li>
                  <li><a href="#blog" className="hover:text-white transition-colors">Study Blog</a></li>
                </ul>
              </div>

            </div>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left select-none">
              <p className="text-[11px] text-slate-500">
                &copy; 2026 SJ Tutor AI. All rights reserved. Designed to ensure maximum school academic performance.
              </p>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">OFFICIAL BRAND COMPLIANCE</span>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
              </div>
            </div>

          </div>
        </footer>

      </div>
    </div>
  );
}
