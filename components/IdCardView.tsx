import React, { useRef, useState } from 'react';
import { UserProfile } from '../types';
import Logo from './Logo';
import { Download, Share2, ShieldCheck, User, Sparkles, School, GraduationCap, Phone, MapPin, Globe, Save } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
// @ts-expect-error - html2canvas missing types
import html2canvas from 'html2canvas';

interface IdCardViewProps {
  userProfile: UserProfile;
  email?: string | null;
  onProfileUpdate?: (profile: UserProfile) => void;
}

const IdCardView: React.FC<IdCardViewProps> = ({ userProfile, email, onProfileUpdate }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Profile Form state for incomplete profiles
  const [formName, setFormName] = useState(userProfile.displayName || '');
  const [formPhone, setFormPhone] = useState(userProfile.phoneNumber || '');
  const [formSchool, setFormSchool] = useState(userProfile.institution || '');
  const [formGrade, setFormGrade] = useState(userProfile.grade || '');
  const [formState, setFormState] = useState(userProfile.state || '');
  const [formDistrict, setFormDistrict] = useState(userProfile.district || '');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Check if profile is complete
  const isProfileComplete = !!(
    userProfile.displayName?.trim() &&
    userProfile.phoneNumber?.trim() &&
    userProfile.institution?.trim() &&
    userProfile.grade?.trim() &&
    userProfile.state?.trim() &&
    userProfile.district?.trim()
  );

  // General student registration ID in Format: Starting Letter + Initial starting Letter + 5-digit sequence
  const resolvedRegistrationId = React.useMemo(() => {
    // If we have a custom registration number stored, use it. Otherwise compute dynamically
    if (userProfile.registrationNumber) return userProfile.registrationNumber;

    const name = (userProfile.displayName || 'Student Name').trim();
    const parts = name.split(/\s+/);
    
    // Starting Letter (S)
    const firstLetter = parts[0] ? parts[0][0].toUpperCase() : 'S';
    // Students Initial Starting Letter (J)
    const secondLetter = parts[1] ? parts[1][0].toUpperCase() : (parts[0] && parts[0].length > 1 ? parts[0][1].toUpperCase() : 'J');
    
    // Generate 5-digit deterministic sequence number from email/name
    const base = email || name || 'student';
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      hash = (hash << 5) - hash + base.charCodeAt(i);
      hash |= 0;
    }
    const sequenceNum = Math.abs(hash).toString().substring(0, 5).padStart(5, '0');
    
    return `${firstLetter}${secondLetter}${sequenceNum}`;
  }, [email, userProfile.displayName, userProfile.registrationNumber]);

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
      const text = `Check out my official Student ID from SJ Tutor AI! I'm a verified member.`;
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveLoading(true);

    if (!formName.trim() || !formPhone.trim() || !formSchool.trim() || !formGrade.trim() || !formState.trim() || !formDistrict.trim()) {
      setSaveError("Please fill in all 6 mandatory profile fields.");
      setSaveLoading(false);
      return;
    }

    try {
      if (onProfileUpdate) {
        const updatedProfile: UserProfile = {
          ...userProfile,
          displayName: formName,
          phoneNumber: formPhone,
          institution: formSchool,
          grade: formGrade,
          state: formState,
          district: formDistrict,
          registrationNumber: resolvedRegistrationId // cache registration ID
        };
        await onProfileUpdate(updatedProfile);
      }
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile.");
    } finally {
      setSaveLoading(false);
    }
  };

  // 1. Render Incomplete Profile view if fields are missing
  if (!isProfileComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6 my-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-amber-500 p-8 text-white relative text-center">
            <div className="absolute top-4 right-4 animate-pulse">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div className="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Logo className="w-10 h-10" iconOnly />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">Complete Your Student Profile</h2>
            <p className="text-xs text-amber-50/90 max-w-md mx-auto leading-relaxed">
              To unlock and download your custom **Digital Student Identity Card**, please complete the required profile details.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="E.g., Sadanand Jyoti"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="E.g., +91 81054 23488"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* School Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">School / Institution</label>
                <div className="relative">
                  <School className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formSchool}
                    onChange={(e) => setFormSchool(e.target.value)}
                    placeholder="E.g., DPS Bangalore"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Grade Class */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Class / Grade</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    placeholder="E.g., Class 10"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* State */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">State</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <select
                    required
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 dark:text-white appearance-none"
                  >
                    <option value="">Select State</option>
                    {[
                      "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
                      "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
                      "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", 
                      "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
                      "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
                    ].map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* District */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">District / City</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    placeholder="E.g., Bangalore North"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

            </div>

            {saveError && (
              <div className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 rounded-xl animate-in shake">
                {saveError}
              </div>
            )}

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-700 hover:to-amber-600 text-white rounded-xl font-bold tracking-wide transition-all hover:shadow-xl active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              <Save className="w-5 h-5" />
              {saveLoading ? "Saving Profile..." : "Verify & Generate ID Card"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Render ID Card view if profile is complete
  return (
    <div className="max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">My Digital Student ID Card</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Official student membership verification passport of SJ Tutor AI.</p>
      </div>

      <div className="flex flex-col items-center gap-8">
        {/* ID Card Box Container */}
        <div 
          ref={cardRef}
          className="relative w-full max-w-[420px] aspect-[1.58/1] rounded-3xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.01] duration-300 bg-slate-950 text-white select-none border border-slate-800"
        >
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-500/35 to-transparent rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none"></div>
          
          {/* Top header strip logo */}
          <div className="absolute top-0 inset-x-0 p-5 flex justify-between items-start z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/15">
                <Logo className="w-full h-full" iconOnly />
              </div>
              <div>
                <h3 className="font-extrabold text-sm leading-none tracking-tight">SJ Tutor AI</h3>
                <p className="text-[7px] text-amber-400 uppercase font-extrabold tracking-wider mt-0.5">LEARNING PLATFORM</p>
              </div>
            </div>
            <div>
              <div className="bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-lg text-[8px] font-black border border-white/15 text-white uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                VERIFIED STUDY CARD
              </div>
            </div>
          </div>

          {/* Details & Photo Layout */}
          <div className="absolute inset-0 pt-20 px-5 pb-5 flex gap-4 z-10">
            {/* Student Photo */}
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-24 h-24 rounded-full bg-slate-800/80 border-2 border-white/15 overflow-hidden shadow-lg relative flex items-center justify-center">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt="Student Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-900 text-slate-400">
                    <User className="w-10 h-10" />
                  </div>
                )}
                {/* Holographic light effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-60 pointer-events-none"></div>
              </div>
              <div className="text-center">
                <p className="text-[7px] text-slate-500 uppercase tracking-widest font-black">Plan type</p>
                <div className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                  userProfile.planType === 'Achiever' ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30' :
                  userProfile.planType === 'Scholar' ? 'bg-primary-500/20 text-primary-200 border border-primary-500/30' :
                  'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {userProfile.planType || 'Free Account'}
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div className="flex-1 flex flex-col justify-between py-0.5">
              <div className="space-y-0.5">
                <h2 className="text-base font-black truncate leading-tight uppercase tracking-tight text-white">
                  {userProfile.displayName || 'Student Profile'}
                </h2>
                <p className="text-[9px] text-slate-400 truncate opacity-90 font-medium">
                  {email || 'student@sjtutor.ai'}
                </p>
              </div>

              {/* Stats / Parameters Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-0.5">
                <div className="min-w-0">
                  <p className="text-[6.5px] text-slate-500 uppercase tracking-widest font-bold">Institution</p>
                  <p className="text-[9px] font-bold truncate text-slate-200">{userProfile.institution}</p>
                </div>
                <div className="text-right">
                  <p className="text-[6.5px] text-slate-500 uppercase tracking-widest font-bold">Grade</p>
                  <p className="text-[9px] font-bold text-slate-200">{userProfile.grade}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[6.5px] text-slate-500 uppercase tracking-widest font-bold">State</p>
                  <p className="text-[9px] font-bold truncate text-slate-200">{userProfile.state}</p>
                </div>
                <div className="text-right">
                  <p className="text-[6.5px] text-slate-500 uppercase tracking-widest font-bold">District</p>
                  <p className="text-[9px] font-bold truncate text-slate-200">{userProfile.district}</p>
                </div>
              </div>

              {/* Footer row: Reg ID and QR */}
              <div className="flex items-end justify-between pt-1 border-t border-white/10 leading-none">
                <div className="space-y-1">
                  <div>
                    <p className="text-[6.5px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">Registration ID</p>
                    <p className="text-[10px] font-mono font-black text-amber-400 tracking-tight">{resolvedRegistrationId}</p>
                  </div>
                  <div>
                    <p className="text-[5.5px] text-slate-500 uppercase font-black">VALID UNTIL</p>
                    <p className="text-[7.5px] font-mono font-bold text-slate-300">
                      {new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* QR Verification bubble */}
                <div className="bg-white p-1 rounded-lg shadow-md border border-slate-700 flex-shrink-0">
                  <QRCodeSVG 
                    value={JSON.stringify({
                      v: 4,
                      id: resolvedRegistrationId,
                      name: userProfile.displayName,
                      email: email || 'student@sjtutor.ai',
                      phone: userProfile.phoneNumber,
                      institution: userProfile.institution,
                      grade: userProfile.grade,
                      state: userProfile.state,
                      district: userProfile.district,
                      plan: userProfile.planType || 'Free'
                    })}
                    size={48}
                    level="L"
                    includeMargin={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Action hub */}
        <div className="flex gap-4">
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-75"
          >
            {isDownloading ? "Generating Image..." : (
              <>
                <Download className="w-5 h-5" />
                Download ID
              </>
            )}
          </button>
          
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            <Share2 className="w-5 h-5 text-slate-500" />
            Share ID
          </button>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 mt-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Fully compliant digital ID verifies your scholar enrollment in the SJ Tutor AI circle.
        </p>
      </div>
    </div>
  );
};

export default IdCardView;
