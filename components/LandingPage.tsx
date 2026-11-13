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
  Award,
  Star,
  ChevronRight,
  Globe,
  Atom,
  Check,
  Zap,
  Quote,
  Cpu,
  Mail,
  Phone,
  Target,
  Lock,
  Lightbulb,
  Shield,
  UserCheck,
  UserPlus,
  ExternalLink,
  Compass,
  Landmark,
  Sigma,
  Repeat,
  Menu,
  X,
  BarChart3,
  BookMarked,
  Dna
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import { getDeviceRegisteredUser } from '../utils/registrationDetection';
import { AccountDetectorWidget } from './auth/AccountDetectorWidget';
import {
  RotatingHeadline,
  WordReveal,
  MagneticButton,
  TiltCard3D,
  BlurFocusReveal,
  CircularImageReveal,
  ParallaxLayer,
  CounterNumber,
  CursorSpotlight,
  GradientOrbsBackdrop,
  FloatingFormulasField,
  ResilientImage,
} from './ui/MotionPrimitives';
import heroIllustrationImg from '../src/assets/images/hero_ai_tutor_scene_1794584199519.jpg';

interface LandingPageProps {
  onGetStarted: (mode?: 'signin' | 'signup', prefilledIdentifier?: string) => void;
  countryCode?: string | null;
  onNavigateToLegal?: (mode: 'PRIVACY' | 'TERMS') => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CorrectGoogleLogo: React.FC<{ className?: string; noBg?: boolean }> = ({ className = 'w-5 h-5', noBg = false }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {!noBg && <circle cx="12" cy="12" r="12" fill="white" />}
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-4.7 0-8.53 3.53-9.4 8.2l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const FEATURES_LIST = [
  {
    icon: MessageCircle,
    title: 'AI Tutor Chat',
    desc: 'Interactive step-by-step explanations with voice dictation, file analysis, and adaptive follow-up questions.',
    glow: 'from-blue-600/25 via-indigo-600/10 to-transparent',
    accent: 'text-blue-400',
    iconBg: 'bg-blue-500/15 border-blue-500/30',
  },
  {
    icon: FileText,
    title: 'Smart Notes',
    desc: 'Instant structured chapter summaries, formula sheets, and downloadable PDF or Markdown revision decks.',
    glow: 'from-violet-600/25 via-purple-600/10 to-transparent',
    accent: 'text-violet-400',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
  },
  {
    icon: BrainCircuit,
    title: 'Quiz Generator',
    desc: 'Generate syllabus-aligned MCQs, adaptive difficulty drills, and scored practice assessments in seconds.',
    glow: 'from-cyan-500/25 via-blue-600/10 to-transparent',
    accent: 'text-cyan-400',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30',
  },
  {
    icon: Award,
    title: 'Exam Preparation',
    desc: 'Full mock exam prep tailored to CBSE, ICSE, State Boards, and competitive STEM readiness checks.',
    glow: 'from-indigo-500/25 via-violet-500/10 to-transparent',
    accent: 'text-indigo-400',
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
  },
  {
    icon: BookOpen,
    title: 'Study Mode',
    desc: 'Guided chapter exploration combining visual intuition, worked examples, and distraction-free focus timers.',
    glow: 'from-blue-500/25 via-cyan-500/10 to-transparent',
    accent: 'text-sky-400',
    iconBg: 'bg-sky-500/15 border-sky-500/30',
  },
  {
    icon: Zap,
    title: 'Practice Mode',
    desc: 'Targeted problem-solving sprints that detect weak steps early and build fluency through instant hints.',
    glow: 'from-purple-500/25 via-blue-600/10 to-transparent',
    accent: 'text-purple-400',
    iconBg: 'bg-purple-500/15 border-purple-500/30',
  },
  {
    icon: Repeat,
    title: 'Revision Mode',
    desc: 'High-yield rapid recap loops, key theorems, and starred bookmarks curated right before exams.',
    glow: 'from-emerald-500/25 via-cyan-500/10 to-transparent',
    accent: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
  },
  {
    icon: Sigma,
    title: 'Formula Explanation',
    desc: 'Clear symbol-by-symbol breakdowns of mathematical theorems, physics derivations, and chemical laws.',
    glow: 'from-blue-600/25 via-sky-500/10 to-transparent',
    accent: 'text-blue-400',
    iconBg: 'bg-blue-500/15 border-blue-500/30',
  },
  {
    icon: Lightbulb,
    title: 'Concept Simplifier',
    desc: 'Turn dense textbook definitions into clear, everyday analogies and bilingual explanations on demand.',
    glow: 'from-amber-500/25 via-violet-500/10 to-transparent',
    accent: 'text-amber-300',
    iconBg: 'bg-amber-500/15 border-amber-500/30',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    desc: 'Real-time study streaks, subject mastery analytics, daily study goals, and verified milestone rewards.',
    glow: 'from-violet-600/25 via-blue-500/10 to-transparent',
    accent: 'text-violet-400',
    iconBg: 'bg-violet-500/15 border-violet-500/30',
  },
];

const SUBJECTS_LIST = [
  {
    name: 'Mathematics',
    desc: 'Algebra, Geometry, Trigonometry & Calculus solved step by step.',
    icon: Sigma,
    gradient: 'from-blue-600/20 to-indigo-600/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  {
    name: 'Physics',
    desc: 'Mechanics, Optics, Electricity & Laws verified with formulas.',
    icon: Atom,
    gradient: 'from-violet-600/20 to-purple-600/10',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
  },
  {
    name: 'Chemistry',
    desc: 'Balanced reactions, Atomic Structure & Organic pathways.',
    icon: Cpu,
    gradient: 'from-cyan-500/20 to-blue-600/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
  },
  {
    name: 'Biology',
    desc: 'Cell processes, Genetics, Human Anatomy & visual diagrams.',
    icon: Dna,
    gradient: 'from-emerald-500/20 to-teal-600/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
  {
    name: 'History',
    desc: 'Chronological timelines, World & Indian History narratives.',
    icon: Landmark,
    gradient: 'from-amber-500/20 to-orange-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
  },
  {
    name: 'Geography',
    desc: 'Earth systems, Climate patterns, Maps & Resource studies.',
    icon: Compass,
    gradient: 'from-sky-500/20 to-blue-600/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
  },
  {
    name: 'Civics',
    desc: 'Constitutional frameworks, Governance & Rights simplified.',
    icon: Shield,
    gradient: 'from-indigo-500/20 to-violet-600/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
  },
  {
    name: 'English',
    desc: 'Grammar precision, Literature analysis & Essay structuring.',
    icon: BookMarked,
    gradient: 'from-rose-500/20 to-pink-600/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
  },
  {
    name: 'Kannada',
    desc: 'ಕನ್ನಡ ವ್ಯಾಕರಣ, ಸಾಹಿತ್ಯ ವಿವರಣೆ ಮತ್ತು ಅಭ್ಯಾಸ ಪ್ರಶ್ನೆಗಳು.',
    icon: Languages,
    gradient: 'from-purple-500/20 to-amber-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
  },
];

export default function LandingPage({ onGetStarted, onNavigateToLegal }: LandingPageProps) {
  const [deviceUser, setDeviceUser] = useState(() => getDeviceRegisteredUser());
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleDetection = () => setDeviceUser(getDeviceRegisteredUser());
    window.addEventListener('sjtutor_registration_detected', handleDetection);
    return () => window.removeEventListener('sjtutor_registration_detected', handleDetection);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });

  const [demoPrompt, setDemoPrompt] = useState<'quad' | 'photo' | 'code'>('quad');
  const [demoIsTyping, setDemoIsTyping] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [parabolaCoeffA, setParabolaCoeffA] = useState(1);
  const [parabolaOffset, setParabolaOffset] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Subtle GPU-friendly particle constellation background (reads mouseRef cleanly without re-creating loop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    class Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      baseRadius: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.radius = Math.random() * 1.8 + 0.9;
        this.baseRadius = this.radius;
        const rand = Math.random();
        if (rand < 0.38) this.color = 'rgba(56, 189, 248, 0.55)';
        else if (rand < 0.72) this.color = 'rgba(139, 92, 246, 0.55)';
        else this.color = 'rgba(37, 99, 235, 0.6)';
      }

      update(mx: number, my: number) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        const dx = mx - this.x;
        const dy = my - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 160) {
          this.x += (dx / dist) * 0.35;
          this.y += (dy / dist) * 0.35;
          this.radius = this.baseRadius * 1.65;
        } else {
          this.radius = this.baseRadius;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.fill();
      }
    }

    const nodeCount = Math.min(Math.floor((width * height) / 18000), 78);
    const nodes: Node[] = Array.from({ length: nodeCount }, () => new Node());

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const grad = ctx.createRadialGradient(width / 2, height / 3, 60, width / 2, height / 2, Math.max(width, height));
      grad.addColorStop(0, '#091233');
      grad.addColorStop(1, '#04091E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < nodes.length; i++) {
        nodes[i].update(mx, my);
        nodes[i].draw(ctx);
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 115) {
            const alpha = (1 - dist / 115) * 0.22;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
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
  }, []);

  useEffect(() => {
    setDemoIsTyping(true);
    setSelectedAnswer(null);
    setQuizChecked(false);
    const timer = setTimeout(() => setDemoIsTyping(false), 950);
    return () => clearTimeout(timer);
  }, [demoPrompt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % 3);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const testimonials = [
    {
      name: 'Marcus Aurelius Cheney',
      role: 'Class 11 Science Student',
      achievement: 'Improved Chemistry grade from C to A+',
      quote: 'SJ Tutor AI completely transformed how I study. The instant step-by-step explanations make complex chemical bonding details as clear as day.',
      rating: 5,
      avatarColor: 'bg-gradient-to-tr from-cyan-400 to-blue-600',
    },
    {
      name: 'Sabrina Patel',
      role: 'AP & Class 12 Calculus Student',
      achievement: 'Mastered Integration & Roots',
      quote: 'I used to sit stuck on difficult integration problems for hours. SJ Tutor AI explains exactly where I went wrong and builds practice quizzes to lock in the logic.',
      rating: 5,
      avatarColor: 'bg-gradient-to-tr from-violet-500 to-indigo-600',
    },
    {
      name: 'Alexander Vance',
      role: 'Undergraduate STEM Scholar',
      achievement: 'Completed Exam Prep Track',
      quote: 'The personalized study paths adjusted smoothly to my visual style. SJ Tutor AI walks you through concepts clearly with interactive notes.',
      rating: 5,
      avatarColor: 'bg-gradient-to-tr from-blue-500 to-purple-600',
    },
  ];

  const navLinks = [
    { label: 'Home', href: '#top' },
    { label: 'Features', href: '#features' },
    { label: 'Subjects', href: '#subjects' },
    { label: 'About Us', href: '#about' },
  ];

  return (
    <div id="top" className="bg-[#04091E] text-[#F8FAFC] font-sans overflow-x-hidden min-h-screen relative selection:bg-blue-600/35 selection:text-white">
      {/* Ambient Background Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full opacity-90" />
        <GradientOrbsBackdrop />
        <div className="absolute inset-0 bg-gradient-to-b from-[#04091E]/30 via-[#04091E]/55 to-[#04091E]" />
      </div>
      <CursorSpotlight />

      {/* NAVBAR (Slides down on load, glassier on scroll, magnetic buttons, staggered mobile menu) */}
      <motion.header
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
        className={`sticky top-0 z-50 transition-all duration-300 border-b ${
          isScrolled
            ? 'bg-[#050B24]/85 backdrop-blur-2xl border-blue-500/20 shadow-[0_8px_32px_rgba(3,7,28,0.65)]'
            : 'bg-[#04091E]/55 backdrop-blur-md border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <a href="#top" className="flex items-center gap-3 shrink-0 group">
            <motion.div
              whileHover={{ rotate: 6, scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600/25 to-violet-600/25 border border-blue-400/30 p-0.5 shadow-lg shadow-blue-500/15"
            >
              <Logo className="w-full h-full" iconOnly noBorder />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                SJ Tutor <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">AI</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.22em] font-semibold text-blue-300/80 whitespace-nowrap mt-0.5">
                AI LEARNING PLATFORM
              </span>
            </div>
          </a>

          {/* Desktop Navigation with animated underline */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative py-1 text-sm font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 group"
              >
                <span>{link.label}</span>
                <span className="absolute left-0 -bottom-0.5 h-[2px] w-0 bg-gradient-to-r from-blue-400 to-violet-400 transition-all duration-300 group-hover:w-full rounded-full" />
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <MagneticButton
              onClick={() => onGetStarted('signin', deviceUser.hasRegistered ? (deviceUser.email || deviceUser.sjTutorId) : undefined)}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Login
            </MagneticButton>

            <MagneticButton
              onClick={() => onGetStarted(deviceUser.hasRegistered ? 'signin' : 'signup', deviceUser.hasRegistered ? (deviceUser.email || deviceUser.sjTutorId) : undefined)}
              className="btn-liquid inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/25 border border-blue-400/30 whitespace-nowrap shrink-0"
            >
              <span>{deviceUser.hasRegistered ? 'Continue Learning' : 'Get Started'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </MagneticButton>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Staggered Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
              className="md:hidden border-t border-white/10 bg-[#050C26]/95 backdrop-blur-2xl overflow-hidden"
            >
              <div className="px-5 py-4 space-y-2">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.25 }}
                    className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                  </motion.a>
                ))}
                <div className="pt-2 flex gap-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onGetStarted('signin', deviceUser.email || deviceUser.sjTutorId);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onGetStarted('signup');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-xs font-bold text-white"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
          <FloatingFormulasField className="opacity-65" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center relative z-10">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* 3D Zoom Entrance for SJ Tutor AI Mark + Unboxed Eyebrow */}
              <div className="flex items-center gap-3.5">
                <motion.div
                  initial={{ scale: 0.35, rotateY: -28, opacity: 0 }}
                  animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.75, ease: EASE_OUT_EXPO }}
                  style={{ perspective: 900 }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/25 via-indigo-500/20 to-violet-500/25 border border-blue-400/35 p-1 shadow-[0_0_32px_rgba(37,99,235,0.35)] shrink-0"
                >
                  <Logo className="w-full h-full" iconOnly noBorder />
                </motion.div>
                <div>
                  <motion.p
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, delay: 0.12, ease: EASE_OUT_EXPO }}
                    className="text-xs font-extrabold uppercase tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-300 to-violet-300"
                  >
                    SJ TUTOR AI · FUTURE-READY EDUCATION
                  </motion.p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Classes 6–12 · Competitive Prep · Bilingual Support
                  </p>
                </div>
              </div>

              {/* Main Rotating Heading */}
              <div className="min-h-[112px] sm:min-h-[130px] flex items-center">
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-black text-white leading-[1.08] tracking-tight">
                  <RotatingHeadline
                    phrases={[
                      'Your Personal AI Tutor',
                      'Learn Smarter Every Day',
                      'Your AI-Powered Study Partner',
                    ]}
                    className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-violet-300"
                  />
                </h1>
              </div>

              {/* Word-by-word description reveal */}
              <div className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
                <WordReveal
                  text="Master mathematics, science, languages, and exams with step-by-step AI explanations, smart study notes, adaptive quizzes, and live progress analytics."
                  delay={0.18}
                  stagger={0.025}
                />
              </div>

              {/* Action Buttons (Get Started elastic zoom + Login slides in from right) */}
              <div className="flex flex-col sm:flex-row gap-3.5 pt-1">
                <motion.div
                  initial={{ scale: 0.72, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.25 }}
                >
                  <MagneticButton
                    onClick={() => onGetStarted('signup')}
                    className="btn-liquid w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl font-bold text-base shadow-[0_12px_36px_rgba(37,99,235,0.38)] border border-blue-400/40 flex items-center justify-center gap-2.5 group"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </MagneticButton>
                </motion.div>

                <motion.div
                  initial={{ x: 28, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.32, ease: EASE_OUT_EXPO }}
                >
                  <MagneticButton
                    onClick={() => onGetStarted('signin', deviceUser.email || deviceUser.sjTutorId)}
                    className="w-full sm:w-auto px-7 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-base border border-blue-400/25 hover:border-blue-400/50 backdrop-blur-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Login to Portal</span>
                  </MagneticButton>
                </motion.div>
              </div>

              {/* Smart Registration Detection Card */}
              <BlurFocusReveal delay={0.35} yOffset={14}>
                {deviceUser.hasRegistered ? (
                  <div className="p-4 rounded-2xl bg-[#0A1638]/85 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                          Registered Device Account
                        </p>
                        <p className="text-sm font-bold text-white truncate">
                          Welcome back{deviceUser.name ? `, ${deviceUser.name}` : ''}!
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onGetStarted('signin', deviceUser.email || deviceUser.sjTutorId)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <span>Resume Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#0A1638]/80 border border-blue-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl backdrop-blur-md">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                          10-Day Free Trial Included
                        </p>
                        <p className="text-sm font-bold text-white">
                          Claim your official SJ Tutor AI Student ID
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onGetStarted('signup')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <span>Create Student ID</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </BlurFocusReveal>

              {/* Live Account Registration Lookup */}
              <div>
                <AccountDetectorWidget
                  variant="landing"
                  onSelectAction={(mode, id) => onGetStarted(mode, id)}
                />
              </div>

              {/* Clean Metric Baseline Strip */}
              <div className="pt-5 border-t border-white/10 grid grid-cols-3 gap-4">
                <div>
                  <div className="flex text-amber-400 gap-0.5 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Rated by Students</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white tabular-nums">10,000+</p>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Active Learners</p>
                </div>
                <div>
                  <p className="text-xl font-extrabold text-white tabular-nums">24/7</p>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">AI Availability</p>
                </div>
              </div>
            </div>

            {/* Right Column: Floating 3D Hero AI Artwork + Live Portal Card */}
            <div className="lg:col-span-6 relative">
              <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-600/25 rounded-full blur-[110px] pointer-events-none" />
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-violet-600/25 rounded-full blur-[110px] pointer-events-none" />

              <ParallaxLayer offset={18}>
                <motion.div
                  initial={{ opacity: 0, y: 24, rotateY: 10 }}
                  animate={{ opacity: 1, y: 0, rotateY: 0 }}
                  transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
                  className="animate-float-subtle"
                >
                  <TiltCard3D maxTilt={5} className="glow-border-card bg-[#0A1332]/85 backdrop-blur-2xl border border-blue-400/25 rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(4,9,30,0.85)] p-4 sm:p-5">
                    {/* Browser Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-3.5 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400/90" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
                      </div>
                      <span className="text-[11px] font-bold tracking-[0.18em] text-blue-300 uppercase">
                        SJ TUTOR AI STUDIO
                      </span>
                    </div>

                    {/* Generated Futuristic Educational Artwork */}
                    <CircularImageReveal delay={0.15} className="rounded-2xl overflow-hidden border border-blue-500/20 mb-4 aspect-video bg-[#070E28]">
                      <ResilientImage
                        src={heroIllustrationImg}
                        alt="SJ Tutor AI Holographic Learning Workspace"
                        className="w-full h-full object-cover"
                        fallbackTitle="SJ Tutor AI Smart Workspace"
                      />
                    </CircularImageReveal>

                    {/* Compact Interactive Highlights */}
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="bg-[#050C24]/80 border border-white/10 p-3.5 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">ADAPTIVE MODES</p>
                        <p className="text-sm font-bold text-white mt-0.5">Study · Practice · Revision</p>
                        <p className="text-[11px] text-slate-400 mt-1">Instant summaries & quizzes</p>
                      </div>
                      <div className="bg-[#050C24]/80 border border-white/10 p-3.5 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400">PROGRESS TRACKER</p>
                        <p className="text-sm font-bold text-white mt-0.5 tabular-nums">92.4% Concept Mastery</p>
                        <p className="text-[11px] text-slate-400 mt-1">Streaks & daily study goals</p>
                      </div>
                    </div>
                  </TiltCard3D>
                </motion.div>
              </ParallaxLayer>
            </div>
          </div>
        </section>

        {/* TRUSTED & ANIMATED STATISTICS STRIP */}
        <section className="border-y border-white/10 bg-[#060E2A]/60 py-12 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tabular-nums">
                  <CounterNumber value={10000} suffix="+" />
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mt-1">Active Students</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400 tabular-nums">
                  <CounterNumber value={1000000} suffix="+" />
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mt-1">Questions Solved</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400 tabular-nums">
                  <CounterNumber value={95} suffix="%" />
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mt-1">Academic Confidence</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300 tabular-nums">
                  24/7
                </p>
                <p className="text-xs uppercase tracking-widest font-bold text-slate-400 mt-1">Tutor Accessibility</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION (All 10 Capabilities with 3D Tilt, Glowing Borders & Animated Icons) */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
          <BlurFocusReveal className="text-center space-y-3 mb-14">
            <p className="text-xs text-blue-400 font-extrabold uppercase tracking-[0.25em]">COMPLETE STUDY ECOSYSTEM</p>
            <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white">
              Ten Intelligent Tools for Faster Mastery
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
              Built around how students actually learn — from instant doubt clearing to exam revision and streak accountability.
            </p>
          </BlurFocusReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {FEATURES_LIST.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <BlurFocusReveal key={feat.title} delay={i * 0.045} yOffset={18}>
                  <TiltCard3D
                    maxTilt={7}
                    onClick={() => onGetStarted('signup')}
                    className="glow-border-card group h-full bg-[#091230]/80 hover:bg-[#0D1840]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 cursor-pointer transition-colors duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    <div className={`absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br ${feat.glow} rounded-full blur-2xl opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500`} />
                    <div className="relative z-10 space-y-3.5 text-left">
                      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${feat.iconBg} ${feat.accent} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                        {feat.title}
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                    <div className="relative z-10 flex items-center gap-1 text-xs font-semibold text-blue-400 mt-4 opacity-80 group-hover:opacity-100">
                      <span>Try feature</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </TiltCard3D>
                </BlurFocusReveal>
              );
            })}
          </div>
        </section>

        {/* SUBJECTS SECTION (All 9 Requested Subjects) */}
        <section id="subjects" className="bg-[#060D28]/70 py-20 lg:py-24 border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <BlurFocusReveal className="text-center space-y-3 mb-14">
              <p className="text-xs text-violet-400 font-extrabold uppercase tracking-[0.25em]">CURRICULUM COVERAGE</p>
              <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white">
                Subjects Supported Across Every Grade
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
                Clear concept explanations, chapter summaries, and practice quizzes tailored across Science, Humanities, and Languages.
              </p>
            </BlurFocusReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SUBJECTS_LIST.map((subj, idx) => {
                const Icon = subj.icon;
                return (
                  <BlurFocusReveal key={subj.name} delay={idx * 0.05} yOffset={16}>
                    <TiltCard3D
                      maxTilt={6}
                      onClick={() => onGetStarted('signup')}
                      className={`group h-full bg-[#091230]/85 hover:bg-[#0D1942] border ${subj.border} p-6 rounded-2xl cursor-pointer transition-all duration-300 flex items-start gap-4 text-left overflow-hidden relative`}
                    >
                      <div className={`absolute -right-8 -bottom-8 w-32 h-32 bg-gradient-to-br ${subj.gradient} rounded-full blur-2xl opacity-40 group-hover:opacity-100 transition-opacity`} />
                      <div className={`w-12 h-12 rounded-2xl bg-[#04091E] border border-white/10 flex items-center justify-center ${subj.text} shrink-0 relative z-10 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-lg font-extrabold text-white group-hover:text-blue-200 transition-colors">
                          {subj.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {subj.desc}
                        </p>
                      </div>
                    </TiltCard3D>
                  </BlurFocusReveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="py-20 lg:py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <BlurFocusReveal className="text-center space-y-3 mb-14">
              <p className="text-xs text-blue-400 font-extrabold uppercase tracking-[0.25em]">LEARNING LOOP</p>
              <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white">
                Learn Smarter in Four Simple Steps
              </h2>
            </BlurFocusReveal>

            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'Ask Any Question', desc: 'Type a formula, upload homework photos or PDFs, or speak directly with voice dictation.' },
                { step: '02', title: 'Receive Clear Breakdowns', desc: 'Get streaming step-by-step explanations tuned to your grade level and preferred language.' },
                { step: '03', title: 'Practice with Quizzes', desc: 'Reinforce each topic immediately with custom quizzes and instant answer feedback.' },
                { step: '04', title: 'Track Your Mastery', desc: 'Maintain daily streaks, monitor subject progress bars, and achieve your study goals.' },
              ].map((s, i) => (
                <BlurFocusReveal key={s.step} delay={i * 0.08}>
                  <div className="h-full bg-[#091230]/75 border border-white/10 p-6 rounded-2xl hover:border-blue-400/40 transition-colors text-left">
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-2xl font-black font-mono text-blue-400/60 tabular-nums">{s.step}</span>
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </BlurFocusReveal>
              ))}
            </div>
          </div>
        </section>

        {/* INTERACTIVE AI TUTOR DEMO SECTION */}
        <section id="demo" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-4 space-y-5 text-left">
              <p className="text-xs text-cyan-400 font-extrabold uppercase tracking-[0.25em]">INTERACTIVE PREVIEW</p>
              <h2 className="font-display text-3xl md:text-4xl font-black text-white leading-tight">
                Live AI Tutor Lesson Explorer
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Select a concept below to preview interactive visual plotting, structured stage cards, and retention checks.
              </p>

              <div className="space-y-3">
                {[
                  { id: 'quad', label: 'Explain Quadratic Equations', desc: 'Formula & interactive parabola graph', icon: Sigma },
                  { id: 'photo', label: 'Solve Cell Respiration', desc: 'Multi-stage ATP biology breakdown', icon: Atom },
                  { id: 'code', label: 'Python Stack Recursion', desc: 'Execution stack frame visualizer', icon: BrainCircuit },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDemoPrompt(item.id as 'quad' | 'photo' | 'code')}
                    className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 transition-all ${
                      demoPrompt === item.id
                        ? 'bg-blue-600/20 border-blue-400 font-bold text-white shadow-lg shadow-blue-600/15'
                        : 'bg-[#091230]/70 border-white/10 hover:border-blue-400/35 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      demoPrompt === item.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <span className="text-[11px] text-slate-400">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="bg-[#091230]/90 border border-blue-500/25 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[480px]">
                <div className="bg-[#050C24]/90 p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <Logo className="w-full h-full" iconOnly noBorder />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">SJ Tutor AI Companion</p>
                      <span className="text-[11px] text-blue-300 flex items-center gap-1">
                        <CorrectGoogleLogo className="w-3 h-3 inline" /> Concept Simulator Mode
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold tracking-wider text-cyan-300 uppercase">INTERACTIVE DEMO</span>
                </div>

                <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[440px] custom-scrollbar">
                  <div className="flex items-start gap-3 justify-end">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl rounded-tr-none text-xs sm:text-sm max-w-md text-left font-medium shadow-md">
                      {demoPrompt === 'quad' && 'Can you explain what quadratic equation roots represent and how to visualize them?'}
                      {demoPrompt === 'photo' && 'Can you give me a clear stage-by-stage visual guide of cellular respiration?'}
                      {demoPrompt === 'code' && 'How does recursion work inside stack memory during execution?'}
                    </div>
                  </div>

                  {demoIsTyping ? (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-blue-400/30 flex items-center justify-center shrink-0">
                        <Logo className="w-full h-full" iconOnly noBorder />
                      </div>
                      <div className="bg-[#050C24]/80 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-none text-xs text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0.12s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0.24s' }} />
                        <span className="ml-1">Formulating visual breakdown...</span>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-blue-400/30 flex items-center justify-center shrink-0">
                        <Logo className="w-full h-full" iconOnly noBorder />
                      </div>

                      <div className="space-y-4 text-left max-w-2xl bg-[#050C24]/75 p-5 border border-white/10 rounded-2xl rounded-tl-none">
                        <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3">
                          {demoPrompt === 'quad' && (
                            <>
                              <p className="text-white font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                                Interactive Lesson: Parabolas & Roots
                              </p>
                              <p>
                                A quadratic equation shapes a symmetric <strong className="text-cyan-300">Parabola</strong>. Solving ax² + bx + c = 0 finds where the curve crosses the x-axis.
                              </p>
                              <div className="bg-[#091230] p-3 rounded-xl border border-white/10 font-mono text-center text-sm font-semibold text-white">
                                x = (-b ± √(b² - 4ac)) / 2a
                              </div>

                              <div className="bg-[#091230] border border-white/10 p-4 rounded-xl space-y-3">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                  <span>PARABOLA COORDINATES PLOTTER</span>
                                  <span className="text-cyan-300 tabular-nums">y = {parabolaCoeffA}x² - 4x + {3 + parabolaOffset}</span>
                                </div>

                                <div className="h-28 bg-[#04091E] border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center">
                                  <div className="absolute h-[1px] w-full bg-slate-700/70 top-1/2 left-0" />
                                  <div className="absolute w-[1px] h-full bg-slate-700/70 left-1/2 top-0" />
                                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100">
                                    <path
                                      d={`M 10 ${60 - parabolaCoeffA * 10 + parabolaOffset} Q 100 ${90 + parabolaOffset} 190 ${60 - parabolaCoeffA * 10 + parabolaOffset}`}
                                      fill="none"
                                      stroke="#38BDF8"
                                      strokeWidth="2.5"
                                    />
                                    <circle cx="50" cy="50" r="4" fill="#A855F7" />
                                    <circle cx="150" cy="50" r="4" fill="#A855F7" />
                                  </svg>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                                    <span className="shrink-0">Scale (A):</span>
                                    <input
                                      type="range"
                                      min="0.5"
                                      max="2"
                                      step="0.1"
                                      value={parabolaCoeffA}
                                      onChange={(e) => setParabolaCoeffA(parseFloat(e.target.value))}
                                      className="w-full accent-blue-400"
                                    />
                                  </label>
                                  <label className="flex items-center gap-2 text-[11px] text-slate-300">
                                    <span className="shrink-0">Offset:</span>
                                    <input
                                      type="range"
                                      min="-15"
                                      max="15"
                                      value={parabolaOffset}
                                      onChange={(e) => setParabolaOffset(parseInt(e.target.value, 10))}
                                      className="w-full accent-violet-400"
                                    />
                                  </label>
                                </div>
                              </div>
                            </>
                          )}

                          {demoPrompt === 'photo' && (
                            <>
                              <p className="text-white font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                                Visual Breakdown: Cellular Respiration
                              </p>
                              <p>Cells convert glucose into ~36 ATP across three stages:</p>
                              <div className="grid grid-cols-3 gap-2.5">
                                <div className="bg-[#091230] border border-white/10 p-2.5 rounded-xl text-center">
                                  <span className="text-[10px] font-bold text-cyan-400 block">STAGE 1</span>
                                  <p className="text-white font-bold text-xs mt-0.5">Glycolysis</p>
                                  <span className="text-[10px] text-slate-400">Cytoplasm · 2 ATP</span>
                                </div>
                                <div className="bg-[#091230] border border-violet-500/30 p-2.5 rounded-xl text-center">
                                  <span className="text-[10px] font-bold text-violet-400 block">STAGE 2</span>
                                  <p className="text-white font-bold text-xs mt-0.5">Krebs Cycle</p>
                                  <span className="text-[10px] text-slate-400">Matrix · 2 ATP</span>
                                </div>
                                <div className="bg-[#091230] border border-blue-500/30 p-2.5 rounded-xl text-center">
                                  <span className="text-[10px] font-bold text-blue-400 block">STAGE 3</span>
                                  <p className="text-white font-bold text-xs mt-0.5">ETC</p>
                                  <span className="text-[10px] text-slate-400">Membrane · 32 ATP</span>
                                </div>
                              </div>
                            </>
                          )}

                          {demoPrompt === 'code' && (
                            <>
                              <p className="text-white font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                                Call Stack Visualizer: Recursion
                              </p>
                              <p>Each recursive function call allocates its own stack frame until a base condition resolves:</p>
                              <div className="bg-[#091230] p-3.5 border border-white/10 rounded-xl space-y-2 font-mono text-xs">
                                <div className="border border-blue-500/30 bg-blue-950/30 p-2 rounded-lg text-blue-200">
                                  FRAME 3 · factorial(3) = 3 * factorial(2)
                                </div>
                                <div className="border border-violet-500/30 bg-violet-950/30 p-2 rounded-lg text-violet-200">
                                  FRAME 2 · factorial(2) = 2 * factorial(1)
                                </div>
                                <div className="border border-emerald-500/30 bg-emerald-950/30 p-2 rounded-lg text-emerald-300">
                                  BASE CASE · factorial(1) returns 1
                                </div>
                              </div>
                            </>
                          )}

                          {/* Quick Interactive Retention Quiz */}
                          <div className="border border-white/10 bg-[#091230]/80 rounded-xl p-4 space-y-3">
                            <p className="text-[10px] font-extrabold text-blue-300 uppercase tracking-wider">
                              QUICK CONCEPT CHECK
                            </p>
                            <p className="font-semibold text-white text-xs">
                              {demoPrompt === 'quad' && 'Which discriminant condition gives a parabola exactly one real root touching the x-axis?'}
                              {demoPrompt === 'photo' && 'Which stage generates the largest yield of ATP during cellular respiration?'}
                              {demoPrompt === 'code' && 'What happens when a recursive function omits an attainable base case?'}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(demoPrompt === 'quad'
                                ? ['b² - 4ac > 0', 'b² - 4ac < 0', 'b² - 4ac = 0', 'a = 0']
                                : demoPrompt === 'photo'
                                ? ['Glycolysis', 'Krebs Cycle', 'Electron Transport Chain', 'Fermentation']
                                : ['Compiler auto-resolves', 'Stack Overflow recursion error', 'Returns zero safely', 'Clears memory']
                              ).map((opt, idx) => {
                                const correctIdx = demoPrompt === 'code' ? 1 : 2;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => !quizChecked && setSelectedAnswer(idx)}
                                    className={`p-2.5 text-left rounded-lg text-xs border transition-all ${
                                      selectedAnswer === idx
                                        ? quizChecked
                                          ? idx === correctIdx
                                            ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                            : 'bg-rose-950 border-rose-500 text-rose-300'
                                          : 'bg-blue-600/30 border-blue-400 text-white'
                                        : quizChecked && idx === correctIdx
                                        ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                                        : 'bg-[#04091E] border-white/10 hover:border-blue-400/40 text-slate-300'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex justify-end items-center gap-3">
                              {quizChecked ? (
                                <>
                                  <span className="text-xs text-slate-300">
                                    {selectedAnswer === (demoPrompt === 'code' ? 1 : 2) ? 'Correct answer!' : 'Review explanation above and try again.'}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setSelectedAnswer(null);
                                      setQuizChecked(false);
                                    }}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-bold text-white"
                                  >
                                    Reset
                                  </button>
                                </>
                              ) : (
                                <button
                                  disabled={selectedAnswer === null}
                                  onClick={() => setQuizChecked(true)}
                                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-40"
                                >
                                  Check Answer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <BlurFocusReveal className="text-center space-y-3 mb-12">
            <p className="text-xs text-violet-400 font-extrabold uppercase tracking-[0.25em]">STUDENT OUTCOMES</p>
            <h2 className="font-display text-3xl md:text-4xl font-black text-white">Student Success Stories</h2>
          </BlurFocusReveal>

          <div className="max-w-4xl mx-auto relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.45 }}
                className="bg-[#091230]/80 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-3xl relative shadow-2xl space-y-5 text-left"
              >
                <Quote className="absolute top-6 right-8 w-10 h-10 text-blue-500/20 pointer-events-none" />
                <div className="flex text-amber-400 gap-1">
                  {[...Array(testimonials[testimonialIdx].rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-base md:text-xl text-slate-200 leading-relaxed">
                  &quot;{testimonials[testimonialIdx].quote}&quot;
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  <div className={`w-11 h-11 ${testimonials[testimonialIdx].avatarColor} rounded-full flex items-center justify-center font-bold text-white shadow-lg`}>
                    {testimonials[testimonialIdx].name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{testimonials[testimonialIdx].name}</h4>
                    <p className="text-xs text-slate-400">{testimonials[testimonialIdx].role} · {testimonials[testimonialIdx].achievement}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-2.5 mt-6">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setTestimonialIdx(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    testimonialIdx === idx ? 'bg-blue-400 w-7' : 'bg-slate-700 hover:bg-slate-600 w-2.5'
                  }`}
                  aria-label={`Testimonial ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT US SECTION */}
        <section id="about" className="bg-[#050B22]/90 py-20 lg:py-24 border-t border-white/10 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 space-y-14">
            <BlurFocusReveal className="text-center space-y-3 max-w-3xl mx-auto">
              <p className="text-xs text-cyan-400 font-extrabold uppercase tracking-[0.25em]">ABOUT SJ TUTOR AI</p>
              <h2 className="font-display text-3xl md:text-5xl font-black text-white leading-tight">
                Empowering Students with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400">
                  Intelligent Learning
                </span>
              </h2>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                Designed to simplify complex concepts, generate adaptive study notes, and offer 24/7 academic mentoring with strict student privacy safeguards.
              </p>
            </BlurFocusReveal>

            {/* Innovators Spotlight */}
            <BlurFocusReveal>
              <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-blue-400/20 rounded-3xl p-6 sm:p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Innovators & Inventors</h3>
                    <p className="text-xs text-slate-400">Creators pioneering the SJ Tutor AI platform</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="bg-[#091230]/80 border border-white/10 p-5 rounded-2xl flex items-start gap-4 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-lg flex items-center justify-center shrink-0">
                      SJ
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Lead Innovator & Founder</p>
                      <h4 className="text-base font-bold text-white mt-0.5">Sadanand Jyoti</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Architect behind SJ Tutor AI&apos;s personalized study workflows, adaptive tutoring frameworks, and student identity network.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#091230]/80 border border-white/10 p-5 rounded-2xl flex items-start gap-4 text-left">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-black text-lg flex items-center justify-center shrink-0">
                      SP
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Innovator & Co-Inventor</p>
                      <h4 className="text-base font-bold text-white mt-0.5">Samanyu S Patil</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Co-inventor pioneering smart learning algorithms, automated revision kits, and interactive student practice tools.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </BlurFocusReveal>

            {/* Mission, Core Values, Safety & Contact */}
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="bg-[#091230]/75 border border-white/10 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Our Mission</h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  To democratize high-quality personalized education so every learner has a patient mentor attuned to their syllabus, speed, and preferred language.
                </p>
              </div>

              <div className="bg-[#091230]/75 border border-white/10 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Privacy & Student Safety</h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Encrypted student profiles with optional 2-step & PIN lock</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Zero sale of student study records to advertisers</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Block */}
            <div id="contact" className="bg-[#091230]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl grid md:grid-cols-2 gap-6 items-center text-left">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">CONTACT TEAM</p>
                <h3 className="text-2xl font-black text-white">Have questions about SJ Tutor AI?</h3>
                <p className="text-slate-400 text-sm mt-2">
                  Reach out directly for school partnerships, feedback, or student account assistance.
                </p>
              </div>
              <div className="space-y-3">
                <a
                  href="mailto:sadanandj2011@gmail.com"
                  className="flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors"
                >
                  <Mail className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Email</p>
                    <p className="font-mono text-xs sm:text-sm text-white">sadanandj2011@gmail.com</p>
                  </div>
                </a>
                <a
                  href="tel:+918105423488"
                  className="flex items-center gap-3.5 p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors"
                >
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Phone</p>
                    <p className="font-mono text-xs sm:text-sm text-white">+91 8105423488</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
          <BlurFocusReveal className="text-center space-y-3 mb-14">
            <p className="text-xs text-blue-400 font-extrabold uppercase tracking-[0.25em]">FLEXIBLE PLANS</p>
            <h2 className="font-display text-3xl md:text-5xl font-black text-white">Choose Your Learning Plan</h2>
          </BlurFocusReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <div className="bg-[#091230]/80 border border-white/10 p-7 rounded-3xl flex flex-col justify-between text-left">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Basic Explorer</h3>
                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold font-mono tabular-nums">₹0</span>
                  <span className="text-xs text-slate-400 uppercase font-bold">/ Free Trial</span>
                </div>
                <p className="text-xs text-slate-400">10-day unlimited AI trial plus 100 free starter credits.</p>
                <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> AI Tutor, Summaries & Quizzes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Official Student ID Card</li>
                </ul>
              </div>
              <button
                onClick={() => onGetStarted('signup')}
                className="w-full mt-7 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            <TiltCard3D maxTilt={4} className="bg-gradient-to-b from-[#131F4D] to-[#0A1130] border border-blue-400/50 p-7 rounded-3xl flex flex-col justify-between shadow-[0_0_50px_rgba(37,99,235,0.22)] text-left relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Academic Pro</h3>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300">MOST POPULAR</span>
                </div>
                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-5xl font-black font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-violet-300">₹999</span>
                  <span className="text-xs text-slate-400 uppercase font-bold">/ Month</span>
                </div>
                <p className="text-xs text-slate-300">Unlimited AI study guidance, mock exam prep, and bonus learning credits.</p>
                <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Unlimited AI Tutoring & Doubts</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Interactive Quizzes & Exam Prep</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> 500 Bonus Monthly Credits</li>
                </ul>
              </div>
              <MagneticButton
                onClick={() => onGetStarted('signup')}
                className="btn-liquid w-full mt-7 py-3.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30"
              >
                Get Academic Pro
              </MagneticButton>
            </TiltCard3D>

            <div className="bg-[#091230]/80 border border-white/10 p-7 rounded-3xl flex flex-col justify-between text-left">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Institution Portal</h3>
                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold font-mono tabular-nums">₹7,499</span>
                  <span className="text-xs text-slate-400 uppercase font-bold">/ Month</span>
                </div>
                <p className="text-xs text-slate-400">For schools and coaching academies deploying AI study companions at scale.</p>
                <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Shared Study Groups & Analytics</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Priority Support & Onboarding</li>
                </ul>
              </div>
              <button
                onClick={() => onGetStarted('signup')}
                className="w-full mt-7 py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors"
              >
                Connect with Team
              </button>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
          <BlurFocusReveal>
            <div className="bg-gradient-to-r from-[#0E1A44] via-[#13184A] to-[#1D1245] border border-blue-400/25 rounded-3xl p-10 md:p-14 text-center shadow-2xl relative overflow-hidden">
              <div className="max-w-2xl mx-auto space-y-5 relative z-10">
                <p className="text-xs text-cyan-300 font-extrabold uppercase tracking-[0.25em]">START TODAY</p>
                <h2 className="font-display text-3xl md:text-5xl font-black text-white tracking-tight">
                  Ready to Learn Smarter?
                </h2>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  Join thousands of learners mastering concepts with SJ Tutor AI. Claim your 10-day free trial and 100 starter credits.
                </p>
                <MagneticButton
                  onClick={() => onGetStarted('signup')}
                  className="btn-liquid px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-2xl font-bold text-base shadow-2xl shadow-blue-600/35 border border-blue-400/40 inline-flex items-center gap-2.5"
                >
                  <span>Start Learning Free</span>
                  <ArrowRight className="w-5 h-5" />
                </MagneticButton>
              </div>
            </div>
          </BlurFocusReveal>
        </section>

        {/* ANIMATED FOOTER */}
        <footer className="border-t border-white/10 py-14 bg-[#030718]/95 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-5 gap-8 pb-10">
            <div className="col-span-2 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/30 p-0.5">
                  <Logo className="w-full h-full" iconOnly noBorder />
                </div>
                <span className="font-display font-extrabold text-white text-lg">SJ Tutor AI</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                About SJ Tutor AI: An intelligent educational platform built to help students understand every subject with clarity, practice quizzes, and verified progress tracking.
              </p>
              <a
                href="https://sjtutorai.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>sjtutorai.vercel.app</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-3 text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#top" className="hover:text-blue-400 transition-colors">Home</a></li>
                <li><a href="#features" className="hover:text-blue-400 transition-colors">Features</a></li>
                <li><a href="#subjects" className="hover:text-blue-400 transition-colors">Subjects</a></li>
                <li><a href="#about" className="hover:text-blue-400 transition-colors">About Us</a></li>
              </ul>
            </div>

            <div className="space-y-3 text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Features</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><button onClick={() => onGetStarted('signup')} className="hover:text-blue-400 transition-colors">AI Tutor Chat</button></li>
                <li><button onClick={() => onGetStarted('signup')} className="hover:text-blue-400 transition-colors">Smart Notes</button></li>
                <li><button onClick={() => onGetStarted('signup')} className="hover:text-blue-400 transition-colors">Quiz Generator</button></li>
                <li><button onClick={() => onGetStarted('signup')} className="hover:text-blue-400 transition-colors">Progress Tracking</button></li>
              </ul>
            </div>

            <div className="space-y-3 text-left">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Contact & Legal</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><a href="#contact" className="hover:text-blue-400 transition-colors">Contact Us</a></li>
                <li>
                  <button
                    onClick={() => onNavigateToLegal?.('PRIVACY')}
                    className="hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigateToLegal?.('TERMS')}
                    className="hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    Terms of Service
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} SJ Tutor AI. Created by Sadanand Jyoti &amp; Samanyu S Patil.</p>
            <p className="text-blue-400 font-semibold">Learn Smarter Every Day</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
