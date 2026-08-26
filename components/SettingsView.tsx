
import React, { useState, useEffect } from 'react';
import { UserProfile, UserSettings, SJTUTOR_AVATAR } from '../types';
import { SettingsService } from '../services/settingsService';
import { calculateTrialInfo } from './TrialTimerWidget';
import { calculateProfileCompletion } from '../utils/profileUtils';
import { auth } from '../firebaseConfig';
import { verifyBeforeUpdateEmail } from 'firebase/auth';
import { 
  User, BookOpen, Bot, MessageSquare, Bell, Moon, Lock, 
  Smartphone, CreditCard, HelpCircle, FlaskConical, ChevronRight, ChevronDown, ChevronUp,
  Save, LogOut, Trash2, Shield, Activity, Type, Palette, Monitor, Zap,
  Volume2, Volume1, VolumeX, PhoneCall, Phone, Play, Square, AlertTriangle, CheckCircle2,
  Terminal, Crown, Check, Clock, FileText, Keyboard, Command, Sparkles, KeyRound, Fingerprint, ShieldCheck
} from 'lucide-react';
import { callAudio, RINGTONE_STYLES } from '../services/webrtcService';
import { NotificationService } from '../services/notificationService';
import { RingtoneStyle } from '../types';
import { SecurityPinSetupModal } from './SecurityPinSetupModal';
import { SecurityPinService } from '../services/securityPinService';
import { SUPPORTED_LANGUAGES } from '../services/languageService';

interface SettingsViewProps {
  userProfile: UserProfile;
  onLogout: () => void;
  onNavigateToProfile: () => void;
  onOpenPremium: () => void;
  onNavigateToLegal: (mode: 'PRIVACY' | 'TERMS') => void;
  onUpdateProfile?: (updatedProfile: UserProfile) => void;
  onOpenShortcuts?: () => void;
  onOpenDevices?: () => void;
  devicesCount?: number;
  initialTab?: SettingsTab;
  openPinSetupTab?: 'twostep' | 'pin';
}

type SettingsTab = 'account' | 'learning' | 'aiTutor' | 'chat' | 'calls' | 'notifications' | 'appearance' | 'privacy' | 'shortcuts' | 'system' | 'billing' | 'help';

const SettingsView: React.FC<SettingsViewProps> = (props) => {
  const { 
    userProfile, 
    onLogout, 
    onNavigateToProfile, 
    onOpenPremium,
    onNavigateToLegal,
    onUpdateProfile,
    onOpenDevices,
    devicesCount,
    initialTab,
    openPinSetupTab,
  } = props;
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'account');
  const [settings, setSettings] = useState<UserSettings>(() => {
    const s = SettingsService.getSettings();
    if (userProfile.grade) {
      s.learning.grade = userProfile.grade;
    }
    return s;
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showPinSetupModal, setShowPinSetupModal] = useState(!!openPinSetupTab);
  const [pinSetupTab, setPinSetupTab] = useState<'twostep' | 'pin'>(openPinSetupTab || 'twostep');
  const [isDisablingPin, setIsDisablingPin] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (openPinSetupTab) {
      setPinSetupTab(openPinSetupTab);
      setShowPinSetupModal(true);
    }
  }, [openPinSetupTab]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [playingRingtoneId, setPlayingRingtoneId] = useState<string | null>(null);
  const [previewingChime, setPreviewingChime] = useState<string | null>(null);

  // Stop any playing audio previews on unmount or tab change
  useEffect(() => {
    return () => {
      callAudio.stopAll();
    };
  }, []);

  const handlePreviewRingtone = (style: RingtoneStyle) => {
    if (playingRingtoneId === style) {
      callAudio.stopAll();
      setPlayingRingtoneId(null);
      return;
    }
    callAudio.stopAll();
    setPlayingRingtoneId(style);
    setPreviewingChime(null);
    callAudio.previewRingtone(style, settings.calls?.ringtoneVolume);
    setTimeout(() => {
      setPlayingRingtoneId((prev) => (prev === style ? null : prev));
    }, 2800);
  };

  const handlePreviewChime = (type: 'connected' | 'ended' | 'handRaise') => {
    callAudio.stopAll();
    setPlayingRingtoneId(null);
    setPreviewingChime(type);
    if (type === 'connected') {
      callAudio.playConnectedChime(settings.calls?.ringtoneVolume);
    } else if (type === 'ended') {
      callAudio.playEndedChime(settings.calls?.ringtoneVolume);
    } else if (type === 'handRaise') {
      callAudio.playHandRaisedChime(settings.calls?.ringtoneVolume);
    }
    setTimeout(() => {
      setPreviewingChime((prev) => (prev === type ? null : prev));
    }, 1200);
  };

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleClearChatHistory = () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('tutor_chat_') || k.startsWith('chat_') || k.includes('messages')) {
          localStorage.removeItem(k);
        }
      });
      showFeedback('Chat history cleared successfully! 🗑️');
    } catch (e) {
      console.error(e);
      showFeedback('Failed to clear chat history.');
    }
  };

  const handleClearLearningData = () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith('history_') || k.startsWith('sjtutor_notes_') || k.includes('quiz_score')) {
          localStorage.removeItem(k);
        }
      });
      showFeedback('Learning & quiz data cleared successfully! 🗑️');
    } catch (e) {
      console.error(e);
      showFeedback('Failed to clear learning data.');
    }
  };

  const handleClearCache = () => {
    try {
      localStorage.removeItem('sjtutor_groups_cache');
      localStorage.removeItem('sjtutor_active_group_id');
      localStorage.removeItem('sjtutor_autosave_quiz');
      showFeedback('App cache cleared successfully (~24 MB freed)! ⚡');
    } catch (e) {
      console.error(e);
      showFeedback('Failed to clear cache.');
    }
  };

  const handleConfirmDeleteAccount = () => {
    try {
      localStorage.clear();
      showFeedback('Account deleted. Logging out...');
      setTimeout(() => {
        setShowDeleteAccountModal(false);
        onLogout();
      }, 1000);
    } catch (e) {
      console.error(e);
      setShowDeleteAccountModal(false);
      onLogout();
    }
  };

  // Synchronize settings grade with userProfile grade
  useEffect(() => {
    if (userProfile.grade) {
      setSettings(prev => {
        if (prev.learning.grade !== userProfile.grade) {
          return {
            ...prev,
            learning: {
              ...prev.learning,
              grade: userProfile.grade
            }
          };
        }
        return prev;
      });
    }
  }, [userProfile.grade]);

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

    if (onUpdateProfile && settings.learning.grade && settings.learning.grade !== userProfile.grade) {
      onUpdateProfile({
        ...userProfile,
        grade: settings.learning.grade,
        language: settings.learning.language || userProfile.language,
      });
    } else if (onUpdateProfile && settings.learning.language && settings.learning.language !== userProfile.language) {
      onUpdateProfile({
        ...userProfile,
        language: settings.learning.language,
      });
    }
    
    // Trigger global event for theme update
    window.dispatchEvent(new Event('settings-changed'));
    
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
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
    { id: 'calls', label: 'Audio & Calls', icon: PhoneCall },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
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
               <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                 <img 
                   src={userProfile.photoURL || SJTUTOR_AVATAR} 
                   alt="Profile" 
                   className="w-full h-full object-cover" 
                   onError={(e) => {
                     if (e.currentTarget.src !== window.location.origin + '/logo.png') {
                       e.currentTarget.src = '/logo.png';
                     }
                   }}
                 />
               </div>
               <div className="flex-1">
                 <h4 className="font-bold text-slate-800 dark:text-white text-lg">{userProfile.displayName || 'Scholar'}</h4>
                 <p className="text-sm text-slate-500 dark:text-slate-400">{userProfile.institution}</p>
                 <div className="flex items-center gap-3 mt-1">
                   {(() => {
                     const trialInfo = calculateTrialInfo(userProfile, auth.currentUser?.uid);
                     const hasUnlimited = !trialInfo.isExpired;
                     return (
                       <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800" title={hasUnlimited ? "Unlimited Credits (Active Trial)" : "Your Credits"}>
                         <Zap className="w-3 h-3 text-amber-500" />
                         {hasUnlimited ? "Unlimited" : `${userProfile.credits} Credits`}
                       </span>
                     );
                   })()}
                   <button onClick={onNavigateToProfile} className="text-primary-600 dark:text-primary-400 text-sm font-semibold hover:underline">
                     Edit Profile Details
                   </button>
                 </div>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
               <div className="p-4 flex justify-between items-center hover:bg-white dark:hover:bg-slate-700/50 cursor-pointer" onClick={onNavigateToProfile}>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Personal Information</p>
                    <p className="text-xs text-slate-400">Name, Phone</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>

               <div className="p-4 flex justify-between items-center hover:bg-white dark:hover:bg-slate-700/50 cursor-pointer" onClick={handleEmailChange}>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Change Email</p>
                    <p className="text-xs text-slate-400">Update your registered email</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
               </div>

               {onOpenDevices && (
                 <div className="p-4 flex justify-between items-center hover:bg-white dark:hover:bg-slate-700/50 cursor-pointer" onClick={onOpenDevices}>
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">Logged-in Devices</p>
                      <p className="text-xs text-slate-400">View active login sessions, dates, and sign out</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 rounded-full border border-primary-200 dark:border-primary-800">
                        {devicesCount || 1} Active
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                 </div>
               )}
               
               <div className="p-4 flex justify-between items-center hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer group" onClick={onLogout}>
                  <div>
                    <p className="font-medium text-red-600 group-hover:text-red-700">Log Out</p>
                    <p className="text-xs text-red-400">Sign out of this device</p>
                  </div>
                  <LogOut className="w-4 h-4 text-red-400" />
               </div>
            </div>

            <div className="pt-6">
               <button 
                 onClick={() => setShowDeleteAccountModal(true)}
                 className="flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-700 transition-colors"
               >
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
                   className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Grade / Class</label>
                 <input 
                   type="text" 
                   value={settings.learning.grade}
                   onChange={(e) => handleSettingChange('learning', 'grade', e.target.value)}
                   className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Content Difficulty</label>
                 <select
                   value={settings.learning.difficulty}
                   onChange={(e) => handleSettingChange('learning', 'difficulty', e.target.value)}
                   className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                 >
                   <option value="Easy">Easy</option>
                   <option value="Medium">Medium</option>
                   <option value="Hard">Hard</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Primary Language</label>
                 <select 
                   value={settings.learning.language}
                   onChange={(e) => handleSettingChange('learning', 'language', e.target.value)}
                   className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
                 >
                   {SUPPORTED_LANGUAGES.map((lang) => (
                     <option key={lang} value={lang}>
                       {lang}
                     </option>
                   ))}
                 </select>
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
                   className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
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
                   className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
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
                    <div className="p-2 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-650 rounded-lg"><Save className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-save Chat History</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.chat.autoSave} onChange={(e) => handleSettingChange('chat', 'autoSave', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-650 rounded-lg"><Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Voice Output</span>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.chat.voiceOutput} onChange={(e) => handleSettingChange('chat', 'voiceOutput', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-650 rounded-lg"><Terminal className="w-4 h-4 text-slate-600 dark:text-slate-300" /></div>
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

      case 'calls':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
               <div>
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <PhoneCall className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                   Audio & Call Ringtones
                 </h3>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                   Customize incoming call ringtones, ringback tones, and sound alerts across all your devices.
                 </p>
               </div>
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                 <Check className="w-3.5 h-3.5" />
                 Synced across all devices
               </span>
             </div>

             {/* Ringtone Selection Cards */}
             <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-slate-800 dark:text-white block">
                      Incoming Call Ringtone
                    </label>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Choose the melody that plays during incoming 1-on-1 calls and study rooms.
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800">
                    Selected: {settings.calls?.ringtone || 'Modern Chime'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {RINGTONE_STYLES.map((style) => {
                    const isSelected = (settings.calls?.ringtone || 'Modern Chime') === style.id;
                    const isPlaying = playingRingtoneId === style.id;

                    return (
                      <div
                        key={style.id}
                        onClick={() => {
                          handleSettingChange('calls', 'ringtone', style.id);
                          handlePreviewRingtone(style.id);
                        }}
                        className={`relative group p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                          isSelected
                            ? 'bg-primary-50/60 dark:bg-primary-950/20 border-primary-500 shadow-sm ring-1 ring-primary-400/30'
                            : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-100/60 dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-lg" role="img" aria-label={style.name}>{style.icon}</span>
                            <div className="flex items-center gap-1.5">
                              {isPlaying && (
                                <span className="flex items-end gap-0.5 h-3 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/60 rounded">
                                  <span className="w-1 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce [animation-delay:0ms] h-3"></span>
                                  <span className="w-1 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce [animation-delay:150ms] h-2"></span>
                                  <span className="w-1 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce [animation-delay:300ms] h-3.5"></span>
                                </span>
                              )}
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? 'border-primary-600 bg-primary-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </span>
                            </div>
                          </div>

                          <h4 className={`text-sm font-bold ${
                            isSelected ? 'text-primary-900 dark:text-primary-200' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {style.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                            {style.description}
                          </p>
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewRingtone(style.id);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              isPlaying
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Square className="w-3 h-3 fill-current" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                Preview
                              </>
                            )}
                          </button>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>

             {/* Volume & Toggles */}
             <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                {/* Volume Slider */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between">
                     <label className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       {(settings.calls?.ringtoneVolume ?? 80) === 0 || !settings.calls?.enableSoundAlerts ? (
                         <VolumeX className="w-4 h-4 text-slate-400" />
                       ) : (settings.calls?.ringtoneVolume ?? 80) < 50 ? (
                         <Volume1 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                       ) : (
                         <Volume2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                       )}
                       Ringtone Volume
                     </label>
                     <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                       {settings.calls?.enableSoundAlerts ? `${settings.calls?.ringtoneVolume ?? 80}%` : 'Muted'}
                     </span>
                   </div>

                   <div className="flex items-center gap-3">
                     <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                     <input
                       type="range"
                       min="0"
                       max="100"
                       step="5"
                       value={settings.calls?.ringtoneVolume ?? 80}
                       onChange={(e) => {
                         const val = Number(e.target.value);
                         handleSettingChange('calls', 'ringtoneVolume', val);
                       }}
                       onMouseUp={() => {
                         handlePreviewRingtone(settings.calls?.ringtone || 'Modern Chime');
                       }}
                       onTouchEnd={() => {
                         handlePreviewRingtone(settings.calls?.ringtone || 'Modern Chime');
                       }}
                       className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
                     />
                     <Volume2 className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                   </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-4">
                   <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                          Play Ringtone on Incoming Calls
                        </span>
                        <span className="text-xs text-slate-400">
                          Audible ringtone when someone calls you or invites you to a study room.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={settings.calls?.enableSoundAlerts ?? true} 
                           onChange={(e) => handleSettingChange('calls', 'enableSoundAlerts', e.target.checked)} 
                           className="sr-only peer" 
                         />
                         <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                   </div>

                   <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
                          Vibrate on Incoming Calls
                        </span>
                        <span className="text-xs text-slate-400">
                          Triggers rhythmic vibration on supported mobile devices and tablets.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={settings.calls?.vibrateOnCall ?? true} 
                           onChange={(e) => handleSettingChange('calls', 'vibrateOnCall', e.target.checked)} 
                           className="sr-only peer" 
                         />
                         <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                   </div>
                </div>
             </div>

             {/* Outgoing Ringback Style & Call Chimes */}
             <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                <div>
                   <label className="text-sm font-bold text-slate-800 dark:text-white block mb-1">
                     Outgoing Ringback Style
                   </label>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                     The audio tone you hear in your headphones while waiting for the other person to answer.
                   </p>
                   <div className="grid grid-cols-3 gap-3">
                     {(['Standard', 'Melodic', 'Subtle'] as const).map((style) => (
                       <button
                         key={style}
                         type="button"
                         onClick={() => {
                           handleSettingChange('calls', 'ringbackStyle', style);
                           callAudio.stopAll();
                           callAudio.startOutgoingRingback();
                           setTimeout(() => callAudio.stopAll(), 2400);
                         }}
                         className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                           (settings.calls?.ringbackStyle || 'Standard') === style
                             ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-500 text-primary-700 dark:text-primary-300 shadow-sm'
                             : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                         }`}
                       >
                         {style}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                   <label className="text-sm font-bold text-slate-800 dark:text-white block mb-1">
                     Call Sound Effects & Audio Cues
                   </label>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                     Test the instant sound cues triggered during live call events.
                   </p>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                     <button
                       type="button"
                       onClick={() => handlePreviewChime('connected')}
                       className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                         previewingChime === 'connected'
                           ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                           : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                       }`}
                     >
                       <Zap className="w-3.5 h-3.5 text-emerald-500" />
                       Call Connected
                     </button>
                     <button
                       type="button"
                       onClick={() => handlePreviewChime('ended')}
                       className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                         previewingChime === 'ended'
                           ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                           : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                       }`}
                     >
                       <Phone className="w-3.5 h-3.5 text-rose-500" />
                       Call Ended
                     </button>
                     <button
                       type="button"
                       onClick={() => handlePreviewChime('handRaise')}
                       className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                         previewingChime === 'handRaise'
                           ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                           : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                       }`}
                     >
                       <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                       Hand Raised
                     </button>
                   </div>
                </div>
             </div>
          </div>
        );

      case 'notifications': {
        const currentPermission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Notifications & Call Alerts</h3>
             
             {/* Call Ringtone Quick Access Card */}
             <div className="bg-gradient-to-r from-primary-50 via-sky-50 to-indigo-50 dark:from-slate-800 dark:to-slate-850 p-4 sm:p-5 rounded-2xl border border-primary-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                      Incoming Call Ringtones & Sounds
                      <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[10px] font-extrabold rounded-full">Active</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Selected Melody: <span className="font-semibold text-primary-600 dark:text-primary-400">{settings.calls?.ringtone || 'Modern Chime'}</span> • Volume: <span className="font-semibold text-slate-700 dark:text-slate-300">{settings.calls?.ringtoneVolume ?? 80}%</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('calls')}
                  className="px-4 py-2 bg-white dark:bg-slate-700 hover:bg-primary-50 dark:hover:bg-slate-650 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Customize Call Audio →</span>
                </button>
             </div>

             {/* Device Notification Status & Test Bench */}
             <div className={`p-5 rounded-2xl border transition-all ${
               currentPermission === 'granted'
                 ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                 : currentPermission === 'denied'
                 ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                 : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
             }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                   <div className="flex items-center gap-3">
                      {currentPermission === 'granted' ? (
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : currentPermission === 'denied' ? (
                        <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Bell className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          Browser & Background Call Push:
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                            currentPermission === 'granted'
                              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                              : currentPermission === 'denied'
                              ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                          }`}>
                            {currentPermission === 'granted' ? 'Background Calls Active 📞✅' : currentPermission === 'denied' ? 'Blocked in Browser 🚫' : 'Permission Required 🔔'}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {currentPermission === 'granted'
                            ? 'Your device is configured to receive incoming voice & video calls in the background with interactive Accept & Decline buttons, even when this tab is closed or you are away from the website.'
                            : currentPermission === 'denied'
                            ? 'Notifications are blocked in your browser site settings. Click the Lock icon in your browser address bar to set Notifications to "Allow" to receive background calls.'
                            : 'Grant permission to receive background voice/video call rings and peer study lounge alerts even when you are not visiting the website.'}
                        </p>
                      </div>
                   </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                   {currentPermission !== 'granted' && (
                     <button
                       type="button"
                       onClick={async () => {
                         if ("Notification" in window) {
                           const perm = await NotificationService.requestPermission();
                           if (perm === 'granted') {
                             showFeedback('Device Notifications Enabled! 🎉');
                             NotificationService.showLocalNotification(
                               "SJ Tutor AI Notifications Active 🔔",
                               "You will now receive incoming call alerts and study updates.",
                               "Important Alerts"
                             );
                           } else {
                             showFeedback(`Permission state: ${perm}`);
                           }
                         }
                       }}
                       className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                     >
                       <Bell className="w-4 h-4" />
                       <span>Enable Browser Notifications</span>
                     </button>
                   )}

                   {/* Test Live Call Notification Button */}
                   <button
                     type="button"
                     onClick={async () => {
                       if ("Notification" in window && Notification.permission !== 'granted') {
                         await NotificationService.requestPermission();
                       }
                       showFeedback("Dispatching Test Incoming Call Notification... 📞");
                       NotificationService.showIncomingCallNotification({
                         id: `test_${Date.now()}`,
                         callerName: "SJ Tutor AI Study Buddy",
                         type: "audio",
                         callerAvatar: "https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg"
                       });
                       callAudio.previewRingtone(settings.calls?.ringtone || 'Modern Chime', settings.calls?.ringtoneVolume);
                     }}
                     className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                   >
                     <PhoneCall className="w-4 h-4 text-emerald-500" />
                     <span>Test Incoming Call Alert 📞</span>
                   </button>

                   {/* Test General Notification Button */}
                   <button
                     type="button"
                     onClick={async () => {
                       if ("Notification" in window && Notification.permission !== 'granted') {
                         await NotificationService.requestPermission();
                       }
                       showFeedback("Test notification dispatched 🔔");
                       NotificationService.showLocalNotification(
                         "Test Study Reminder 📚",
                         "Keep your 4-day learning streak alive on SJ Tutor AI!",
                         "Daily Streak Reminders"
                       );
                     }}
                     className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                   >
                     <Zap className="w-4 h-4 text-amber-500" />
                     <span>Test General Alert 🔔</span>
                   </button>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Notification Categories & Preferences</h4>
                {[
                  { id: 'studyReminders', label: 'Daily Study Reminders', desc: 'Get reminded to hit your daily study targets and maintain streaks.' },
                  { id: 'examAlerts', label: 'Exam & Test Alerts', desc: 'Alerts for upcoming scheduled tests and practice series.' },
                  { id: 'aiTips', label: 'AI Study Tips', desc: 'Receive personalized insights from your AI tutor.' },
                  { id: 'push', label: 'Push Notifications', desc: 'Enable native push notification delivery on this device.' },
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
      }

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
                             : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
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
                                        : 'border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
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

      case 'privacy': {
        const is2FAActive = !!userProfile.twoFactorEnabled || !!settings.privacy.twoFactor || !!userProfile.twoFactorPassword;
        const isPinActive = !!userProfile.pinLockEnabled || !!settings.privacy.pinLock || !!userProfile.securityPin;
        const currentPinLength = userProfile.securityPinLength || settings.privacy.pinLength || 4;

        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Privacy & Security</h3>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
               
               {/* 1. Two-Step Verification (On Sign-In / Login) */}
               <div className="p-5 rounded-2xl border bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/80 space-y-4">
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-xl text-white shadow-sm shrink-0 ${is2FAActive ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-800 dark:text-white">
                            2-Step Verification (On Login)
                          </span>
                          {is2FAActive ? (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full">
                              Off
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Requires your 2-Step Verification Password whenever you log in via Google, Yahoo, or Email on any browser or device.
                        </p>
                        {!is2FAActive && (
                          <div className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                            <span>Password not kept — Setup recommended for multi-device protection</span>
                          </div>
                        )}
                        {is2FAActive && (
                          <div className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-2.5 py-1 inline-flex items-center gap-1.5">
                            <span>Password active — Required upon relogin on this and all devices</span>
                          </div>
                        )}
                      </div>
                   </div>

                   <div className="flex items-center gap-2 shrink-0">
                     {is2FAActive && (
                       <button
                         onClick={() => {
                           setPinSetupTab('twostep');
                           setIsDisablingPin(false);
                           setShowPinSetupModal(true);
                         }}
                         className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 rounded-lg text-slate-700 dark:text-slate-200 font-bold transition text-xs flex items-center gap-1"
                       >
                         <KeyRound className="w-3.5 h-3.5 text-emerald-500" /> Change
                       </button>
                     )}

                     <button
                       onClick={() => {
                         setPinSetupTab('twostep');
                         if (is2FAActive) {
                           setIsDisablingPin(true);
                           setShowPinSetupModal(true);
                         } else {
                           setIsDisablingPin(false);
                           setShowPinSetupModal(true);
                         }
                       }}
                       className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                         is2FAActive
                           ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                           : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                       }`}
                     >
                       {is2FAActive ? 'Disable' : 'Set Up 2-Step'}
                     </button>
                   </div>
                 </div>
               </div>

               {/* 2. Security PIN Lock (On Refresh & Website Visits) */}
               <div className="p-5 rounded-2xl border bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/80 space-y-4">
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-xl text-white shadow-sm shrink-0 ${isPinActive ? 'bg-primary-600' : 'bg-slate-600'}`}>
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-800 dark:text-white">
                            Security PIN Lock (On Refresh / Revisit)
                          </span>
                          {isPinActive ? (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 rounded-full border border-primary-300 dark:border-primary-800">
                              Active ({currentPinLength}-Digit)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full">
                              Off
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Locks your current workspace whenever you refresh the page or revisit SJ Tutor AI, prompting for your {currentPinLength}-digit PIN or Biometrics.
                        </p>
                      </div>
                   </div>

                   <button
                     onClick={() => {
                       setPinSetupTab('pin');
                       if (isPinActive) {
                         setIsDisablingPin(true);
                         setShowPinSetupModal(true);
                       } else {
                         setIsDisablingPin(false);
                         setShowPinSetupModal(true);
                       }
                     }}
                     className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                       isPinActive
                         ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
                         : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                     }`}
                   >
                     {isPinActive ? 'Disable' : 'Set Up PIN'}
                   </button>
                 </div>

                 {isPinActive && (
                   <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                     <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                       <KeyRound className="w-4 h-4 text-amber-500" />
                       <span>Configured PIN: <strong>{currentPinLength}-Digit Quick Code</strong></span>
                     </div>
                     <div className="flex items-center gap-2">
                       <button
                         onClick={() => {
                           setPinSetupTab('pin');
                           setIsDisablingPin(false);
                           setShowPinSetupModal(true);
                         }}
                         className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-bold transition text-xs flex items-center gap-1"
                       >
                         <KeyRound className="w-3.5 h-3.5 text-primary-500" /> Change PIN
                       </button>
                       <button
                         onClick={() => {
                           if (auth.currentUser) {
                             SecurityPinService.lockSession(auth.currentUser.uid);
                             window.location.reload();
                           }
                         }}
                         className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-bold transition text-xs flex items-center gap-1"
                         title="Lock the session now to test the PIN prompt"
                       >
                         <Lock className="w-3.5 h-3.5 text-slate-500" /> Test Lock
                       </button>
                     </div>
                   </div>
                 )}
               </div>

               {/* Biometric & App Lock */}
               <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-750 bg-white dark:bg-slate-800">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 rounded-lg">
                      <Fingerprint className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Biometric App Lock</span>
                      <span className="text-xs text-slate-400">Unlock with Face ID, Touch ID or WebAuthn Passkey</span>
                    </div>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!settings.privacy.appLock || !!userProfile.biometricsEnabled} 
                      onChange={(e) => {
                        handleSettingChange('privacy', 'appLock', e.target.checked);
                        if (props.onUpdateProfile) {
                          props.onUpdateProfile({
                            ...userProfile,
                            biometricsEnabled: e.target.checked
                          });
                        }
                      }} 
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                 </label>
               </div>

               {/* 3. Security Recovery Question */}
               <div className="p-5 rounded-2xl border bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/80 space-y-3">
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex items-start gap-3.5">
                     <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-sm shrink-0">
                       <HelpCircle className="w-5 h-5" />
                     </div>
                     <div>
                       <div className="flex items-center gap-2">
                         <span className="text-base font-bold text-slate-800 dark:text-white">
                           Security Recovery Question
                         </span>
                         {(userProfile.securityQuestion || settings.privacy.securityQuestion) ? (
                           <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-300 dark:border-emerald-800">
                             Configured
                           </span>
                         ) : (
                           <span className="px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 rounded-full">
                             Not Set
                           </span>
                         )}
                       </div>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                         {(userProfile.securityQuestion || settings.privacy.securityQuestion) ? (
                           <span>Question: <em>&ldquo;{userProfile.securityQuestion || settings.privacy.securityQuestion}&rdquo;</em> — Allows instant password &amp; PIN recovery.</span>
                         ) : (
                           <span>Choose from categorized templates or write a custom question with repeated answer confirmation to prevent 50-day reset holding delays.</span>
                         )}
                       </p>
                     </div>
                   </div>

                   <button
                     onClick={() => {
                       setPinSetupTab('pin');
                       setIsDisablingPin(false);
                       setShowPinSetupModal(true);
                     }}
                     className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 shadow-sm"
                   >
                     <Sparkles className="w-3.5 h-3.5" />
                     {(userProfile.securityQuestion || settings.privacy.securityQuestion) ? 'Update Question' : 'Set Question'}
                   </button>
                 </div>
               </div>

               <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                 <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Data Management</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                       onClick={handleClearChatHistory}
                       className="flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                       <MessageSquare className="w-4 h-4 text-primary-500" /> Clear Chat History
                    </button>
                    <button 
                       onClick={handleClearLearningData}
                       className="flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                       <FlaskConical className="w-4 h-4 text-amber-500" /> Clear Learning Data
                    </button>
                 </div>
               </div>

               <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                 <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Legal Documents</h4>
                 <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => onNavigateToLegal('PRIVACY')}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      <span className="flex items-center gap-2">
                         <Shield className="w-4 h-4 text-primary-600" />
                         Privacy Policy
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                    <button 
                      onClick={() => onNavigateToLegal('TERMS')}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      <span className="flex items-center gap-2">
                         <FileText className="w-4 h-4 text-primary-600" />
                         Terms of Service
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                 </div>
               </div>

            </div>
          </div>
        );
      }

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

                <div className="py-2.5 border-t border-slate-100 dark:border-slate-700">
                   <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Innovators &amp; Inventors</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-white">Sadanand Jyoti <span className="text-slate-400 font-normal">&amp;</span> Samanyu S Patil</p>
                   <p className="text-[11px] text-slate-400 mt-0.5">Creators of the SJ Tutor AI educational platform</p>
                </div>

                <div className="flex justify-between items-center py-2 border-t border-slate-100 dark:border-slate-700">
                   <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Cache Size</p>
                      <p className="text-xs text-slate-400">~24 MB used</p>
                   </div>
                   <button 
                      onClick={handleClearCache}
                      className="text-xs font-bold text-primary-600 hover:underline"
                   >
                      Clear Cache
                   </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
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
                {(() => {
                   const trialInfo = calculateTrialInfo(userProfile, auth.currentUser?.uid);
                   const isTrialActive = !trialInfo.isExpired && (!userProfile.planType || userProfile.planType === 'Free');
                   const isPro = Boolean(userProfile.planType && userProfile.planType !== 'Free');

                   return (
                     <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm"><Crown className="w-5 h-5 text-amber-400" /></div>
                           <span className="font-bold text-amber-400 tracking-wider text-sm uppercase">Current Plan</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-1">
                           {isPro ? `${userProfile.planType} Plan` : isTrialActive ? '10-Day Free Trial' : 'Free Tier (100 Credits)'}
                        </h2>
                        <p className="text-slate-400 text-sm mb-6">
                           {isPro 
                             ? 'Unlimited access to all AI models and advanced learning tools.' 
                             : isTrialActive 
                             ? 'Complete free unlimited access to all AI models for 10 days, followed by 100 Free Credits.' 
                             : 'You have 100 Free Credits to study and generate notes. Upgrade for unlimited access.'}
                        </p>
                        
                        <div className="flex items-center justify-between bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/5">
                           <div>
                              <p className="text-xs text-slate-400 mb-1">Available Credits</p>
                              <p className="text-2xl font-bold flex items-center gap-2">
                                 <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400 animate-pulse" />
                                 {isPro || isTrialActive ? "Unlimited" : `${userProfile.credits ?? 100} Credits`}
                              </p>
                           </div>
                           <button 
                              onClick={onOpenPremium}
                              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-emerald-500/20 transition cursor-pointer"
                           >
                              {isPro ? "Active Plan" : isTrialActive ? "Trial Active" : "Upgrade Plan"}
                           </button>
                        </div>
                     </div>
                   );
                })()}
             </div>

             {/* Permanent Premium Options Invitation */}
             <div className="bg-gradient-to-r from-amber-500/5 to-primary-650/5 dark:from-amber-500/10 dark:to-primary-650/10 border border-amber-500/15 dark:border-amber-500/10 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="text-left font-sans">
                   <h4 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
                      <Crown className="w-5 h-5 text-amber-500 fill-amber-500 animate-bounce" />
                      Upgrade to Premium
                   </h4>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Enjoy unlimited AI tutor credits, exam prep packs, and real-time WebRTC study tools with our lifetime packages starting at ₹99.
                   </p>
                </div>
                <button
                   onClick={onOpenPremium}
                   className="px-4.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-650 hover:to-orange-650 active:scale-95 text-slate-900 font-extrabold rounded-xl text-xs tracking-wider uppercase shadow-md hover:shadow-lg transition-all whitespace-nowrap animate-pulse"
                >
                   View Packages
                </button>
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
             
             <div className="flex bg-white border border-slate-200 dark:bg-slate-800 p-1 rounded-lg w-fit">
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
                       <p className="text-xs font-medium bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 mb-6">
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

       case 'shortcuts': {
        const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
        const modKey = isMac ? '⌘' : 'Ctrl';

        const shortcutList = [
          {
            category: 'Navigation & Modes',
            items: [
              { key: `${modKey} + D`, label: 'Dashboard Overview', desc: 'Return directly to the main Study Dashboard' },
              { key: `${modKey} + S`, label: 'Summary Generator', desc: 'Jump to Instant Summary creation mode' },
              { key: `${modKey} + Q`, label: 'Quiz Creator', desc: 'Create AI-powered multiple-choice quizzes' },
              { key: `${modKey} + H`, label: 'Homework Solver', desc: 'Step-by-step homework solution solver' },
              { key: `${modKey} + T`, label: 'AI Tutor Chat', desc: 'Open interactive conversational AI tutor' },
              { key: `${modKey} + G`, label: 'Study Groups', desc: 'Explore and chat in group study rooms' },
              { key: `${modKey} + N`, label: 'Notes & Timetable', desc: 'Access study notes and timetable planner' },
            ]
          },
          {
            category: 'System & Modals',
            items: [
              { key: `${modKey} + K`, label: 'Interactive Shortcuts', desc: 'Toggle keyboard shortcut cheat sheet' },
              { key: `${modKey} + Shift + A`, label: 'About Us Modal', desc: 'View creator details & academic mission' },
              { key: 'Esc', label: 'Close Active Modal', desc: 'Dismiss any open dialog or full-screen viewer' },
            ]
          }
        ];

        return (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-amber-500" />
                  Keyboard Shortcuts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Speed up your workflow and navigate SJ Tutor AI effortlessly using global keyboard shortcuts.
                </p>
              </div>

              {props.onOpenShortcuts && (
                <button
                  onClick={props.onOpenShortcuts}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 self-start"
                >
                  <Sparkles className="w-4 h-4" />
                  Open Interactive Cheatsheet
                </button>
              )}
            </div>

            <div className="space-y-6">
              {shortcutList.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {group.category}
                  </h4>
                  <div className="grid gap-2.5">
                    {group.items.map((sc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{sc.label}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{sc.desc}</p>
                        </div>
                        <kbd className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-600 dark:text-amber-400 shadow-sm shrink-0">
                          {sc.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Command className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Keyboard shortcuts automatically bypass input fields and chat editors when you are typing.</span>
            </div>
          </div>
        );
      }

      default:
        return (
           <div className="text-center py-20 text-slate-400 dark:text-slate-500">
             <p>Select a setting category from the menu.</p>
           </div>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-100px)] w-full bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
      {/* Sidebar / Tabs */}
      <div className="w-full md:w-72 lg:w-80 bg-slate-50/60 dark:bg-slate-900/60 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex md:flex-col overflow-x-auto md:overflow-y-auto shrink-0">
         <div className="p-5 md:p-6 font-bold text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider hidden md:block">
            Settings Menu
         </div>
         <div className="flex md:flex-col p-2 md:p-3 gap-1 w-full">
           {tabs.map((tab) => {
             const Icon = tab.icon;
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-3 px-4 md:px-5 py-3 md:py-3.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap md:whitespace-normal text-left ${
                   isActive 
                     ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 font-bold border border-primary-200 dark:border-primary-800/60 shadow-xs' 
                     : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                 }`}
               >
                 <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                 <span>{tab.label}</span>
               </button>
             );
           })}
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 md:p-8 lg:p-10 relative bg-white dark:bg-slate-900 custom-scrollbar">
         {(() => {
           const completion = calculateProfileCompletion(userProfile);
           const isProfileComplete = completion >= 100 || !!userProfile.isRegisteredInFirestore || !!userProfile.hasCompletedOnboarding;
           const isPublicTab = activeTab === 'help' || activeTab === 'account' || activeTab === 'shortcuts';
           
           return (
             <>
               {!isProfileComplete && !isPublicTab && (
                 <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex gap-3">
                     <span className="text-2xl mt-0.5">🔒</span>
                     <div>
                       <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Settings Customization Locked</h4>
                       <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                         Your profile is currently <span className="font-bold">{completion}% complete</span>. Please complete your profile (100%) in the Profile tab to unlock settings customization. Incomplete profiles prevent personalized AI updates.
                       </p>
                     </div>
                   </div>
                   <button
                     onClick={onNavigateToProfile}
                     className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all self-start whitespace-nowrap"
                   >
                     Complete Profile Now
                   </button>
                 </div>
               )}
               
               <div className={!isProfileComplete && !isPublicTab ? "pointer-events-none opacity-60" : ""}>
                 {renderContent()}
               </div>
             </>
           );
         })()}

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

         {feedbackMessage && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 z-20 border border-slate-700">
               <Check className="w-4 h-4 text-emerald-400" />
               <span className="text-sm font-medium">{feedbackMessage}</span>
            </div>
         )}

         {/* Delete Account Modal */}
         {showDeleteAccountModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                     <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-1">
                     <h3 className="text-lg font-bold text-slate-800 dark:text-white">Delete Account</h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400">
                        Are you sure you want to delete your account? This action will permanently remove all your learning history, custom notes, saved chats, and preferences.
                     </p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-300 font-medium text-center">
                     ⚠️ This action is irreversible. All your study progress will be erased.
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                     <button
                        onClick={() => setShowDeleteAccountModal(false)}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={handleConfirmDeleteAccount}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md transition"
                     >
                        Delete Everything
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Security PIN Setup / Management Modal */}
         {showPinSetupModal && (
           <SecurityPinSetupModal
             isOpen={showPinSetupModal}
             onClose={() => setShowPinSetupModal(false)}
             userProfile={userProfile}
             uid={auth.currentUser?.uid}
             isDisabling={isDisablingPin}
              initialTab={pinSetupTab}
             onSuccess={(updatedProfile) => {
               if (props.onUpdateProfile) {
                 props.onUpdateProfile({
                   ...userProfile,
                   ...updatedProfile,
                 });
               }
               setSettings(SettingsService.getSettings());
               setFeedbackMessage(
                 isDisablingPin
                   ? 'Two-step verification has been disabled.'
                   : 'Security PIN and Two-step verification updated successfully!'
               );
               setTimeout(() => setFeedbackMessage(null), 4000);
             }}
           />
         )}
      </div>
    </div>
  );
};

export default SettingsView;