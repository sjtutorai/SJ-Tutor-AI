
import React, { useState, useEffect } from 'react';
import { UserProfile, UserSettings, SJTUTOR_AVATAR } from '../types';
import { SettingsService } from '../services/settingsService';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import { 
  User, BookOpen, Bot, MessageSquare, Bell, Moon, Lock, 
  Smartphone, CreditCard, HelpCircle, FlaskConical, ChevronRight, ChevronDown, ChevronUp,
  Save, LogOut, Trash2, Globe, Shield, Activity, Eye, Type, Palette, Monitor, Zap,
  Volume2, Terminal, Crown, Check, AlertTriangle, Clock, Mail, School
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
    
    // Trigger global event for theme update
    window.dispatchEvent(new Event('settings-changed'));
    
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
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
    } else {
      alert("You need to be logged in to change your password.");
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
           if (e.code === 'auth/requires-recent-login') {
              alert("Please log out and log back in before changing your email.");
           } else {
              alert("Error updating email: " + e.message);
           }
         }
      }
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'learning', label: 'Learning Preference', icon: BookOpen },
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
    { q: "Is SJ Tutor AI free to use?", a: "SJ Tutor AI offers free features, and some advanced features require a subscription." },
    { q: "Are AI answers always correct?", a: "AI responses are generated automatically and may not always be 100% accurate. Always verify important facts." },
  ];

  const terms = [
    { title: "1. About SJ Tutor AI", content: "SJ Tutor AI is an educational support tool intended to aid students in their studies." },
    { title: "2. Privacy", content: "Your data is handled according to our Privacy Policy. We do not sell personal information." },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'account':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Account Settings</h3>
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
               <div className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={handleEmailChange}>
                  <p className="font-medium text-slate-700 dark:text-slate-200">Change Email</p>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
               <div className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={handlePasswordChange}>
                  <p className="font-medium text-slate-700 dark:text-slate-200">Change Password</p>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
               <div className="p-4 flex justify-between items-center hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer group" onClick={onLogout}>
                  <p className="font-medium text-red-600 group-hover:text-red-700">Log Out</p>
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
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <School className="w-4 h-4 text-primary-500" />
                    Education Board
                 </label>
                 <input 
                   type="text" 
                   value={settings.learning.board}
                   onChange={(e) => handleSettingChange('learning', 'board', e.target.value)}
                   placeholder="e.g. CBSE, ICSE, IGCSE"
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Content Difficulty</label>
                 <select
                   value={settings.learning.difficulty}
                   onChange={(e) => handleSettingChange('learning', 'difficulty', e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 >
                   <option value="Easy">Easy</option>
                   <option value="Medium">Medium</option>
                   <option value="Hard">Hard</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Primary Language</label>
                 <input 
                   type="text" 
                   value={settings.learning.language}
                   onChange={(e) => handleSettingChange('learning', 'language', e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Daily Study Goal</span>
                    <span className="text-primary-600">{settings.learning.dailyGoalMins} mins</span>
                 </label>
                 <input 
                   type="range" 
                   min="10" max="120" step="10"
                   value={settings.learning.dailyGoalMins}
                   onChange={(e) => handleSettingChange('learning', 'dailyGoalMins', parseInt(e.target.value))}
                   className="w-full accent-primary-600"
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
              <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Explanation Style</label>
                 <select
                   value={settings.aiTutor.explanationStyle}
                   onChange={(e) => handleSettingChange('aiTutor', 'explanationStyle', e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 >
                   <option value="Short & Simple">Short & Simple</option>
                   <option value="Detailed">Detailed</option>
                   <option value="Step-by-step">Step-by-step</option>
                 </select>
              </div>
              <div className="flex items-center justify-between pt-2">
                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ask Follow-up Questions</span>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.aiTutor.followUp} onChange={(e) => handleSettingChange('aiTutor', 'followUp', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary-600 transition-colors"></div>
                 </label>
              </div>
            </div>
          </div>
        );

      case 'help':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Help Center</h3>
             <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-y-auto">
                <div className="space-y-4">
                  {faqs.map((item, idx) => (
                    <div key={idx} className="border-b border-slate-100 dark:border-slate-700 last:border-0 pb-4 last:pb-0">
                      <button onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)} className="flex justify-between items-start w-full text-left font-medium text-slate-700 dark:text-slate-200">
                        <span>{item.q}</span>
                        {openFaqIndex === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {openFaqIndex === idx && <p className="mt-2 text-sm text-slate-500">{item.a}</p>}
                    </div>
                  ))}
                </div>
             </div>
          </div>
        );

      default:
        return <div className="text-center py-20 text-slate-400">Select a category.</div>;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex md:flex-col overflow-x-auto">
         {tabs.map((tab) => {
           const Icon = tab.icon;
           const isActive = activeTab === tab.id;
           return (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors ${
                 isActive 
                   ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 border-b-2 md:border-b-0 md:border-r-2 border-primary-500' 
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
               }`}
             >
               <Icon className="w-4 h-4" />
               {tab.label}
             </button>
           );
         })}
      </div>
      <div className="flex-1 overflow-y-auto p-8 relative bg-white dark:bg-slate-900">
         {renderContent()}
         {hasChanges && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-20">
               <span className="text-sm">Unsaved changes</span>
               <button onClick={saveSettings} className="bg-primary-600 px-4 py-1.5 rounded-full text-xs font-bold">Save</button>
            </div>
         )}
         {showSaveSuccess && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 z-20">
               <Activity className="w-4 h-4" />
               <span className="text-sm font-bold">Saved!</span>
            </div>
         )}
      </div>
    </div>
  );
};

export default SettingsView;
