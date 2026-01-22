
import React, { useState, useEffect } from 'react';
import { UserProfile, UserSettings, SJTUTOR_AVATAR } from '../types';
import { SettingsService } from '../services/settingsService';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import { 
  User, BookOpen, Bot, MessageSquare, Bell, Moon, Lock, 
  Smartphone, CreditCard, HelpCircle, FlaskConical, ChevronRight, ChevronDown, ChevronUp,
  Save, LogOut, Trash2, Globe, Shield, Activity, Eye, Type, Palette, Monitor, Zap,
  Volume2, Terminal, Crown, Check, AlertTriangle, Clock, Mail, Copy, CheckCircle
} from 'lucide-react';

interface SettingsViewProps {
  userProfile: UserProfile;
  onLogout: () => void;
  onNavigateToProfile: () => void;
  onOpenPremium: () => void;
}

type SettingsTab = 'account' | 'learning' | 'aiTutor' | 'chat' | 'notifications' | 'appearance' | 'privacy' | 'system' | 'billing' | 'help';

const SettingsView: React.FC<SettingsViewProps> = ({ userProfile, onLogout, onNavigateToProfile, onOpenPremium }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [settings, setSettings] = useState<UserSettings>(SettingsService.getSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Help Center State
  const [helpTab, setHelpTab] = useState<'FAQ' | 'TERMS'>('FAQ');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleSettingChange = (category: keyof UserSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    SettingsService.saveSettings(settings);
    setHasChanges(false);
    window.dispatchEvent(new Event('settings-changed'));
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const copyId = () => {
    if (userProfile.customId) {
      navigator.clipboard.writeText(userProfile.customId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handlePasswordChange = async () => {
    const user = auth.currentUser;
    if (user && user.email) {
       const confirmReset = window.confirm(`Send password reset email to ${user.email}?`);
       if (confirmReset) {
         try {
           await sendPasswordResetEmail(auth, user.email);
           alert("Password reset email sent! Please check your inbox to create a new password.");
         } catch (e: any) {
           alert("Error sending reset email: " + e.message);
         }
       }
    }
  };

  const handleEmailChange = async () => {
    const user = auth.currentUser;
    if (user) {
      const newEmail = window.prompt("Enter your new email address:");
      if (newEmail && newEmail !== user.email) {
         try {
           await verifyBeforeUpdateEmail(user, newEmail);
           alert(`Verification email sent to ${newEmail}. Please verify it to complete the update.`);
         } catch (e: any) {
            alert("Error updating email: " + e.message);
         }
      }
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'learning', label: 'Learning Prefs', icon: BookOpen },
    { id: 'aiTutor', label: 'AI Tutor', icon: Bot },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'system', label: 'App & System', icon: Smartphone },
    { id: 'billing', label: 'Subscription', icon: CreditCard },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const faqs = [
    { q: "What is SJ Tutor AI?", a: "SJ Tutor AI is an AI-powered learning app that helps students understand concepts, solve doubts, and improve learning using smart artificial intelligence." },
    { q: "Who can use SJ Tutor AI?", a: "SJ Tutor AI is designed for students, learners, and anyone who wants academic support." },
  ];

  const terms = [
    { title: "1. About SJ Tutor AI", content: "SJ Tutor AI is an AI-powered learning application designed to help students with studying and understanding concepts." },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'account':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Account Settings</h3>
            
            {/* Identity Badge */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Shield className="w-32 h-32 rotate-12" />
               </div>
               <div className="relative z-10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">SJ Student Identity</p>
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-mono font-bold tracking-tighter">{userProfile.customId || 'SJS-GUEST-0000'}</h2>
                     <button 
                        onClick={copyId}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-md transition-all flex items-center gap-2 text-xs font-bold"
                     >
                        {isCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {isCopied ? 'Copied' : 'Copy ID'}
                     </button>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden">
                        <img src={userProfile.photoURL || SJTUTOR_AVATAR} className="w-full h-full object-cover" alt="" />
                     </div>
                     <div>
                        <p className="text-sm font-bold">{userProfile.displayName || 'Scholar'}</p>
                        <p className="text-[10px] opacity-70 uppercase font-bold">{userProfile.planType} Member</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
               <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500">
                 <img src={userProfile.photoURL || SJTUTOR_AVATAR} alt="Profile" className="w-full h-full object-cover" />
               </div>
               <div className="flex-1">
                 <h4 className="font-bold text-slate-800 dark:text-white text-lg">{userProfile.displayName || 'Scholar'}</h4>
                 <p className="text-sm text-slate-500 dark:text-slate-400">{userProfile.institution}</p>
                 <button onClick={onNavigateToProfile} className="text-primary-600 dark:text-primary-400 text-sm font-semibold mt-1 hover:underline">
                   Edit Profile Details
                 </button>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
               <div className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={onNavigateToProfile}>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Personal Information</p>
                    <p className="text-xs text-slate-400">Name, Phone</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>

               <div className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={handleEmailChange}>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Change Email</p>
                    <p className="text-xs text-slate-400">Update your registered email</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>

               <div className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={handlePasswordChange}>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Change Password</p>
                    <p className="text-xs text-slate-400">Update your security credentials</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
               
               <div className="p-4 flex justify-between items-center hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer group" onClick={onLogout}>
                  <div>
                    <p className="font-medium text-red-600 group-hover:text-red-700">Log Out</p>
                    <p className="text-xs text-red-400">Sign out of this device</p>
                  </div>
                  <LogOut className="w-4 h-4 text-red-400" />
               </div>
            </div>
          </div>
        );
      case 'learning':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Learning Preferences</h3>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Preferred Subject</label>
                 <input 
                   type="text" 
                   value={settings.learning.preferredSubject}
                   onChange={(e) => handleSettingChange('learning', 'preferredSubject', e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Grade / Class</label>
                 <input 
                   type="text" 
                   value={settings.learning.grade}
                   onChange={(e) => handleSettingChange('learning', 'grade', e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 />
               </div>
            </div>
          </div>
        );
      case 'aiTutor':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">AI Tutor Settings</h3>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tutor Personality</label>
                 <div className="grid grid-cols-3 gap-3">
                   {['Friendly', 'Professional', 'Strict'].map((p) => (
                     <button
                       key={p}
                       onClick={() => handleSettingChange('aiTutor', 'personality', p)}
                       className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                         settings.aiTutor.personality === p 
                           ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-400' 
                           : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                       }`}
                     >
                       {p}
                     </button>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        );
      case 'chat':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Chat Preferences</h3>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><Save className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-save Chat History</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.chat.autoSave} onChange={(e) => handleSettingChange('chat', 'autoSave', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
               </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Notifications</h3>
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                {[{ id: 'push', label: 'Push Notifications', desc: 'Enable notifications on this device.' }].map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                     <div>
                       <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{item.label}</span>
                       <span className="text-xs text-slate-400">{item.desc}</span>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={(settings.notifications as any)[item.id]} 
                          onChange={(e) => handleSettingChange('notifications', item.id, e.target.checked)} 
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                     </label>
                  </div>
                ))}
             </div>
          </div>
        );
      case 'appearance':
        return (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Appearance</h3>
             <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                   <div className="grid grid-cols-3 gap-3">
                      {['Light', 'Dark', 'System'].map((t) => (
                         <button
                           key={t}
                           onClick={() => handleSettingChange('appearance', 'theme', t)}
                           className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                             settings.appearance.theme === t
                             ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 ring-1 ring-primary-500'
                             : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                           }`}
                         >
                            <span className="text-sm font-medium">{t} Mode</span>
                         </button>
                      ))}
                   </div>
                </div>
             </div>
           </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Privacy & Security</h3>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><Shield className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Two-Factor Authentication</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.privacy.twoFactor} onChange={(e) => handleSettingChange('privacy', 'twoFactor', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
               </div>
            </div>
          </div>
        );
      case 'system':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">App & System</h3>
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                <div className="flex justify-between items-center py-2">
                   <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">App Version</p>
                      <p className="text-xs text-slate-400">v2.5.1 (Stable)</p>
                   </div>
                </div>
             </div>
          </div>
        );
      case 'billing':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Subscription & Credits</h3>
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                   <h2 className="text-3xl font-bold mb-1">{userProfile.planType || 'Free Plan'}</h2>
                   <div className="mt-4 flex items-center justify-between bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                      <div>
                         <p className="text-xs text-slate-400 mb-1">Available Credits</p>
                         <p className="text-2xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-amber-400 fill-amber-400" />{userProfile.credits}</p>
                      </div>
                      <button onClick={onOpenPremium} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-sm">Top Up</button>
                   </div>
                </div>
             </div>
          </div>
        );
      case 'help':
        return (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Help Center</h3>
             <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <p className="text-sm text-slate-500">Contact us at support@sjtutorai.com</p>
             </div>
          </div>
        );
      default:
        return <div className="text-center py-20 text-slate-400">Select a setting category.</div>;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
      <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex md:flex-col overflow-x-auto md:overflow-y-auto">
         {tabs.map((tab) => {
           const Icon = tab.icon;
           return (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal ${
                 activeTab === tab.id 
                   ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 border-b-2 md:border-b-0 md:border-r-2 border-primary-500' 
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
               }`}
             >
               <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
               {tab.label}
             </button>
           );
         })}
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-white dark:bg-slate-900">
         {renderContent()}
         {hasChanges && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4 z-20">
               <span className="text-sm font-medium">You have unsaved changes</span>
               <div className="flex items-center gap-2">
                 <button onClick={() => { setSettings(SettingsService.getSettings()); setHasChanges(false); }} className="text-xs hover:text-slate-300 px-2">Discard</button>
                 <button onClick={saveSettings} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1"><Save className="w-3 h-3" />Save</button>
               </div>
            </div>
         )}
         {showSaveSuccess && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-20">
               <Activity className="w-4 h-4" />
               <span className="text-sm font-bold">Saved!</span>
            </div>
         )}
      </div>
    </div>
  );
};

export default SettingsView;
