import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  FileText, 
  BrainCircuit, 
  MessageCircle, 
  Languages, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Award,
  Star,
  ChevronRight,
  GraduationCap,
  Play,
  Globe,
  Atom,
  Check,
  Zap,
  Quote,
  Flame,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';

interface LandingPageProps {
  onGetStarted: () => void;
  countryCode?: string | null;
}

// Corrected, pristine Google Brand SVG Path for trust badges / login references
const CorrectGoogleLogo: React.FC<{ className?: string; noBg?: boolean }> = ({ className = "w-5 h-5", noBg = false }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {!noBg && <circle cx="12" cy="12" r="12" fill="white" />}
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-4.7 0-8.53 3.53-9.4 8.2l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  // Canvas Animation Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Custom demo state
  const [demoPrompt, setDemoPrompt] = useState<'quad' | 'photo' | 'code'>('quad');
  const [demoIsTyping, setDemoIsTyping] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [parabolaCoeffA, setParabolaCoeffA] = useState(1); // Coefficient A for parabolic math plot
  const [parabolaOffset, setParabolaOffset] = useState(0); // Vertical offset for curve plotting

  // Counters for Statistics (smoothly counts up on mount)
  const [statistics, setStatistics] = useState({
    students: 0,
    solved: 0,
    success: 0,
    availability: "24/7"
  });

  // Carousel Success Testimonial index
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Statistics counters trigger
  useEffect(() => {
    const duration = 2000; // ms
    const frameRate = 1000 / 60; // 60 FPS
    const totalFrames = duration / frameRate;
    
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      
      const studentsVal = Math.min(Math.floor(10000 * progress), 10000);
      const solvedVal = Math.min(Math.floor(1000000 * progress), 1000000);
      const successVal = Math.min(Math.floor(95 * progress), 95);

      setStatistics({
        students: studentsVal,
        solved: solvedVal,
        success: successVal,
        availability: "24/7"
      });

      if (frame >= totalFrames) {
        clearInterval(interval);
      }
    }, frameRate);

    return () => clearInterval(interval);
  }, []);

  // Neural Network Cinematic Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Particle class
    class Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      originalRadius: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 1;
        this.originalRadius = this.radius;
        
        // Alternate colors for a high-end nebula energy feel
        const rand = Math.random();
        if (rand < 0.4) {
          this.color = 'rgba(6, 182, 212, 0.6)'; // cyan Accent
        } else if (rand < 0.7) {
          this.color = 'rgba(124, 58, 237, 0.6)'; // violet Secondary
        } else {
          this.color = 'rgba(37, 99, 235, 0.6)'; // blue Primary
        }
      }

      update(mx: number, my: number) {
        this.x += this.vx;
        this.y += this.vy;

        // Bouncing logic
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse attraction/repulsion
        const dx = mx - this.x;
        const dy = my - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          // Soft attraction to mouse cursor
          this.x += (dx / dist) * 0.45;
          this.y += (dy / dist) * 0.45;
          this.radius = this.originalRadius * 1.8;
        } else {
          this.radius = this.originalRadius;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.shadowColor = this.color;
        c.shadowBlur = this.radius > 2 ? 8 : 0;
        c.fill();
        c.shadowBlur = 0; // reset
      }
    }

    // Initialize nodes array
    const nodeCount = Math.min(Math.floor((width * height) / 14000), 100);
    const nodes: Node[] = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new Node());
    }

    // Track mouse position globally
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Soft glow center
      const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, Math.max(width, height));
      grad.addColorStop(0, '#090d22');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw flowing grid lines under nodes
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 80;
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

      // Update and connect nodes
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].update(mousePosition.x, mousePosition.y);
        nodes[i].draw(ctx);

        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Connection threshold
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            
            // Fade line on distance
            const alpha = (1 - dist / 120) * 0.25;
            ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [mousePosition]);

  // Handle typing effects inside demo section
  useEffect(() => {
    setDemoIsTyping(true);
    setSelectedAnswer(null);
    setQuizChecked(false);
    
    const timer = setTimeout(() => {
      setDemoIsTyping(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [demoPrompt]);

  // Testimonial Carousel Auto-changer
  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % 3);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const testimonials = [
    {
      name: "Marcus Aurelius Cheney",
      role: "High School Junior",
      achievement: "Improved Chemistry grade from C to A+",
      quote: "SJ Tutor AI completely transformed how I study. The instant step-by-step explanations make complex chemical bonding details as clear as day. It's like having an MIT professor in my pocket.",
      rating: 5,
      avatarColor: "bg-gradient-to-tr from-cyan-400 to-blue-600"
    },
    {
      name: "Sabrina Patel",
      role: "AP Calculus Student",
      achievement: "Scored perfect 5 on AP BC Calculus Exam",
      quote: "I used to sit stuck on difficult integration problems for hours. SJ Tutor AI explains exactly where I went wrong, diagrams the concepts, and generates practice quizzes to lock in the logic.",
      rating: 5,
      avatarColor: "bg-gradient-to-tr from-purple-500 to-indigo-600"
    },
    {
      name: "Alexander Vance",
      role: "Freshman STEM Major",
      achievement: "Mastered Python Recursion in 3 Days",
      quote: "The personalized learning paths adjusted perfectly to my visual style. SJ Tutor AI doesn't just hand you the code – it walks you through stacked execution frames with stunning breakdowns.",
      rating: 5,
      avatarColor: "bg-gradient-to-tr from-amber-400 to-rose-500"
    }
  ];

  const subjects = [
    { name: "Mathematics", icon: GraduationCap, color: "from-blue-500/20 to-indigo-500/10", border: "border-blue-500/30", text: "text-blue-400" },
    { name: "Physics", icon: Atom, color: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/30", text: "text-violet-400" },
    { name: "Chemistry", icon: Cpu, color: "from-cyan-500/20 to-blue-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
    { name: "Biology", icon: BookOpen, color: "from-emerald-500/20 to-teal-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
    { name: "Computer Science", icon: BrainCircuit, color: "from-slate-500/20 to-slate-400/10", border: "border-slate-500/30", text: "text-slate-300" },
    { name: "English", icon: Sparkles, color: "from-rose-500/20 to-pink-500/10", border: "border-rose-500/30", text: "text-rose-400" },
    { name: "History", icon: Globe, color: "from-amber-500/20 to-orange-500/10", border: "border-amber-500/30", text: "text-amber-400" },
    { name: "Economics", icon: TrendingUp, color: "from-teal-500/20 to-emerald-500/10", border: "border-teal-500/30", text: "text-teal-400" }
  ];

  return (
    <div className="bg-[#020617] text-[#F8FAFC] font-sans overflow-hidden min-h-screen relative selection:bg-blue-600/30 selection:text-white">
      
      {/* 2D Particles Canvas Network Behind Everything */}
      <div className="absolute inset-0 z-0 h-full w-full pointer-events-none overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {/* Soft 75% Dark Overlay above animation to enforce pristine readability */}
        <div className="absolute inset-0 bg-slate-950/75 pointer-events-none" />
      </div>

      {/* Floating Header Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#020617]/40 backdrop-blur-xl border-b border-[#0F172A]/80 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" iconOnly />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                SJ Tutor <span className="text-blue-500 font-black">AI</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-cyan-400">PERSONALIZED LEARNING</span>
            </div>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-blue-400 transition-colors">Why Choose Us</a>
            <a href="#how" className="hover:text-blue-400 transition-colors">How It Works</a>
            <a href="#demo" className="hover:text-blue-400 transition-colors">Simulator Demo</a>
            <a href="#subjects" className="hover:text-blue-400 transition-colors">Subjects</a>
            <a href="#about" className="hover:text-blue-400 transition-colors">Our Vision</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onGetStarted}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 border border-blue-500/30 transition-all hover:scale-105 active:scale-95"
            >
              Start Learning Free
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10">

        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 lg:pt-28 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side Content */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-950 to-purple-950 border border-blue-500/30 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>🚀 Next Generation AI Learning Platform</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
              Your Personal <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">
                AI Tutor,
              </span> <br />
              Available 24/7
            </h1>

            <p className="text-slate-300 md:text-lg max-w-xl leading-relaxed">
              Master any subject with personalized AI-powered learning, instant explanations, adaptive practice, real-time feedback, and intelligent study guidance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-505 hover:to-purple-500 text-white rounded-2xl font-bold text-base shadow-2xl shadow-blue-500/30 border border-blue-400/40 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 group"
              >
                <span>Start Learning Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a 
                href="#demo"
                className="px-8 py-4 bg-slate-900/40 hover:bg-slate-900/80 text-white rounded-2xl font-bold text-base border border-slate-700/60 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Watch Live Demo</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="pt-6 border-t border-slate-800/85 grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex text-amber-400 gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rated by Students</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white tracking-tight">10,000+</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Learners</p>
              </div>
              <div>
                <p className="text-xl font-bold text-white tracking-tight">95%</p>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Success Rate</p>
              </div>
            </div>
          </div>

          {/* Right Side: High-End Dashboard Mockup with Glassmorphism */}
          <div className="lg:col-span-6 relative">
            
            {/* Absolute colorful ambient backing glows */}
            <div className="absolute -top-12 -left-12 w-72 h-72 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-purple-600/25 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative bg-[#0F172A]/70 backdrop-blur-xl border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl p-6 hover:border-slate-600/60 transition-all duration-500 group">
              
              {/* Fake Menu Topbar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs text-slate-400 font-bold tracking-widest bg-slate-900 border border-slate-800 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  STUDENT PORTAL DEMO
                </div>
              </div>

              {/* Grid content inside mockup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Subject Cards Overview Item */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">REVISIONS</span>
                    <span className="text-[10px] text-green-400 font-black bg-green-950 border border-green-800/40 px-1.5 py-0.5 rounded-full">+4% Streak</span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60 transition-transform hover:translate-x-1">
                    <div className="w-9 h-9 bg-blue-950 rounded-lg flex items-center justify-center border border-blue-800/20">
                      <GraduationCap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left leading-none">
                      <p className="text-sm font-bold text-white">AP Calculus</p>
                      <span className="text-[9px] text-slate-400">Chapters 1-7 Summary</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60 transition-transform hover:translate-x-1">
                    <div className="w-9 h-9 bg-violet-900/30 rounded-lg flex items-center justify-center border border-violet-800/20">
                      <Atom className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="text-left leading-none">
                      <p className="text-sm font-bold text-violet-300">Physics 101</p>
                      <span className="text-[9px] text-slate-400">Electromagnetic Notes</span>
                    </div>
                  </div>
                </div>

                {/* Progress Graph card item */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-inner">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Weekly Progress</span>
                      <p className="text-lg font-black text-white">92.4% Mastery</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  
                  {/* Custom SVG line progress chart */}
                  <div className="w-full h-16 relative">
                    <svg className="w-full h-full" viewBox="0 0 100 40">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 35 C15 30 20 10 40 22 C60 30 75 5 100 12 L100 40 L0 40 Z" fill="url(#chartGrad)" />
                      <path d="M0 35 C15 30 20 10 40 22 C60 30 75 5 100 12" fill="none" stroke="#00d2ff" strokeWidth="2" strokeDasharray="300" className="animate-[growLines_3s_ease-out_infinite]" />
                      <circle cx="100" cy="12" r="3" fill="#ffffff" className="animate-ping" />
                    </svg>
                  </div>
                </div>

                {/* Floating Glass AI Insights */}
                <div className="md:col-span-2 bg-[#0F172A]/90 border border-slate-800 p-4 rounded-2xl text-left space-y-3 relative overflow-hidden shadow-xl">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                    <span>AI COMPANION RECOMMENDATIONS</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    &quot;Based on your Quiz scores on Quadratic Equations, we recommend focusing on <strong className="text-blue-400 font-black">Factoring Methods</strong> to complete your perfect math credentials.&quot;
                  </p>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] text-slate-300">#MathChallenge</span>
                    <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] text-slate-300">#QuadraticRoots</span>
                  </div>
                </div>
              </div>

              {/* Floating micro items overlapping edge for premium layout */}
              <div className="absolute -bottom-4 -left-6 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl flex items-center gap-2 transform -rotate-2 hover:rotate-0 transition-transform hidden sm:flex">
                <div className="w-7 h-7 bg-purple-950 rounded-lg flex items-center justify-center border border-purple-800/40">
                  <Flame className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left leading-none">
                  <p className="text-xs font-bold text-white">Daily Streak Activator</p>
                  <span className="text-[9px] text-slate-400">Score logged now</span>
                </div>
              </div>

              <div className="absolute -top-6 -right-6 bg-slate-900/95 backdrop-blur-md border border-[#00d4ff]/30 p-3.5 rounded-xl shadow-2xl flex items-center gap-2 transform rotate-3 hover:translate-y-1 transition-all hidden sm:flex">
                <div className="w-8 h-8 rounded-full bg-cyan-950 flex items-center justify-center">
                  <CorrectGoogleLogo className="w-4 h-4" />
                </div>
                <div className="text-left text-xs leading-none">
                  <p className="font-bold text-white">Perfect Identity</p>
                  <span className="text-[8px] text-cyan-400 uppercase tracking-widest font-bold">Official Integration</span>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* TRUSTED BY / STATS SECTION */}
        <section className="border-y border-slate-900 bg-slate-950/40 py-12 relative overflow-hidden backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6">
            <h3 className="text-xs uppercase tracking-[0.3em] font-black text-slate-500 mb-8 text-center">Loved &amp; Trusted By Students worldwide</h3>
            
            {/* Trusted Brand Logos (With pristine corrected Google Brand SVG) */}
            <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 mb-12 opacity-60 hover:opacity-85 transition-opacity duration-300">
              <div className="flex items-center gap-2 text-white">
                <CorrectGoogleLogo className="w-5 h-5" />
                <span className="font-bold tracking-tight text-sm">Google Student Forums</span>
              </div>
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <svg className="w-5 h-5" viewBox="0 0 23 23" fill="currentColor">
                  <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z" fill="#F25022" />
                </svg>
                <span>Microsoft Education</span>
              </div>
              <div className="text-white font-extrabold tracking-widest text-sm flex items-center gap-1">
                <span>STANFORD</span>
                <span className="text-xs text-rose-500">STEM</span>
              </div>
              <div className="text-white font-serif italic text-base font-bold">
                Princeton Academics
              </div>
            </div>

            {/* Stats list with animated counter calculations */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-slate-900">
              <div className="space-y-1 text-center">
                <p className="text-3xl md:text-4xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                  {statistics.students.toLocaleString()}+
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Active Students</p>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-3xl md:text-4xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                  {statistics.solved >= 1000000 ? "1 Million+" : statistics.solved.toLocaleString()}
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Questions Solved</p>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-3xl md:text-4xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-rose-400">
                  {statistics.success}%
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Academic Success</p>
              </div>
              <div className="space-y-1 text-center">
                <p className="text-3xl md:text-4xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-400">
                  {statistics.availability}
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400">AI Accessibility</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION (Why Students Choose SJ Tutor AI) */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24 select-none">
          <div className="text-center space-y-4 mb-20">
            <span className="text-xs text-blue-400 font-extrabold uppercase tracking-[0.25em]">ELITE ACADEMIC CRITERIA</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">Why Students Choose SJ Tutor AI</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              We leverage top-tier machine learning models configured specifically for comprehensive school textbooks, turning frustrating homework roadblocks into active learning success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: "AI Homework Assistance", desc: "Solve complex, multi-level homework problems with clean step-by-step mathematical and conceptual justifications.", color: "from-blue-600/20 to-indigo-600/5", glow: "group-hover:shadow-[0_0_50px_rgba(37,99,235,0.25)]", accent: "text-blue-400" },
              { icon: BrainCircuit, title: "Personalized Learning Paths", desc: "The platform dynamically tracks your mastery quotient, structuring learning tracks configured specifically to clear personal knowledge gaps.", color: "from-purple-600/20 to-violet-600/5", glow: "group-hover:shadow-[0_0_50px_rgba(124,58,237,0.25)]", accent: "text-purple-400" },
              { icon: MessageCircle, title: "Instant Doubt Resolution", desc: "Speak directly with your hyper-friendly study companion. Backed by multi-subject, conversational, easy-to-follow wisdom anytime.", color: "from-cyan-600/20 to-blue-600/5", glow: "group-hover:shadow-[0_0_50px_rgba(6,182,212,0.25)]", accent: "text-cyan-400" },
              { icon: Award, title: "AP & Exam Preparation", desc: "Generate custom revision sets, mock exams, and test templates matching specific syllabi, CBSE, or advanced curricula.", color: "from-rose-600/20 to-pink-600/5", glow: "group-hover:shadow-[0_0_50px_rgba(244,63,94,0.25)]", accent: "text-rose-400" },
              { icon: TrendingUp, title: "Performance Analytics", desc: "Visualize clear progress records. Review completion reminders, streak calendars, and claim bonus learning credits immediately.", color: "from-emerald-600/20 to-teal-600/5", glow: "group-hover:shadow-[0_0_50px_rgba(16,185,129,0.25)]", accent: "text-emerald-400" },
              { icon: Languages, title: "Multi-Subject & Language Support", desc: "Unconditional math, literature, sciences, and history answers, seamlessly translated into standard explanations in your language of choice.", color: "from-amber-600/20 to-orange-600/5", glow: "group-hover:shadow-[0_0_50px_rgba(217,119,6,0.25)]", accent: "text-amber-400" }
            ].map((feat, i) => (
              <div 
                key={i} 
                className={`group relative bg-[#0F172A]/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-slate-700 hover:bg-slate-900/40 transition-all duration-500 overflow-hidden ${feat.glow}`}
              >
                {/* Visual Accent Inner Glow */}
                <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${feat.color} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                
                <div className="relative z-10 space-y-5">
                  <div className={`w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center ${feat.accent} group-hover:scale-110 group-hover:border-slate-700 transition-all duration-300`}>
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">{feat.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
                  
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-white transition-colors pt-2 font-semibold">
                    <span>Explore capability</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS (Timeline with interactive visual storytelling) */}
        <section id="how" className="py-24 bg-slate-950/20 border-y border-slate-900/60 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center space-y-4 mb-20">
              <span className="text-xs text-purple-400 font-extrabold uppercase tracking-[0.25em]">STEP-BY-STEP WORKFLOW</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">Learn Smarter in Four Simple Steps</h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm">
                An active, loop-linked approach to scientific training. Here is how your daily study cycle transforms from chaos to structural order.
              </p>
            </div>

            {/* Roadmap layout */}
            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
              
              {/* Connector gradient bar */}
              <div className="absolute top-[38px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 opacity-20 hidden md:block" />

              {[
                { step: "01", title: "Ask Any Question", desc: "Submit difficult geometry, biology equations, scan textbook paragraphs, or simply converse regarding obscure history queries.", opt: "blue" },
                { step: "02", title: "Receive AI Explanations", desc: "Review detailed, typing-animated step-by-step conceptual breakdowns instantly generated in simple human language.", opt: "purple" },
                { step: "03", title: "Adaptive Practice Sets", desc: "Unlock customized multiple-choice practice quizzes triggered of your actual search subjects to enforce core retention.", opt: "cyan" },
                { step: "04", title: "Track Progress & Thrive", desc: "Gain performance credits, build your student streak stats, and compile beautiful revision PDF lists immediately.", opt: "emerald" }
              ].map((s, i) => (
                <div key={i} className="relative z-10 bg-[#0F172A]/30 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl hover:border-slate-700 group hover:bg-[#0F172A]/50 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-3xl font-black text-slate-800 group-hover:text-blue-500/20 transition-colors font-mono">{s.step}</div>
                    
                    {/* Ring Indicator */}
                    <div className={`w-8 h-8 rounded-full bg-slate-950 border-2 border-slate-800 flex items-center justify-center text-xs font-bold text-white group-hover:border-blue-500 shadow-xl`}>
                      <Check className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">{s.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI TUTOR DEMO SECTION (Highly interactive chatbot panel with math plotting) */}
        <section id="demo" className="max-w-7xl mx-auto px-6 py-24 select-none relative">
          
          <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Simulation Controls Left Side */}
            <div className="lg:col-span-4 space-y-6 text-left">
              <span className="text-xs text-cyan-400 font-extrabold uppercase tracking-[0.25em]">LIVE REASONING PORTAL</span>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">Interactive AI Tutor Lesson</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Test-drive our advanced learning modules. Select a challenging concept below to witness the comprehensive, structured, conversational results.
              </p>

              {/* Selector buttons */}
              <div className="space-y-3">
                {[
                  { id: 'quad', label: "Explain Quadratic Equations", desc: "Algebraic formula & parabola graphing", icon: GraduationCap },
                  { id: 'photo', label: "Solve Cell Respiration", desc: "Complex biology cycle breakdown", icon: Atom },
                  { id: 'code', label: "Python Stack Recursion", desc: "Visualizing execution stacks", icon: BrainCircuit }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setDemoPrompt(item.id as any);
                    }}
                    className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
                      demoPrompt === item.id 
                        ? 'bg-blue-600/20 border-blue-500 font-bold text-white shadow-lg' 
                        : 'bg-[#121A2E]/20 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      demoPrompt === item.id ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400'
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <span className="text-[10px] opacity-75">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chatbot Interface Right Side */}
            <div className="lg:col-span-8">
              <div className="bg-[#0F172A]/80 border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
                
                {/* Chat Header */}
                <div className="bg-slate-950/60 p-4 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-primary-500 flex items-center justify-center shrink-0">
                        <Logo className="w-full h-full" iconOnly />
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-white">SJ Tutor AI Companion</p>
                      <span className="text-[10px] text-green-400 flex items-center gap-1">
                        <CorrectGoogleLogo className="w-3 h-3 inline" /> Powered by Advanced Gemini Model
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-950/50 border border-blue-800/40 rounded-full text-[10px] font-bold text-blue-400">MATH INTEGRATION</span>
                </div>

                {/* Chat Scroll Container */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800">
                  
                  {/* Student Input Prompt Bubble */}
                  <div className="flex items-start gap-3 justify-end">
                    <div className="bg-blue-600 text-white p-4 rounded-t-2xl rounded-bl-2xl text-xs max-w-sm text-left font-medium shadow-md">
                      {demoPrompt === 'quad' && "Hi! I am super confused by quadratic equations. Can you explain what the roots actually represent and how we find them?"}
                      {demoPrompt === 'photo' && "Can you write a visual, easy-to-follow study guide of cellular respiration? It feels like just memorizing a giant list of molecules."}
                      {demoPrompt === 'code' && "Explain Python recursion. What happens inside the stack memories during recursive execution?"}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold flex items-center justify-center text-xs shrink-0 select-none">
                      S
                    </div>
                  </div>

                  {/* AI Tutor Response Bubble */}
                  {demoIsTyping ? (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-primary-500 flex items-center justify-center shrink-0">
                        <Logo className="w-full h-full" iconOnly />
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-r-2xl rounded-bl-2xl max-w-md text-left text-xs text-slate-400 flex items-center gap-2">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce delay-100">●</span>
                        <span className="animate-bounce delay-200">●</span>
                        <span>SJ is formulating customized visuals...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-primary-500 flex items-center justify-center shrink-0">
                        <Logo className="w-full h-full" iconOnly />
                      </div>

                      <div className="space-y-4 text-left max-w-2xl bg-slate-950/30 p-6 border border-slate-800/80 rounded-2xl shadow-inner">
                        <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-3">
                          
                          {/* DYNAMIC TEXT PER PROMPT */}
                          {demoPrompt === 'quad' && (
                            <>
                              <p className="text-white font-bold text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                                Interactive Lesson: Parabolas and Roots
                              </p>
                              <p>
                                At its heart, a quadratic equation represents a <strong className="text-cyan-400">Parabola</strong> (a perfect mirror-symmetric U-shaped curve). When we solve ax² + bx + c = 0, we are searching for the exact spots where this curve crashes right through the ground level (x-axis)!
                              </p>
                              <p>
                                The supreme key to locating these roots is the quadratic formula:
                              </p>
                              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 font-mono text-center text-sm font-semibold text-white my-3">
                                {"x = (-b ± √(b² - 4ac)) / a²"}
                              </div>

                              {/* Interactive mathematical plot coordinate card */}
                              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                  <span>LIVE PARABOLA COORDINATES PLOTTER</span>
                                  <span className="text-cyan-400">y = {parabolaCoeffA}x² - 4x + {3 + parabolaOffset}</span>
                                </div>

                                {/* Plotter Graph */}
                                <div className="h-32 bg-slate-950 border border-slate-850 rounded-lg relative overflow-hidden flex items-center justify-center">
                                  
                                  {/* Grid Lines */}
                                  <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-10 pointer-events-none">
                                    {[...Array(24)].map((_, idx) => <div key={idx} className="border-r border-b border-white" />)}
                                  </div>

                                  {/* Coordinate Axes */}
                                  <div className="absolute h-[1px] w-full bg-slate-700/60 top-1/2 left-0 pointer-events-none" />
                                  <div className="absolute w-[1px] h-full bg-slate-700/60 left-1/2 top-0 pointer-events-none" />

                                  {/* SVG Graph Curve path drawn real-time based on variables */}
                                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
                                    <path 
                                      d={`M 10 ${60 - (parabolaCoeffA * 10) + parabolaOffset} Q 100 ${90 + parabolaOffset} 190 ${60 - (parabolaCoeffA * 10) + parabolaOffset}`} 
                                      fill="none" 
                                      stroke="#06b6d4" 
                                      strokeWidth="2.5" 
                                      className="transition-all duration-300" 
                                    />
                                    {/* Plotted Roots Points circles */}
                                    <circle cx="50" cy="50" r="4" fill="#ef4444" className="animate-bounce" />
                                    <circle cx="150" cy="50" r="4" fill="#ef4444" className="animate-bounce" />
                                  </svg>

                                  <span className="absolute bottom-2 right-2 text-[9px] font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    Roots highlighted in Red
                                  </span>
                                </div>

                                {/* Slide controls */}
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex-1 flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 shrink-0">Scale Parabola (A):</span>
                                    <input 
                                      type="range" 
                                      min="0.5" 
                                      max="2" 
                                      step="0.1"
                                      value={parabolaCoeffA}
                                      onChange={(e) => setParabolaCoeffA(parseFloat(e.target.value))}
                                      className="w-full accent-cyan-400 h-1 roundedbg-slate-700 pointer-events-auto"
                                    />
                                  </div>
                                  <div className="flex-1 flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 shrink-0">Shift Curve (Offset):</span>
                                    <input 
                                      type="range" 
                                      min="-15" 
                                      max="15" 
                                      value={parabolaOffset}
                                      onChange={(e) => setParabolaOffset(parseInt(e.target.value))}
                                      className="w-full accent-cyan-400 h-1 rounded bg-slate-700 pointer-events-auto"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {demoPrompt === 'photo' && (
                            <>
                              <p className="text-white font-bold text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                                Visual Breakdown: Cellular Respiration
                              </p>
                              <p>
                                Do not think of cellular respiration as memorizing formulas. Imagine an <strong className="text-purple-400">Elite Molecular Turbine</strong>. It breaks down glucose to generate 36 units of cellular fuel (ATP)!
                              </p>
                              <p>
                                The cycle behaves in three progressive cellular environments:
                              </p>
                              
                              <div className="grid grid-cols-3 gap-3 my-4">
                                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-center leading-tight">
                                  <span className="text-[10px] font-black text-cyan-400 block">STAGE 1</span>
                                  <p className="text-white font-bold text-xs">Glycolysis</p>
                                  <span className="text-[9px] text-slate-500">Cytoplasm (2 ATP)</span>
                                </div>
                                <div className="bg-slate-900 border border-purple-800/40 p-2.5 rounded-lg text-center leading-tight">
                                  <span className="text-[10px] font-black text-purple-400 block">STAGE 2</span>
                                  <p className="text-white font-bold text-xs">Krebs Cycle</p>
                                  <span className="text-[9px] text-slate-500">Mitochondria (2 ATP)</span>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-center leading-tight">
                                  <span className="text-[10px] font-black text-blue-400 block">STAGE 3</span>
                                  <p className="text-white font-bold text-xs">ETC</p>
                                  <span className="text-[9px] text-slate-500">Membrane (32 ATP)</span>
                                </div>
                              </div>
                              <p>
                                Glucose molecules are stripped of high-energy electrons, causing a proton gradient to spin the ATP Synthase enzyme like a hydroelectric dam turbine!
                              </p>
                            </>
                          )}

                          {demoPrompt === 'code' && (
                            <>
                              <p className="text-white font-bold text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                                Stack Trace Frame: Recursion Simulator
                              </p>
                              <p>
                                Think of recursive execution like nested Russian nesting dolls. Each call pushes a new <strong className="text-emerald-400">Execution Stack Frame</strong> containing variables onto the system stack. None of these frames can dissolve until the base case acts!
                              </p>
                              <p>
                                Let&apos;s trace `factorial(3)` stacked calls visually:
                              </p>
                              
                              <div className="bg-slate-900 p-4 border border-slate-800 rounded-xl space-y-2.5 my-3 font-mono text-[11px]">
                                <div className="border border-red-500/30 bg-red-950/20 p-2 rounded-lg text-red-300">
                                  <span className="text-[10px] font-black uppercase text-red-500 block">PUSH FRAME 3</span>
                                  factorial(3) = 3 * factorial(2) <span className="text-slate-500">(Waiting...)</span>
                                </div>
                                <div className="border border-purple-500/30 bg-purple-950/20 p-2 rounded-lg text-purple-300">
                                  <span className="text-[10px] font-black uppercase text-purple-500 block">PUSH FRAME 2</span>
                                  factorial(2) = 2 * factorial(1) <span className="text-slate-500">(Waiting...)</span>
                                </div>
                                <div className="border border-emerald-500/40 bg-emerald-950/20 p-2 rounded-lg text-emerald-300">
                                  <span className="text-[10px] font-black uppercase text-emerald-500 block">BASE CASE FRAME 1 - RETURNING</span>
                                  factorial(1) = returns 1 <span className="font-extrabold text-white">✓ Solved</span>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Interactive Practice Question Widget */}
                          <div className="border border-slate-800 bg-[#0F172A]/70 rounded-xl p-5 mt-4 space-y-3 shadow-inner">
                            <span className="text-[10px] font-black text-amber-500 tracking-wider block bg-amber-950/40 border border-amber-800/30 px-2 py-0.5 rounded-full w-fit">
                              TEST YOUR RETENTION PROGRESS
                            </span>
                            
                            <p className="font-semibold text-white text-xs">
                              {demoPrompt === 'quad' && "Which of the following conditions ensures a parabola will touch the x-axis exactly once?"}
                              {demoPrompt === 'photo' && "Which stage of cellular respiration produces the largest amount of ATP energy?"}
                              {demoPrompt === 'code' && "What happens if a recursive function does not define an accessible base case?"}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {demoPrompt === 'quad' && [
                                "The discriminant (b² - 4ac) is positive",
                                "The discriminant (b² - 4ac) is negative",
                                "The discriminant (b² - 4ac) is exactly 0",
                                "The coefficient a is equal to 0"
                              ].map((opt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    if (!quizChecked) setSelectedAnswer(idx);
                                  }}
                                  className={`p-3 text-left rounded-lg text-[11px] border transition-all ${
                                    selectedAnswer === idx 
                                      ? (quizChecked && idx === 2 ? 'bg-green-950 border-green-500 text-green-300' : quizChecked ? 'bg-red-950 border-red-500 text-red-300' : 'bg-blue-600/35 border-blue-500 text-white') 
                                      : (quizChecked && idx === 2 ? 'bg-green-950/30 border-green-800 text-green-400' : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300')
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}

                              {demoPrompt === 'photo' && [
                                "Glycolysis in cytoplasmic spaces",
                                "The Krebs citric acid cycle",
                                "The membrane Electron Transport Chain (ETC)",
                                "Anaerobic lactic acid processes"
                              ].map((opt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    if (!quizChecked) setSelectedAnswer(idx);
                                  }}
                                  className={`p-3 text-left rounded-lg text-[11px] border transition-all ${
                                    selectedAnswer === idx 
                                      ? (quizChecked && idx === 2 ? 'bg-green-950 border-green-500 text-green-300' : quizChecked ? 'bg-red-950 border-red-500 text-red-300' : 'bg-blue-600/35 border-blue-500 text-white') 
                                      : (quizChecked && idx === 2 ? 'bg-green-950/30 border-green-800 text-green-400' : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300')
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}

                              {demoPrompt === 'code' && [
                                "The compiler auto-corrects the logic",
                                "Infinite loop causing Stack Overflow crash",
                                "The execution gets values from previous cache",
                                "Memory memory clears out automatically"
                              ].map((opt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    if (!quizChecked) setSelectedAnswer(idx);
                                  }}
                                  className={`p-3 text-left rounded-lg text-[11px] border transition-all ${
                                    selectedAnswer === idx 
                                      ? (quizChecked && idx === 1 ? 'bg-green-950 border-green-500 text-green-300' : quizChecked ? 'bg-red-950 border-red-500 text-red-300' : 'bg-blue-600/35 border-blue-500 text-white') 
                                      : (quizChecked && idx === 1 ? 'bg-green-950/30 border-green-800 text-green-400' : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300')
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>

                            {/* Submit verification button */}
                            <div className="flex justify-end pt-2">
                              {quizChecked ? (
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {(demoPrompt === 'quad' && selectedAnswer === 2) || (demoPrompt === 'photo' && selectedAnswer === 2) || (demoPrompt === 'code' && selectedAnswer === 1)
                                      ? "🏆 Perfectly correct answer!" 
                                      : "❌ Oops, examine explanations again!"}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setSelectedAnswer(null);
                                      setQuizChecked(false);
                                    }}
                                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300"
                                  >
                                    Try again
                                  </button>
                                </div>
                              ) : (
                                <button
                                  disabled={selectedAnswer === null}
                                  onClick={() => setQuizChecked(true)}
                                  className="px-5 py-2.5 bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 text-white rounded-lg text-[10px] font-black border border-[#00d4ff]/40 disabled:opacity-40"
                                >
                                  VERIFY MY CHOICE
                                </button>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </section>

        {/* INTERACTIVE SUBJECTS SECTION */}
        <section id="subjects" className="bg-[#0b0f24]/50 py-24 border-y border-slate-900/80">
          <div className="max-w-7xl mx-auto px-6 text-center select-none">
            <div className="space-y-4 mb-20 text-center">
              <span className="text-xs text-blue-400 font-extrabold uppercase tracking-[0.25em]">COMPREHENSIVE MULTI-SUBJECT ENVELOPE</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">Full-Spectrum Academic Support</h2>
              <p className="text-slate-400 max-w-xl mx-auto text-sm">
                From high-school calculus functions to AP historical essays, our custom neural layers deliver subject fluency configured precisely to your study objectives.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {subjects.map((subj, i) => {
                const Icon = subj.icon;
                return (
                  <div 
                    key={i}
                    onClick={onGetStarted}
                    className={`group bg-slate-950/70 hover:bg-slate-900 border ${subj.border} p-6 rounded-2xl flex flex-col items-center justify-center space-y-4 cursor-pointer hover:scale-105 hover:shadow-[0_10px_35px_rgba(0,0,0,0.4)] transition-all duration-300 overflow-hidden relative`}
                  >
                    {/* Glowing highlight bubble behind */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br ${subj.color} rounded-full blur-2xl group-hover:scale-150 transition-all duration-300 opacity-0 group-hover:opacity-100`} />
                    
                    <div className={`w-14 h-14 bg-slate-900/90 rounded-full flex items-center justify-center ${subj.text} border border-slate-800/85 relative z-10 group-hover:border-slate-700`}>
                      <Icon className="w-7 h-7" />
                    </div>

                    <div className="relative z-10 text-center">
                      <p className="font-extrabold text-[#F8FAFC] text-sm md:text-base">{subj.name}</p>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block mt-1">Practice &amp; Solvers</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center space-y-4 mb-20">
            <span className="text-xs text-purple-400 font-extrabold slider-indicator uppercase tracking-[0.25em]">AUTHENTIC SUCCESS RECORDS</span>
            <h2 className="text-3xl md:text-4xl font-black text-white">Student Success Stories</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-xs md:text-sm">
              Discover how school students are utilizing local streaks, custom notes compilations, and interactive summaries to complete their perfect study regimens.
            </p>
          </div>

          <div className="max-w-4xl mx-auto relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                className="bg-[#0F172A]/40 backdrop-blur-xl border border-slate-805 p-8 md:p-12 rounded-3xl relative shadow-2xl space-y-6 text-left"
              >
                {/* Floating Quotation Icon */}
                <Quote className="absolute top-6 right-8 w-12 h-12 text-blue-500/15 pointer-events-none" />

                {/* Rating */}
                <div className="flex text-amber-500 gap-1">
                  {[...Array(testimonials[testimonialIdx].rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-500 text-amber-500" />
                  ))}
                </div>

                <p className="text-lg md:text-xl text-slate-250 italic leading-relaxed font-serif">
                  &quot;{testimonials[testimonialIdx].quote}&quot;
                </p>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-850">
                  <div className={`w-12 h-12 ${testimonials[testimonialIdx].avatarColor} rounded-full flex items-center justify-center font-bold text-white shadow-lg`}>
                    {testimonials[testimonialIdx].name.charAt(0)}
                  </div>
                  <div className="leading-tight text-left">
                    <h4 className="font-bold text-white text-base">{testimonials[testimonialIdx].name}</h4>
                    <p className="text-xs text-slate-400">{testimonials[testimonialIdx].role}</p>
                    <span className="text-[11px] font-black text-emerald-400 mt-1 block">
                      🏅 {testimonials[testimonialIdx].achievement}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slider triggers */}
            <div className="flex items-center justify-center gap-3 mt-8">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setTestimonialIdx(idx)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    testimonialIdx === idx ? 'bg-blue-400 w-8' : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION (Strictly Present Only On This Landing Page) */}
        <section id="about" className="bg-[#020617]/95 py-24 border-t border-slate-900/80 relative">
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Visual illustration side */}
            <div className="lg:col-span-5 relative order-last lg:order-first">
              <div className="bg-[#0F172A]/70 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl text-left space-y-6">
                
                <div className="w-12 h-12 bg-purple-950 border border-purple-800/40 rounded-xl flex items-center justify-center text-purple-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  &quot;SJ Tutor AI operates with safe, aligned academic credentials. Unlike standard AI playgrounds that output hallucinated or misleading search logs, our platform processes answers directly referenced against standard educational core methodologies.&quot;
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Double-Checked Scientific Explanations</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Encrypted study tracking profile structures</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No data resale, strictly classroom focused</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/70 border border-slate-850 rounded-lg text-[10px] text-slate-500 text-center font-bold">
                  SJ SECURE LEARNING ENVIRONMENT INTEGRATION
                </div>
              </div>
            </div>

            {/* Mission Text Side */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="text-xs text-cyan-400 font-extrabold uppercase tracking-[0.25em]">ABOUT OUR MISSION</span>
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                Democratizing Elite 1-on-1 Tutoring of Every School Student
              </h2>
              
              <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                SJ Tutor AI was established with a singular, clear objective: to make highly adaptive, premium personal education available to students worldwide, unconditionally. 
              </p>
              
              <p className="text-slate-400 text-sm leading-relaxed">
                We believe that every single scholar learns at their own specific pace. Yet, contemporary classroom environments are forced to stream identical lessons to thousands of individuals without room for personalized speed adjustments.
              </p>

              <p className="text-slate-400 text-sm leading-relaxed">
                SJ Tutor AI acts as a flexible study companion. Utilizing advanced Large Language reasoning, we capture the exact knowledge gap of a student, producing customized examples, interactive curve plotting math aids, and targeted MCQs instantly. It acts like a private private educator available 24/7.
              </p>

              {/* Founder Sign-off */}
              <div className="flex items-center gap-4 pt-4 border-t border-slate-900">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                  SJ
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">S. J. Tutor AI Founders Group</h4>
                  <span className="text-[11px] text-slate-500 uppercase tracking-widest font-black block">Pristine Educational Systems Group</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* FINAL CTA SECTION (Ready to Learn Smarter?) */}
        <section className="max-w-7xl mx-auto px-6 py-24 select-none">
          <div className="bg-gradient-to-r from-[#1E293B]/40 to-[#0F172A]/80 border border-slate-800/80 rounded-3xl p-12 md:p-16 text-center shadow-2xl relative overflow-hidden">
            
            {/* Absolute colorful background elements */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[240px] h-[240px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-2xl mx-auto space-y-6 relative z-10">
              <span className="text-xs text-cyan-400 font-extrabold uppercase tracking-[0.25em]">START LEARNING NOW</span>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Ready to Learn Smarter?</h2>
              
              <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                Join thousands of students transforming their education through the smartest, most conversational AI-powered personal tutor.
              </p>

              <button 
                onClick={onGetStarted}
                className="px-10 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-505 hover:to-purple-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-blue-500/30 border border-blue-400/40 transition-all hover:scale-105 inline-flex items-center gap-3 group"
              >
                <span>Start Learning for Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>

              <p className="text-xs text-slate-500 font-medium">Claim 100 free credits upon active registration completion. No card required.</p>
            </div>
          </div>
        </section>

        {/* MINIMALIST LUXURIOUS SaaS FOOTER */}
        <footer className="border-t border-[#0F172A] py-16 bg-[#020617]/90 backdrop-blur-md relative overflow-hidden select-none">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-6 gap-8 pb-12">
            
            {/* Branding col */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <Logo className="w-10 h-10" iconOnly />
                <span className="font-extrabold text-white text-lg">SJ Tutor AI</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs text-left">
                The future of education powered by conversational artificial intelligence. Providing pristine explanations, exam quizzes, and credentials.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] font-bold">
                <CorrectGoogleLogo className="w-3.5 h-3.5" /> Checked for Google Compliance
              </div>
            </div>

            {/* Product */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#features" className="hover:text-blue-400 transition-colors">Core Features</a></li>
                <li><a href="#demo" className="hover:text-blue-400 transition-colors">Tutor Simulator</a></li>
                <li><span className="text-slate-600 cursor-not-allowed">Roadmap 2027</span></li>
              </ul>
            </div>

            {/* Capabilities */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Capabilities</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><span className="cursor-pointer hover:text-blue-400" onClick={onGetStarted}>Instant Summarizer</span></li>
                <li><span className="cursor-pointer hover:text-blue-400" onClick={onGetStarted}>Quiz Creator</span></li>
                <li><span className="cursor-pointer hover:text-blue-400" onClick={onGetStarted}>Homework Solver</span></li>
                <li><span className="cursor-pointer hover:text-blue-400" onClick={onGetStarted}>Streak Rewarder</span></li>
              </ul>
            </div>

            {/* Company / Vision */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#about" className="hover:text-blue-300 transition-colors">About Mission</a></li>
                <li><span className="text-slate-500">Press Kit</span></li>
                <li><span className="text-slate-500">Inquiry Team</span></li>
                <li><span className="text-slate-500">We are Hiring!</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Legal &amp; Policy</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><span className="cursor-pointer hover:text-blue-400">Privacy Policy</span></li>
                <li><span className="cursor-pointer hover:text-blue-400">Terms of Service</span></li>
                <li><span className="cursor-pointer hover:text-blue-400">Cookie Preferences</span></li>
              </ul>
            </div>

          </div>

          {/* Subfooter */}
          <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-900/90 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>Copyright © 2026 SJ Tutor AI Operations Group. All rights reserved.</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#00d4ff]">
              Your smart path to better grades is here.
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
