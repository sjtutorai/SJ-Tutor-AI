import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, ChevronRight, X, Heart, 
  Gamepad2, Battery, Volume2, VolumeX, Flame
} from 'lucide-react';
import { HistoryItem, UserProfile } from '../types';

interface StreakToyProps {
  userProfile: UserProfile;
  streak: number;
  userId?: string | null;
  history: HistoryItem[];
}

export const StreakToy: React.FC<StreakToyProps> = ({ 
  userProfile, 
  streak, 
  userId, 
  history 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(true);
  const [bubbleText, setBubbleText] = useState<string>('');
  const [isWiggling, setIsWiggling] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  // 1. Identify Streak Levels
  const getStreakLevel = (s: number) => {
    if (s >= 7) return { 
      level: 3, 
      name: 'Cosmic Sage', 
      colorClass: 'from-amber-500 via-orange-500 to-yellow-400',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50',
      avatar: '👑✨',
      desc: 'Floating Galactic Overlord',
      casing: 'bg-slate-900 dark:bg-slate-950 border-amber-400 p-4 shadow-xl shadow-amber-500/20 ring-4 ring-amber-400/30'
    };
    if (s >= 3) return { 
      level: 2, 
      name: 'Cyber Companion', 
      colorClass: 'from-blue-500 to-indigo-600',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50',
      avatar: '🤖🎧',
      desc: 'Blithesome Cybernet Companion',
      casing: 'bg-slate-900 dark:bg-slate-950 border-blue-400 p-4 shadow-xl shadow-blue-500/20 ring-4 ring-blue-400/30'
    };
    return { 
      level: 1, 
      name: 'Cozy Hatchling', 
      colorClass: 'from-emerald-500 to-teal-600',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50',
      avatar: '🥚💤',
      desc: 'Sleeping Mystic Egg',
      casing: 'bg-slate-900 dark:bg-slate-950 border-emerald-400 p-4 shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-400/30'
    };
  };

  const currentLevel = getStreakLevel(streak);

  // 2. Play Retro Sound Bleep using Web Audio API
  const playRetroBleep = (type: 'chirp' | 'success' | 'click' | 'levelup') => {
    if (!isPlayingSound) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'chirp') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(900, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'levelup') {
        // Play melodic upgrade rise
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.15);
        });
      }
    } catch {
      // Standard audio blocker bypass
    }
  };

  // 3. Custom Whimsical Mascot Dialouges
  const getWittyBubbleText = () => {
    const dialogs = [
      streak >= 7 
        ? `🌟 Feel the cosmic energy of my extreme brain, ${userProfile.displayName || 'Scholar'}!` 
        : streak >= 3 
        ? `⚡ We are building direct neuron pathways, ${userProfile.displayName || 'Scholar'}!` 
        : `💤 Keep studying ${userProfile.displayName || 'Scholar'} so I can evolve into supreme form!`,
      "🧪 Remember: consistency beats intensive cramming anytime.",
      "🧠 Want to feed me? Clear a summary or write a formula page!",
      "⏳ Our focus timer is a magical portal of productivity.",
      "📖 'Knowledge is indeed the ultimate armor.' Let's read!",
      "🎮 Click the buttons on my casing to tune my energy!",
      "✨ Level 3 is supreme. Can you master a 7-day streak?",
    ];
    const item = dialogs[Math.floor(Math.random() * dialogs.length)];
    return item;
  };

  // Handle Mascot Interaction Click
  const handleMascotClick = () => {
    setIsWiggling(true);
    playRetroBleep('chirp');
    setBubbleText(getWittyBubbleText());
    
    // Launch floating heart/sparkle particle
    const newId = Date.now();
    setFloatingHearts(prev => [
      ...prev,
      { id: newId, x: Math.random() * 80 + 10, y: Math.random() * 40 - 20 }
    ]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newId));
    }, 1500);

    setTimeout(() => setIsWiggling(false), 300);
  };

  // 4. Calculate daily progress matrix for this week
  const getWeeklyProgressData = () => {
    const key = userId || 'guest';
    const milestonesStr = localStorage.getItem(`study_milestones_${key}`) || '[]';
    let milestones: any[] = [];
    try {
      milestones = JSON.parse(milestonesStr);
    } catch {
      milestones = [];
    }

    const actionDates = new Set<string>();
    
    history.forEach(item => {
      if (item.timestamp) {
        actionDates.add(new Date(item.timestamp).toDateString());
      }
    });

    milestones.forEach((m: any) => {
      if (m.timestamp) {
        actionDates.add(new Date(m.timestamp).toDateString());
      } else if (m.date) {
        actionDates.add(new Date(m.date).toDateString());
      }
    });

    // Generate last 7 days including today (retro matrix view)
    const weekDays = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const isComplete = actionDates.has(d.toDateString());
      
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayNum = d.getDate();
      const isToday = d.toDateString() === today.toDateString();

      weekDays.push({
        label: dayLabel,
        num: dayNum,
        isComplete,
        isToday,
        dateKey: d.toDateString()
      });
    }

    return weekDays;
  };

  const weekProgress = getWeeklyProgressData();
  const daysActiveCount = weekProgress.filter(w => w.isComplete).length;

  useEffect(() => {
    if (bubbleText) {
      const t = setTimeout(() => setBubbleText(''), 5500);
      return () => clearTimeout(t);
    }
  }, [bubbleText]);

  return (
    <>
      {/* 🚀 CLICKABLE MASCOT TOY CARD (ON THE DASHBOARD) */}
      <div 
        id="streak-toy-launcher"
        onClick={() => {
          setIsOpen(true);
          playRetroBleep('levelup');
        }}
        className="flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer relative overflow-hidden group select-none min-w-[280px]"
      >
        {/* Glow backlight behind pet egg */}
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${currentLevel.colorClass} opacity-5 blur-xl group-hover:opacity-15 transition-opacity duration-300`} />
        
        {/* Interactive Mascot Mascot Capsule */}
        <div className="relative flex-none">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-3xl select-none relative shadow-inner overflow-hidden">
            {/* Grid display background scanlines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.05)_50%,_rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] opacity-20 pointer-events-none" />
            <motion.span 
              animate={{
                y: [0, -4, 0],
                rotate: streak >= 7 ? [0, -5, 5, 0] : [0, 0]
              }}
              transition={{
                repeat: Infinity,
                duration: streak >= 7 ? 1.5 : 2.5,
                ease: "easeInOut"
              }}
              className="z-10"
            >
              {currentLevel.avatar.split('')[0]}
            </motion.span>
          </div>
          
          {/* Level indicators as absolute floating dots */}
          <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm">
            {currentLevel.level}
          </span>
        </div>

        {/* Level text & titles */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">STREAK PARTNER</span>
            <span className="flex items-center gap-0.5 text-amber-500 text-xs font-bold font-mono">
              <Flame className="w-3.5 h-3.5 fill-amber-500 animate-bounce" />
              {streak}
            </span>
          </div>
          <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
            {currentLevel.name}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-1 flex items-center gap-1">
            <span>Level {currentLevel.level}: {currentLevel.desc}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>

      {/* 🔮 BEAUTIFUL FULL-SCREEN RETRO "TOY GAMEBOX" MODAL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-sm"
              id="streak-toy-console"
            >
              {/* Outer Whimsical Gameboy/Tamagotchi Styled Frame */}
              <div className={`rounded-[36px] border-4 p-5 ${currentLevel.casing} transition-all duration-300 relative`}>
                
                {/* Consoles Top Speaker grill / Logo */}
                <div className="flex justify-between items-center px-4 mb-3">
                  <div className="flex gap-1.5 items-center">
                    <Gamepad2 className="w-5 h-5 text-slate-300" />
                    <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">SJ PARTNER GP-1</span>
                  </div>
                  
                  {/* Sound control button */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setIsPlayingSound(!isPlayingSound);
                        playRetroBleep('click');
                      }}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                      title={isPlayingSound ? "Mute Bleeps" : "Unmute Bleeps"}
                    >
                      {isPlayingSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => {
                        setIsOpen(false);
                        playRetroBleep('click');
                      }}
                      className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 📟 EMBEDDED DIGITAL LCD MONITOR SCREEN */}
                <div className="bg-[#1e293b] rounded-2xl border-4 border-slate-700 p-4 shadow-inner relative overflow-hidden">
                  
                  {/* LCD Display Background Scanlines & CRT curve */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.06)_50%,_rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-15 pointer-events-none z-10" />
                  
                  {/* Mascot Header Ribbon */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-700/80 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                      HP: 100%
                    </span>
                    <span className="flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      XP Level {currentLevel.level}
                    </span>
                  </div>

                  {/* Character visual stage inside the screen */}
                  <div className="relative py-4 flex flex-col items-center justify-center min-h-[140px] bg-slate-950/80 rounded-xl border border-slate-800 shadow-inner">
                    
                    {/* Floating Heart Sparks Animation */}
                    {floatingHearts.map(h => (
                      <motion.span
                        key={h.id}
                        initial={{ opacity: 1, scale: 0.5, x: h.x, y: h.y }}
                        animate={{ opacity: 0, scale: 1.5, y: h.y - 80 }}
                        transition={{ duration: 1.2 }}
                        className="absolute text-rose-500 text-lg pointer-events-none z-30"
                      >
                        ❤️
                      </motion.span>
                    ))}

                    <div 
                      onClick={handleMascotClick}
                      className="cursor-pointer group relative flex flex-col items-center justify-center select-none"
                    >
                      {/* Active level avatar emoji inside LCD screen */}
                      <motion.div
                        animate={isWiggling ? {
                          scale: [1, 1.25, 0.95, 1],
                          rotate: [-15, 15, -10, 10, 0]
                        } : {
                          y: [0, -8, 0],
                        }}
                        transition={isWiggling ? {
                          duration: 0.35,
                        } : {
                          repeat: Infinity,
                          duration: currentLevel.level === 3 ? 1.4 : 2.5,
                          ease: "easeInOut"
                        }}
                        className="text-5xl drop-shadow-[0_4px_12px_rgba(245,158,11,0.3)] select-none hover:scale-110 transition-transform"
                      >
                        {currentLevel.level === 3 ? "👑🤖" : currentLevel.level === 2 ? "🤖🎧" : "🥚💤"}
                      </motion.div>
                      
                      {/* Interactive Hover Prompt */}
                      <div className="absolute -bottom-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/90 text-slate-300 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest pointer-events-none border border-slate-700">
                        Tap Pet!
                      </div>
                    </div>

                    {/* Speech dialog bubble */}
                    <AnimatePresence>
                      {bubbleText && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: -10 }}
                          className="absolute -top-1 px-3 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg border-2 border-slate-900 max-w-[200px] text-center"
                        >
                          <p className="leading-tight">{bubbleText}</p>
                          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-amber-500 border-r-2 border-b-2 border-slate-900" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Streak Count Banner in screen */}
                    <div className="mt-4 px-3 py-1.5 bg-slate-900 rounded-full border border-slate-800 flex items-center gap-1.5 shadow-sm">
                      <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Active Streak:</span>
                      <code className="text-xs font-black text-amber-400 font-mono">{streak} Days</code>
                    </div>
                  </div>

                  {/* 📊 DAILY WEEK PROGRESS IN THE SCREEN */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        This Week progress ({daysActiveCount}/7 Days)
                      </span>
                      <span className="text-[9px] font-bold text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {streak >= 3 ? "XP Active" : "Level Hatch"}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {weekProgress.map((day) => (
                        <div 
                          key={day.dateKey}
                          className="flex flex-col items-center"
                          title={day.isComplete ? `${day.dateKey} - Studied!` : `${day.dateKey} - Missed`}
                        >
                          {/* LCD Styled Dot Bulbs */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm transition-all relative ${
                            day.isComplete 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                              : 'bg-slate-950 text-slate-600 border border-slate-800'
                          } ${day.isToday ? 'ring-2 ring-indigo-500' : ''}`}>
                            {day.isComplete ? "⭐" : day.num}
                          </div>
                          <span className="text-[8px] font-semibold text-slate-500 uppercase mt-1">
                            {day.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Physical Console D-PAD / BUTTONS underneath (Authentic toy decoration) */}
                <div className="mt-5 flex justify-between items-center px-2 pb-1 relative z-10">
                  {/* Digital Cross D-Pad */}
                  <div className="relative w-16 h-16 bg-slate-800 dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-700 shadow-md">
                    <div className="absolute w-10 h-3 bg-slate-700 dark:bg-slate-800 rounded-full" />
                    <div className="absolute h-10 w-3 bg-slate-700 dark:bg-slate-800 rounded-full" />
                    <button 
                      onClick={() => {
                        playRetroBleep('click'); 
                        setIsWiggling(true); 
                        setTimeout(() => setIsWiggling(false), 200);
                        setBubbleText("🤖 Beep boop! Directional input received!");
                      }} 
                      className="absolute w-4 h-4 rounded-full bg-slate-600 active:scale-95 shadow z-10" 
                    />
                  </div>

                  {/* Decorative Play Console ventilation slits */}
                  <div className="flex flex-col gap-1 w-10">
                    <div className="h-1 bg-slate-800 dark:bg-slate-900 rounded-full w-full" />
                    <div className="h-1 bg-slate-800 dark:bg-slate-900 rounded-full w-4/5 mx-auto" />
                    <div className="h-1 bg-slate-800 dark:bg-slate-900 rounded-full w-2/3 mx-auto" />
                  </div>

                  {/* Neon interactive plastic Action buttons */}
                  <div className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <button 
                        onClick={() => {
                          playRetroBleep('click');
                          setBubbleText("🍳 Serving a futuristic brain burger... delicious!");
                          const newId = Date.now();
                          setFloatingHearts(prev => [
                            ...prev,
                            { id: newId, x: Math.random() * 80 + 10, y: Math.random() * 40 - 20 }
                          ]);
                          setTimeout(() => {
                            setFloatingHearts(prev => prev.filter(h => h.id !== newId));
                          }, 1500);
                        }}
                        className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 border border-slate-900 active:scale-90 shadow-md flex items-center justify-center text-xs text-white uppercase font-black"
                        title="Feed"
                      >
                        F
                      </button>
                      <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Feed</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <button 
                        onClick={() => {
                          playRetroBleep('click');
                          setBubbleText(getWittyBubbleText());
                          playRetroBleep('chirp');
                        }}
                        className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 border border-slate-900 active:scale-90 shadow-md flex items-center justify-center text-xs text-white uppercase font-black"
                        title="Talk"
                      >
                        T
                      </button>
                      <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Talk</span>
                    </div>
                  </div>
                </div>

                {/* Subtitle brand stamp */}
                <p className="text-center text-[8px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-4 uppercase tracking-widest uppercase">
                  &bull; TAMAGOTCHI BRAIN BOOSTER SYSTEM &bull;
                </p>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
