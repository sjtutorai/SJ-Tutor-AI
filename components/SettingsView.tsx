
import React, { useState, useEffect } from 'react';
import { UserProfile, UserSettings, SJTUTOR_AVATAR } from '../types';
import { SettingsService } from '../services/settingsService';
import { auth } from '../firebaseConfig';
import { sendPasswordResetEmail, verifyBeforeUpdateEmail } from 'firebase/auth';
import { 
  User, BookOpen, Bot, MessageSquare, Bell, Moon, Lock, 
  Smartphone, CreditCard, HelpCircle, FlaskConical, ChevronRight, ChevronDown, ChevronUp,
  Save, LogOut, Trash2, Globe, Shield, Activity, Eye, Type, Palette, Monitor, Zap,
  Volume2, Terminal, Crown, Check, AlertTriangle, Clock, Mail
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
           // This triggers the security requirement: Verify new email + Notify old email
           await verifyBeforeUpdateEmail(user, newEmail);
           alert(`Verification email sent to ${newEmail}. Please verify it to complete the update. For security, a notification has also been sent to your current email.`);
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

  // ... (Keep existing FAQs and Terms) ...
  const faqs = [
    { q: "What is SJ Tutor AI?", a: "SJ Tutor AI is an AI-powered learning app that helps students understand concepts, solve doubts, and improve learning using smart artificial intelligence." },
    { q: "Who can use SJ Tutor AI?", a: "SJ Tutor AI is designed for students, learners, and anyone who wants academic support. Younger users should use the app with parent or guardian guidance." },
    { q: "Is SJ Tutor AI free to use?", a: "SJ Tutor AI offers free features, and some advanced features may require a subscription. You can view your current plan in Settings → Subscription." },
    { q: "Can SJ Tutor AI replace a teacher?", a: "No. SJ Tutor AI is a learning support tool, not a replacement for teachers, schools, or textbooks. It helps explain concepts and clear doubts, but human guidance is still important." },
    { q: "Are AI answers always correct?", a: "AI responses are generated automatically and may not always be 100% accurate. Students should verify important information from trusted sources." },
    { q: "Is my data safe in SJ Tutor AI?", a: "Yes. We take user privacy seriously. Data is securely stored, communication is encrypted, personal data is not sold, and users can control or delete their data." },
    { q: "Does SJ Tutor AI store my chat messages?", a: "Chat messages may be stored to improve AI responses and remember user preferences (if enabled). You can clear chat history or turn off AI memory anytime in Settings → Privacy." },
    { q: "Can I delete my account?", a: "Yes. You can permanently delete your account from Settings → Account → Delete Account. All associated data will be removed." },
    { q: "Does SJ Tutor AI show ads?", a: "SJ Tutor AI does not show targeted or inappropriate ads, especially for students." },
    { q: "Can I use SJ Tutor AI for exams or homework?", a: "SJ Tutor AI can help you understand concepts, but it should not be used for cheating or violating school or exam rules." },
    { q: "What subjects does SJ Tutor AI support?", a: "SJ Tutor AI supports multiple subjects such as Math, Science, Coding, General knowledge, and AI & technology. Available subjects may expand over time." },
    { q: "Can I change the AI tutor style?", a: "Yes. You can change the Tutor personality, Explanation style, and Answer format in Settings → AI Tutor Settings." },
    { q: "Is SJ Tutor AI available offline?", a: "Some features may work offline, but AI chat requires an internet connection." },
    { q: "How do I report a problem or bug?", a: "You can report issues via Settings → Help & Support or email us at support@sjtutorai.com" },
    { q: "How do I contact SJ Tutor AI support?", a: "Email: support@sjtutorai.com or In App: Settings → Help & Support" },
    { q: "Will SJ Tutor AI get new features?", a: "Yes. We regularly improve the app by adding new features, better AI responses, and performance updates." },
    { q: "Can parents monitor student usage?", a: "Currently, parental monitoring is limited. Future updates may include parental controls." },
    { q: "What happens if Terms or Privacy Policy change?", a: "Users will be notified of major updates. Continued use of the app means acceptance of updated policies." },
  ];

  const terms = [
    { title: "1. About SJ Tutor AI", content: "SJ Tutor AI is an AI-powered learning application designed to help students with studying, understanding concepts, and improving learning outcomes using artificial intelligence. The app is intended for educational purposes only." },
    { title: "2. User Eligibility", content: "SJ Tutor AI is intended for students and learners. If you are under the age required by your local laws, you should use the app with parent or guardian guidance. You are responsible for providing accurate account information." },
    { title: "3. Account Responsibility", content: "You are responsible for maintaining the confidentiality of your account. Do not share your login credentials with others. You agree to notify us if you suspect unauthorized access to your account." },
    { title: "4. Acceptable Use", content: "You agree to use SJ Tutor AI responsibly. You must NOT: Use the app for illegal activities; Share harmful, abusive, or inappropriate content; Attempt to misuse, hack, or disrupt the app; Use the AI to cheat in exams or violate school rules; Impersonate others or provide false information. We reserve the right to suspend or terminate accounts that violate these rules." },
    { title: "5. AI-Generated Content Disclaimer", content: "Responses are generated by AI and may not always be perfect. SJ Tutor AI does not replace teachers, professionals, or official textbooks. Users should verify important academic or factual information independently. The app is not responsible for decisions made solely based on AI responses." },
    { title: "6. Learning & Academic Responsibility", content: "The app is designed to support learning, not guarantee results. Academic success depends on individual effort and usage. SJ Tutor AI is not responsible for exam scores or academic outcomes." },
    { title: "7. Privacy & Data Protection", content: "Your privacy is important to us. Data is handled according to our Privacy Policy. Users can manage, download, or delete their data. Chat history and AI memory controls are provided. We do not sell personal data. Please review the Privacy Policy for full details." },
    { title: "8. Intellectual Property", content: "All app content, branding, design, and AI systems belong to SJ Tutor AI. You may not copy, modify, distribute, or reverse engineer any part of the app without permission." },
    { title: "9. Service Availability", content: "We strive to keep the app available at all times, but uninterrupted service is not guaranteed. Features may be updated, modified, or removed to improve the app. Temporary downtime may occur for maintenance or updates." },
    { title: "10. Third-Party Services", content: "SJ Tutor AI may use third-party services for Authentication, Analytics, Cloud storage, and Payments. These services follow their own terms and privacy policies." },
    { title: "11. Termination of Use", content: "We reserve the right to Suspend or terminate accounts that violate these terms, Remove content that breaks rules, and Restrict access to protect users and the platform. Users may delete their account at any time." },
    { title: "12. Limitation of Liability", content: "SJ Tutor AI is provided 'as is'. We are not responsible for Incorrect AI responses, Academic or personal decisions made using the app, or Data loss caused by user actions or external factors." },
    { title: "13. Changes to Terms", content: "These Terms may be updated from time to time. Users will be notified of significant changes. Continued use of the app means acceptance of updated terms." },
    { title: "14. Contact Us", content: "If you have questions about these Terms: Email: support@sjtutorai.com" },
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

              <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Answer Format</label>
                 <select
                   value={settings.aiTutor.answerFormat}
                   onChange={(e) => handleSettingChange('aiTutor', 'answerFormat', e.target.value)}
                   className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 >
                   <option value="Text Only">Text Only</option>
                   <option value="Text + Examples">Text + Examples</option>
                   <option value="Text + Code">Text + Code</option>
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
                   <span className="text-xs text-slate-400">Remember previous chats for better context</span>
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
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Voice Output</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.chat.voiceOutput} onChange={(e) => handleSettingChange('chat', 'voiceOutput', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><Terminal className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Show Typing Indicator</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.chat.typingIndicator} onChange={(e) => handleSettingChange('chat', 'typingIndicator', e.target.checked)} className="sr-only peer" />
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
                {[
                  { id: 'studyReminders', label: 'Daily Study Reminders', desc: 'Get reminded to hit your daily goals.' },
                  { id: 'examAlerts', label: 'Exam & Test Alerts', desc: 'Notifications for upcoming scheduled exams.' },
                  { id: 'aiTips', label: 'AI Study Tips', desc: 'Receive personalized tips from your AI tutor.' },
                  { id: 'push', label: 'Push Notifications', desc: 'Enable notifications on this device.' },
                ].map((item) => (
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
             
             <div className="space-y-6">
                {/* Theme Section */}
                <div className="space-y-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                   <div className="flex justify-between items-start">
                      <div>
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1">
                            <Moon className="w-4 h-4" />
                            App Theme
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Choose your preferred visual mode.</p>
                      </div>
                   </div>
                   
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
                            {t === 'Light' ? (
                                <div className="w-8 h-8 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center">
                                    <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                                </div>
                            ) : t === 'Dark' ? (
                                <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center shadow-sm border border-slate-700">
                                    <div className="w-4 h-4 bg-slate-700 rounded-full"></div>
                                </div>
                            ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-white to-slate-900 rounded-full border border-slate-200 flex items-center justify-center shadow-sm">
                                    <Monitor className="w-4 h-4 text-slate-500 mix-blend-difference" />
                                </div>
                            )}
                            <span className="text-sm font-medium">{t} Mode</span>
                         </button>
                      ))}
                   </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Brand Color */}
                    <div className="space-y-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div>
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1">
                                <Palette className="w-4 h-4" />
                                Accent Color
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Personalize buttons and highlights.</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {[
                                { name: 'Gold', color: '#D4AF37' },
                                { name: 'Blue', color: '#3b82f6' },
                                { name: 'Emerald', color: '#10b981' },
                                { name: 'Violet', color: '#8b5cf6' },
                                { name: 'Rose', color: '#f43f5e' },
                            ].map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => handleSettingChange('appearance', 'primaryColor', color.name)}
                                    className={`relative w-10 h-10 rounded-full transition-all flex items-center justify-center shadow-sm hover:scale-110 ${
                                        (settings.appearance.primaryColor || 'Gold') === color.name
                                        ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                                        : 'hover:ring-2 hover:ring-offset-1 hover:ring-slate-200 dark:hover:ring-slate-700'
                                    }`}
                                    style={{ backgroundColor: color.color }}
                                    title={color.name}
                                    aria-label={`Select ${color.name} color`}
                                >
                                    {(settings.appearance.primaryColor || 'Gold') === color.name && (
                                        <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Font Style */}
                    <div className="space-y-4 p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div>
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-1">
                                <Type className="w-4 h-4" />
                                Typography
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Select the primary font family.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {['Inter', 'Roboto', 'Open Sans'].map((font) => (
                                <label 
                                    key={font}
                                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                        (settings.appearance.fontFamily || 'Inter') === font
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-400'
                                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    <span className="text-sm font-medium" style={{ fontFamily: font }}>{font}</span>
                                    <input 
                                        type="radio" 
                                        name="fontFamily"
                                        value={font}
                                        checked={(settings.appearance.fontFamily || 'Inter') === font}
                                        onChange={(e) => handleSettingChange('appearance', 'fontFamily', e.target.value)}
                                        className="w-4 h-4 accent-primary-600"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Animation Toggle */}
                <div className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                   <div className="flex items-start gap-3">
                       <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                          <Zap className="w-5 h-5" />
                       </div>
                       <div>
                           <span className="font-bold text-slate-800 dark:text-white block text-sm">UI Animations</span>
                           <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 max-w-xs">Enable subtle transitions and effects across the app for a smoother experience.</span>
                       </div>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.appearance.animations} 
                        onChange={(e) => handleSettingChange('appearance', 'animations', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                   </label>
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
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Two-Factor Authentication</span>
                      <span className="text-xs text-slate-400">Add an extra layer of security</span>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.privacy.twoFactor} onChange={(e) => handleSettingChange('privacy', 'twoFactor', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
               </div>

               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"><Lock className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">App Lock</span>
                      <span className="text-xs text-slate-400">Require biometrics to open app</span>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.privacy.appLock} onChange={(e) => handleSettingChange('privacy', 'appLock', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
               </div>

               <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                 <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Data Management</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                       <MessageSquare className="w-4 h-4" /> Clear Chat History
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                       <FlaskConical className="w-4 h-4" /> Clear Learning Data
                    </button>
                 </div>
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
                   <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Up to date</span>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-slate-100 dark:border-slate-700">
                   <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Cache Size</p>
                      <p className="text-xs text-slate-400">~24 MB used</p>
                   </div>
                   <button className="text-xs font-bold text-primary-600 hover:underline">Clear Cache</button>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
                   <p className="font-bold mb-1 flex items-center gap-2"><Smartphone className="w-3 h-3" /> Device Info</p>
                   <p>Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Safari/Other'}</p>
                   <p>Platform: Web Application</p>
                   <p>Resolution: {window.innerWidth}x{window.innerHeight}</p>
                </div>
             </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Subscription & Credits</h3>
             
             {/* Current Plan Card */}
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Crown className="w-32 h-32 rotate-12" />
                </div>
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm"><Crown className="w-5 h-5 text-amber-400" /></div>
                      <span className="font-bold text-amber-400 tracking-wider text-sm uppercase">Current Plan</span>
                   </div>
                   <h2 className="text-3xl font-bold mb-1">{userProfile.planType || 'Free Plan'}</h2>
                   <p className="text-slate-400 text-sm mb-6">{userProfile.planType === 'Free' ? 'Upgrade to unlock premium features.' : 'You are a premium member.'}</p>
                   
                   <div className="flex items-center justify-between bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                      <div>
                         <p className="text-xs text-slate-400 mb-1">Available Credits</p>
                         <p className="text-2xl font-bold flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                            {userProfile.credits}
                         </p>
                      </div>
                      <button 
                         onClick={onOpenPremium}
                         className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-sm transition-colors"
                      >
                         Top Up
                      </button>
                   </div>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="font-bold text-slate-800 dark:text-white mb-4">Transaction History</h4>
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl">
                   <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                   <p>No recent transactions</p>
                </div>
             </div>
          </div>
        );

      case 'help':
        return (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Help Center</h3>
             
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setHelpTab('FAQ')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${helpTab === 'FAQ' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  FAQ
                </button>
                <button
                  onClick={() => setHelpTab('TERMS')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${helpTab === 'TERMS' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                  Terms & Conditions
                </button>
             </div>

             <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-[500px] overflow-y-auto custom-scrollbar">
                {helpTab === 'FAQ' && (
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Frequently Asked Questions</h4>
                    {faqs.map((item, idx) => (
                      <div key={idx} className="border-b border-slate-100 dark:border-slate-700 last:border-0 pb-4 last:pb-0">
                        <button 
                          onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                          className="flex justify-between items-start w-full text-left font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          <span className="pr-4">{item.q}</span>
                          {openFaqIndex === idx ? <ChevronUp className="w-4 h-4 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 mt-1" />}
                        </button>
                        {openFaqIndex === idx && (
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed animate-in fade-in slide-in-from-top-1">
                            {item.a}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {helpTab === 'TERMS' && (
                  <div className="space-y-6">
                    <div className="text-center border-b border-slate-100 dark:border-slate-700 pb-4">
                       <h4 className="font-bold text-lg text-slate-800 dark:text-white">Terms and Conditions</h4>
                       <p className="text-xs text-slate-400 mt-1">Last Updated: January 2026</p>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                       <p className="text-xs font-medium bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 mb-6">
                         By accessing or using SJ Tutor AI, you agree to these Terms and Conditions. If you do not agree, please do not use the app.
                       </p>
                       
                       {terms.map((item, idx) => (
                         <div key={idx} className="mb-6">
                           <h5 className="font-bold text-slate-800 dark:text-white mb-2 text-base">{item.title}</h5>
                           <p className="text-sm leading-relaxed whitespace-pre-line">{item.content}</p>
                         </div>
                       ))}
                       
                       <div className="mt-8 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                          <h5 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2 mb-2">
                             <Check className="w-4 h-4" /> Simple Summary
                          </h5>
                          <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1 list-disc list-inside">
                             <li>Use SJ Tutor AI responsibly.</li>
                             <li>Learning support, not cheating.</li>
                             <li>Your data, your control.</li>
                             <li>Respect the rules, enjoy learning.</li>
                          </ul>
                       </div>
                    </div>
                  </div>
                )}
             </div>
             
             <div className="text-center text-xs text-slate-400 mt-4">
                <p>Have more questions? Contact us at <a href="mailto:support@sjtutorai.com" className="text-primary-600 hover:underline">support@sjtutorai.com</a></p>
             </div>
          </div>
        );

      default:
        return (
           <div className="text-center py-20 text-slate-400 dark:text-slate-500">
             <p>Select a setting category from the menu.</p>
           </div>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-120px)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
      {/* Sidebar / Tabs */}
      <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 flex md:flex-col overflow-x-auto md:overflow-y-auto">
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
                   ? 'bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-400 border-b-2 md:border-b-0 md:border-r-2 border-primary-500' 
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
               }`}
             >
               <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
               {tab.label}
             </button>
           );
         })}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-white dark:bg-slate-900">
         {renderContent()}

         {/* Floating Save Bar */}
         {hasChanges && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-4 z-20">
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
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-20">
               <Activity className="w-4 h-4" />
               <span className="text-sm font-bold">Settings Saved Successfully!</span>
            </div>
         )}
      </div>
    </div>
  );
};

export default SettingsView;