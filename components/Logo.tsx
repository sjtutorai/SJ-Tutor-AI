import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
  iconOnly?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  className = "w-8 h-8", 
  showText = false, 
  textColor = "text-slate-900",
  iconOnly = false 
}) => {
  const logoUrl = "https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg";
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${iconOnly ? 'w-full h-full' : 'w-10 h-10'} rounded-full overflow-hidden border-2 border-primary-500 shadow-sm flex-shrink-0 bg-white`}>
        <img 
          src={logoUrl} 
          alt="SJ Tutor AI" 
          className="w-full h-full object-cover"
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
};

export default Logo;