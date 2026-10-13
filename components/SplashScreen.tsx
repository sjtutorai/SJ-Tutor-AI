import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import Logo from "./Logo";

interface SplashScreenProps {
  onComplete: () => void;
}

const STATUS_MESSAGES = [
  "Initializing AI...",
  "Loading Knowledge Base...",
  "Preparing Your Learning Experience...",
  "Syncing Your Dashboard...",
  "Almost Ready..."
];

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle messages and smooth progress bar over 2.8 seconds
  useEffect(() => {
    const duration = 2800; // 2.8 seconds total
    const intervalTime = duration / STATUS_MESSAGES.length;

    const messageInterval = setInterval(() => {
      setStatusIdx((prev) => (prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev));
    }, intervalTime);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1.25; // Smooth incremental fill
      });
    }, 30);

    const finishTimeout = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      clearTimeout(finishTimeout);
    };
  }, [onComplete]);

  // Generate particles
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 2,
    duration: Math.random() * 4 + 4,
  }));

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-tr from-slate-950 via-[#061435] to-[#042459] text-white">
      {/* Floating Ambient Light Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#0564E8]/20 blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#46D8D1]/15 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: `${p.y + 10}%` }}
            animate={{ 
              opacity: [0, 0.5, 0.5, 0],
              y: [`${p.y}%`, `${p.y - 30}%`]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut"
            }}
            className="absolute bg-cyan-300 rounded-full"
            style={{
              left: `${p.x}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center max-w-sm w-full px-6 text-center z-10">
        {/* Logo and Rotating Ring Container */}
        <div className="relative mb-10 flex items-center justify-center">
          {/* Outer glowing pulsing aura */}
          <div className="absolute w-44 h-44 bg-[#0564E8]/30 rounded-full blur-2xl animate-pulse" />

          {/* Rotating AI Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            className="absolute w-36 h-36 rounded-full border border-dashed border-[#46D8D1]/50 p-1"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
            className="absolute w-[150px] h-[150px] rounded-full border border-dashed border-[#0564E8]/40"
          />

          {/* Premium Logo Wrapper */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-[#0564E8] via-[#0C9DDB] to-[#46D8D1] shadow-[0_0_30px_rgba(5,100,232,0.5)] flex items-center justify-center overflow-hidden"
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-950 flex items-center justify-center">
              <Logo className="w-full h-full" iconOnly noBorder />
            </div>
          </motion.div>
        </div>

        {/* Brand Name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-2xl font-black tracking-tight text-white mb-2"
        >
          SJ Tutor <span className="bg-gradient-to-r from-[#46D8D1] via-[#38BDF8] to-[#0564E8] bg-clip-text text-transparent">AI</span>
        </motion.h1>

        {/* Dynamic cycling status messages */}
        <div className="h-6 mb-6 flex items-center justify-center">
          <motion.p
            key={statusIdx}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="text-xs font-semibold text-slate-300 uppercase tracking-widest font-mono"
          >
            {STATUS_MESSAGES[statusIdx]}
          </motion.p>
        </div>

        {/* Glassmorphic progress bar */}
        <div className="w-full h-1.5 bg-slate-950/60 rounded-full border border-white/10 overflow-hidden backdrop-blur-sm shadow-inner relative">
          <motion.div
            className="h-full bg-gradient-to-r from-[#0564E8] via-[#0C9DDB] to-[#46D8D1] rounded-full shadow-[0_0_12px_rgba(5,100,232,0.7)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
