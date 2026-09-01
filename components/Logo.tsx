import React, { useState } from 'react';
import { SJTUTOR_AVATAR, SJTUTOR_AVATAR_REMOTE, SJTUTOR_AVATAR_IBB } from '../types';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
  iconOnly?: boolean;
  src?: string;
  noBorder?: boolean;
}

const FALLBACK_SOURCES = [
  SJTUTOR_AVATAR_REMOTE, // "https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg"
  SJTUTOR_AVATAR_IBB, // "https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg"
  SJTUTOR_AVATAR, // "/logo.png"
  "/favicon-512x512.png",
  "/favicon.png"
];

// Infallible High-Definition Vector SVG Logo Fallback (Gold ring, deep midnight blue, graduation cap & AI sparkle)
export const BrandSvgLogo: React.FC<{ className?: string }> = ({ className = "w-full h-full" }) => (
  <svg 
    viewBox="0 0 512 512" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    preserveAspectRatio="xMidYMid slice"
    role="img"
    aria-label="SJ Tutor AI Logo"
  >
    {/* Outer Gold Border Ring */}
    <circle cx="256" cy="256" r="250" fill="#D4AF37" />
    <circle cx="256" cy="256" r="236" fill="#0F172A" />
    
    {/* Inner Gold Ambient Dotted Accent Ring */}
    <circle cx="256" cy="256" r="210" stroke="#F59E0B" strokeWidth="6" strokeDasharray="16 8" opacity="0.75" />
    
    {/* Graduation Academic Cap */}
    <path 
      d="M256 120 L400 190 L256 260 L112 190 Z" 
      fill="#FBBF24" 
      stroke="#D4AF37" 
      strokeWidth="8" 
      strokeLinejoin="round" 
    />
    <path 
      d="M170 220 V310 C170 355 342 355 342 310 V220" 
      stroke="#FBBF24" 
      strokeWidth="12" 
      strokeLinecap="round" 
      fill="none" 
    />
    {/* Academic Tassel */}
    <path d="M380 200 V300" stroke="#EF4444" strokeWidth="10" strokeLinecap="round" />
    <circle cx="380" cy="305" r="10" fill="#EF4444" />
    
    {/* AI Sparkle / Brain Neural Star */}
    <path 
      d="M256 350 Q256 390 290 390 Q256 390 256 430 Q256 390 222 390 Q256 390 256 350 Z" 
      fill="#38BDF8" 
    />
    <circle cx="256" cy="390" r="8" fill="#FFFFFF" />
    
    {/* SJ Monogram */}
    <text 
      x="256" 
      y="325" 
      textAnchor="middle" 
      fill="#FFFFFF" 
      fontSize="64" 
      fontWeight="900" 
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="4"
    >
      SJ
    </text>
  </svg>
);

export default function Logo({ 
  className = "w-10 h-10", 
  showText = false, 
  textColor = "text-slate-900",
  iconOnly = false,
  src,
  noBorder = false
}: LogoProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [hasAllFailed, setHasAllFailed] = useState(false);

  const currentSrc = src || (sourceIndex < FALLBACK_SOURCES.length ? FALLBACK_SOURCES[sourceIndex] : null);

  const handleImageError = () => {
    if (src) {
      setSourceIndex(0);
      return;
    }
    if (sourceIndex + 1 < FALLBACK_SOURCES.length) {
      setSourceIndex(prev => prev + 1);
    } else {
      setHasAllFailed(true);
    }
  };

  const borderClasses = noBorder 
    ? '' 
    : 'border border-primary-500/60 shadow-sm';

  const imageElement = (
    <div className={`${className} rounded-full overflow-hidden ${borderClasses} flex-shrink-0 aspect-square bg-white dark:bg-slate-900 flex items-center justify-center relative`}>
      {!hasAllFailed && currentSrc ? (
        <img 
          src={currentSrc} 
          alt="SJ Tutor AI Logo" 
          className="w-full h-full object-cover block select-none pointer-events-none"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
      ) : (
        <BrandSvgLogo className="w-full h-full object-cover block" />
      )}
    </div>
  );

  if (iconOnly || !showText) {
    return imageElement;
  }

  return (
    <div className="flex items-center gap-3">
      {imageElement}
      <div className="flex flex-col leading-none">
        <span className={`font-bold text-lg tracking-tight ${textColor}`}>
          SJ Tutor <span className="text-primary-600">AI</span>
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">
          Your Study Buddy
        </span>
      </div>
    </div>
  );
}
