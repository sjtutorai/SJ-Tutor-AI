
import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
  iconOnly?: boolean;
}

export default function Logo({ 
  className = "w-10 h-10", 
  showText = false, 
  textColor = "text-slate-900",
  iconOnly = false 
}: LogoProps) {
  const primaryLogoUrl = "https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg";
  const [imgSrc, setImgSrc] = useState(primaryLogoUrl);

  return (
    <div className={`flex items-center gap-3 ${iconOnly ? 'w-full h-full justify-center' : ''}`}>
      <div className={`${className} rounded-full overflow-hidden border-2 border-primary-500 shadow-sm flex-shrink-0 bg-white flex items-center justify-center`}>
        <img 
          src={imgSrc} 
          alt="SJ Tutor AI Logo" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => {
            if (imgSrc !== '/logo.jpg' && imgSrc !== '/logo.png') {
              setImgSrc('/logo.jpg');
            }
          }}
        />
      </div>
      
      {showText && !iconOnly && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold text-lg tracking-tight ${textColor}`}>SJ Tutor <span className="text-primary-600">AI</span></span>
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400">Your Study Buddy</span>
        </div>
      )}
    </div>
  );
}
