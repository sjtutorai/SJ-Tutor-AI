import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  User, 
  Phone, 
  School, 
  Camera, 
  Edit2, 
  Mail, 
  GraduationCap, 
  CheckCircle, 
  Calendar, 
  Briefcase, 
  Layers, 
  BookOpen, 
  Crown,
  Lock,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  Target,
  Lightbulb
} from 'lucide-react';
import { validateAndParsePhone } from '../utils/phoneUtils';
import { 
  calculateProfileCompletion, 
  generateSjTutorId, 
  calculateGradeFromAge, 
  calculateProfileUpdateCooldown 
} from '../utils/profileUtils';
import { 
  STATE_DISTRICT_MAPPING, 
  INDIAN_STATES, 
  INDIAN_SCHOOL_BOARDS, 
  GRADES_LIST, 
  COMMON_SCHOOL_TYPES, 
  LEARNING_GOALS_LIST, 
  LEARNING_STYLES_LIST 
} from '../data/academicData';
import { auth } from '../firebaseConfig';
import { saveProfileToFirestore } from '../utils/firebaseUtils';

interface ProfileViewProps {
  profile: UserProfile;
  email: string | null;
  onSave: (profile: UserProfile, redirect?: boolean) => void;
  isOnboarding?: boolean;
  onOpenUpgrade?: () => void;
}

type ProfileTab = 'personal' | 'academic' | 'preferences' | 'account';

const ProfileView: React.FC<ProfileViewProps> = ({ 
  profile, 
  email, 
  onSave, 
  isOnboarding = false, 
  onOpenUpgrade
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [isEditing, setIsEditing] = useState(isOnboarding);
  const initialResolvedDob = profile.dob || profile.dateOfBirth || (profile as any)?.birthDate || '';
  const [formData, setFormData] = useState<UserProfile>({
    ...profile,
    dob: initialResolvedDob,
    dateOfBirth: initialResolvedDob,
  });
  const [showCooldownModal, setShowCooldownModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState(profile.institution || '');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const schoolDropdownRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<any>(null);

  const cooldownInfo = calculateProfileUpdateCooldown(profile);
  const isPremium = Boolean(profile.planType && profile.planType !== 'Free');
  const canEdit = isOnboarding || cooldownInfo.canUpdate || isPremium;

  const sjTutorId = formData.sjTutorId || formData.registrationNumber || profile.sjTutorId || generateSjTutorId();

  useEffect(() => {
    if (isOnboarding) {
      setIsEditing(true);
    }
    const resolvedDob = profile.dob || profile.dateOfBirth || (profile as any)?.birthDate || '';
    setFormData({
      ...profile,
      dob: resolvedDob,
      dateOfBirth: resolvedDob,
    });
    setSchoolSearchQuery(profile.institution || '');
  }, [isOnboarding, profile]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const triggerAutoSave = (updated: UserProfile) => {
    const activeUid = auth.currentUser?.uid || localStorage.getItem('sjtutor_active_id_session');
    if (!activeUid) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setAutoSaveStatus('saving');
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const resolvedDob = updated.dob || updated.dateOfBirth || '';
        const payload: UserProfile = {
          ...updated,
          dob: resolvedDob,
          dateOfBirth: resolvedDob,
          lastProfileUpdate: Date.now(),
          isRegisteredInFirestore: true,
        };
        localStorage.setItem(`profile_${activeUid}`, JSON.stringify(payload));
        await saveProfileToFirestore(activeUid, payload);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2500);
      } catch (err) {
        console.warn('Auto-save profile warning:', err);
        setAutoSaveStatus('idle');
      }
    }, 800);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target as Node)) {
        setShowSchoolDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => {
      const next = {
        ...prev,
        [field]: value
      };
      if (field === 'dob') {
        next.dateOfBirth = value;
      } else if (field === 'dateOfBirth') {
        next.dob = value;
      }
      triggerAutoSave(next);
      return next;
    });
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDobChange = (val: string) => {
    setFormData(prev => {
      const next = {
        ...prev,
        dob: val,
        dateOfBirth: val,
      };
      if (val) {
        const estimatedGrade = calculateGradeFromAge(val);
        if (estimatedGrade && GRADES_LIST.includes(estimatedGrade)) {
          next.grade = estimatedGrade;
        }
      }
      triggerAutoSave(next);
      return next;
    });
    if (validationErrors.dob) {
      setValidationErrors(prev => ({ ...prev, dob: '' }));
    }
  };

  const handleGoalToggle = (goal: string) => {
    const currentGoals = formData.learningGoals || (formData.learningGoal ? [formData.learningGoal] : []);
    let newGoals: string[];
    if (currentGoals.includes(goal)) {
      newGoals = currentGoals.filter(g => g !== goal);
    } else {
      newGoals = [...currentGoals, goal];
    }
    handleInputChange('learningGoals', newGoals);
    handleInputChange('learningGoal', newGoals[0] || '');
  };

  const handleStyleToggle = (style: string) => {
    const currentStyles = formData.learningStyles || (formData.learningStyle ? [formData.learningStyle] : []);
    let newStyles: string[];
    if (currentStyles.includes(style)) {
      newStyles = currentStyles.filter(s => s !== style);
    } else {
      newStyles = [...currentStyles, style];
    }
    handleInputChange('learningStyles', newStyles);
    handleInputChange('learningStyle', newStyles[0] || '');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size exceeds 2MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleInputChange('photoURL', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.displayName || formData.displayName.trim().length < 2) {
      errors.displayName = 'Full name is required (at least 2 characters).';
    }

    if (!formData.institution || !formData.institution.trim()) {
      errors.institution = 'School Name/School Selection is REQUIRED.';
    }

    if (formData.phoneNumber) {
      const phoneVal = validateAndParsePhone(formData.phoneNumber);
      if (!phoneVal.isValid) {
        errors.phoneNumber = phoneVal.error || 'Please enter a valid phone number.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      alert('Please fill in all required fields, including School Selection.');
      return;
    }

    const updatedProfile: UserProfile = {
      ...formData,
      sjTutorId: sjTutorId,
      registrationNumber: sjTutorId,
      lastProfileUpdate: Date.now(),
      isRegisteredInFirestore: true
    };

    onSave(updatedProfile, isOnboarding);
    setIsEditing(false);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(sjTutorId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const completionPct = calculateProfileCompletion(formData);

  const filteredSchools = COMMON_SCHOOL_TYPES.filter(s => 
    s.toLowerCase().includes(schoolSearchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6">
      
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          
          {/* Avatar & Basic Identity */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-md overflow-hidden border-2 border-white dark:border-slate-800">
                {formData.photoURL ? (
                  <img 
                    src={formData.photoURL} 
                    alt={formData.displayName || 'Profile'} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  formData.displayName ? formData.displayName.charAt(0).toUpperCase() : <User className="w-10 h-10" />
                )}
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition-all hover:scale-110"
                  title="Upload profile picture"
                >
                  <Camera className="w-3.5 h-3.5" />
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

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {formData.displayName || 'Scholar User'}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  Active Account
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formData.institution ? `${formData.institution} • ` : ''}
                {formData.grade || '10th Grade'}
              </p>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 select-all font-semibold">
                  {sjTutorId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Copy SJ Tutor AI ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Progress & Edit Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-750 flex items-center gap-4 min-w-[200px]">
              <div className="space-y-1 flex-1">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Profile Strength</span>
                  <span className="text-primary-600 dark:text-primary-400">{completionPct}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary-600 dark:bg-primary-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  if (canEdit) {
                    setIsEditing(true);
                  } else {
                    setShowCooldownModal(true);
                  }
                }}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                {autoSaveStatus === 'saving' && (
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Auto-saving to cloud...
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Auto-saved
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>Profile successfully updated!</span>
          </div>
        )}
      </div>

      {/* 4 Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-8 overflow-x-auto scrollbar-none border border-slate-200/60 dark:border-slate-700/60">
        {[
          { id: 'personal', label: '1. Personal Info', icon: User },
          { id: 'academic', label: '2. Academic & Contact', icon: GraduationCap },
          { id: 'preferences', label: '3. Learning Preferences', icon: Sparkles },
          { id: 'account', label: '4. SJ Tutor Account', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ProfileTab)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: PERSONAL INFORMATION ================= */}
      {activeTab === 'personal' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Personal Information</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Basic personal identity and demographic data.</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Section 1 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Full Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.displayName || ''}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter full name"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Date of Birth *</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  disabled={!isEditing}
                  value={formData.dob || ''}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850"
                />
              </div>
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">State *</label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  disabled={!isEditing}
                  value={formData.state || 'Delhi'}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* District */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">District *</label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  disabled={!isEditing}
                  value={formData.district || ''}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850"
                >
                  {formData.state && STATE_DISTRICT_MAPPING[formData.state] ? (
                    STATE_DISTRICT_MAPPING[formData.state].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))
                  ) : (
                    <option value="">Select State</option>
                  )}
                </select>
              </div>
            </div>

            {/* About Me */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200">About Me (Bio)</label>
              <textarea
                rows={3}
                disabled={!isEditing}
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us a little about your academic interests and ambitions..."
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850 resize-none"
              />
            </div>

          </div>
        </div>
      )}

      {/* ================= TAB 2: ACADEMIC & CONTACT ================= */}
      {activeTab === 'academic' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Academic & Contact Information</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">School, grade level, and verified contact channels.</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Section 2 of 4</span>
          </div>

          <div className="space-y-5">
            
            {/* REQUIRED School Selection */}
            <div className="space-y-1.5 relative" ref={schoolDropdownRef}>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  School Selection <strong className="text-rose-500">*</strong>
                  <span className="text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded border border-rose-200/50">Required</span>
                </span>
                {validationErrors.institution && (
                  <span className="text-rose-500 text-[11px] font-normal">{validationErrors.institution}</span>
                )}
              </label>

              <div className="relative">
                <School className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  disabled={!isEditing}
                  value={isEditing ? schoolSearchQuery : (formData.institution || '')}
                  onFocus={() => isEditing && setShowSchoolDropdown(true)}
                  onChange={(e) => {
                    setSchoolSearchQuery(e.target.value);
                    handleInputChange('institution', e.target.value);
                    setShowSchoolDropdown(true);
                  }}
                  placeholder="Search and select your school..."
                  className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850 ${
                    validationErrors.institution ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>

              {isEditing && showSchoolDropdown && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-2">
                  {filteredSchools.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleInputChange('institution', s);
                        setSchoolSearchQuery(s);
                        setShowSchoolDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between"
                    >
                      <span>{s}</span>
                      {formData.institution === s && <Check className="w-4 h-4 text-primary-500" />}
                    </button>
                  ))}
                  {schoolSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange('institution', schoolSearchQuery.trim());
                        setShowSchoolDropdown(false);
                      }}
                      className="w-full mt-1 p-2 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 rounded-xl text-xs font-bold text-center border border-primary-200"
                    >
                      Use &ldquo;{schoolSearchQuery.trim()}&rdquo; as my School
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Class / Grade & Academic Board Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Class / Grade *</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    disabled={!isEditing}
                    value={formData.grade || '10th Grade'}
                    onChange={(e) => handleInputChange('grade', e.target.value)}
                    className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850"
                  >
                    {GRADES_LIST.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Academic Board *</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    disabled={!isEditing}
                    value={formData.board || 'CBSE (Central Board of Secondary Education)'}
                    onChange={(e) => handleInputChange('board', e.target.value)}
                    className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none appearance-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850"
                  >
                    {INDIAN_SCHOOL_BOARDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Email & Phone Number Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={email || auth.currentUser?.email || 'sjtutorai@gmail.com'}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-sm cursor-not-allowed opacity-90"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={formData.phoneNumber || ''}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-850"
                  />
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ================= TAB 3: LEARNING PREFERENCES ================= */}
      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Learning Preferences</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tailor the SJ Tutor AI response style and depth to your learning pace.</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Section 3 of 4</span>
          </div>

          <div className="space-y-6">
            
            {/* Field 1: Main Learning Goals */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-primary-500" />
                Main Learning Goals
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {LEARNING_GOALS_LIST.map((goal) => {
                  const currentGoals = formData.learningGoals || (formData.learningGoal ? [formData.learningGoal] : []);
                  const isSelected = currentGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => handleGoalToggle(goal)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 text-primary-900 dark:text-primary-200 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      } ${!isEditing ? 'cursor-default opacity-85' : 'hover:scale-[1.01]'}`}
                    >
                      <span>{goal}</span>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-md bg-primary-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 2: Preferred Learning Style */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Preferred Learning Style
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {LEARNING_STYLES_LIST.map((style) => {
                  const currentStyles = formData.learningStyles || (formData.learningStyle ? [formData.learningStyle] : []);
                  const isSelected = currentStyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => handleStyleToggle(style)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      } ${!isEditing ? 'cursor-default opacity-85' : 'hover:scale-[1.01]'}`}
                    >
                      <span>{style}</span>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-md bg-amber-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= TAB 4: SJ TUTOR AI ACCOUNT ================= */}
      {activeTab === 'account' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">SJ Tutor AI Account Details</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Account identifier, membership credentials, and subscription status.</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Section 4 of 4</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Prominent Unique ID */}
            <div className="sm:col-span-2 p-5 bg-gradient-to-r from-primary-600 to-indigo-700 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-primary-600/20">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary-200">
                  Official SJ Tutor AI ID
                </span>
                <div className="text-2xl font-mono font-bold tracking-wider">
                  {sjTutorId}
                </div>
                <p className="text-xs text-primary-100/80">
                  Your persistent educational identifier across all tests, classes, and analytics.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="px-4 py-2 bg-white text-primary-700 hover:bg-primary-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
              >
                {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
              </button>
            </div>

            {/* Account Status Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <span className="text-xs text-slate-400 block font-semibold">Account Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-bold text-slate-800 dark:text-white">Active & Verified</span>
              </div>
            </div>

            {/* Account Creation Date */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <span className="text-xs text-slate-400 block font-semibold">Account Creation Date</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {formData.createdAt 
                  ? new Date(formData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'August 2026'}
              </span>
            </div>

            {/* AI Credits Balance */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1">
              <span className="text-xs text-slate-400 block font-semibold">Available AI Credits</span>
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                {formData.credits ?? 100} Credits
              </span>
            </div>

            {/* Plan Tier */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-1 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-semibold">Current Plan</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">
                  {formData.planType || 'Free Tier'}
                </span>
              </div>
              {onOpenUpgrade && (
                <button
                  type="button"
                  onClick={onOpenUpgrade}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 underline"
                >
                  Upgrade
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Cooldown Information Modal */}
      {showCooldownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 space-y-5 text-center border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-500 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Profile Update Cooldown</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Free tier accounts can update profile details once every <span className="font-bold text-slate-900 dark:text-white">{cooldownInfo.cooldownDays} days</span>.
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium">
                Next update unlocks on <span className="font-bold">{cooldownInfo.nextAvailableDate?.toLocaleDateString()}</span> (in ~{cooldownInfo.remainingDays} day{cooldownInfo.remainingDays > 1 ? 's' : ''}).
              </div>
            </div>
            <div className="pt-2 space-y-2.5">
              {onOpenUpgrade && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCooldownModal(false);
                    onOpenUpgrade();
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 fill-amber-300" />
                  Upgrade to Edit Whenever You Want
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCooldownModal(false)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfileView;
