import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Flame, Info, HelpCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface DraggableStreakWidgetProps {
  userProfile: UserProfile;
  onClick: () => void;
  onPositionSave?: (x: number, y: number) => void;
}

export const DraggableStreakWidget: React.FC<DraggableStreakWidgetProps> = ({
  userProfile,
  onClick,
  onPositionSave
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  
  // Default values: positioned at bottom right corner above primary action spaces
  const [position, setPosition] = useState({ x: -1000, y: -1000 });
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Drag threshold tracking
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Load initial position
  useEffect(() => {
    const loadPosition = () => {
      let savedX: number | null = null;
      let savedY: number | null = null;

      // 1. Try Loading from User Profile stored in Cloud Database
      if (typeof userProfile.streakWidgetX === 'number' && typeof userProfile.streakWidgetY === 'number') {
        savedX = userProfile.streakWidgetX;
        savedY = userProfile.streakWidgetY;
      } else {
        // 2. Fallback to LocalStorage
        const localPos = localStorage.getItem('streak_widget_pos');
        if (localPos) {
          try {
            const parsed = JSON.parse(localPos);
            if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
              savedX = parsed.x;
              savedY = parsed.y;
            }
          } catch (e) {
            console.error("Failed to parse local position:", e);
          }
        }
      }

      const widgetWidth = 140; 
      const widgetHeight = 56;
      const margin = 16;
      const headerOffset = 80;

      // Ensure viewport size exists
      const width = window.innerWidth || 1024;
      const height = window.innerHeight || 768;

      let targetX = width - widgetWidth - margin;
      let targetY = height - widgetHeight - margin - 20; // slightly above bottom

      if (savedX !== null && savedY !== null) {
        targetX = savedX;
        targetY = savedY;
      }

      // Constrain position to actual screen limits (handling resizing dynamically)
      const boundX = Math.max(margin, Math.min(width - widgetWidth - margin, targetX));
      const boundY = Math.max(headerOffset, Math.min(height - widgetHeight - margin, targetY));

      setPosition({ x: boundX, y: boundY });
    };

    loadPosition();
    window.addEventListener('resize', loadPosition);
    return () => {
      window.removeEventListener('resize', loadPosition);
    };
  }, [userProfile.streakWidgetX, userProfile.streakWidgetY]);

  // Handle pointer down (supports mouse AND touch transparently)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!widgetRef.current) return;
    
    // Check if target is a button or close icon inside widget so we can handle interactions cleanly
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    // Set dragging mode
    setIsDragging(true);
    widgetRef.current.setPointerCapture(e.pointerId);

    // Track starting point
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { x: position.x, y: position.y };
    hasMovedRef.current = false;
    
    // Hide tooltip temporarily while dragging
    setShowTooltip(false);
  };

  // Handle dragging motion
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
    }

    const widgetWidth = 140; 
    const widgetHeight = 56;
    const margin = 16;
    const headerOffset = 80; // keep below SJ Tutor header space

    const width = window.innerWidth;
    const height = window.innerHeight;

    const rawX = positionStartRef.current.x + deltaX;
    const rawY = positionStartRef.current.y + deltaY;

    // Boundary constraints
    const clampedX = Math.max(margin, Math.min(width - widgetWidth - margin, rawX));
    const clampedY = Math.max(headerOffset, Math.min(height - widgetHeight - margin, rawY));

    setPosition({ x: clampedX, y: clampedY });
  };

  // Handle drag completion and position persistence
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (widgetRef.current) {
      widgetRef.current.releasePointerCapture(e.pointerId);
    }

    // Save position statically
    localStorage.setItem('streak_widget_pos', JSON.stringify(position));
    if (onPositionSave) {
      onPositionSave(position.x, position.y);
    }

    // If there was no substantial movement, treat as click
    if (!hasMovedRef.current) {
      onClick();
    } else {
      // Temporarily trigger tooltip to show target guidance on drop spot
      setShowTooltip(true);
      const timer = setTimeout(() => setShowTooltip(false), 3000);
      return () => clearTimeout(timer);
    }
  };

  // Autohide tooltip after timer triggers
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  const currentStreak = userProfile.streak || 0;
  
  // Has completed activity today?
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const isCompletedToday = userProfile.lastActivityDate === todayStr;

  return (
    <div
      ref={widgetRef}
      id="floating-draggable-streak-widget"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none', // Prevents default scrolling behavior while dragging on phone screen
        zIndex: 999,
        display: position.x === -1000 ? 'none' : 'flex'
      }}
      className={`group select-none flex items-center gap-2 px-3 py-2.5 rounded-full shadow-lg border transition-all duration-150 ${
        isDragging 
          ? 'scale-105 cursor-grabbing border-orange-500 shadow-orange-500/20 shadow-xl ring-2 ring-orange-500/30' 
          : 'cursor-grab hover:scale-102 hover:shadow-xl active:scale-98 active:cursor-grabbing border-orange-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 backdrop-blur-md'
      }`}
    >
      {/* Icon Area with continuous visual glow */}
      <div className="relative flex items-center justify-center p-2 rounded-full bg-gradient-to-tr from-amber-400 via-orange-505 via-orange-500 to-red-500 text-white shadow-md animate-in fade-in zoom-in-90 duration-300">
        <span className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping opacity-55" />
        <Calendar className="w-4 h-4 relative z-10" />
        <Flame className="absolute -bottom-1 -right-1.5 w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse z-20" />
      </div>

      {/* Streak Text & Flame Tracker */}
      <div className="flex flex-col text-left">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
          Study Streak
        </span>
        <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-0.5 leading-none mt-0.5">
          🔥 {currentStreak}
        </span>
      </div>

      {/* Mini info helper button */}
      <button 
        type="button"
        id="streak-widget-tooltip-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(!showTooltip);
        }}
        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        title="Streak Info"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Persistent HTML Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border border-orange-500/20 text-white rounded-2xl p-3 shadow-2xl w-56 text-center animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none text-xs leading-relaxed z-[1000] font-semibold">
          <p className="text-orange-400 font-bold mb-1">
            {isCompletedToday ? "🎯 Today Protected!" : "⚡ Streak Pending Today!"}
          </p>
          <p className="text-[10px] text-slate-300">
            Keep learning daily to maintain your streak! Place widget anywhere.
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-swap w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-950/95" />
        </div>
      )}
    </div>
  );
};
