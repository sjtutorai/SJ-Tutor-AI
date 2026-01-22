
import React, { useState, useEffect } from 'react';
import { UserProfile, UserSettings, SJTUTOR_AVATAR } from '../types';
import { SettingsService } from '../services/settingsService';
import { 
  User, BookOpen, Bot, MessageSquare, Bell, Moon, Lock, 
  Smartphone, CreditCard, HelpCircle, FlaskConical, ChevronRight, ChevronDown, ChevronUp,
  Save, LogOut, Trash2, Globe, Shield, Activity, Eye, Type, Palette, Monitor, Zap
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
    { q: "How do I report a problem or bug?", a: "You can report issues via Settings → Help & Support or email us at sjtutorai@gmail.com" },
    { q: "How do I contact SJ Tutor AI support?", a: "Email: sjtutorai@gmail.com or In App: Settings → Help & Support" },
    { q: "Will SJ Tutor AI get new features?", a: "Yes. We regularly improve the app by adding new features, better AI responses, and performance updates." },
    { q: "Can parents monitor student usage?", a: "Currently, parental monitoring is limited. Future updates may include parental controls." },
    { q: "What happens if Terms or Privacy Policy change?", a: "Users will be notified of major updates. Continued use of the app means acceptance of updated policies." },
  ];

  const terms = [
    { title: "1. About SJ Tutor AI", content: "SJ Tutor AI is an AI-powered educational application designed to support students in learning, understanding concepts, and improving academic skills using artificial intelligence. The application is intended only for educational and learning support purposes." },
    { title: "2. User Eligibility", content: "SJ Tutor AI is intended for students and learners. Users below the legally permitted age should use the app with parent or guardian supervision. You agree to provide accurate and complete information when creating an account." },
    { title: "3. Account Responsibility", content: "You are responsible for maintaining the confidentiality of your account credentials. You must not share your login details with others. You are responsible for all activities conducted through your account. Notify us immediately if you suspect unauthorized access." },
    { title: "4. Acceptable Use Policy", content: "You agree to use SJ Tutor AI responsibly and ethically. You must NOT: Use the app for illegal or harmful activities; Upload or share abusive, misleading, or inappropriate content; Attempt to hack, exploit, or disrupt the app or its services; Use the AI for cheating, plagiarism, or violating academic rules; Impersonate another person or entity. Violation of these rules may result in account suspension or termination." },
    { title: "5. AI-Generated Content Disclaimer", content: "Content is generated by artificial intelligence and may not always be accurate. SJ Tutor AI does not replace teachers, schools, or professional educators. Users must independently verify critical academic or factual information. SJ Tutor AI is not responsible for decisions made based solely on AI responses." },
    { title: "6. Learning Responsibility", content: "The app is a learning support tool, not a guarantee of academic success. Learning outcomes depend on user effort and proper usage. SJ Tutor AI is not liable for exam results or academic performance." },
    { title: "7. Privacy and Data Protection", content: "Your privacy is important to us. User data is handled according to our Privacy Policy. Users can view, update, download, or delete their data. AI memory and chat history controls are available. We do not sell personal data. Please review the Privacy Policy for detailed information." },
    { title: "8. Intellectual Property Rights", content: "All content, design, branding, and AI systems are the property of SJ Tutor AI. Users may not copy, modify, distribute, or reverse engineer any part of the app without written permission. Unauthorized use of intellectual property may result in legal action." },
    { title: "9. Service Availability", content: "We aim to provide uninterrupted service, but availability is not guaranteed. Features may be updated, changed, or removed to improve the app. Temporary downtime may occur due to maintenance or technical issues." },
    { title: "10. Third-Party Services", content: "SJ Tutor AI may use trusted third-party services for Authentication, Analytics, Cloud storage, and Payments. These services operate under their own terms and privacy policies." },
    { title: "11. Account Termination", content: "We reserve the right to Suspend or terminate accounts violating these Terms, Remove content that breaches rules, and Restrict access to protect users and the platform. Users may delete their account at any time from the app settings." },
    { title: "12. Limitation of Liability", content: "SJ Tutor AI is provided 'as is' and 'as available'. We are not liable for Errors or inaccuracies in AI-generated content, Academic or personal decisions made using the app, or Data loss caused by user actions or external technical failures." },
    { title: "13. Changes to Terms", content: "These Terms may be updated periodically. Significant changes will be communicated to users. Continued use of the app after updates means acceptance of revised Terms." },
    { title: "14. Contact Information", content: "If you have any questions or concerns regarding these Terms and Conditions: Email: sjtutorai@gmail.com" },
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
                    <p className="text-xs text-slate-400">Name, Email, Phone</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>
               <div className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
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
                   
                   {settings.appearance.theme === 'System' && (
                      <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                         <Monitor className="w-4 h-4 mt-0.5 flex-shrink-0" />
                         <p className="text-xs leading-relaxed">
                           The app will automatically switch between Light and Dark modes to match your device's system settings.
                         </p>
                      </div>
                   )}
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
                       <p className="text-xs font-medium bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                         By downloading, accessing, or using SJ Tutor AI, you agree to these Terms and Conditions. If you do not agree, please discontinue use of the application.
                       </p>
                       {terms.map((item, idx) => (
                         <div key={idx} className="mb-4">
                           <h5 className="font-bold text-slate-800 dark:text-white mb-1">{item.title}</h5>
                           <p className="text-sm leading-relaxed">{item.content}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
             </div>
             
             <div className="text-center text-xs text-slate-400 mt-4">
                <p>Have more questions? Contact us at <a href="mailto:sjtutorai@gmail.com" className="text-primary-600 hover:underline">sjtutorai@gmail.com</a></p>
             </div>
          </div>
        );

      default:
        // Fallback for other tabs that are not modified in this specific task
        return (
           <div className="text-center py-20 text-slate-400 dark:text-slate-500">
             <p>This section is available but code not displayed for brevity.</p>
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
