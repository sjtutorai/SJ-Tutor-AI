
import React, { useState, useEffect } from 'react';
import { UserProfile, UserSettings, SJTUTOR_AVATAR } from '../types';
import { SettingsService } from '../services/settingsService';
import { 
  User, BookOpen, Bot, MessageSquare, Bell, Moon, Lock, 
  Smartphone, CreditCard, HelpCircle, FlaskConical, ChevronRight, 
  Save, LogOut, Trash2, Globe, Shield, Activity
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
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'learning', label: 'Learning Prefs', icon: BookOpen },
    { id: 'aiTutor', label: 'AI Tutor', icon: Bot },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Moon },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'system', label: 'App & System', icon: Smartphone },
    { id: 'billing', label: 'Subscription', icon: CreditCard },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'account':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Account Settings</h3>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
               <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500">
                 <img src={userProfile.photoURL || SJTUTOR_AVATAR} alt="Profile" className="w-full h-full object-cover" />
               </div>
               <div className="flex-1">
                 <h4 className="font-bold text-slate-800 text-lg">{userProfile.displayName || 'Scholar'}</h4>
                 <p className="text-sm text-slate-500">{userProfile.institution}</p>
                 <button onClick={onNavigateToProfile} className="text-primary-600 text-sm font-semibold mt-1 hover:underline">
                   Edit Profile Details
                 </button>
               </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
               <div className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer" onClick={onNavigateToProfile}>
                  <div>
                    <p className="font-medium text-slate-700">Personal Information</p>
                    <p className="text-xs text-slate-400">Name, Email, Phone</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
               <div className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                  <div>
                    <p className="font-medium text-slate-700">Change Password</p>
                    <p className="text-xs text-slate-400">Update your security credentials</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
               <div className="p-4 flex justify-between items-center hover:bg-red-50 cursor-pointer group" onClick={onLogout}>
                  <div>
                    <p className="font-medium text-red-600 group-hover:text-red-700">Log Out</p>
                    <p className="text-xs text-red-400">Sign out of this device</p>
                  </div>
                  <LogOut className="w-4 h-4 text-red-400" />
               </div>
            </div>

            <div className="pt-6">
               <button className="flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-700">
                 <Trash2 className="w-4 h-4" />
                 Delete Account
               </button>
            </div>
          </div>
        );

      case 'learning':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Learning Preferences</h3>
            
            <div className="grid gap-6">
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-600">Preferred Subject</label>
                 <input 
                   type="text" 
                   value={settings.learning.preferredSubject}
                   onChange={(e) => handleSettingChange('learning', 'preferredSubject', e.target.value)}
                   className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-600">Class / Grade</label>
                   <select 
                      value={settings.learning.grade}
                      onChange={(e) => handleSettingChange('learning', 'grade', e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 bg-white"
                   >
                     <option value="6th">6th Grade</option>
                     <option value="7th">7th Grade</option>
                     <option value="8th">8th Grade</option>
                     <option value="9th">9th Grade</option>
                     <option value="10th">10th Grade</option>
                     <option value="11th">11th Grade</option>
                     <option value="12th">12th Grade</option>
                     <option value="University">University</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-600">Difficulty</label>
                   <select 
                      value={settings.learning.difficulty}
                      onChange={(e) => handleSettingChange('learning', 'difficulty', e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 bg-white"
                   >
                     <option value="Easy">Beginner</option>
                     <option value="Medium">Intermediate</option>
                     <option value="Hard">Advanced</option>
                   </select>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-600">Language Preference</label>
                 <select 
                    value={settings.learning.language}
                    onChange={(e) => handleSettingChange('learning', 'language', e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-200 bg-white"
                 >
                   <option value="English">English</option>
                   <option value="Hindi">Hindi</option>
                   <option value="Spanish">Spanish</option>
                   <option value="French">French</option>
                 </select>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-600">Daily Study Goal (Minutes)</label>
                 <input 
                   type="range" 
                   min="10" 
                   max="180" 
                   step="10"
                   value={settings.learning.dailyGoalMins}
                   onChange={(e) => handleSettingChange('learning', 'dailyGoalMins', parseInt(e.target.value))}
                   className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                 />
                 <div className="text-right text-sm font-medium text-primary-600">{settings.learning.dailyGoalMins} min/day</div>
               </div>
            </div>
          </div>
        );

      case 'aiTutor':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">AI Tutor Settings</h3>
             
             <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 mb-4 flex gap-3">
                <Bot className="w-6 h-6 text-primary-600 flex-shrink-0" />
                <p className="text-sm text-primary-800">Customize how your AI Tutor interacts with you. Changes affect all future chats.</p>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-600">Tutor Personality</label>
                   <div className="grid grid-cols-3 gap-2">
                      {['Friendly', 'Professional', 'Strict'].map((p) => (
                        <button
                          key={p}
                          onClick={() => handleSettingChange('aiTutor', 'personality', p)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                             settings.aiTutor.personality === p 
                             ? 'bg-primary-600 text-white border-primary-600' 
                             : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {p === 'Friendly' ? '😊 ' : p === 'Professional' ? '🎓 ' : '🧠 '}
                          {p}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-600">Explanation Style</label>
                   <select 
                      value={settings.aiTutor.explanationStyle}
                      onChange={(e) => handleSettingChange('aiTutor', 'explanationStyle', e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 bg-white"
                   >
                     <option value="Short & Simple">Short & Simple</option>
                     <option value="Detailed">Detailed</option>
                     <option value="Step-by-step">Step-by-step</option>
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-600">Answer Format</label>
                   <select 
                      value={settings.aiTutor.answerFormat}
                      onChange={(e) => handleSettingChange('aiTutor', 'answerFormat', e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 bg-white"
                   >
                     <option value="Text Only">Text Only</option>
                     <option value="Text + Examples">Text + Examples</option>
                     <option value="Text + Code">Text + Code</option>
                   </select>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                   <div>
                     <span className="font-medium text-slate-700">Enable Follow-up Questions</span>
                     <p className="text-xs text-slate-400">AI will check your understanding</p>
                   </div>
                   <input 
                      type="checkbox" 
                      checked={settings.aiTutor.followUp}
                      onChange={(e) => handleSettingChange('aiTutor', 'followUp', e.target.checked)}
                      className="w-5 h-5 accent-primary-600"
                   />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                   <div>
                     <span className="font-medium text-slate-700">Memory</span>
                     <p className="text-xs text-slate-400">AI remembers context from past chats</p>
                   </div>
                   <input 
                      type="checkbox" 
                      checked={settings.aiTutor.memory}
                      onChange={(e) => handleSettingChange('aiTutor', 'memory', e.target.checked)}
                      className="w-5 h-5 accent-primary-600"
                   />
                </div>
             </div>
          </div>
        );

      case 'chat':
         return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Chat Settings</h3>
            
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              <div className="p-4 flex items-center justify-between">
                 <span className="font-medium text-slate-700">Clear Chat History</span>
                 <button className="text-xs font-bold text-red-500 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
                   Clear All
                 </button>
              </div>
              <div className="p-4 flex items-center justify-between">
                 <span className="font-medium text-slate-700">Auto-save Conversations</span>
                 <input 
                    type="checkbox" 
                    checked={settings.chat.autoSave}
                    onChange={(e) => handleSettingChange('chat', 'autoSave', e.target.checked)}
                    className="w-5 h-5 accent-primary-600"
                 />
              </div>
              <div className="p-4 flex items-center justify-between">
                 <span className="font-medium text-slate-700">Chat Font Size</span>
                 <select 
                    value={settings.chat.fontSize}
                    onChange={(e) => handleSettingChange('chat', 'fontSize', e.target.value)}
                    className="p-1.5 border border-slate-200 rounded text-sm"
                 >
                   <option>Small</option>
                   <option>Medium</option>
                   <option>Large</option>
                 </select>
              </div>
              <div className="p-4 flex items-center justify-between">
                 <span className="font-medium text-slate-700">Enable Voice Output</span>
                 <input 
                    type="checkbox" 
                    checked={settings.chat.voiceOutput}
                    onChange={(e) => handleSettingChange('chat', 'voiceOutput', e.target.checked)}
                    className="w-5 h-5 accent-primary-600"
                 />
              </div>
              <div className="p-4 flex items-center justify-between">
                 <span className="font-medium text-slate-700">Typing Indicator</span>
                 <input 
                    type="checkbox" 
                    checked={settings.chat.typingIndicator}
                    onChange={(e) => handleSettingChange('chat', 'typingIndicator', e.target.checked)}
                    className="w-5 h-5 accent-primary-600"
                 />
              </div>
            </div>
          </div>
         );

      case 'notifications':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Notifications</h3>
             <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
               {Object.entries(settings.notifications).map(([key, value]) => (
                 <div key={key} className="p-4 flex items-center justify-between">
                   <span className="font-medium text-slate-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                   </span>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={value as boolean} 
                        onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                   </label>
                 </div>
               ))}
             </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Subscription & Billing</h3>
            
            <div className={`p-6 rounded-xl border ${userProfile.planType !== 'Free' ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Current Plan</p>
                    <h4 className="text-2xl font-bold text-slate-800">{userProfile.planType || 'Free'}</h4>
                  </div>
                  {userProfile.planType !== 'Free' && <div className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full">ACTIVE</div>}
               </div>
               
               <p className="text-slate-600 mb-6">
                 {userProfile.planType === 'Free' 
                   ? "You are on the free plan with limited AI credits."
                   : "You have access to premium features and priority support."
                 }
               </p>

               <div className="flex gap-3">
                 <button 
                   onClick={onOpenPremium}
                   className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors"
                 >
                   {userProfile.planType === 'Free' ? 'Upgrade Plan' : 'Change Plan'}
                 </button>
                 {userProfile.planType !== 'Free' && (
                    <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold text-sm hover:bg-white transition-colors">
                      Cancel Subscription
                    </button>
                 )}
               </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
               <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">Payment History</div>
               <div className="p-8 text-center text-slate-400 text-sm">No payment history available.</div>
            </div>
          </div>
        );

      case 'help':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Help & Support</h3>
             
             <div className="grid gap-3">
               {[
                 'Frequently Asked Questions',
                 'Contact Support',
                 'Report a Problem',
                 'Suggest a Feature',
                 'Rate the App ⭐'
               ].map((item, i) => (
                 <button key={i} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all text-left">
                   <span className="font-medium text-slate-700">{item}</span>
                   <ChevronRight className="w-4 h-4 text-slate-400" />
                 </button>
               ))}
             </div>
             
             <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                <FlaskConical className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                   <h4 className="font-bold text-blue-900">Join Beta Program</h4>
                   <p className="text-sm text-blue-700 mb-2">Try experimental AI features before everyone else.</p>
                   <button className="text-xs font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">Enable Beta</button>
                </div>
             </div>
          </div>
        );

      case 'appearance':
        return (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-2">Appearance</h3>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-600">App Theme</label>
                   <div className="grid grid-cols-3 gap-3">
                      {['Light', 'Dark', 'System'].map((t) => (
                         <button
                           key={t}
                           onClick={() => handleSettingChange('appearance', 'theme', t)}
                           className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                             settings.appearance.theme === t
                             ? 'border-primary-500 bg-primary-50 text-primary-700'
                             : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                           }`}
                         >
                            {t === 'Light' ? <div className="w-6 h-6 bg-white border rounded-full"></div> : 
                             t === 'Dark' ? <div className="w-6 h-6 bg-slate-900 rounded-full"></div> : 
                             <div className="w-6 h-6 bg-gradient-to-r from-white to-slate-900 rounded-full border"></div>}
                            <span className="text-sm font-medium">{t} Mode</span>
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                   <span className="font-medium text-slate-700">UI Animations</span>
                   <input 
                      type="checkbox" 
                      checked={settings.appearance.animations}
                      onChange={(e) => handleSettingChange('appearance', 'animations', e.target.checked)}
                      className="w-5 h-5 accent-primary-600"
                   />
                </div>
             </div>
           </div>
        );

      default:
        return (
           <div className="text-center py-20 text-slate-400">
             <p>This section is under development.</p>
           </div>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Sidebar / Tabs */}
      <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex md:flex-col overflow-x-auto md:overflow-y-auto">
         <div className="p-4 md:p-6 font-bold text-slate-400 text-xs uppercase tracking-wider hidden md:block">
            Settings Menu
         </div>
         {tabs.map((tab) => {
           const Icon = tab.icon;
           const isActive = activeTab === tab.id;
           return (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-3.5 text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal ${
                 isActive 
                   ? 'bg-white md:bg-white text-primary-700 border-b-2 md:border-b-0 md:border-r-2 border-primary-500' 
                   : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
               }`}
             >
               <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
               {tab.label}
             </button>
           );
         })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
         {renderContent()}

         {/* Floating Save Bar */}
         {hasChanges && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4">
               <span className="text-sm font-medium">You have unsaved changes</span>
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => {
                     setSettings(SettingsService.getSettings()); // Reset
                     setHasChanges(false);
                   }}
                   className="text-xs hover:text-slate-300 px-2"
                 >
                   Discard
                 </button>
                 <button 
                   onClick={saveSettings}
                   className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1"
                 >
                   <Save className="w-3 h-3" />
                   Save Changes
                 </button>
               </div>
            </div>
         )}

         {showSaveSuccess && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
               <Activity className="w-4 h-4" />
               <span className="text-sm font-bold">Settings Saved Successfully!</span>
            </div>
         )}
      </div>
    </div>
  );
};

export default SettingsView;
