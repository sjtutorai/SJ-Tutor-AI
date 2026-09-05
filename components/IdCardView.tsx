import React, { useRef, useState } from 'react';
import { UserProfile } from '../types';
import Logo from './Logo';
import { 
  Download, 
  Share2, 
  ShieldCheck, 
  User, 
  Sparkles, 
  Printer, 
  RotateCw, 
  CheckCircle2, 
  Award, 
  Building, 
  Phone, 
  MapPin, 
  Calendar,
  GraduationCap
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

interface IdCardViewProps {
  userProfile: UserProfile;
  email?: string | null;
}

const IdCardView: React.FC<IdCardViewProps> = ({ userProfile, email }) => {
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeSide, setActiveSide] = useState<'front' | 'back' | 'both'>('front');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generate a consistent pseudo-random student ID if not stored
  const studentId = React.useMemo(() => {
    if (userProfile.sjTutorId) return userProfile.sjTutorId;
    if (userProfile.registrationNumber) return userProfile.registrationNumber;
    const base = email || userProfile.displayName || 'student';
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = (hash << 5) - hash + base.charCodeAt(i);
      hash |= 0;
    }
    const suffix = Math.abs(hash).toString().substring(0, 6).padStart(6, '0');

    // Extract initials
    const displayName = userProfile.displayName || '';
    const names = displayName.trim().split(/\s+/).filter(Boolean);
    const firstName = names[0] || 'S';
    const lastName = names[names.length - 1] || 'J';
    const firstLetter = firstName.charAt(0).toUpperCase() || 'S';
    const surnameLetter = lastName.charAt(0).toUpperCase() || 'J';

    return `SJ-${firstLetter}${surnameLetter}-${suffix}`;
  }, [email, userProfile.displayName, userProfile.registrationNumber]);

  // Valid until calculation (1 year from now)
  const validUntilDate = React.useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadSide = async (side: 'front' | 'back') => {
    const targetRef = side === 'front' ? frontCardRef.current : backCardRef.current;
    if (!targetRef) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(targetRef, {
        scale: 3, // Ultra-high crisp resolution
        useCORS: true,
        backgroundColor: null,
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      const cleanName = (userProfile.displayName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `SJ_Tutor_ID_${cleanName}_${side.toUpperCase()}.png`;
      link.click();
      showToast(`Downloaded ${side} side in ultra-HD resolution! 🪪`);
    } catch (err) {
      console.error("Failed to download ID card", err);
      showToast("Could not generate image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    await handleDownloadSide('front');
    if (backCardRef.current) {
      setTimeout(async () => {
        await handleDownloadSide('back');
      }, 500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const studentName = userProfile.displayName || 'Student';
    const plan = userProfile.planType || 'Scholar';
    const text = `🪪 Official Verified Student ID Card — SJ Tutor AI\nStudent: ${studentName}\nID: ${studentId}\nPlan: ${plan}\nInstitution: ${userProfile.institution || 'SJ Tutor AI Academy'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${studentName}'s SJ Tutor AI Student ID`,
          text: text,
          url: window.location.href
        });
      } catch {
        // Share dismissed
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        showToast("Student ID information copied to clipboard! 📋");
      } catch {
        showToast("Failed to copy info to clipboard.");
      }
    }
  };

  // Student verification QR Payload
  const qrData = JSON.stringify({
    app: "SJ Tutor AI",
    id: studentId,
    name: userProfile.displayName || 'Student Name',
    email: email || userProfile.email || 'student@sjtutor.ai',
    phone: userProfile.phoneNumber || 'N/A',
    institution: userProfile.institution || 'SJ Tutor AI Academy',
    grade: userProfile.grade || 'N/A',
    board: userProfile.board || 'CBSE/ICSE/State',
    state: userProfile.state || 'Karnataka',
    district: userProfile.district || 'Dharwad',
    plan: userProfile.planType || 'Scholar',
    verified: true,
    issued: new Date().getFullYear(),
    validUntil: validUntilDate
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-400/40 text-sm font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Student Identity Card</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Verified Credential
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enlarged, high-definition verifiable student badge displaying full academic details.
          </p>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSide('front')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSide === 'front'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Front Side
          </button>
          <button
            onClick={() => setActiveSide('back')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSide === 'back'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Back Side
          </button>
          <button
            onClick={() => setActiveSide('both')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSide === 'both'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Both Sides
          </button>
        </div>
      </div>

      {/* Main ID Cards Canvas Container */}
      <div className="flex flex-col items-center justify-center gap-8 my-4">
        
        {/* ========================================================================= */}
        {/* FRONT SIDE ID CARD (ENLARGED, HIGH DEF, NO TRUNCATION)                    */}
        {/* ========================================================================= */}
        {(activeSide === 'front' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Card Front
              </span>
            )}
            
            <div 
              ref={frontCardRef}
              id="student-id-card-front"
              className="relative w-full max-w-[680px] rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 text-white select-none transition-all duration-300"
              style={{
                background: 'radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.18), transparent 45%), radial-gradient(circle at 15% 85%, rgba(245, 158, 11, 0.15), transparent 45%), #090E17'
              }}
            >
              {/* Micro Guilloché Security Wave Pattern Background */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #090e17 1px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px'
                }}
              />

              {/* Decorative Accent Glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* TOP HEADER BAR */}
              <div className="relative z-10 px-6 sm:px-8 pt-6 pb-4 flex items-center justify-between border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
                {/* Brand & Logo */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg p-1 overflow-hidden">
                    <Logo className="w-full h-full" iconOnly noBorder />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg sm:text-xl tracking-tight text-white">SJ Tutor AI</h3>
                      <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                        Official
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Student Identity Card • Global Academic Pass
                    </p>
                  </div>
                </div>

                {/* Verified Badge */}
                <div className="shrink-0">
                  <div className="bg-emerald-500/15 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black border border-emerald-400/40 text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ID CARD</span>
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT BODY */}
              <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                
                {/* LEFT PHOTO COLUMN */}
                <div className="flex flex-row sm:flex-col items-center sm:items-center gap-4 sm:gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                  {/* Photo with glowing ring */}
                  <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-500 to-blue-500 rounded-3xl blur-xs opacity-60 group-hover:opacity-100 transition duration-300" />
                    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-slate-900 border-2 border-white/40 overflow-hidden shadow-2xl flex items-center justify-center">
                      {userProfile.photoURL ? (
                        <img 
                          src={userProfile.photoURL} 
                          alt={userProfile.displayName || "Student Photo"} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                          <User className="w-14 h-14" />
                          <span className="text-[9px] font-bold uppercase tracking-wider mt-1 text-slate-500">Student</span>
                        </div>
                      )}
                      {/* Holographic Sheen */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-60 pointer-events-none" />
                    </div>
                  </div>

                  {/* Plan Badge & Status */}
                  <div className="flex flex-col items-center sm:w-36 text-center space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      Plan Type
                    </span>
                    <span className={`px-4 py-1 rounded-xl text-xs font-black uppercase tracking-wider shadow-md w-full border ${
                      userProfile.planType === 'Achiever' 
                        ? 'bg-purple-600/30 text-purple-200 border-purple-400/50 shadow-purple-900/30' 
                        : userProfile.planType === 'Scholar' 
                        ? 'bg-blue-600/30 text-blue-200 border-blue-400/50 shadow-blue-900/30' 
                        : 'bg-amber-600/30 text-amber-200 border-amber-400/50 shadow-amber-900/30'
                    }`}>
                      {userProfile.planType || 'Scholar'}
                    </span>

                    <span className="text-[10px] text-slate-400 font-medium pt-0.5 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-amber-400" />
                      Active Student
                    </span>
                  </div>
                </div>

                {/* RIGHT DETAILS COLUMN */}
                <div className="flex-1 w-full flex flex-col justify-between space-y-4">
                  
                  {/* Name & Email */}
                  <div className="space-y-0.5">
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-none drop-shadow-sm break-words">
                      {userProfile.displayName || 'SJ TUTOR AI'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium truncate pt-1 opacity-90">
                      {email || userProfile.email || 'sjtutorai@gmail.com'}
                    </p>
                  </div>

                  {/* Academic Details 2-Column Grid (NO TRUNCATION - FULL NAMES VISIBLE) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-white/10">
                    
                    {/* Institution */}
                    <div className="sm:col-span-2">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3 text-amber-400" /> Institution / School
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug mt-0.5 break-words">
                        {userProfile.institution || 'JSS SMCS Vidyagiri Dharwad'}
                      </p>
                    </div>

                    {/* Grade & Board */}
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Award className="w-3 h-3 text-blue-400" /> Grade & Board
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug mt-0.5">
                        {userProfile.grade || '9th Grade'} {userProfile.board ? `(${userProfile.board})` : ''}
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" /> Phone
                      </span>
                      <p className="text-xs sm:text-sm font-mono font-bold text-slate-100 leading-snug mt-0.5">
                        {userProfile.phoneNumber || '+91 8105423488'}
                      </p>
                    </div>

                    {/* State & District */}
                    <div className="sm:col-span-2">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-400" /> Region / State
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug mt-0.5">
                        {userProfile.district ? `${userProfile.district}, ` : ''}{userProfile.state || 'Karnataka'}
                      </p>
                    </div>
                  </div>

                  {/* BOTTOM ROW: REGISTRATION ID, VALIDITY, QR CODE */}
                  <div className="pt-3 border-t border-white/10 flex items-end justify-between gap-4">
                    
                    {/* ID & Validity */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Registration ID
                        </span>
                        <p className="text-sm sm:text-base font-mono font-black tracking-wider text-amber-400 leading-none mt-0.5">
                          {studentId}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" /> Valid Until
                          </span>
                          <p className="text-[11px] sm:text-xs font-mono font-bold text-slate-200 mt-0.5">
                            {validUntilDate}
                          </p>
                        </div>

                        <div>
                          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Status
                          </span>
                          <p className="text-[11px] sm:text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Container (Large, High Contrast) */}
                    <div className="flex flex-col items-center bg-white p-2 rounded-2xl shadow-xl border-2 border-white/80 shrink-0">
                      <QRCodeSVG 
                        value={qrData}
                        size={84}
                        level="Q"
                        includeMargin={false}
                      />
                      <span className="text-[7px] font-black text-slate-800 uppercase tracking-tighter mt-1 font-mono">
                        SCAN TO VERIFY
                      </span>
                    </div>

                  </div>
                </div>

              </div>

              {/* CARD FOOTER WATERMARK BAR */}
              <div className="px-6 sm:px-8 py-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400 font-medium">
                <span>SJ TUTOR AI ACADEMIC SYSTEM</span>
                <span className="font-mono">VERIFIED • DIGITAL CREDENTIAL</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BACK SIDE ID CARD (TERMS, EMERGENCY CONTACT, SECURITY SEAL)              */}
        {/* ========================================================================= */}
        {(activeSide === 'back' || activeSide === 'both') && (
          <div className="w-full flex flex-col items-center">
            {activeSide === 'both' && (
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Card Back
              </span>
            )}
            
            <div 
              ref={backCardRef}
              id="student-id-card-back"
              className="relative w-full max-w-[680px] rounded-3xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-950 text-white select-none transition-all duration-300"
              style={{
                background: 'radial-gradient(circle at 15% 15%, rgba(59, 130, 246, 0.15), transparent 40%), radial-gradient(circle at 85% 85%, rgba(16, 185, 129, 0.15), transparent 40%), #090E17'
              }}
            >
              {/* Micro Guilloché Security Wave Pattern Background */}
              <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #090e17 1px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px'
                }}
              />

              {/* Top Bar Magnetic Stripe Simulation */}
              <div className="w-full h-12 bg-slate-900 border-b border-white/10 flex items-center justify-between px-6">
                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                  SECURITY STRIPE • ACADEMIC VERIFICATION TOKEN
                </span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">
                  {studentId}
                </span>
              </div>

              {/* Main Back Content */}
              <div className="p-6 sm:p-8 space-y-5 relative z-10">
                
                {/* Terms of Identity */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Terms & Conditions of Digital Membership
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    1. This Digital Identity Card is non-transferable and remains the official digital property of SJ Tutor AI.
                    <br />
                    2. Cardholder is entitled to personalized AI tutoring sessions, interactive quiz evaluations, and study resource access.
                    <br />
                    3. For verification inquiries or loss of credentials, contact the academic helpline at <strong>support@sjtutor.ai</strong>.
                  </p>
                </div>

                {/* Emergency Contact & Academic Authority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10">
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Academic Support Helpline
                    </span>
                    <p className="text-xs font-bold text-white">SJ Tutor AI Learning Support</p>
                    <p className="text-xs font-mono text-amber-300 mt-0.5">+91 8105423488</p>
                    <p className="text-[11px] text-slate-400">sjtutorai@gmail.com</p>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Issuing Authority
                      </span>
                      <p className="text-xs font-bold text-white">Office of Academic Credentials</p>
                      <p className="text-[11px] text-slate-400">SJ Tutor AI Global Education</p>
                    </div>

                    {/* Official Stamp */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> DIGITALLY SIGNED
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">AUTH-ID: 25112011</span>
                    </div>
                  </div>
                </div>

                {/* Barcode representation */}
                <div className="pt-2 flex flex-col items-center justify-center">
                  <div className="h-10 w-64 bg-white/20 rounded flex items-center justify-center tracking-[6px] font-mono text-xs text-slate-300 font-bold border border-white/20">
                    ||| | |||| || ||| |||| | ||
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                    {studentId} • VALID IN ALL LEARNING HUBS
                  </span>
                </div>

              </div>

              {/* Bottom Footer */}
              <div className="px-6 sm:px-8 py-2.5 bg-black/40 border-t border-white/5 text-center text-[9px] text-slate-400">
                WWW.SJTUTOR.AI • OFFICIAL DIGITAL VERIFICATION SYSTEM
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Action Buttons Toolbar */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        
        {/* Download Front Button */}
        <button 
          onClick={() => handleDownloadSide('front')}
          disabled={isDownloading}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
        >
          <Download className="w-4 h-4" />
          <span>Download Front ID (HD PNG)</span>
        </button>

        {/* Download Back Button */}
        <button 
          onClick={() => handleDownloadSide('back')}
          disabled={isDownloading}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
        >
          <Download className="w-4 h-4" />
          <span>Download Back Side</span>
        </button>

        {/* Download Both */}
        <button 
          onClick={handleDownloadAll}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl font-bold text-sm shadow-md transition-all border border-slate-700"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Download Complete Set</span>
        </button>

        {/* Print Button */}
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print</span>
        </button>

        {/* Share Button */}
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm shadow-sm transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>

        {/* Flip Side Button */}
        <button 
          onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
          className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl font-bold text-sm transition-all"
        >
          <RotateCw className="w-4 h-4 text-slate-500" />
          <span>Flip Card</span>
        </button>

      </div>

      {/* Helpful Info Banner */}
      <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          This official enlarged student identity card is accepted across all SJ Tutor AI learning modules, study groups, and community leaderboards.
        </p>
      </div>

    </div>
  );
};

export default IdCardView;
