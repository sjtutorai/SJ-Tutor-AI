
import React from 'react';
import Logo from './Logo';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface WelcomeViewProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden font-sans selection:bg-orange-100 selection:text-orange-900">
      
      {/* Compact Background Shapes - Subtle & Warm */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-amber-100/40 to-orange-100/40 rounded-bl-[100%] blur-3xl -z-10 transform translate-x-1/3 -translate-y-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-t from-orange-50 to-white rounded-tr-[100%] blur-3xl -z-10 transform -translate-x-1/4 translate-y-1/4"></div>
      
      {/* Navbar - Compact */}
      <div className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-2.5">
           <div className="transform scale-90 origin-left">
             <Logo className="w-9 h-9" iconOnly />
           </div>
           <span className="font-bold text-lg text-slate-900 tracking-tight">SJ Tutor <span className="text-orange-500">AI</span></span>
        </div>
        <button 
          onClick={onSignIn}
          className="text-sm font-semibold text-slate-600 hover:text-orange-600 transition-colors px-4 py-2 hover:bg-orange-50 rounded-full"
        >
          Log In
        </button>
      </div>

      {/* Main Content - Vertically Centered & Compact */}
      <div className="flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-6 pb-8 md:pb-0">
        <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-16 w-full">
          
          {/* LEFT SIDE: Text Content */}
          <div className="flex-1 text-center md:text-left space-y-6 md:space-y-5 max-w-xl mx-auto md:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-100 w-fit mx-auto md:mx-0">
               <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
               <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Online AI Tutoring</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">SMART LEARNING</span>
              <br />
              that actually works
            </h1>

            <p className="text-slate-600 text-base md:text-lg leading-relaxed md:max-w-[90%] font-medium">
              Study smarter with AI-powered guidance, clear explanations, daily discipline, and motivation that drives real progress.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 justify-center md:justify-start">
              <button 
                onClick={onGetStarted}
                className="group px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-sm md:text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 min-w-[160px] justify-center"
              >
                GET STARTED
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <div className="hidden md:block h-8 w-px bg-slate-200"></div>
              
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                Learn smarter. Stay consistent. Succeed.
              </p>
            </div>

            {/* Trust Indicators (Optional, minimal) */}
            <div className="pt-4 flex items-center justify-center md:justify-start gap-6 text-slate-400 text-xs font-semibold uppercase tracking-wider">
               <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Help</span>
               <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Personalized</span>
            </div>
          </div>

          {/* RIGHT SIDE: Compact Hero Image */}
          <div className="flex-1 w-full flex justify-center md:justify-end relative animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
             
             {/* Tight Blob */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-amber-50 rounded-full -z-10 mix-blend-multiply"></div>

             <div className="relative w-[280px] h-[350px] md:w-[400px] md:h-[500px] lg:h-[520px] rounded-[32px] overflow-hidden border-4 border-white shadow-xl shadow-orange-100/50 bg-white">
                <img 
                  src="https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg" 
                  alt="Confident Student"
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700"
                />
                
                {/* Compact Floating Badge */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-sm p-3.5 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</p>
                      <p className="text-xs font-bold text-slate-800">AI Mentor Active</p>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WelcomeView;
