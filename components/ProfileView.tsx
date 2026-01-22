
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { User, Phone, School, FileText, Camera, Save, X, Edit2, ArrowRight, Mail, BookOpen, Layers, Briefcase, Zap, GraduationCap, Fingerprint } from 'lucide-react';

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
    if (isOnboarding) setIsEditing(true);
    setFormData(profile);
  }, [isOnboarding, profile]);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    // Special handling for Student ID to prevent spaces and enforce SJS prefix if desired
    if (field === 'customId') {
       value = value.toUpperCase().replace(/\s+/g, '-');
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave(formData, true);
    if (!isOnboarding) setIsEditing(false);
  };

  const isPremium = formData.planType && formData.planType !== 'Free';

  return (
    <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isOnboarding ? 'py-4' : ''}`}>
      {isOnboarding && (
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome!</h1>
          <p className="text-slate-500">Let's set up your identity.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center">
           <div className="relative group mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-primary-50 shadow-md bg-slate-50 flex items-center justify-center overflow-hidden">
                {formData.photoURL ? <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-slate-300" />}
              </div>
              {isEditing && (
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 p-2 bg-primary-600 text-white rounded-full"><Camera className="w-4 h-4" /></button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{formData.displayName || 'Scholar'}</h2>
            <p className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400 mt-1">{formData.customId}</p>

            {!isOnboarding && !isEditing ? (
              <button onClick={() => setIsEditing(true)} className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-medium mt-6">Edit Profile</button>
            ) : isEditing && !isOnboarding && (
              <div className="w-full grid grid-cols-2 gap-3 mt-6">
                <button onClick={() => setIsEditing(false)} className="py-2.5 bg-white border rounded-xl">Cancel</button>
                <button onClick={handleSave} className="py-2.5 bg-primary-600 text-white rounded-xl">Save</button>
              </div>
            )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Identity & Profile</h3>
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Student ID</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.customId || ''}
                      onChange={(e) => handleInputChange('customId', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border rounded-xl outline-none"
                      placeholder="SJS-ID"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>
             </div>
          </div>
          {isOnboarding && (
            <div className="flex justify-end pt-4">
              <button onClick={handleSave} className="px-8 py-3.5 bg-primary-600 text-white rounded-xl font-bold flex items-center gap-2">Complete Setup <ArrowRight className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
