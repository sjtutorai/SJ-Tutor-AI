
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
              alert("For security, please log out and log back in before changing your email.");
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
    { q: "Is SJ Tutor AI free to use?", a: "SJ Tutor AI offers free features, and some advanced features may require a subscription." },
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
                   placeholder="e.g. Science, Math, History"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Grade / Class</label>
                 <input 
                   type="text" 
                   value={settings.learning.grade}
                   onChange={(e) => handleSettingChange('learning', 'grade', e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                   placeholder="e.g. 10th Grade"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Education Board</label>
                 <input 
                   type="text" 
                   value={settings.learning.board}
                   onChange={(e) => handleSettingChange('learning', 'board', e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                   placeholder="e.g. CBSE, ICSE, State Board"
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
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
              </div>
              
              <div className="flex items-center justify-between">
                 <div>
                   <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Context Memory</span>
                   <span className="text-xs text-slate-400">Remember previous chats</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.aiTutor.memory} onChange={(e) => handleSettingChange('aiTutor', 'memory', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
              </div>

            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Chat Preferences</h3>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
               <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Font Size</label>
                 <div className="grid grid-cols-3 gap-3">
                   {['Small', 'Medium', 'Large'].map((s) => (
                     <button
                       key={s}
                       onClick={() => handleSettingChange('chat', 'fontSize', s)}
                       className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                         settings.chat.fontSize === s 
                           ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-400' 
                           : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                       }`}
                     >
                       {s}
                     </button>
                   ))}
                 </div>
               </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Appearance</h3>
             
             <div className="space-y-6">
                <div className="space-y-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                   <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1">
                       <Moon className="w-4 h-4" /> App Theme
                   </label>
                   <div className="grid grid-cols-3 gap-3">
                      {['Light', 'Dark', 'System'].map((t) => (
                         <button
                           key={t}
                           onClick={() => handleSettingChange('appearance', 'theme', t)}
                           className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                             settings.appearance.theme === t
                             ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                             : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                           }`}
                         >
                            <span className="text-sm font-medium">{t}</span>
                         </button>
                      ))}
                   </div>
                </div>
             </div>
           </div>
        );

      case 'billing':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Subscription</h3>
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <h2 className="text-3xl font-bold mb-1">{userProfile.planType || 'Free Plan'}</h2>
                <p className="text-slate-400 text-sm mb-6">Credits: {userProfile.credits}</p>
                <button onClick={onOpenPremium} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-sm">Upgrade Plan</button>
             </div>
          </div>
        );

      default:
        return <div className="text-center py-20 text-slate-400">Select a category.</div>;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex md:flex-col overflow-x-auto md:overflow-y-auto">
         <div className="p-4 md:p-6 font-bold text-slate-400 text-xs uppercase tracking-wider hidden md:block">Settings</div>
         {tabs.map((tab) => {
           const Icon = tab.icon;
           const isActive = activeTab === tab.id;
           return (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-3.5 text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal ${
                 isActive 
                   ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 border-b-2 md:border-b-0 md:border-r-2 border-primary-500' 
                   : 'text-slate-600 dark:text-slate-400'
               }`}
             >
               <Icon className="w-4 h-4" />
               {tab.label}
             </button>
           );
         })}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
         {renderContent()}
         {hasChanges && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-20">
               <span className="text-sm font-medium">Unsaved changes</span>
               <button onClick={saveSettings} className="bg-primary-600 hover:bg-primary-700 px-4 py-1.5 rounded-full text-xs font-bold">Save Changes</button>
            </div>
         )}
         {showSaveSuccess && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-xl z-20">
               <span className="text-sm font-bold">Settings Saved!</span>
            </div>
         )}
      </div>
    </div>
  );
};

export default SettingsView;
