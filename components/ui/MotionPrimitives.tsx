import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import Logo from '../Logo';

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Letter-by-letter reveal for headlines with balance-safe word wrapping.
 */
export const LetterReveal: React.FC<{
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}> = ({ text, className = '', delay = 0, stagger = 0.022 }) => {
  const prefersReduced = useReducedMotion();
  const words = text.split(' ');

  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  let charIndex = 0;

  return (
    <span className={`inline-block [text-wrap:balance] ${className}`}>
      {words.map((word, wIdx) => (
        <span key={wIdx} className="inline-block whitespace-nowrap mr-[0.26em] last:mr-0">
          {Array.from(word).map((char, cIdx) => {
            const currentDelay = delay + charIndex * stagger;
            charIndex++;
            return (
              <motion.span
                key={`${wIdx}-${cIdx}`}
                initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.42,
                  delay: currentDelay,
                  ease: EASE_OUT_EXPO,
                }}
                className="inline-block"
              >
                {char}
              </motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
};

/**
 * Word-by-word reveal for descriptive paragraphs and subheadings.
 */
export const WordReveal: React.FC<{
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}> = ({ text, className = '', delay = 0.15, stagger = 0.032 }) => {
  const prefersReduced = useReducedMotion();
  const words = text.split(' ');

  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.36,
            delay: delay + idx * stagger,
            ease: EASE_OUT_EXPO,
          }}
          className="inline-block mr-[0.28em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

/**
 * Smooth rotating main headline for Hero section.
 */
export const RotatingHeadline: React.FC<{
  phrases: string[];
  className?: string;
  intervalMs?: number;
}> = ({ phrases, className = '', intervalMs = 3400 }) => {
  const [index, setIndex] = useState(0);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || phrases.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [phrases.length, intervalMs, prefersReduced]);

  const current = phrases[index] || phrases[0];

  return (
    <span className={`inline-block relative ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={current}
          initial={prefersReduced ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={prefersReduced ? undefined : { opacity: 0, y: -16, filter: 'blur(6px)' }}
          transition={{ duration: 0.48, ease: EASE_OUT_EXPO }}
          className="inline-block [text-wrap:balance]"
        >
          <LetterReveal text={current} stagger={0.018} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

/**
 * Magnetic hover wrapper for buttons & interactive actions.
 */
export const MagneticButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  strength?: number;
  title?: string;
  'aria-label'?: string;
}> = ({
  children,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  strength = 6,
  title,
  'aria-label': ariaLabel,
}) => {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReduced || disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * strength;
    const dy = ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * strength;
    setPos({ x: dx, y: dy });
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24, mass: 0.6 }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

/**
 * 3D Perspective Hover Card with subtle pointer spotlight reflection.
 */
export const TiltCard3D: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  maxTilt?: number;
}> = ({ children, className = '', onClick, maxTilt = 7 }) => {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * (maxTilt * 2),
      ry: (px - 0.5) * (maxTilt * 2),
      gx: px * 100,
      gy: py * 100,
      hovered: true,
    });
  };

  const handleLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });
  };

  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={{
        rotateX: tilt.rx,
        rotateY: tilt.ry,
        y: tilt.hovered ? -5 : 0,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className={`relative ${className}`}
    >
      {tilt.hovered && !prefersReduced && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200 z-0"
          style={{
            background: `radial-gradient(280px circle at ${tilt.gx}% ${tilt.gy}%, rgba(56, 189, 248, 0.14), rgba(124, 58, 237, 0.08) 45%, transparent 80%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
};

/**
 * Scroll-triggered blur-to-focus reveal block.
 */
export const BlurFocusReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}> = ({ children, className = '', delay = 0, yOffset = 22 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: yOffset, filter: 'blur(6px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : undefined}
      transition={{ duration: 0.55, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Circular clip-path expansion reveal for media & illustrations.
 */
export const CircularImageReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0.2 }) => {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ clipPath: 'circle(12% at 50% 50%)', opacity: 0, scale: 0.96 }}
      animate={{ clipPath: 'circle(90% at 50% 50%)', opacity: 1, scale: 1 }}
      transition={{ duration: 0.85, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Scroll-based GPU Parallax wrapper.
 */
export const ParallaxLayer: React.FC<{
  children: React.ReactNode;
  className?: string;
  offset?: number;
}> = ({ children, className = '', offset = 28 }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], prefersReduced ? [0, 0] : [offset, -offset]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
};

/**
 * Smooth numeric count-up with tabular numerals.
 */
export const CounterNumber: React.FC<{
  value: number;
  suffix?: string;
  prefix?: string;
  durationMs?: number;
  className?: string;
}> = ({ value, suffix = '', prefix = '', durationMs = 1300, className = '' }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(prefersReduced ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    let start: number | null = null;
    let rafId = 0;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const ratio = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setDisplay(Math.round(value * eased));
      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [inView, value, durationMs, prefersReduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
};

/**
 * Animated SVG circular progress indicator for student analytics.
 */
export const AnimatedProgressCircle: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  accentColor?: string;
}> = ({
  percentage,
  size = 92,
  strokeWidth = 7,
  label,
  sublabel,
  accentColor = '#2563EB',
}) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * clamped) / 100;
  const prefersReduced = useReducedMotion();

  return (
    <div className="relative inline-flex flex-col items-center justify-center shrink-0">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={accentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={prefersReduced ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.05, ease: EASE_OUT_EXPO }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
            {Math.round(clamped)}%
          </span>
        </div>
      </div>
      {label && (
        <span className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
          {label}
        </span>
      )}
      {sublabel && (
        <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
          {sublabel}
        </span>
      )}
    </div>
  );
};

/**
 * Interactive cursor spotlight for dark hero / cinematic auth backdrops.
 */
export const CursorSpotlight: React.FC<{ className?: string }> = ({ className = '' }) => {
  const prefersReduced = useReducedMotion();
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (prefersReduced) return;
    const onMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [prefersReduced]);

  if (prefersReduced || !coords) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[1] transition-opacity duration-300 ${className}`}
      style={{
        background: `radial-gradient(460px circle at ${coords.x}px ${coords.y}px, rgba(59, 130, 246, 0.11), rgba(124, 58, 237, 0.06) 45%, transparent 72%)`,
      }}
    />
  );
};

/**
 * Ambient animated gradient orbs for futuristic dark navy backdrop.
 */
export const GradientOrbsBackdrop: React.FC<{ subtle?: boolean }> = ({ subtle = false }) => {
  const opacityClass = subtle ? 'opacity-40' : 'opacity-70';
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${opacityClass}`}>
      <div className="animate-orb-float absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div
        className="animate-blob absolute top-1/3 -right-24 w-[380px] h-[380px] rounded-full bg-violet-600/20 blur-[130px]"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="animate-orb-float absolute -bottom-24 left-1/3 w-[340px] h-[340px] rounded-full bg-cyan-500/15 blur-[110px]"
        style={{ animationDelay: '4s' }}
      />
    </div>
  );
};

const FLOATING_FORMULAS = [
  { text: 'E = mc²', x: '8%', y: '14%', dur: 11 },
  { text: '∫ f(x) dx', x: '78%', y: '18%', dur: 13 },
  { text: 'a² + b² = c²', x: '12%', y: '68%', dur: 12 },
  { text: 'sin²θ + cos²θ = 1', x: '72%', y: '76%', dur: 14 },
  { text: '∑ n = n(n+1)/2', x: '18%', y: '41%', dur: 10 },
  { text: 'ΔG = ΔH - TΔS', x: '81%', y: '46%', dur: 15 },
  { text: 'λ = h / p', x: '44%', y: '10%', dur: 12 },
  { text: 'lim x→∞ (1 + 1/x)ˣ = e', x: '48%', y: '86%', dur: 13 },
];

/**
 * Gently drifting math formulas & science symbols for immersive educational backdrops.
 */
export const FloatingFormulasField: React.FC<{ className?: string }> = ({ className = '' }) => {
  const prefersReduced = useReducedMotion();

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {FLOATING_FORMULAS.map((item, idx) => (
        <motion.div
          key={idx}
          initial={prefersReduced ? { opacity: 0.18 } : { opacity: 0.08, y: 0 }}
          animate={
            prefersReduced
              ? { opacity: 0.16 }
              : {
                  opacity: [0.1, 0.28, 0.1],
                  y: [0, -18, 0],
                  x: [0, idx % 2 === 0 ? 8 : -8, 0],
                }
          }
          transition={{
            duration: item.dur,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: idx * 0.45,
          }}
          style={{ left: item.x, top: item.y }}
          className="absolute font-mono text-xs sm:text-sm font-medium text-blue-300/70 select-none tracking-tight whitespace-nowrap"
        >
          {item.text}
        </motion.div>
      ))}
    </div>
  );
};

/**
 * Resilient image slot obeying Zero-Broken-Image policy.
 */
export const ResilientImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}> = ({ src, alt, className = '', fallbackTitle }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1538] via-[#131F4E] to-[#1D1245] text-blue-200 p-6 ${className}`}
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mb-3">
          <Logo className="w-10 h-10" iconOnly noBorder />
        </div>
        {fallbackTitle && <span className="text-sm font-semibold text-white">{fallbackTitle}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

/**
 * Section C: Post-auth Dashboard Transition
 * Fade the cinematic dark navy backdrop, zoom smoothly through the SJ Tutor AI logo,
 * and reveal the clean white/light-grey authenticated Student Dashboard.
 */
export const DashboardRevealTransition: React.FC<{
  active: boolean;
  studentName?: string;
  onComplete: () => void;
}> = ({ active, studentName, onComplete }) => {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(() => {
      onComplete();
    }, prefersReduced ? 120 : 900);
    return () => clearTimeout(timeout);
  }, [active, onComplete, prefersReduced]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="dashboard-reveal-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.15 : 0.85, delay: prefersReduced ? 0 : 0.25, ease: EASE_OUT_EXPO }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#04091E] via-[#0B1437] to-[#160D35] pointer-events-none select-none overflow-hidden"
        >
          {/* Radial electric blue + violet glow */}
          <div className="absolute w-96 h-96 rounded-full bg-blue-600/30 blur-[120px]" />
          <div className="absolute w-80 h-80 rounded-full bg-violet-600/25 blur-[110px]" />

          <motion.div
            initial={prefersReduced ? { scale: 1, opacity: 1 } : { scale: 0.78, opacity: 0.9 }}
            animate={prefersReduced ? { scale: 1, opacity: 0 } : { scale: [0.85, 1.12, 3.6], opacity: [1, 1, 0] }}
            transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
            className="relative flex flex-col items-center gap-4"
          >
            <div className="w-24 h-24 rounded-3xl p-1 bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 shadow-[0_0_55px_rgba(37,99,235,0.65)]">
              <div className="w-full h-full rounded-[20px] bg-slate-950 flex items-center justify-center overflow-hidden">
                <Logo className="w-full h-full" iconOnly noBorder />
              </div>
            </div>
            {studentName && (
              <p className="text-sm font-semibold text-blue-200 tracking-wide">
                Preparing dashboard for {studentName}...
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
