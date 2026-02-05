
import React from 'react';
import Logo from './Logo';

interface WelcomeViewProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const WelcomeView: React.FC<WelcomeViewProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Background Abstract Shapes - Orange/Yellow Gradient */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-amber-200 to-orange-400 rounded-bl-[100%] opacity-20 -z-10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-orange-100 to-amber-200 rounded-tr-[100%] opacity-30 -z-10 blur-2xl"></div>
      
      {/* Navbar Placeholder */}
      <div className="container mx-auto px-6 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
           <Logo className="w-10 h-10" iconOnly />
           <span className="font-bold text-xl text-slate-900 tracking-tight">SJ Tutor <span className="text-orange-500">AI</span></span>
        </div>
        <button 
          onClick={onSignIn}
          className="text-sm font-bold text-slate-600 hover:text-orange-600 transition-colors"
        >
          Login
        </button>
      </div>

      <div className="flex-1 container mx-auto px-6 flex flex-col md:flex-row items-center justify-center relative z-10 gap-12 md:gap-0 pb-10">
        
        {/* LEFT SIDE: Content */}
        <div className="flex-1 space-y-8 text-center md:text-left animate-in fade-in slide-in-from-left-8 duration-700">
          
          <div className="inline-block">
             <h3 className="text-orange-500 font-bold tracking-[0.2em] uppercase text-sm md:text-base mb-2">Online AI Tutoring</h3>
             <div className="h-1 w-12 bg-orange-400 rounded-full md:mx-0 mx-auto"></div>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
            <span className="text-orange-500">SMART LEARNING</span>
            <br />
            that actually works
          </h1>

          <p className="text-lg text-slate-600 max-w-lg mx-auto md:mx-0 leading-relaxed font-medium">
            SJ Tutor AI helps students study smarter with AI-powered guidance,
            clear explanations, daily discipline, and motivation that builds
            real academic progress without pressure.
          </p>

          <div className="flex flex-col md:flex-row items-center gap-4 pt-4">
            <button 
              onClick={onGetStarted}
              className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-bold text-lg shadow-xl shadow-orange-500/30 hover:scale-105 transition-transform active:scale-95 tracking-wide"
            >
              GET STARTED
            </button>
            <p className="text-sm text-slate-400 font-medium">
              Learn smarter. Stay consistent. Succeed.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: Hero Image */}
        <div className="flex-1 w-full flex justify-center md:justify-end relative animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
           
           {/* Decorative Blob behind image */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[500px] md:h-[500px] bg-amber-100 rounded-full -z-10 mix-blend-multiply filter blur-xl"></div>

           <div className="relative w-[320px] h-[400px] md:w-[450px] md:h-[550px] rounded-[40px] overflow-hidden border-8 border-white shadow-2xl bg-orange-50">
              <img 
                src="https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg" 
                alt="Confident Student"
                className="w-full h-full object-cover transform scale-110 translate-y-4"
              />
              
              {/* Overlay Badge */}
              <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/50 max-w-[200px]">
                 <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Active</span>
                 </div>
                 <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    "Your personal AI mentor is ready to help you succeed."
                 </p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default WelcomeView;
