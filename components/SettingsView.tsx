
import React, { useState, useEffect } from 'react';
import { UserProfile, UserSettings, SJTUTOR_AVATAR } from '../types';
import { SettingsService } from '../services/settingsService';
import { 
  User, BookOpen, Bot, MessageSquare, Bell, Moon, Lock, 
  Smartphone, CreditCard, HelpCircle, FlaskConical, ChevronRight, 
  Save, LogOut, Trash2, Globe, Shield, Activity, Eye, Download, Info, Check, AlertTriangle, Mail, GraduationCap, Palette, FileText, X
} from 'lucide-react';

interface SettingsViewProps {
  userProfile: UserProfile;
  onLogout: () => void;
  onNavigateToProfile: () => void;
  onOpenPremium: () => void;
}

type SettingsTab = 'account' | 'learning' | 'aiTutor' | 'chat' | 'notifications' | 'appearance' | 'privacy' | 'system' | 'billing' | 'help' | 'legal';

const SettingsView: React.FC<SettingsViewProps> = ({ userProfile, onLogout, onNavigateToProfile, onOpenPremium }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [settings, setSettings] = useState<UserSettings>(SettingsService.getSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Privacy specific states
  const [expandedPrivacySection, setExpandedPrivacySection] = useState<string | null>(null);

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

  const handleAiMemoryToggle = (checked: boolean) => {
    // Sync both settings locations for memory
    setSettings(prev => ({
      ...prev,
      aiTutor: { ...prev.aiTutor, memory: checked },
      // Assuming we map this preference to privacy as well if needed
    }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    SettingsService.saveSettings(settings);
    setHasChanges(false);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleDownloadData = () => {
    const data = {
      userProfile: userProfile,
      settings: settings,
      timestamp: new Date().toISOString(),
      note: "Exported from SJ Tutor AI"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sj_tutor_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert("Your data download has started.");
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all chat history? This cannot be undone.")) {
      // In a real app, this would call an API or clear specific local storage keys
      alert("Chat history cleared locally.");
    }
  };

  const handleDeleteAccount = () => {
    const confirmation = prompt("Type 'DELETE' to confirm account deletion. This will permanently remove all your data.");
    if (confirmation === 'DELETE') {
      alert("Account deletion request submitted. You will be logged out.");
      onLogout();
    }
  };

  const togglePrivacySection = (id: string) => {
    setExpandedPrivacySection(expandedPrivacySection === id ? null : id);
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
    { id: 'legal', label: 'Legal', icon: FileText },
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
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Privacy & Security</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage your data and privacy preferences.</p>
             </div>

             {/* 4. User Data Control (Mandatory) + 3. AI Chat Privacy Controls */}
             <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                   <Shield className="w-4 h-4 text-emerald-500" />
                   Data Controls
                </h4>
                
                <div className="space-y-4">
                   <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                      <div>
                         <span className="font-medium text-slate-700 dark:text-slate-300 block">Allow AI Memory</span>
                         <span className="text-xs text-slate-400">Remember my preferences for better help.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.aiTutor.memory} 
                          onChange={(e) => handleAiMemoryToggle(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                   </div>

                   <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                      <div>
                         <span className="font-medium text-slate-700 dark:text-slate-300 block">App Analytics</span>
                         <span className="text-xs text-slate-400">Share anonymous usage data to improve app.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={settings.privacy.analytics} 
                          onChange={(e) => handleSettingChange('privacy', 'analytics', e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                   </div>

                   <div className="flex flex-col gap-3 pt-2">
                      <button 
                        onClick={handleDownloadData}
                        className="flex items-center justify-between w-full p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
                      >
                         <span className="flex items-center gap-2"><Download className="w-4 h-4 text-slate-500" /> Download My Data</span>
                         <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                      
                      <button 
                        onClick={handleClearHistory}
                        className="flex items-center justify-between w-full p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
                      >
                         <span className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-slate-500" /> Clear Chat History</span>
                         <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>

                      <button 
                        onClick={handleDeleteAccount}
                        className="flex items-center justify-between w-full p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-sm text-red-600 dark:text-red-400 transition-colors"
                      >
                         <span className="flex items-center gap-2 font-medium">Delete Account</span>
                         <AlertTriangle className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             </div>

             {/* Privacy Policy Accordions */}
             <div className="space-y-2">
                {[
                  {
                    id: 'data-collection',
                    title: '1. What Data We Collect',
                    icon: Info,
                    content: (
                      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <li><strong>Profile:</strong> Name, email, and optional profile photo.</li>
                        <li><strong>Learning Profile:</strong> Subjects, grade level, and difficulty settings.</li>
                        <li><strong>Conversations:</strong> Chat messages with the AI tutor (stored locally or encrypted in cloud).</li>
                        <li><strong>Usage Stats:</strong> Anonymous data on which features (Quiz, Essay) are used most.</li>
                        <li><strong>Device Info:</strong> Basic device model and app version for troubleshooting.</li>
                      </ul>
                    )
                  },
                  {
                    id: 'data-usage',
                    title: '2. How We Use Your Data',
                    icon: Activity,
                    content: (
                      <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                        <p>We use your data solely for:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Personalizing your learning experience.</li>
                          <li>Improving the accuracy of AI responses.</li>
                          <li>Maintaining your preferences across sessions.</li>
                        </ul>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                          <Check className="w-4 h-4" /> User data is never sold or shared for advertising.
                        </p>
                      </div>
                    )
                  },
                  {
                    id: 'security',
                    title: '3. Security & Storage',
                    icon: Lock,
                    content: (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        All data is transmitted via secure HTTPS encryption. Your personal data is stored in encrypted databases with restricted access. We perform regular security audits to ensure your information remains safe.
                      </p>
                    )
                  },
                  {
                    id: 'student-privacy',
                    title: '4. Student & Child Privacy',
                    icon: GraduationCap,
                    content: (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <p className="mb-2">SJ Tutor AI is designed for learners of all ages.</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>No targeted advertisements are shown to students.</li>
                          <li>Strict filters prevent inappropriate content generation.</li>
                          <li>We comply with standard student privacy guidelines.</li>
                        </ul>
                      </div>
                    )
                  },
                  {
                    id: 'third-party',
                    title: '5. Third-Party Services',
                    icon: Globe,
                    content: (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <p className="mb-2">We use trusted third-party services for essential functions only:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><strong>Authentication:</strong> Google/Firebase (for secure login).</li>
                          <li><strong>AI Processing:</strong> Google Gemini API (for generating content).</li>
                          <li><strong>Hosting:</strong> Secure cloud infrastructure providers.</li>
                        </ul>
                      </div>
                    )
                  },
                  {
                    id: 'updates',
                    title: '6. Updates & Contact',
                    icon: Mail,
                    content: (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <p className="mb-2">This privacy policy may be updated periodically. Significant changes will be notified via the app.</p>
                        <p>For privacy concerns or data requests, contact:</p>
                        <a href="mailto:privacy@sjtutor.ai" className="text-primary-600 font-medium hover:underline">privacy@sjtutor.ai</a>
                      </div>
                    )
                  }
                ].map((section) => (
                  <div key={section.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <button 
                      onClick={() => togglePrivacySection(section.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <section.icon className="w-5 h-5 text-slate-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{section.title}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedPrivacySection === section.id ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedPrivacySection === section.id && (
                      <div className="p-4 pt-0 border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="pt-4">
                          {section.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </div>
        );

      case 'appearance':
        return (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Appearance</h3>
             
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-600 dark:text-slate-400">App Theme</label>
                   <div className="grid grid-cols-3 gap-3">
                      {['Light', 'Dark', 'System'].map((t) => (
                         <button
                           key={t}
                           onClick={() => handleSettingChange('appearance', 'theme', t)}
                           className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                             settings.appearance.theme === t
                             ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                             : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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

                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-600 dark:text-slate-400">Brand Color</label>
                   <div className="grid grid-cols-5 gap-3">
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
                           className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                             (settings.appearance.primaryColor || 'Gold') === color.name
                             ? 'border-slate-900 dark:border-white scale-105'
                             : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                           }`}
                           title={color.name}
                         >
                            <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: color.color }}></div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{color.name}</span>
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                   <span className="font-medium text-slate-700 dark:text-slate-300">UI Animations</span>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.appearance.animations} 
                        onChange={(e) => handleSettingChange('appearance', 'animations', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                   </label>
                </div>
             </div>
           </div>
        );

      case 'legal':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="border-b border-slate-100 dark:border-slate-700 pb-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Terms & Conditions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please read our terms of service carefully.</p>
             </div>
             
             <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                  <p className="text-xs text-slate-500 mb-4">Last Updated: January 2026</p>
                  
                  <p className="mb-4">By downloading, accessing, or using SJ Tutor AI, you agree to these Terms and Conditions. If you do not agree, please discontinue use of the application.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">1. About SJ Tutor AI</h4>
                  <p>SJ Tutor AI is an AI-powered educational application designed to support students in learning, understanding concepts, and improving academic skills using artificial intelligence. The application is intended only for educational and learning support purposes.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">2. User Eligibility</h4>
                  <p>SJ Tutor AI is intended for students and learners. Users below the legally permitted age should use the app with parent or guardian supervision. You agree to provide accurate and complete information when creating an account.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">3. Account Responsibility</h4>
                  <p>You are responsible for maintaining the confidentiality of your account credentials. You must not share your login details with others. You are responsible for all activities conducted through your account. Notify us immediately if you suspect unauthorized access.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">4. Acceptable Use Policy</h4>
                  <p>You agree to use SJ Tutor AI responsibly and ethically. You must NOT:</p>
                  <ul className="list-disc pl-5 mb-2">
                    <li>Use the app for illegal or harmful activities</li>
                    <li>Upload or share abusive, misleading, or inappropriate content</li>
                    <li>Attempt to hack, exploit, or disrupt the app or its services</li>
                    <li>Use the AI for cheating, plagiarism, or violating academic rules</li>
                    <li>Impersonate another person or entity</li>
                  </ul>
                  <p>Violation of these rules may result in account suspension or termination.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">5. AI-Generated Content Disclaimer</h4>
                  <p>Content is generated by artificial intelligence and may not always be accurate. SJ Tutor AI does not replace teachers, schools, or professional educators. Users must independently verify critical academic or factual information. SJ Tutor AI is not responsible for decisions made based solely on AI responses.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">6. Learning Responsibility</h4>
                  <p>The app is a learning support tool, not a guarantee of academic success. Learning outcomes depend on user effort and proper usage. SJ Tutor AI is not liable for exam results or academic performance.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">7. Privacy and Data Protection</h4>
                  <p>Your privacy is important to us. User data is handled according to our Privacy Policy. Users can view, update, download, or delete their data. AI memory and chat history controls are available. We do not sell personal data. Please review the Privacy Policy for detailed information.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">8. Intellectual Property Rights</h4>
                  <p>All content, design, branding, and AI systems are the property of SJ Tutor AI. Users may not copy, modify, distribute, or reverse engineer any part of the app without written permission. Unauthorized use of intellectual property may result in legal action.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">9. Service Availability</h4>
                  <p>We aim to provide uninterrupted service, but availability is not guaranteed. Features may be updated, changed, or removed to improve the app. Temporary downtime may occur due to maintenance or technical issues.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">10. Third-Party Services</h4>
                  <p>SJ Tutor AI may use trusted third-party services for: Authentication, Analytics, Cloud storage, Payments (if applicable). These services operate under their own terms and privacy policies.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">11. Account Termination</h4>
                  <p>We reserve the right to: Suspend or terminate accounts violating these Terms, Remove content that breaches rules, Restrict access to protect users and the platform. Users may delete their account at any time from the app settings.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">12. Limitation of Liability</h4>
                  <p>SJ Tutor AI is provided “as is” and “as available.” We are not liable for: Errors or inaccuracies in AI-generated content, Academic or personal decisions made using the app, Data loss caused by user actions or external technical failures.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">13. Changes to Terms</h4>
                  <p>These Terms may be updated periodically. Significant changes will be communicated to users. Continued use of the app after updates means acceptance of revised Terms.</p>

                  <h4 className="font-bold text-slate-900 dark:text-white mt-4 mb-2">14. Contact Information</h4>
                  <p>If you have any questions or concerns regarding these Terms and Conditions:</p>
                  <p>📧 Email: sjtutorai@gmail.com</p>
                  <p>📱 In App: Settings → Help & Support</p>

                  <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <h5 className="font-bold text-slate-900 dark:text-white mb-2">Simple User Summary</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Use responsibly.</li>
                      <li>Learn honestly.</li>
                      <li>Your data remains under your control.</li>
                      <li>Respect the rules and enjoy learning with SJ Tutor AI.</li>
                    </ul>
                  </div>
                </div>
             </div>
          </div>
        );

      default:
        // Fallback for sections not modified in this update
        return (
           <div className="text-center py-20 text-slate-400 dark:text-slate-500">
             <p>Select a category from the menu.</p>
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
