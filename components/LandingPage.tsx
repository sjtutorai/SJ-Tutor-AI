import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  BrainCircuit, 
  MessageCircle, 
  Languages, 
  CheckCircle2, 
  Camera as CameraIcon,
  ArrowRight,
  Star,
  Activity,
  ChevronRight,
  Play,
  Menu,
  X,
  Trophy,
  LineChart,
  Check
} from 'lucide-react';
import Logo from './Logo';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onGetStarted: () => void;
  countryCode?: string | null;
}

interface DemoTutorSlide {
  subject: string;
  question: string;
  tutorResponse: string;
  quizQuestion: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  colorAccent: string;
}

const DEMO_SLIDES: DemoTutorSlide[] = [
  {
    subject: "Mathematics",
    question: "Explain quadratic equations clearly and show me how they are solved.",
    colorAccent: "#3B82F6", // Blue
    tutorResponse: `### What is a Quadratic Equation?
A **quadratic equation** is a second-degree polynomial equation in a single variable. Its standard mathematical form is:

$$\\mathbf{ax^2 + bx + c = 0}$$

Where **$x$** represents an unknown, and **$a$**, **$b$**, and **$c$** are constants, with **$a \\neq 0$**.

---

### Solving Using the Quadratic Formula
The most reliable method to solve any quadratic equation is the **Quadratic Formula**:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

The term under the square root, **$b^2 - 4ac$**, is called the **Discriminant ($\\Delta$)**. It tells us about the nature of the roots:
* **$\\Delta > 0$**: Two distinct real roots.
* **$\\Delta = 0$**: One real repeated root.
* **$\\Delta < 0$**: Two complex conjugate roots.

---

### Step-by-Step Example: Solve  $x^2 - 5x + 6 = 0$
1. **Identify Coefficients**: Here, $a = 1$, $b = -5$, $c = 6$.
2. **Calculate the Discriminant**:
   $$\\Delta = (-5)^2 - 4(1)(6) = 25 - 24 = 1$$
   Since $\\Delta = 1 > 0$, we have structural roots!
3. **Apply the Formula**:
   $$x = \\frac{-(-5) \\pm \\sqrt{1}}{2(1)} = \\frac{5 \\pm 1}{2}$$
4. **Find the Roots**:
   * **Root 1**: $x = \\frac{5 + 1}{2} = 3$
   * **Root 2**: $x = \\frac{5 - 1}{2} = 2$

$$\\text{Roots of the equation are } \\mathbf{x = 2} \\text{ and } \\mathbf{x = 3}.$$`,
    quizQuestion: {
      question: "Which of the following represents the roots of the quadratic equation x² - 4x + 4 = 0?",
      options: [
        "x = 2 (Repeated Double Root)",
        "x = 2 and x = -2",
        "x = 0 and x = 4",
        "The equation has no real roots"
      ],
      correctIndex: 0,
      explanation: "Excellent work! Factoring x² - 4x + 4 gives (x - 2)² = 0. Therefore, the only solution is a single repeated root at x = 2."
    }
  },
  {
    subject: "Physics",
    question: "Explain Newton's Third Law with practical force formulas.",
    colorAccent: "#7C3AED", // Purple
    tutorResponse: `### Newton's Third Law of Motion
Commonly stated as: *"For every action, there is an equal and opposite reaction."*

In exact physical terms, whenever one object exerts a force on a second object, the second object exerts an equal and opposite force on the first.

---

### The Force Vector Formula
If Object A exerts a force $\\vec{F}_{AB}$ (force on B by A) on Object B, then Object B simultaneously exerts a force $\\vec{F}_{BA}$ (force on A by B) on Object A, such that:

$$\\mathbf{\\vec{F}_{AB} = -\\vec{F}_{BA}}$$

---

### Core Principles
1. **Forces Always occur in Pairs**: Single isolated forces cannot exist in nature.
2. **Action and Reaction act on DIFFERENT bodies**: They never cancel each other out because they operate on separate physical masses.
3. **Simultaneity**: Action and reaction forces arise at exactly the same absolute instant.

---

### Real-World Aerospace Propulsion Example
* **Rocket Lift-off**: A rocket's engine burns fuel and blasts hot exhaust gases downward (**Action force**). In reaction, the expelled gas exerts an immense, equal thrust upward on the engine nozzle (**Reaction force**), propelling the rocket into orbit.`,
    quizQuestion: {
      question: "If a massive truck collides head-on with a tiny subcompact car, which vehicle experiences the greater force of impact?",
      options: [
        "The small car experiences a much larger force due to smaller mass.",
        "The heavy truck experiences a larger force since it has more momentum.",
        "Both vehicles experience exactly the same force of impact.",
        "No force is exchanged; the car simply bouncing back is due to elastic pressure."
      ],
      correctIndex: 2,
      explanation: "Brilliant check! According to Newton's Third Law, forces are always equal and opposite. The force exerted by the truck on the car is identical in magnitude to the force exerted by the car on the truck. The car suffers more damage solely because of its smaller mass causing a massive acceleration change (F = ma)."
    }
  },
  {
    subject: "Chemistry",
    question: "How do covalent bonds form? Illustrate with simple formulas.",
    colorAccent: "#06B6D4", // Cyan
    tutorResponse: `### What is Covalent Bonding?
A **covalent bond** is a chemical bond that involves the **sharing of electron pairs** between atoms, typically non-metals. These shared pairs are called bonding or shared pairs, and the stable balance of attractive and repulsive forces between atoms is covalent bonding.

---

### The Octet Rule
Atoms share valence electrons to achieve a stable electronic configuration matching the nearest noble gas (usually having **8 outer valence electrons**, hence the "Octet Rule").

For example, Hydrogen (H) seeks to share 1 electron to complete its single shell with **2 electrons** (the Duet Rule).

---

### Bonding Types based on Shared Pairs
* **Single Bond**: Shares 1 pair of electrons (e.g., $H-H$ in $H_2$).
* **Double Bond**: Shares 2 pairs of electrons (e.g., $O=O$ in $O_2$).
* **Triple Bond**: Shares 3 pairs of electrons (e.g., $N \\equiv N$ in $N_2$).

---

### Water Molecule ($H_2O$) Lewis Structure
Oxygen has 6 valence electrons and needs 2 more. Two Hydrogens each have 1 valence electron and need 1 more:
* Oxygen shares 1 electron with each Hydrogen, forming **two single covalent bonds**.
* Oxygen finishes with 8 valence electrons (stable octet).
* Hydrogens finish with 2 valence electrons (stable duet).`,
    quizQuestion: {
      question: "Which of the following organic structures contains a triple covalent bond?",
      options: [
        "Water (H₂O)",
        "Carbon Dioxide (CO₂)",
        "Nitrogen Gas (N₂)",
        "Methane (CH₄)"
      ],
      correctIndex: 2,
      explanation: "Spot on! Nitrogen gas (N₂) consists of two Nitrogen atoms that share three pairs of valence electrons (triple bond) to satisfy the octet rule, making N₂ incredibly stable and chemically inert under normal conditions."
    }
  },
  {
    subject: "Computer Science",
    question: "What is Binary Search and why is it faster than Linear Search?",
    colorAccent: "#10B981", // Emerald
    tutorResponse: `### Binary Search Algorithm
**Binary Search** is an exceptionally efficient algorithm for finding an element from a **sorted** array of items. It works by repeatedly dividing in half the portion of the list that could contain the target item, until you narrow down the location to just one element.

---

### Step-by-Step Search Logic
Suppose we are searching for a target value $T$ in a sorted array:
1. Set the low bound $L = 0$ and high bound $H = n - 1$.
2. Compute the midpoint: $M = \\lfloor(L + H) / 2\\rfloor$.
3. If $Array[M] == T$, search complete! Return index $M$.
4. If $Array[M] < T$, search the right half: set $L = M + 1$.
5. If $Array[M] > T$, search the left half: set $H = M - 1$.
6. Repeat until the target is found or $L > H$ (target not in array).

---

### Time Complexity Comparison
* **Linear Search**: Checks each element sequentially. Worst-case is checking all elements. Time Complexity is:
  $$\\mathbf{O(n)}$$
* **Binary Search**: Halves the search space at each state step. Worst-case is logarithmically bounded. Time Complexity is:
  $$\\mathbf{O(\\log_2 n)}$$

---

### Efficiency Example
If we search through **1,000,000 elements**:
* **Linear Search**: Might require **1,000,000 comparisons**.
* **Binary Search**: Max comparisons is $\\approx \\log_2(1,000,000) \\approx \\mathbf{20 \\text{ comparisons}}$!`,
    quizQuestion: {
      question: "What is the maximum number of iterations binary search needs to find an element in a sorted list of 1,024 items?",
      options: [
        "1,024 iterations",
        "512 iterations",
        "10 iterations",
        "20 iterations"
      ],
      correctIndex: 2,
      explanation: "Perfect index! Log2(1024) is exactly 10. Since binary search splits the remaining array elements completely in half at each single step, it will require at absolute maximum 10 comparisons to isolate or reject any item in a list of 1,024 elements."
    }
  }
];

export default function LandingPage({ onGetStarted, countryCode }: LandingPageProps) {
  // Mobile navigation state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Interactive Demo States
  const [activeTab, setActiveTab] = useState<number>(0);
  const [typedOverview, setTypedOverview] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [customQuery, setCustomQuery] = useState<string>("");
  const [customAnswersList, setCustomAnswersList] = useState<Array<{ sender: 'user' | 'tutor', text: string }>>([]);
  const [isCustomThinking, setIsCustomThinking] = useState<boolean>(false);

  // Stats Counters State
  const [stats, setStats] = useState({ students: 0, questions: 0, success: 0, hours: 0 });

  // Refs for Scroll navigation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorGlowRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mouseActive, setMouseActive] = useState(false);

  // Animated Stats Trigger
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const intervalTime = duration / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      const progress = stepCount / steps;
      // Easing out quadratic
      const ease = progress * (2 - progress);

      setStats({
        students: Math.floor(ease * 10000),
        questions: Math.floor(ease * 1000000),
        success: Math.floor(ease * 95),
        hours: 24,
      });

      if (stepCount >= steps) {
        clearInterval(timer);
        setStats({
          students: 10000,
          questions: 1000000,
          success: 95,
          hours: 24
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  // Neural Network Full-Screen Canvas Motion Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class definition
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      depth: number;
      color: string;
      pulse: number;
      pulseSpeed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.depth = Math.random() * 0.8 + 0.6; // depth-based parallax, 0.6 to 1.4
        this.size = (Math.random() * 2 + 1) * this.depth;
        this.pulse = Math.random() * Math.PI;
        this.pulseSpeed = 0.01 + Math.random() * 0.02;

        const colors = [
          'rgba(37, 99, 235, ', // electric blue
          'rgba(124, 58, 237, ', // purple secondary
          'rgba(6, 182, 212, ', // accent cyan
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx * this.depth;
        this.y += this.vy * this.depth;

        // Mouse responsive parallax drift
        if (mouseActive) {
          const dx = cursorGlowRef.current.x - width / 2;
          const dy = cursorGlowRef.current.y - height / 2;
          this.x += dx * 0.0008 * (this.depth - 0.6);
          this.y += dy * 0.0008 * (this.depth - 0.6);
        }

        // Boundary wrap
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        this.pulse += this.pulseSpeed;
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        const pulseFactor = Math.sin(this.pulse) * 0.3 + 0.7;
        const currentAlpha = 0.25 * pulseFactor * (this.depth / 1.4);
        
        c.shadowBlur = 8 * pulseFactor;
        c.shadowColor = this.color.replace(', ', ')').replace('rgba', 'rgb');
        
        c.beginPath();
        c.arc(this.x, this.y, this.size * pulseFactor, 0, Math.PI * 2);
        c.fillStyle = this.color + currentAlpha + ')';
        c.fill();
        c.restore();
      }
    }

    const particles: Particle[] = Array.from({ length: 85 }, () => new Particle());

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw glowing grid lines in background
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1;
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

      // 2. Draw connections between nodes
      ctx.lineWidth = 0.8;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw(ctx);

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          const maxDistance = 140;

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.13 * Math.min(p1.depth, p2.depth);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Connected line gradient mapping
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, p1.color + alpha + ')');
            grad.addColorStop(1, p2.color + alpha + ')');
            
            ctx.strokeStyle = grad;
            ctx.stroke();
          }
        }

        // 3. Draw connection lines to mouse cursor
        if (mouseActive) {
          const mDist = Math.hypot(p1.x - cursorGlowRef.current.x, p1.y - cursorGlowRef.current.y);
          const mouseConnectionRadius = 200;
          if (mDist < mouseConnectionRadius) {
            const alpha = (1 - mDist / mouseConnectionRadius) * 0.28;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(cursorGlowRef.current.x, cursorGlowRef.current.y);
            ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      // 4. Glow spot light around mouse
      if (mouseActive) {
        ctx.save();
        const radGrad = ctx.createRadialGradient(
          cursorGlowRef.current.x, cursorGlowRef.current.y, 10,
          cursorGlowRef.current.x, cursorGlowRef.current.y, 250
        );
        radGrad.addColorStop(0, 'rgba(124, 58, 237, 0.08)');
        radGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.03)');
        radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(cursorGlowRef.current.x, cursorGlowRef.current.y, 250, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mouseActive]);

  // Track cursor coordinates globally on landing page container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    cursorGlowRef.current = { x: e.clientX, y: e.clientY + window.scrollY };
    if (!mouseActive) setMouseActive(true);
  };

  const handleMouseLeave = () => {
    setMouseActive(false);
  };

  // Simulated live typing stream for educational response
  useEffect(() => {
    const slide = DEMO_SLIDES[activeTab];
    if (!slide) return;

    setIsTyping(true);
    setSelectedQuizAnswer(null);
    setShowExplanation(false);

    let progress = 0;
    const responseText = slide.tutorResponse;
    const interval = 8; // high speed typing rate
    
    // Simulate instantaneous chunks + progressive character typing
    setTypedOverview("");
    const timer = setInterval(() => {
      progress += 14; // rapid characters chunk
      if (progress >= responseText.length) {
        setTypedOverview(responseText);
        setIsTyping(false);
        clearInterval(timer);
      } else {
        setTypedOverview(responseText.substring(0, progress));
      }
    }, interval);

    return () => clearInterval(timer);
  }, [activeTab]);

  const handleSelectQuizAnswer = (index: number) => {
    setSelectedQuizAnswer(index);
    setShowExplanation(true);
  };

  const handleCustomQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;

    const userText = customQuery;
    setCustomAnswersList(prev => [...prev, { sender: 'user', text: userText }]);
    setCustomQuery("");
    setIsCustomThinking(true);

    setTimeout(() => {
      setIsCustomThinking(false);
      const responses = [
        "That's an excellent question! Covalent bonding represents shared electron valency, which you can easily master using our interactive structures.",
        "That is correct. Newton's Third Law governs reaction vectors across multiple physical systems such as rockets and propulsion.",
        "Brilliant check! To study that topic step-by-step, join our interactive curriculums to unlock dynamic math charts and verified NCERT notes instantly.",
        "Fantastic! Choosing any subject card or topic above will automatically populate structured quizzes and active visual learning aids for you."
      ];
      const matchText = responses[Math.floor(Math.random() * responses.length)] + " Click 'Start Learning Free' below to unlock our complete AI Study Buddy, scan-to-solve cameras, and 24/7 continuous chatbot!";
      setCustomAnswersList(prev => [...prev, { sender: 'tutor', text: matchText }]);
    }, 1200);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div 
      className="relative min-h-screen bg-[#020617] text-[#F8FAFC] font-sans overflow-x-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Dynamic Animated Tech Vector Neural Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full opacity-65" />
      </div>

      {/* 75% dark overlay above animation for extreme content contrast & readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/90 via-[#020617]/75 to-[#020617]/95 z-0 pointer-events-none" />

      {/* FIXED PREMIUM GRADIENTS IN CORNERS */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] left-[-15%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[200px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* ==================================================== HEADER & NAV */}
      <header className="sticky top-0 z-50 bg-[#020617]/65 backdrop-blur-md border-b border-[#0F172A]/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" showText={true} textColor="text-[#F8FAFC]" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-[#94A3B8]">
            <button onClick={() => scrollToSection('features')} className="hover:text-[#F8FAFC] transition-colors cursor-pointer">Features</button>
            <button onClick={() => scrollToSection('how-it-works')} className="hover:text-[#F8FAFC] transition-colors cursor-pointer">How It Works</button>
            <button onClick={() => scrollToSection('demo')} className="hover:text-[#F8FAFC] transition-colors cursor-pointer">Interactive Demo</button>
            <button onClick={() => scrollToSection('subjects')} className="hover:text-[#F8FAFC] transition-colors cursor-pointer">Subjects</button>
            <button onClick={() => scrollToSection('testimonials')} className="hover:text-[#F8FAFC] transition-colors cursor-pointer">Success Stories</button>
            <button onClick={() => scrollToSection('pricing')} className="hover:text-[#F8FAFC] transition-colors cursor-pointer">Pricing</button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden lg:flex items-center gap-4">
            <button 
              onClick={onGetStarted}
              className="px-5 py-2.5 text-sm font-semibold text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              Log In
            </button>
            <button 
              onClick={onGetStarted}
              className="relative group overflow-hidden px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
              <span className="absolute inset-0 bg-[#06B6D4] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
            </button>
          </div>

          {/* Mobile Hamburguer Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-[#94A3B8] hover:text-[#F8FAFC] focus:outline-none"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Slide-down Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[#0F172A] border-b border-[#1E293B]"
            >
              <div className="px-6 py-8 flex flex-col gap-5 text-base font-semibold text-[#94A3B8]">
                <button onClick={() => { setIsMobileMenuOpen(false); scrollToSection('features'); }} className="text-left py-2 hover:text-white">Features</button>
                <button onClick={() => { setIsMobileMenuOpen(false); scrollToSection('how-it-works'); }} className="text-left py-2 hover:text-white">How It Works</button>
                <button onClick={() => { setIsMobileMenuOpen(false); scrollToSection('demo'); }} className="text-left py-2 hover:text-white">Interactive Demo</button>
                <button onClick={() => { setIsMobileMenuOpen(false); scrollToSection('subjects'); }} className="text-left py-2 hover:text-white">Subjects</button>
                <button onClick={() => { setIsMobileMenuOpen(false); scrollToSection('testimonials'); }} className="text-left py-2 hover:text-white">Success Stories</button>
                <button onClick={() => { setIsMobileMenuOpen(false); scrollToSection('pricing'); }} className="text-left py-2 hover:text-white">Pricing</button>
                <hr className="border-[#1E293B] my-2" />
                <button onClick={onGetStarted} className="w-full text-center py-3 rounded-xl border border-[#1E293B] text-white font-semibold hover:bg-[#1E293B] transition-colors">Log In</button>
                <button onClick={onGetStarted} className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-semibold shadow-lg shadow-blue-500/25">Get Started Free</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ==================================================== HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-16 md:pt-24 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left Side */}
          <div className="lg:col-span-6 space-y-6 md:space-y-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0F172A] border border-blue-500/25 text-[#06B6D4] text-xs font-semibold tracking-wider uppercase backdrop-blur-md shadow-inner shadow-blue-500/5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
              🚀 Next Generation AI Learning Platform
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-none text-[#F8FAFC]">
              Your Personal <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4]">
                AI Tutor,
              </span> <br />
              Available 24/7
            </h1>

            <p className="text-lg md:text-xl text-[#94A3B8] leading-relaxed max-w-xl">
              Master any subject with personalized AI-powered learning, instant explanations, adaptive practice, real-time feedback, and intelligent study guidance.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button 
                onClick={onGetStarted}
                className="group relative overflow-hidden px-8 py-4 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-bold text-lg shadow-xl shadow-blue-500/20 hover:shadow-purple-500/35 transition-all hover:-translate-y-1"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-[#06B6D4] to-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
              </button>
              
              <button 
                onClick={() => scrollToSection('demo')}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-[#1E293B] hover:border-slate-700 bg-[#0F172A]/40 backdrop-blur-md font-bold text-lg hover:bg-[#0F172A]/80 transition-all hover:-translate-y-1"
              >
                <Play className="w-4 h-4 text-[#06B6D4]" />
                Watch Live Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="pt-6 border-t border-[#0F172A]/60 flex flex-wrap items-center gap-6 md:gap-8 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-[#94A3B8] text-xs">★★★★★ Rated by Students</p>
              </div>

              <div className="h-8 w-px bg-[#1E293B]" />

              <div className="space-y-0.5">
                <p className="text-lg font-bold text-[#F8FAFC]">10,000+</p>
                <p className="text-xs text-[#94A3B8]">Active Learners</p>
              </div>

              <div className="h-8 w-px bg-[#1E293B]" />

              <div className="space-y-0.5">
                <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#06B6D4] to-[#10B981]">95%</p>
                <p className="text-xs text-[#94A3B8]">Success Rate</p>
              </div>
            </div>
          </div>

          {/* Hero Right Side — Premium Dashboard Mockup with Dynamic Layout */}
          <div className="lg:col-span-6 relative mt-10 lg:mt-0">
            {/* Visual background gradient glow */}
            <div className="absolute inset-x-0 bottom-0 top-1/4 bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 blur-3xl rounded-3xl" />

            <div className="relative rounded-2xl bg-[#0F172A]/65 border border-white/5 backdrop-blur-xl p-6 shadow-2xl p-5 md:p-6 select-none shadow-black/80">
              {/* Mockup Header line */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-[#10B981]/80" />
                  </div>
                  <span className="text-xs text-[#94A3B8]/60 font-mono tracking-wider ml-4 uppercase">SJ-AI_STUDIO_V2.0</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                  LIVE CONNECTIONS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Simulated Tutor Conversation block */}
                <div className="md:col-span-8 bg-[#020617]/80 rounded-2xl border border-white/5 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-[#94A3B8]">AI Chat Terminal</span>
                    <span className="text-[10px] font-mono text-[#06B6D4]">AI-CO_PROCESSOR_ENGAGED</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1 text-xs text-[#94A3B8]">
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-blue-600/25 flex items-center justify-center text-blue-400 font-bold font-mono text-[9px] flex-shrink-0">
                        S
                      </div>
                      <div className="bg-[#0F172A] p-2.5 rounded-xl border border-white/5">
                        <p className="text-neutral-200">How do I calculate kinetic energy easily?</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-600/25 flex items-center justify-center text-purple-400 font-bold flex-shrink-0">
                        🤖
                      </div>
                      <div className="bg-[#0F172A] p-2.5 rounded-xl border border-white/5 space-y-1 text-[#F8FAFC]">
                        <p className="font-semibold text-xs text-[#06B6D4]">SJ Tutor AI:</p>
                        <p className="text-neutral-300">{"Kinetic Energy formula is Ek = (1/2) * m * v²."}</p>
                        <p className="text-neutral-400 text-[10.5px]">If standard mass = 4kg, velocity = 5m/s:</p>
                        <p className="font-mono text-emerald-400">{"Ek = 0.5 * 4 * 5² = 50 Joules!"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-[#0F172A] p-2 rounded-xl border border-white/5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping ml-1" />
                    <span className="text-xs text-[#94A3B8]/60">Enter high-school query...</span>
                  </div>
                </div>

                {/* Progress Indicators Panel */}
                <div className="md:col-span-4 space-y-4">
                  {/* Subject Mastery Radar box */}
                  <div className="bg-[#020617]/80 rounded-2xl border border-white/5 p-4 text-center">
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span className="text-[10px] uppercase font-bold text-[#94A3B8]">Efficiency</span>
                    </div>
                    <div className="relative w-12 h-12 mx-auto my-3 flex items-center justify-center">
                      <svg className="w-full h-full rotate-[-90deg]">
                        <circle cx="24" cy="24" r="18" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                        <circle cx="24" cy="24" r="18" fill="transparent" stroke="#06B6D4" strokeWidth="3" strokeDasharray="113" strokeDashoffset="22" strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-[10px] font-bold">80%</span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#F8FAFC]">Physics Core</p>
                  </div>

                  {/* Recommendation block */}
                  <div className="bg-[#020617]/80 rounded-2xl border border-white/5 p-3 space-y-1.5 flex flex-col justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-[#94A3B8]/40 font-bold block">RECOMMENDED NEXT</span>
                    <p className="text-[11px] font-semibold text-rose-400">Quiz: Circular Vectors</p>
                    <p className="text-[9px] text-[#94A3B8]">+12 target grade score</p>
                  </div>
                </div>
              </div>

              {/* Floating Glass Cards Overlayed onto Mockup */}
              <div className="absolute right-[-10px] top-[40%] bg-gradient-to-r from-blue-600/30 via-[#7C3AED]/40 to-[#06B6D4]/40 p-[1px] rounded-xl shadow-xl backdrop-blur-xl max-w-[170px] hidden md:block">
                <div className="bg-[#020617]/95 rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="font-bold font-mono tracking-wide text-[10px]/none uppercase">
                      {`VERIFIED CURRICULUM: ${countryCode ? countryCode.toUpperCase() : "INTL"}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8]">Curriculum mapping sync: **100%**</p>
                </div>
              </div>

              <div className="absolute left-[-20px] bottom-[15%] bg-gradient-to-r from-cyan-500/20 to-[#2563EB]/25 p-[1px] rounded-xl shadow-xl backdrop-blur-xl max-w-[150px] hidden md:block">
                <div className="bg-[#020617]/95 rounded-xl p-3 items-center text-center space-y-1">
                  <span className="text-[10px] font-bold block text-purple-400">🚀 Speed response</span>
                  <p className="text-[14px] font-extrabold text-[#F8FAFC]">0.45s <span className="text-[9px] text-[#94A3B8]">LATENCY</span></p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5 text-center">
                <div className="bg-[#020617]/30 py-2 rounded-xl">
                  <p className="text-[14px] font-extrabold text-[#F8FAFC]">98.2%</p>
                  <p className="text-[9px] text-[#94A3B8]">Precision</p>
                </div>
                <div className="bg-[#020617]/30 py-2 rounded-xl">
                  <p className="text-[14px] font-extrabold text-[#F8FAFC]">8/8</p>
                  <p className="text-[9px] text-[#94A3B8]">Subjects</p>
                </div>
                <div className="bg-[#020617]/30 py-2 rounded-xl">
                  <p className="text-[14px] font-extrabold text-[#F8FAFC]">Score A</p>
                  <p className="text-[9px] text-[#94A3B8]">Prep Rate</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================== TRUSTED BY / STATS */}
      <section className="relative z-10 border-y border-[#0F172A]/80 bg-[#0F172A]/15 backdrop-blur-md py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-[#94A3B8]/60 mb-8 md:mb-10">TRUSTED BY OVER 10,000+ HIGH SCHOOLERS AND TOP ACADEMICS</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            
            <div className="space-y-1">
              <p className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F8FAFC] to-[#94A3B8] font-mono">
                {stats.students.toLocaleString()}+
              </p>
              <p className="text-[#94A3B8] text-sm font-medium">Students Learning</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#06B6D4] font-mono">
                {(stats.questions / 1000000).toFixed(1)}M+
              </p>
              <p className="text-[#94A3B8] text-sm font-medium">Questions Solved</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-pink-500 font-mono">
                {stats.success}%
              </p>
              <p className="text-[#94A3B8] text-sm font-medium">Success Rate</p>
            </div>

            <div className="space-y-1">
              <p className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-[#06B6D4] font-mono">
                {stats.hours}/7
              </p>
              <p className="text-[#94A3B8] text-sm font-medium">AI Availability</p>
            </div>

          </div>
        </div>
      </section>

      {/* ==================================================== FEATURES SECTION */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
        
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-4">
          <span className="text-[#7C3AED] text-xs font-bold uppercase tracking-[0.2em]">UNLEASH ACADEMIC EXCELLENCE</span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#F8FAFC]">
            Why Students Choose SJ Tutor AI
          </h2>
          <p className="text-[#94A3B8] text-base md:text-lg">
            Our platform provides advanced custom AI tools designed specifically for school curricula, transforming difficult chapters and questions into active elements you master.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { 
              icon: CameraIcon, 
              title: "AI Homework Assistance", 
              desc: "Upload math, physics, chemistry photos or type down doubts. Receive detailed, stepwise logical guides explaining formulas behind solutions instantly.", 
              color: "from-blue-600 to-indigo-600",
              accent: "group-hover:border-blue-500/40"
            },
            { 
              icon: Sparkles, 
              title: "Personalized Learning Paths", 
              desc: "Get adaptive schedules matching school timetables. The AI tracks conceptual retention rate and dynamically presents practice modules according to weaknesses.", 
              color: "from-purple-600 to-indigo-600",
              accent: "group-hover:border-purple-500/40"
            },
            { 
              icon: MessageCircle, 
              title: "Instant Doubt Resolution", 
              desc: "Chat with an empathetic, expert virtual academic assistant and secure deep custom interactive explanations for questions in real-time, anytime.", 
              color: "from-cyan-500 to-blue-500",
              accent: "group-hover:border-cyan-500/40"
            },
            { 
              icon: BrainCircuit, 
              title: "Exam Preparation Tools", 
              desc: "Build unlimited mock exams mapped against standard state boards. Gain practice answering high-level subjective and MCQ questions step-by-step.", 
              color: "from-pink-500 to-rose-500",
              accent: "group-hover:border-pink-500/40"
            },
            { 
              icon: LineChart, 
              title: "Performance Analytics", 
              desc: "Monitor exact concept mastery scores via premium graphs. Watch diagnostic stats reveal current learning loops and milestone progress visually.", 
              color: "from-emerald-500 to-[#06B6D4]",
              accent: "group-hover:border-emerald-500/40"
            },
            { 
              icon: Languages, 
              title: "Multi-Subject Support", 
              desc: "Excels natively across mathematics, physics, biology, chemistry, computer science, and more, offering streamlined summaries and checklists.", 
              color: "from-violet-600 to-pink-500",
              accent: "group-hover:border-violet-600/40"
            }
          ].map((f, i) => (
            <div 
              key={i} 
              className={`group relative rounded-3xl p-8 bg-[#0F172A]/40 border border-[#1E293B] hover:bg-[#0F172A]/85 hover:border-[#334155]/60 transition-all duration-300 transform hover:-translate-y-1 shadow-md shadow-black/30 ${f.accent}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 rounded-3xl" />
              
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${f.color} flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform shadow-lg shadow-black/40`}>
                <f.icon className="w-5 h-5" />
              </div>

              <h3 className="text-xl font-bold text-[#F8FAFC] mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all font-sans">
                {f.title}
              </h3>
              
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

      </section>

      {/* ==================================================== HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 bg-[#0F172A]/20 border-y border-[#0F172A]/80 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-4">
            <span className="text-[#06B6D4] text-xs font-bold uppercase tracking-[0.2em]">STREAMLINED SYLLABUS DISCOVERY</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#F8FAFC] tracking-tight">
              Learn Smarter in Four Simple Steps
            </h2>
            <p className="text-[#94A3B8] text-base md:text-lg">
              We make academic success incredibly natural. Simply choose your focus and watch the platform adapt to teach you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Horizontal progress/connector line for desktop */}
            <div className="absolute top-[45px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-[#2563EB]/40 via-[#7C3AED]/30 to-[#06B6D4]/40 hidden md:block z-0" />

            {[
              { 
                step: "01", 
                title: "Ask Any Question", 
                desc: "Type or scan a picture of your homework doubt, exam syllabus concept, or specific textbook exercise.",
                accent: "from-[#2563EB]/20 to-blue-600/10",
                icon: BookOpen
              },
              { 
                step: "02", 
                title: "Receive AI Explanation", 
                desc: "Get an instant, simple, and step-by-step logical explanation with real-time math graphs and diagrams.",
                accent: "from-[#7C3AED]/20 to-purple-600/10",
                icon: Sparkles
              },
              { 
                step: "03", 
                title: "Practice Exercises", 
                desc: "Solve custom practice quizzes created instantly by the AI tutor to reinforce what you've just learned.",
                accent: "from-pink-500/20 to-rose-500/10",
                icon: BrainCircuit
              },
              { 
                step: "04", 
                title: "Track Progress & Improve", 
                desc: "Watch your concept mastery scores increase on your premium dashboard. Redeem study rewards!",
                accent: "from-emerald-500/20 to-[#06B6D4]/10",
                icon: LineChart
              }
            ].map((s, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center px-4">
                
                {/* Glowing step bubble */}
                <div className={`relative w-16 h-16 rounded-full bg-gradient-to-b ${s.accent} border border-white/5 shadow-xl flex items-center justify-center font-mono font-bold text-xl mb-6 shadow-black/40 hover:scale-105 transition-transform`}>
                  <span className="text-[#F8FAFC] tracking-tight">{s.step}</span>
                  <div className="absolute inset-0 rounded-full bg-[#06B6D4]/5 blur-[6px] animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#F8FAFC]">{s.title}</h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed max-w-[210px] mx-auto">{s.desc}</p>
                </div>

              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ==================================================== INTERACTIVE AI TUTOR DEMO */}
      <section id="demo" className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28">
        
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 space-y-4">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            LIVE PLAYGROUND CONSOLE
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#F8FAFC] tracking-tight">
            Meet Your Personal AI Tutor
          </h2>
          <p className="text-[#94A3B8] text-base md:text-lg">
            Pick a subject below to witness our tutor compile comprehensive guides, visual formulas, and custom interactive quizzes right before your eyes.
          </p>
        </div>

        {/* Demo Playground Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left panel: Subject picker sidebar */}
          <div className="lg:col-span-4 flex flex-cols sm:flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-none justify-start lg:justify-stretch">
            {DEMO_SLIDES.map((slide, index) => {
              const isActive = activeTab === index;
              return (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`flex-shrink-0 lg:flex-shrink flex items-center justify-between gap-4 p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 w-[240px] sm:w-auto lg:w-full select-none ${
                    isActive 
                      ? 'bg-[#0F172A] border-blue-500/40 shadow-lg shadow-blue-500/5 translate-x-1 lg:translate-x-2' 
                      : 'bg-[#0F172A]/30 border-white/5 hover:border-white/10 hover:bg-[#0F172A]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md font-mono font-bold"
                      style={{ backgroundColor: slide.colorAccent }}
                    >
                      {slide.subject.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#F8FAFC]">{slide.subject}</p>
                      <p className="text-xs text-[#94A3B8] truncate max-w-[140px]">{slide.question}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-[#06B6D4] translate-x-0.5' : 'text-[#94A3B8]/40'}`} />
                </button>
              );
            })}

            {/* Custom Input prompt form inside Sidebar */}
            <div className="hidden lg:block bg-[#0F172A]/30 border border-white/5 rounded-2xl p-4 mt-4 space-y-3">
              <span className="text-[10px] font-bold uppercase text-[#94A3B8]/60 tracking-wider">Try custom prompt</span>
              <form onSubmit={handleCustomQuerySubmit} className="space-y-2">
                <input 
                  type="text" 
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Ask a custom doubt e.g., Supply & Demand..."
                  className="w-full text-xs bg-[#020617] text-[#F8FAFC] p-3 rounded-xl border border-white/5 focus:outline-none focus:border-[#7C3AED]"
                />
                <button 
                  type="submit" 
                  className="w-full py-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:shadow-lg hover:shadow-blue-500/10"
                >
                  Ask Tutor AI
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Active simulated chat & interactive quiz */}
          <div className="lg:col-span-8 flex flex-col justify-between rounded-3xl bg-[#0F172A]/65 border border-white/5 backdrop-blur-xl p-5 md:p-6 shadow-2xl relative">
            
            {/* Screen Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5 select-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center font-bold text-xs text-[#06B6D4]">🤖</div>
                <div>
                  <p className="text-xs font-bold text-[#F8FAFC]">SJ Tutor AI - Dedicated Educator</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    STREAMING_ENGINE_ONLINE
                  </p>
                </div>
              </div>

              {/* Subject Pill Indicator */}
              <span 
                className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-inner"
                style={{ backgroundColor: DEMO_SLIDES[activeTab].colorAccent + '25', border: `1px solid ${DEMO_SLIDES[activeTab].colorAccent}40`, color: DEMO_SLIDES[activeTab].colorAccent }}
              >
                {DEMO_SLIDES[activeTab].subject}
              </span>
            </div>

            {/* Simulated Live Streaming Interactive Area */}
            <div className="flex-1 space-y-6 min-h-[340px] max-h-[460px] overflow-y-auto pr-1">
              
              {/* Query bubble of current selected slide */}
              <div className="flex gap-3 justify-end leading-relaxed text-xs">
                <div className="bg-[#2563EB]/10 rounded-2xl p-4 border border-[#2563EB]/20 text-right max-w-lg">
                  <p className="text-[#94A3B8]/60 uppercase text-[9px] font-bold block mb-1">STUDENT INQUIRY</p>
                  <p className="font-semibold text-neutral-200">{`"${DEMO_SLIDES[activeTab].question}"`}</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-[#2563EB]/35 flex items-center justify-center font-bold flex-shrink-0 text-white">S</div>
              </div>

              {/* Streaming markdown explanation responses */}
              <div className="flex gap-3 leading-relaxed text-xs">
                <div className="w-7 h-7 rounded-full bg-purple-600/35 flex items-center justify-center font-bold flex-shrink-0 text-[#06B6D4]">🤖</div>
                <div className="bg-[#020617]/70 rounded-2xl p-5 border border-white/5 flex-1 space-y-4 max-w-full overflow-hidden text-[#F8FAFC]">
                  <p className="text-[#94A3B8]/60 uppercase text-[9px] font-bold block">TUTOR EXPLANATION</p>
                  
                  {/* Styled simulated streaming markdown content */}
                  <div className="space-y-3 font-sans leading-relaxed text-[#D1D5DB] text-xs max-w-full whitespace-pre-line">
                    {typedOverview}
                    {isTyping && <span className="inline-block w-1.5 h-4 bg-blue-500 animate-ping ml-0.5" />}
                  </div>
                </div>
              </div>

              {/* Custom Ask user questions list (if any submitted) */}
              {customAnswersList.map((chatVal, ind) => (
                <div key={ind} className={`flex gap-3 leading-relaxed text-xs ${chatVal.sender === 'user' ? 'justify-end' : ''}`}>
                  {chatVal.sender === 'tutor' && (
                    <div className="w-7 h-7 rounded-full bg-purple-600/35 flex items-center justify-center font-bold flex-shrink-0 text-[#06B6D4]">🤖</div>
                  )}
                  <div className={`rounded-2xl p-4 border max-w-lg ${chatVal.sender === 'user' ? 'bg-[#2563EB]/10 border-[#2563EB]/20 text-right text-neutral-200' : 'bg-[#020617]/70 border-white/5 text-neutral-300'}`}>
                    <span className="text-[#94A3B8]/60 uppercase text-[8px] font-bold block mb-1">
                      {chatVal.sender === 'user' ? 'MY DOUBT' : 'TUTOR AI RESPONSE'}
                    </span>
                    <p className="font-semibold">{chatVal.text}</p>
                  </div>
                  {chatVal.sender === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-blue-600/35 flex items-center justify-center font-bold flex-shrink-0 text-white">S</div>
                  )}
                </div>
              ))}

              {isCustomThinking && (
                <div className="flex gap-3 leading-relaxed text-xs">
                  <div className="w-7 h-7 rounded-full bg-purple-600/35 flex items-center justify-center font-bold flex-shrink-0 text-purple-400">🤖</div>
                  <div className="bg-[#020617]/70 rounded-2xl p-4 border border-white/5 space-y-1">
                    <span className="text-[10px] text-slate-500 animate-pulse">SJ Tutor analyzing curriculum index...</span>
                  </div>
                </div>
              )}

              {/* ==================================================== INTERACTIVE PRACTICE QUIZ */}
              {!isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-[#10B981]/15 rounded-2xl bg-[#10B981]/5 p-5 space-y-4"
                >
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold tracking-wider text-[10px] uppercase">Interactive Practice Challenge</span>
                  </div>

                  <p className="text-[#F8FAFC] font-semibold text-xs leading-relaxed">
                    {DEMO_SLIDES[activeTab].quizQuestion.question}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 select-none">
                    {DEMO_SLIDES[activeTab].quizQuestion.options.map((opt, index) => {
                      const isCorrect = index === DEMO_SLIDES[activeTab].quizQuestion.correctIndex;
                      const isSelected = selectedQuizAnswer === index;
                      
                      let btnStyle = "border-white/5 bg-[#0F172A]/40 hover:border-white/15 hover:bg-[#0F172A]/75 text-[#D1D5DB]";
                      if (selectedQuizAnswer !== null) {
                        if (isSelected) {
                          btnStyle = isCorrect 
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" // Corret option
                            : "bg-rose-500/20 border-rose-500/40 text-rose-300"; // Wrong selected
                        } else if (isCorrect) {
                          btnStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"; // Correct highlighted anyway
                        }
                      }

                      return (
                        <button
                          key={index}
                          disabled={selectedQuizAnswer !== null}
                          onClick={() => handleSelectQuizAnswer(index)}
                          className={`p-3 rounded-xl border text-left text-xs font-semibold select-none cursor-pointer text-xs transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span className="max-w-[85%]">{opt}</span>
                          {selectedQuizAnswer !== null && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>

                  {showExplanation && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs leading-relaxed p-3.5 rounded-xl border border-white/5 bg-[#020617]/50"
                    >
                      <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-[#06B6D4] font-bold uppercase text-[9px] mb-1">
                        {selectedQuizAnswer === DEMO_SLIDES[activeTab].quizQuestion.correctIndex ? '🎉 Perfect Solution!' : '💡 Conceptual Explanation'}
                      </p>
                      <p className="text-neutral-300 text-[11.5px] leading-relaxed">
                        {DEMO_SLIDES[activeTab].quizQuestion.explanation}
                      </p>
                    </motion.div>
                  )}

                  {selectedQuizAnswer !== null && (
                    <div className="flex items-center justify-between border-t border-[#10B981]/10 pt-3 text-[10px] text-[#94A3B8]/60">
                      <span>Concept retention credit: **+10 experience pts**</span>
                      <button 
                        onClick={() => setSelectedQuizAnswer(null)}
                        className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                      >
                        Reset Question
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* End of content footer recommendations */}
              {!isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-[#94A3B8]/60"
                >
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#7C3AED]/15 text-[#7C3AED] font-bold">NEXT LESSON SUGGESTIONS:</span>
                  <p className="hover:text-white transition-colors cursor-pointer underline">Review sample homework exercises</p>
                  <span>•</span>
                  <p className="hover:text-white transition-colors cursor-pointer underline">Explore subject summary card</p>
                </motion.div>
              )}

            </div>

            {/* Custom Input prompt form for mobile in Footer */}
            <form onSubmit={handleCustomQuerySubmit} className="lg:hidden flex gap-2 mt-4 pt-4 border-t border-white/5 select-none text-xs">
              <input 
                type="text" 
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Ask any school question..."
                className="flex-1 bg-[#020617] text-white p-3 rounded-xl border border-white/5 focus:outline-none"
              />
              <button 
                type="submit" 
                className="px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl"
              >
                Send
              </button>
            </form>

          </div>

        </div>

      </section>

      {/* ==================================================== SUBJECTS SECTION */}
      <section id="subjects" className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 bg-[#020617]/40 leading-none">
        
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-4">
          <span className="text-[#06B6D4] text-xs font-bold uppercase tracking-[0.2em]">COMPLETE SYLLABUS MAPPING</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#F8FAFC] tracking-tight">
            Comprehensive Multi-Subject Board Support
          </h2>
          <p className="text-[#94A3B8] text-base md:text-lg">
            SJ Tutor AI mapping covers complex STEM chapters and Humanities subjects natively, creating custom lesson goals instantly.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { name: "Mathematics", icon: "∑", color: "from-blue-600 to-[#2563EB]/40", bgGlow: "rgba(37,99,235, 0.25)" },
            { name: "Physics", icon: "⚛", color: "from-purple-600 to-[#7C3AED]/40", bgGlow: "rgba(124,58,237, 0.25)" },
            { name: "Chemistry", icon: "🧪", color: "from-pink-500 to-rose-500/40", bgGlow: "rgba(236,72,153, 0.25)" },
            { name: "Biology", icon: "🌿", color: "from-emerald-400 to-[#10B981]/40", bgGlow: "rgba(16,185,129, 0.25)" },
            { name: "Computer Science", icon: "💻", color: "from-cyan-500 to-[#06B6D4]/40", bgGlow: "rgba(6,182,212, 0.25)" },
            { name: "English", icon: "📖", color: "from-indigo-600 to-violet-600/40", bgGlow: "rgba(79,70,229, 0.25)" },
            { name: "History", icon: "🏺", color: "from-amber-600 to-orange-600/40", bgGlow: "rgba(245,158,11, 0.25)" },
            { name: "Economics", icon: "📈", color: "from-rose-500 to-pink-500/40", bgGlow: "rgba(244,63,94, 0.25)" }
          ].map((sub, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-5 md:p-6 bg-[#0F172A]/30 border border-white/5 hover:bg-[#0F172A]/70 hover:border-slate-800 transition-all duration-300 text-center select-none cursor-pointer max-w-full overflow-hidden flex flex-col justify-center items-center"
            >
              {/* Radial gradient background aura on card hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none blur-xl rounded-2xl" 
                style={{ backgroundColor: sub.bgGlow }}
              />

              {/* Glowing Icon container */}
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${sub.color} flex items-center justify-center font-sans font-bold text-xl text-white mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-black/25`}>
                <span className="leading-none">{sub.icon}</span>
              </div>

              <h4 className="text-sm md:text-base font-bold text-[#F8FAFC] tracking-tight mb-2 group-hover:text-blue-400 transition-colors">
                {sub.name}
              </h4>
              <p className="text-[11px] text-[#94A3B8]/60 font-mono tracking-wider">MAPS_READY_V2</p>
            </div>
          ))}
        </div>

      </section>

      {/* ==================================================== TESTIMONIALS */}
      <section id="testimonials" className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 border-t border-[#0F172A]/60">
        
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20 space-y-4">
          <span className="text-[#7C3AED] text-xs font-bold uppercase tracking-[0.2em]">STUDENT IMPACT ANALYSIS</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#F8FAFC] tracking-tight">
            Student Success Stories
          </h2>
          <p className="text-[#94A3B8] text-base md:text-lg">
            Hear how secondary and high-school students are excelling on exams and clearing their curriculum chapter doubts securely.
          </p>
        </div>

        {/* Carousel Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "Jessica Miller",
              photo: "https://picsum.photos/seed/jessica/150/150",
              rating: 5,
              improvement: "+22% Grade Score",
              task: "Mathematics & Chemistry",
              feedback: "The instant step-by-step math solver is a miracle. I was struggling with quadratics and chemistry bonding, but SJ Tutor broke down chemical valence formulas into simple lists. Cleared CBSE with flying colors!"
            },
            {
              name: "Aryan Patel",
              photo: "https://picsum.photos/seed/aryan/150/150",
              rating: 5,
              improvement: "Cleared Term Exams: Score A+",
              task: "High-school Physics",
              feedback: "Newtonian vector equations used to keep me up at night. The live simulation tutor demo is basically identical to having a private coach. SJ AI explains force actions instantly and tests you with interactive mock challenges."
            },
            {
              name: "Maya Lin",
              photo: "https://picsum.photos/seed/maya/150/150",
              rating: 5,
              improvement: "Perfect 100/100 Computer Science",
              task: "AP Computer Science",
              feedback: "Extremely fast streaming. Binary search tree recursion concepts clicked for me in 2 minutes. The performance analytics lines on my student dashboard are highly addictive and let me track exact retention easily."
            }
          ].map((t, i) => (
            <div 
              key={i} 
              className="rounded-3xl p-6 md:p-8 bg-[#0F172A]/45 border border-white/5 backdrop-blur-md hover:border-slate-800 transition-all duration-300 relative space-y-5"
            >
              <div className="flex items-center gap-4">
                <img 
                  src={t.photo} 
                  alt={t.name} 
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full border-2 border-purple-500/50 object-cover"
                />
                <div>
                  <h5 className="font-bold text-sm text-[#F8FAFC]">{t.name}</h5>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                    {t.improvement}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(t.rating)].map((_, r) => (
                  <Star key={r} className="w-3.5 h-3.5 fill-amber-500" />
                ))}
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed italic">
                {`"${t.feedback}"`}
              </p>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[11px] text-[#94A3B8]/60 font-mono">
                <span>Focus: **{t.task}**</span>
                <span className="text-emerald-400 uppercase tracking-wider text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  VERIFIED GRADE
                </span>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ==================================================== PRICING SECTION */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-28 border-t border-[#0F172A]/60">
        
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24 space-y-4">
          <span className="text-[#06B6D4] text-xs font-bold uppercase tracking-[0.2em]">FLEXIBLE HIGH-RETENTION SUBSCRIPTIONS</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#F8FAFC] tracking-tight">
            Choose Your Learning Plan
          </h2>
          <p className="text-[#94A3B8] text-base md:text-lg">
            Invest in your credentials with transparent premium pricing tiers tailored for both solo students and schools.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          
          {/* Plan 1: Free */}
          <div className="rounded-3xl p-6 md:p-8 bg-[#0F172A]/25 border border-white/5 backdrop-blur-md flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] tracking-widest font-black uppercase text-[#94A3B8]/60 block">GET FAMILIAR</span>
              <h3 className="text-xl font-bold text-[#F8FAFC]">Free Companion</h3>
              <p className="text-xs text-[#94A3B8]">Clear basic doubts during revision steps.</p>
              
              <div className="py-4 border-y border-white/5">
                <p className="text-4xl font-extrabold text-[#F8FAFC]">$0<span className="text-sm font-normal text-[#94A3B8] ml-1">/ always free</span></p>
              </div>

              <ul className="space-y-3 pt-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>Limited AI Questions (10 daily)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>Basic Learning & Summary Tools</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500 line-through">
                  <span>Advanced Performance Graphs</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500 line-through">
                  <span>Subjective mock exam prep boards</span>
                </li>
              </ul>
            </div>

            <button 
              onClick={onGetStarted}
              className="mt-8 py-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-white font-semibold text-sm cursor-pointer transition-colors text-center w-full block"
            >
              Start Free Companion
            </button>
          </div>

          {/* Plan 2: Pro HIGHLIGHTED */}
          <div className="relative rounded-3xl p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 shadow-2xl flex flex-col justify-between transform hover:-translate-y-0.5 transition-all">
            <div className="absolute top-[-14px] right-[20px] bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-md animate-bounce">
              🌟 Popular Scholar Choose
            </div>

            <div className="rounded-[22px] bg-[#0F172A] p-6 md:p-8 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <span className="text-[10px] tracking-widest font-black uppercase text-purple-400 block block">MAX ACHIEVEMENT</span>
                <h3 className="text-xl font-bold text-[#F8FAFC]">Pro Scholar</h3>
                <p className="text-xs text-purple-300/80">Continuous unlimited doubt clearing and mock quizzes.</p>
                
                <div className="py-4 border-y border-white/5">
                  <p className="text-4xl font-extrabold text-[#F8FAFC]">$9.99<span className="text-sm font-normal text-[#94A3B8] ml-1">/ month</span></p>
                </div>

                <ul className="space-y-3 pt-2 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#06B6D4] flex-shrink-0" />
                    <span>**Unlimited** AI Tutoring doubt explanation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#06B6D4] flex-shrink-0" />
                    <span>Advanced Analytics & Progress Heatmaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#06B6D4] flex-shrink-0" />
                    <span>Interactive Exam Prep Mock boards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#06B6D4] flex-shrink-0" />
                    <span>Personalized Retention Learning Plans</span>
                  </li>
                </ul>
              </div>

              <button 
                onClick={onGetStarted}
                className="mt-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm shadow-md cursor-pointer hover:shadow-lg hover:shadow-purple-500/25 transition-all text-center w-full block"
              >
                Unlock Pro Scholar Now
              </button>
            </div>
          </div>

          {/* Plan 3: School */}
          <div className="rounded-3xl p-6 md:p-8 bg-[#0F172A]/25 border border-white/5 backdrop-blur-md flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] tracking-widest font-black uppercase text-[#94A3B8]/60 block font-sans">INSTITUTION</span>
              <h3 className="text-xl font-bold text-[#F8FAFC]">Institution School</h3>
              <p className="text-xs text-[#94A3B8]">Deploy AI dashboards to monitor multiple classrooms.</p>
              
              <div className="py-4 border-y border-white/5">
                <p className="text-4xl font-extrabold text-[#F8FAFC]">$49<span className="text-sm font-normal text-[#94A3B8] ml-1">/ month / class</span></p>
              </div>

              <ul className="space-y-3 pt-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#7C3AED] flex-shrink-0" />
                  <span>Teacher admin dashboard controls</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#7C3AED] flex-shrink-0" />
                  <span>Verified Classroom study Analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#7C3AED] flex-shrink-0" />
                  <span>Secure Student registration control codes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#7C3AED] flex-shrink-0" />
                  <span>Unified school curriculum reports</span>
                </li>
              </ul>
            </div>

            <button 
              onClick={onGetStarted}
              className="mt-8 py-3 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-white font-semibold text-sm cursor-pointer transition-colors text-center w-full block"
            >
              Contact School Sales
            </button>
          </div>

        </div>

      </section>

      {/* ==================================================== FINAL CTA SECTION */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-16 text-center select-none">
        
        {/* Glow center backing block */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/15 to-cyan-500/10 blur-2xl rounded-[3rem] pointer-events-none" />

        <div className="relative rounded-3xl p-8 md:p-14 bg-gradient-to-b from-[#0F172A]/85 to-[#0F172A]/50 border border-white/5 backdrop-blur-md space-y-6 md:space-y-8 shadow-xl">
          <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-blue-600/[0.03] to-transparent pointer-events-none rounded-b-3xl" />
          
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/15 rounded-full text-[#06B6D4] text-xs font-semibold tracking-wider uppercase animate-pulse">
            💥 FREE ENROLLMENT CLOSING SOON
          </span>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#F8FAFC] leading-none max-w-3xl mx-auto">
            Ready to Learn Smarter?
          </h2>
          
          <p className="text-base md:text-lg text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
            Join thousands of school students transforming their education, clearing syllabus chapters, and acing tests easily through AI-powered learning.
          </p>

          <button 
            onClick={onGetStarted}
            className="group relative overflow-hidden px-10 py-5 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-extrabold text-xl shadow-2xl shadow-blue-500/15 hover:shadow-purple-500/30 transition-all hover:-translate-y-1"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Start Free Today
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-[#06B6D4] to-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
          </button>
        </div>

      </section>

      {/* ==================================================== FOOTER */}
      <footer className="relative z-10 bg-[#020617] border-t border-[#0F172A]/80 py-16 text-xs text-[#94A3B8]">
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-6 gap-8 pb-12 border-b border-white/5 select-none text-xs">
          
          {/* Brand block footer */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8" showText={true} textColor="text-white" />
            </div>
            <p className="text-[#94A3B8]/60 leading-relaxed max-w-[210px]">
              Advanced AI-powered tutoring and personalized learning companion for students worldwide. Available 24 hours daily.
            </p>
            <p className="text-blue-500 font-bold uppercase tracking-widest text-[9px]">YOUR PATH TO BETTER GRADE SCORE</p>
          </div>

          <div>
            <h6 className="font-bold text-white uppercase tracking-wider text-[9px] mb-4">Product</h6>
            <ul className="space-y-2.5">
              <li><p className="hover:text-white transition-colors cursor-pointer">Instant Summary</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Quiz Creator</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Doubt Solver</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Syllabus Planner</p></li>
            </ul>
          </div>

          <div>
            <h6 className="font-bold text-white uppercase tracking-wider text-[9px] mb-4">Features</h6>
            <ul className="space-y-2.5">
              <li><p className="hover:text-white transition-colors cursor-pointer">AI Search Terminal</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Camera photos upload</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Diagnostic statistics</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Adaptive mock exams</p></li>
            </ul>
          </div>

          <div>
            <h6 className="font-bold text-white uppercase tracking-wider text-[9px] mb-4">Pricing Plans</h6>
            <ul className="space-y-2.5">
              <li><p className="hover:text-white transition-colors cursor-pointer">Free Companion</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Pro Scholar</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Institution School</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Enterprise mapping</p></li>
            </ul>
          </div>

          <div>
            <h6 className="font-bold text-white uppercase tracking-wider text-[9px] mb-4">Company</h6>
            <ul className="space-y-2.5">
              <li><p className="hover:text-white transition-colors cursor-pointer">About Us</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Blog News</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Privacy Policy</p></li>
              <li><p className="hover:text-white transition-colors cursor-pointer">Terms of Service</p></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[#94A3B8]/60">
          <p>© 2026 SJ Tutor AI. All physical credentials and grade metrics reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-white transition-colors cursor-pointer text-sm">𝕏 Twitter</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer text-sm">Discord Community</span>
            <span>•</span>
            <span className="hover:text-white transition-colors cursor-pointer text-sm">LinkedIn Careers</span>
          </div>
        </div>

      </footer>

    </div>
  );
}
