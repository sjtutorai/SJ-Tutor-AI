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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950 text-white">
      {/* Floating Ambient Light Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: `${p.y + 10}%` }}
            animate={{ 
              opacity: [0, 0.4, 0.4, 0],
              y: [`${p.y}%`, `${p.y - 30}%`]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut"
            }}
            className="absolute bg-blue-400 rounded-full"
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
          <div className="absolute w-40 h-40 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />

          {/* Rotating AI Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute w-32 h-32 rounded-full border border-dashed border-blue-400/40 p-1"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute w-[140px] h-[140px] rounded-full border border-dashed border-purple-400/20"
          />

          {/* Premium Logo Wrapper */}
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-28 h-28 flex items-center justify-center"
          >
            <Logo className="w-full h-full text-blue-500" iconOnly />
          </motion.div>
        </div>

        {/* Brand Name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-2xl font-black tracking-tight text-white mb-2"
        >
          SJ Tutor <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">AI</span>
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
        <div className="w-full h-1.5 bg-slate-950/40 rounded-full border border-white/5 overflow-hidden backdrop-blur-sm shadow-inner relative">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
