
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
        scale: 3, // High resolution
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
      // Basic sharing text
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
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Student Identity Card</h2>
        <p className="text-slate-500 dark:text-slate-400">Your official SJ Tutor AI verification card.</p>
      </div>

      <div className="flex flex-col items-center gap-8">
        {/* ID Card Container - Aspect Ratio approx Credit Card (85.6mm x 53.98mm ~ 1.58) */}
        <div 
          ref={cardRef}
          className="relative w-full max-w-[400px] aspect-[1.58/1] rounded-2xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] duration-300 bg-white"
        >
          {/* Background Design */}
          <div className="absolute inset-0 bg-slate-900 text-white">
             {/* Abstract Shapes */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl -ml-10 -mb-10"></div>
             
             {/* Header */}
             <div className="absolute top-0 inset-x-0 p-5 flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
                      <Logo className="w-full h-full" iconOnly />
                   </div>
                   <div>
                      <h3 className="font-bold text-sm leading-none tracking-tight">SJ Tutor AI</h3>
                      <p className="text-[8px] opacity-70 uppercase tracking-wider mt-0.5">Student ID</p>
                   </div>
                </div>
                <div className="text-right">
                   <div className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[8px] font-bold border border-white/20 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      ID CARD
                   </div>
                </div>
             </div>

             {/* Content Layout */}
             <div className="absolute inset-0 pt-20 px-5 pb-5 flex gap-4 z-10">
                
                {/* Photo Section */}
                <div className="flex flex-col gap-2">
                   <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 overflow-hidden shadow-lg relative">
                      {userProfile.photoURL ? (
                         <img src={userProfile.photoURL} alt="Student" className="w-full h-full object-cover rounded-full" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                            <User className="w-10 h-10" />
                         </div>
                      )}
                      {/* Holographic Effect Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-50 pointer-events-none"></div>
                   </div>
                   <div className="text-center">
                       <p className="text-[8px] text-slate-400 uppercase tracking-wider">Plan Type</p>
                       <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                           userProfile.planType === 'Achiever' ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30' :
                           userProfile.planType === 'Scholar' ? 'bg-primary-500/20 text-primary-200 border border-primary-500/30' :
                           'bg-slate-700 text-slate-300'
                       }`}>
                           {userProfile.planType || 'Free'}
                       </p>
                   </div>
                </div>

                {/* Details Section */}
                <div className="flex-1 flex flex-col justify-between py-0.5">
                   <div className="space-y-0.5">
                      <h2 className="text-base font-black truncate leading-tight text-white uppercase tracking-tight">
                         {userProfile.displayName || 'Student Name'}
                      </h2>
                      <p className="text-[9px] text-slate-400 truncate opacity-80">
                         {email || 'student@sjtutor.ai'}
                      </p>
                   </div>

                   <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-1">
                      <div className="min-w-0">
                         <p className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">Institution</p>
                         <p className="text-[9px] font-bold truncate text-slate-200">{userProfile.institution || 'Unknown School'}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">Grade</p>
                         <p className="text-[9px] font-bold text-slate-200">{userProfile.grade || 'N/A'}</p>
                      </div>
                      <div className="min-w-0">
                         <p className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">Phone</p>
                         <p className="text-[9px] font-bold truncate text-slate-200">{userProfile.phoneNumber || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">State</p>
                         <p className="text-[9px] font-bold truncate text-slate-200">{userProfile.state || 'N/A'}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-end justify-between pt-1 border-t border-white/10">
                       <div className="space-y-0.5">
                          <div className="mb-0.5">
                             <p className="text-[7px] text-slate-500 uppercase tracking-widest font-bold">Registration ID</p>
                             <p className="text-[9px] font-mono font-black tracking-tighter text-primary-400">{userProfile.registrationNumber || studentId}</p>
                          </div>
                          <div>
                             <p className="text-[6px] text-slate-500 uppercase font-bold">Valid until</p>
                             <p className="text-[8px] font-mono font-bold text-slate-300">{new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="bg-white p-1 rounded-md shadow-sm border border-slate-100 flex-shrink-0">
                          <QRCodeSVG 
                            value={JSON.stringify({
                              v: 3,
                              id: userProfile.registrationNumber || studentId,
                              name: userProfile.displayName || 'Student',
                              email: email || 'student@sjtutor.ai',
                              phone: userProfile.phoneNumber || 'N/A',
                              institution: userProfile.institution || 'SJ Tutor AI',
                              grade: userProfile.grade || 'N/A',
                              state: userProfile.state || 'N/A',
                              district: userProfile.district || 'N/A',
                              plan: userProfile.planType || 'Scholar'
                            })}
                            size={55}
                            level="M"
                            includeMargin={false}
                          />
                       </div>
                   </div>
                </div>
             </div>

             {/* Decorative Elements */}
             <div className="absolute bottom-4 right-32 w-32 h-32 bg-gradient-to-t from-primary-500/10 to-transparent rotate-45 pointer-events-none"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
           <button 
             onClick={handleDownload}
             disabled={isDownloading}
             className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
           >
             {isDownloading ? (
                <>Loading...</>
             ) : (
                <>
                   <Download className="w-5 h-5" />
                   Download ID
                </>
             )}
           </button>
           <button 
             onClick={handleShare}
             className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold shadow-sm transition-all"
           >
             <Share2 className="w-5 h-5" />
             Share
           </button>
        </div>
        
        <div className="text-center max-w-sm mt-4">
           <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              This digital ID card verifies your membership in the SJ Tutor AI learning community.
           </p>
        </div>
      </div>
    </div>
  );
};

export default IdCardView;
