import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { User, Phone, School, FileText, Camera, Save, X, Edit2, ArrowRight, Mail, BookOpen, Layers, Briefcase, Zap } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  email: string | null;
  onSave: (profile: UserProfile, redirect?: boolean) => void;
  isOnboarding?: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, email, onSave, isOnboarding = false }) => {
  const [isEditing, setIsEditing] = useState(isOnboarding);
  const [formData, setFormData] = useState<UserProfile>(profile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOnboarding) {
      setIsEditing(true);
    }
    // Update local form state if prop changes
    setFormData(profile);
  }, [isOnboarding, profile]);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave(formData, true);
    if (!isOnboarding) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  const isPremium = formData.planType && formData.planType !== 'Free';

  return (
    <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isOnboarding ? 'py-4' : ''}`}>
      
      {isOnboarding && (
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome to SJ Tutor AI!</h1>
          <p className="text-slate-500 max-w-lg mx-auto">Let's build your academic profile to personalize your AI tutor and study materials.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Identity Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center lg:sticky lg:top-24">
           <div className="relative group mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-primary-50 shadow-md bg-slate-50 flex items-center justify-center overflow-hidden">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-300" />
                )}
              </div>
              {isEditing && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 shadow-md transition-colors transform hover:scale-110"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800">{formData.displayName || 'Scholar'}</h2>
            <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1 mb-4">
               <Mail className="w-3.5 h-3.5" />
               <span className="truncate max-w-[200px]">{email}</span>
            </div>

            <div className="w-full border-t border-slate-100 pt-4 mb-4">
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-slate-500">Status</span>
                 <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">Active</span>
               </div>
               <div className="flex justify-between text-sm mb-2">
                 <span className="text-slate-500">Plan</span>
                 <span className={`font-semibold px-2 py-0.5 rounded text-xs ${!isPremium ? 'text-slate-600 bg-slate-100' : 'text-primary-600 bg-primary-50'}`}>
                    {formData.planType || 'Free'}
                 </span>
               </div>
               <div className="flex justify-between text-sm items-center">
                 <span className="text-slate-500">Credits</span>
                 <div className="flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                    <Zap className="w-3 h-3 fill-amber-400 text-amber-500" />
                    {formData.credits} / 100
                 </div>
               </div>
            </div>

            {!isOnboarding && !isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            ) : isEditing && !isOnboarding && (
              <div className="w-full grid grid-cols-2 gap-3">
                 <button 
                  onClick={handleCancel}
                  className="py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-md"
                >
                  Save
                </button>
              </div>
            )}
        </div>

        {/* Right Column: Details Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Personal Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
               <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                 <User className="w-5 h-5 text-blue-600" />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-slate-800">Personal Details</h3>
                  <p className="text-sm text-slate-400">Your basic information</p>
               </div>
             </div>
             
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">About Me (Bio)</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                    placeholder="e.g. Aspiring Physicist"
                  />
                </div>
             </div>
          </div>

          {/* Section 2: Account & Academic */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
               <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                 <Briefcase className="w-5 h-5 text-purple-600" />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-slate-800">Academic & Contact</h3>
                  <p className="text-sm text-slate-400">School and communication info</p>
               </div>
             </div>

             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">School / University</label>
                  <div className="relative">
                     <School className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                     <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.institution}
                      onChange={(e) => handleInputChange('institution', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                      placeholder="e.g. Stanford University"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      disabled={!isEditing}
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 text-slate-900"
                      placeholder="e.g. +1 234 567 890"
                    />
                  </div>
                </div>
             </div>
          </div>

          {/* Section 3: Learning Preferences */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
             <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
               <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                 <Layers className="w-5 h-5 text-amber-600" />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-slate-800">Learning Preferences</h3>
                  <p className="text-sm text-slate-400">Customize your AI experience</p>
               </div>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Learning Goal</label>
                  <textarea
                    disabled={!isEditing}
                    value={formData.learningGoal || ''}
                    onChange={(e) => handleInputChange('learningGoal', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 resize-none min-h-[80px] text-slate-900"
                    placeholder="e.g. Prepare for finals and improve my understanding of Quantum Physics."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Learning Style</label>
                  <div className="relative">
                     <BookOpen className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                     <select
                        disabled={!isEditing}
                        value={formData.learningStyle || 'Visual'}
                        onChange={(e) => handleInputChange('learningStyle', e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all disabled:opacity-70 disabled:bg-slate-50/50 appearance-none text-slate-900"
                      >
                        <option value="Visual">Visual (Images, Diagrams)</option>
                        <option value="Auditory">Auditory (Listening, Discussing)</option>
                        <option value="Reading/Writing">Reading & Writing</option>
                        <option value="Kinesthetic">Kinesthetic (Hands-on)</option>
                      </select>
                  </div>
                </div>
             </div>
          </div>

          {isOnboarding && (
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                className="px-8 py-3.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2"
              >
                Complete Setup
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProfileView;