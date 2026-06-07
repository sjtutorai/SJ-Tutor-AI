import React, { useRef, useState } from 'react';
import { UserProfile } from '../types';
import Logo from './Logo';
import { Download, Share2, ShieldCheck, User, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
// @ts-expect-error - html2canvas missing types
import html2canvas from 'html2canvas';

interface IdCardViewProps {
  userProfile: UserProfile;
  email?: string | null;
}

const IdCardView: React.FC<IdCardViewProps> = ({ userProfile, email }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Generate a pseudo-random ID based on email or name
  const studentId = React.useMemo(() => {
    const base = email || userProfile.displayName || 'student';
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = (hash << 5) - hash + base.charCodeAt(i);
      hash |= 0;
    }
    const suffix = Math.abs(hash).toString().substring(0, 6).padStart(6, '0');
    return `SJ-${new Date().getFullYear()}-${suffix}`;
  }, [email, userProfile.displayName]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 4, // Extremely high resolution
        useCORS: true,
        backgroundColor: null,
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `SJ_Tutor_ID_${userProfile.displayName || 'Student'}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to download ID card", err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
      const text = `Check out my official Student ID from SJ Tutor AI! I'm a ${userProfile.planType || 'Free'} Plan Scholar.`;
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'My SJ Tutor AI ID',
                  text: text,
                  url: window.location.href
              });
          } catch (e) {
              console.error("Share failed", e);
          }
      } else {
          try {
             await navigator.clipboard.writeText(text);
             alert("Info copied to clipboard!");
          } catch(e) {
              console.error("Clipboard failed", e);
          }
      }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Student Identity Card</h2>
        <p className="text-slate-500 dark:text-slate-400">Your official, high-fidelity SJ Tutor AI verification card.</p>
      </div>

      <div className="flex flex-col items-center gap-6 w-full">
        
        {/* 📱 HORIZONTAL SCROLL CONTAINER FOR ROBUST MOBILE RESPONSIVENESS AND NO ASPECT RATIO SQUEEZING */}
        <div className="w-full overflow-x-auto pb-4 scrollbar-thin flex justify-center">
          
          {/* Main Card Element - Fixed 650x410 size to guarantee absolute perfect layout alignment on all devices */}
          <div 
            ref={cardRef}
            className="relative w-[650px] h-[410px] rounded-3xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.015] duration-300 bg-slate-900 border border-slate-800 flex-shrink-0"
          >
            {/* Background Holographic Glow & Wave Shapes */}
            <div className="absolute inset-0 bg-slate-900 text-white select-none">
               <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
               
               {/* Decorative Graphic Elements */}
               <div className="absolute bottom-4 right-32 w-32 h-32 bg-gradient-to-t from-primary-500/10 to-transparent rotate-45 pointer-events-none"></div>
            </div>

            {/* Header Area */}
            <div className="absolute top-0 inset-x-0 h-20 px-8 flex justify-between items-center z-10 border-b border-white/5">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 shadow-sm flex-shrink-0">
                     <Logo className="w-full h-full p-1.5" iconOnly />
                  </div>
                  <div>
                     <h3 className="font-extrabold text-base leading-none tracking-tight text-white uppercase">SJ Tutor AI</h3>
                     <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5 font-bold">Official Learning Member</p>
                  </div>
               </div>
               <div className="text-right">
                  <div className="bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-xl text-[10px] font-black border border-white/20 uppercase tracking-widest flex items-center gap-1.5 shadow-sm text-white">
                     <ShieldCheck className="w-4 h-4 text-emerald-400" />
                     ID Verified
                  </div>
               </div>
            </div>

            {/* Content Core Body Area - Splitting Left and Right Sections meticulously */}
            <div className="absolute top-20 inset-x-0 bottom-0 px-8 pb-6 pt-5 flex gap-8 z-10">
               
               {/* Left Section: Student Profile Image & membership level badge */}
               <div className="w-32 flex-shrink-0 flex flex-col items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/25 overflow-hidden shadow-xl relative flex-shrink-0">
                     {userProfile.photoURL ? (
                        <img src={userProfile.photoURL} alt="Student" className="w-full h-full object-cover rounded-full" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                           <User className="w-12 h-12" />
                        </div>
                     )}
                     {/* Glossy overlay reflection */}
                     <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50 pointer-events-none" />
                  </div>
                  
                  {/* Plan display block */}
                  <div className="text-center mt-4">
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Plan Tier</p>
                      <p className={`text-[10px] font-black px-3.5 py-0.5 rounded-full inline-block mt-1 uppercase border tracking-wider ${
                          userProfile.planType === 'Achiever' ? 'bg-purple-500/20 text-purple-250 border-purple-500/30 shadow-sm shadow-purple-500/10' :
                          userProfile.planType === 'Scholar' ? 'bg-primary-500/20 text-primary-200 border-primary-500/30 shadow-sm shadow-primary-500/10' :
                          'bg-slate-700/40 text-slate-300 border-slate-600/30'
                      }`}>
                          {userProfile.planType || 'Free'}
                      </p>
                  </div>
               </div>

               {/* Right Section: Core Fields, Registrations and the QR Code */}
               <div className="flex-1 flex flex-col justify-between py-1 min-w-0 h-full">
                  
                  {/* Student Name and Email Row */}
                  <div className="space-y-1">
                     <h2 className="text-xl font-bold truncate leading-tight text-white uppercase tracking-tight">
                        {userProfile.displayName || 'Student Name'}
                     </h2>
                     <p className="text-xs text-slate-400 truncate tracking-wide leading-none font-medium">
                        {email || 'student@sjtutor.ai'}
                     </p>
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 my-3 font-sans">
                     <div className="min-w-0">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold leading-none">Institution</p>
                        <p className="text-xs font-bold truncate text-slate-250 mt-1">{userProfile.institution || 'Unknown School'}</p>
                     </div>
                     <div className="text-right min-w-0">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold leading-none">Grade/Class</p>
                        <p className="text-xs font-bold text-slate-250 truncate mt-1">{userProfile.grade || 'N/A'}</p>
                     </div>
                     <div className="min-w-0">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold leading-none">Phone Contact</p>
                        <p className="text-xs font-bold truncate text-slate-250 mt-1">{userProfile.phoneNumber || 'N/A'}</p>
                     </div>
                     <div className="text-right min-w-0">
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold leading-none">Location State</p>
                        <p className="text-xs font-bold truncate text-slate-250 mt-1">{userProfile.state || 'N/A'}</p>
                     </div>
                  </div>
                  
                  {/* Footer metadata segment & Large High-Visibility QR Code */}
                  <div className="flex items-center justify-between pt-3.5 border-t border-white/10 min-w-0">
                      
                      {/* Details Segment */}
                      <div className="space-y-2.5 min-w-0">
                         <div>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold leading-none">Registration ID</p>
                            <p className="text-xs font-mono font-black tracking-tight text-primary-400 truncate mt-1">{userProfile.registrationNumber || studentId}</p>
                         </div>
                         <div>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold leading-none">Valid membership until</p>
                            <p className="text-[10px] font-mono font-bold text-slate-300 mt-1">{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString()}</p>
                         </div>
                      </div>
                      
                      {/* 🛠️ LARGE AND HIGHLY SCANNABLE QR CODE UNIT */}
                      <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 flex-shrink-0 transition-transform hover:scale-105 duration-300">
                         <QRCodeSVG 
                           value={`ID: ${userProfile.registrationNumber || studentId}\nName: ${userProfile.displayName || 'Student'}\nSchool: ${userProfile.institution || 'N/A'}\nPlan: ${userProfile.planType || 'Scholar'}`}
                           size={110}
                           level="H"
                           includeMargin={false}
                         />
                      </div>

                  </div>
               </div>

            </div>
          </div>

        </div>

        {/* Action Controls */}
        <div className="flex gap-4">
           <button 
             onClick={handleDownload}
             disabled={isDownloading}
             className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
           >
             {isDownloading ? (
                <>Generating ID...</>
             ) : (
                <>
                   <Download className="w-5 h-5" />
                   Download ID Card
                </>
             )}
           </button>
           <button 
             onClick={handleShare}
             className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold shadow-sm transition-all"
           >
             <Share2 className="w-5 h-5" />
             Share Identity
           </button>
        </div>
        
        <div className="text-center max-w-sm mt-2">
           <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              Verifiable QR block connects securely to the verified student registries layout.
           </p>
        </div>
      </div>
    </div>
  );
};

export default IdCardView;
