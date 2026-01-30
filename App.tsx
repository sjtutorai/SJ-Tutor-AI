
import React, { useState, useEffect, useRef } from 'react';
import { AppMode, StudyRequestData, INITIAL_FORM_DATA, QuizQuestion, HistoryItem, UserProfile, SJTUTOR_AVATAR } from './types';
import InputForm from './components/InputForm';
import ResultsView from './components/ResultsView';
import QuizView from './components/QuizView';
import TutorChat from './components/TutorChat';
import ProfileView from './components/ProfileView';
import Auth from './components/Auth';
import PremiumModal from './components/PremiumModal';
import LoadingState from './components/LoadingState'; 
import NotesView from './components/NotesView';
import SettingsView from './components/SettingsView';
import AboutView from './components/AboutView';
import IdCardView from './components/IdCardView';
import Logo from './components/Logo';
import { GeminiService } from './services/geminiService';
import { SettingsService } from './services/settingsService';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  BookOpen, 
  FileText, 
  BrainCircuit, 
  MessageCircle, 
  Sparkles, 
  AlertCircle, 
  Menu, 
  ChevronRight,
  LayoutDashboard,
  ArrowLeft,
  Calendar,
  Eye,
  LogOut,
  Zap,
  Crown,
  Plus,
  Clock,
  Key,
  ExternalLink,
  Settings,
  Info,
  Share2,
  CreditCard,
  // Added Loader2 to fix the reported error on line 489
  Loader2
} from 'lucide-react';
import { GenerateContentResponse } from '@google/genai';

const SAMPLE_DATA: StudyRequestData = {
  subject: 'Science',
  gradeClass: 'Class 8',
  board: 'CBSE',
  language: 'English',
  chapterName: "Synthetic Fibres",
  author: '',
  questionCount: 5,
  difficulty: 'Medium',
  includeImages: false
};

const THEME_COLORS: Record<string, Record<string, string>> = {
  Gold: {
    50: '#FFFAF0', 100: '#FDF5E6', 200: '#FEEBC8', 300: '#FBD38D', 400: '#F6AD55',
    500: '#D4AF37', 600: '#B7950B', 700: '#975A16', 800: '#744210', 900: '#742A2A'
  },
  Blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a'
  },
  Emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b'
  },
  Violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
    500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95'
  },
  Rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337'
  }
};

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [formData, setFormData] = useState<StudyRequestData>(INITIAL_FORM_DATA);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Profile State
  const initialProfileState: UserProfile = {
    displayName: '',
    phoneNumber: '',
    institution: '',
    grade: '',
    bio: '',
    photoURL: '',
    learningGoal: '',
    learningStyle: 'Visual',
    credits: 100,
    planType: 'Free'
  };
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfileState);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dashboardView, setDashboardView] = useState<AppMode | 'OVERVIEW'>('OVERVIEW');
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  
  // Content States
  const [summaryContent, setSummaryContent] = useState('');
  const [essayContent, setEssayContent] = useState('');
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [existingQuizScore, setExistingQuizScore] = useState<number | undefined>(undefined);
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notification Timer Ref
  const lastNotificationCheck = useRef(Date.now());

  // Notification Service
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const lastCheck = lastNotificationCheck.current;
      const key = user ? `reminders_${user.uid}` : 'reminders_guest';
      
      try {
        const storedReminders = localStorage.getItem(key);
        if (storedReminders) {
          const items = JSON.parse(storedReminders);
          items.forEach((item: any) => {
            if (!item.completed && item.dueTime) {
              const dueTime = new Date(item.dueTime).getTime();
              if (dueTime > lastCheck && dueTime <= now) {
                if (Notification.permission === "granted") {
                  new Notification("SJ Tutor AI Reminder", {
                    body: item.task,
                    icon: SJTUTOR_AVATAR
                  });
                }
              }
            }
          });
        }
      } catch (e) {
        console.error("Error checking reminders", e);
      }
      
      lastNotificationCheck.current = now;
    }, 10000);

    return () => clearInterval(interval);
  }, [user]);

  // Theme Management
  useEffect(() => {
    const applyTheme = () => {
      const settings = SettingsService.getSettings();
      const theme = settings.appearance.theme;
      const primaryColorName = settings.appearance.primaryColor || 'Gold';
      const fontFamily = settings.appearance.fontFamily || 'Inter';
      const animationsEnabled = settings.appearance.animations;
      
      const root = window.document.documentElement;
      const body = window.document.body;
      
      const isDark = theme === 'Dark' || (theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      const palette = THEME_COLORS[primaryColorName] || THEME_COLORS['Gold'];
      Object.entries(palette).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value);
      });

      const formattedFont = fontFamily.includes(' ') ? `'${fontFamily}'` : fontFamily;
      root.style.setProperty('--font-sans', formattedFont);

      if (animationsEnabled) {
        body.classList.remove('reduce-motion');
      } else {
        body.classList.add('reduce-motion');
      }
    };

    applyTheme();
    window.addEventListener('settings-changed', applyTheme);
    return () => window.removeEventListener('settings-changed', applyTheme);
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (!currentUser) {
        setIsNewUser(false);
        setUserProfile(initialProfileState);
        setMode(AppMode.DASHBOARD);
      }
    });

    return () => unsubscribe();
  }, []);

  // Profile Persistence
  useEffect(() => {
    if (user) {
      const savedProfile = localStorage.getItem(`profile_${user.uid}`);
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setUserProfile(prev => ({ 
            ...initialProfileState, 
            ...parsed,
            displayName: parsed.displayName || user.displayName || '',
            photoURL: parsed.photoURL || user.photoURL || '' 
          }));
        } catch (e) {
          console.error("Failed to parse profile", e);
        }
      } else {
        setUserProfile({
           ...initialProfileState,
           displayName: user.displayName || '',
           photoURL: user.photoURL || '',
           credits: 100
        });
      }
    }
  }, [user]);

  // History Persistence
  useEffect(() => {
    const storageKey = user ? `history_${user.uid}` : 'history_guest';
    const savedHistory = localStorage.getItem(storageKey);
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { setHistory([]); }
    } else { setHistory([]); }
  }, [user]);

  useEffect(() => {
    const storageKey = user ? `history_${user.uid}` : 'history_guest';
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [history, user]);

  const handleProfileSave = (newProfile: UserProfile, redirectDashboard = false) => {
    setUserProfile(newProfile);
    if (user) {
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(newProfile));
    }
    if (isNewUser) {
      setIsNewUser(false);
      setShowAuthModal(false);
      if (redirectDashboard) setMode(AppMode.DASHBOARD);
    }
  };

  const handleSignUpSuccess = (initialData?: Partial<UserProfile>) => {
    setIsNewUser(true);
    const newProfile = { ...initialProfileState, ...initialData };
    setUserProfile(newProfile);
    if (auth.currentUser) localStorage.setItem(`profile_${auth.currentUser.uid}`, JSON.stringify(newProfile));
    setShowAuthModal(false);
  };

  const handlePaymentSuccess = (creditsToAdd: number, planName: 'STARTER' | 'SCHOLAR' | 'ACHIEVER') => {
    const planTypeMap: Record<string, 'Starter' | 'Scholar' | 'Achiever'> = { 'STARTER': 'Starter', 'SCHOLAR': 'Scholar', 'ACHIEVER': 'Achiever' };
    const updatedProfile: UserProfile = { ...userProfile, credits: userProfile.credits + creditsToAdd, planType: planTypeMap[planName] };
    handleProfileSave(updatedProfile);
  };

  const handleFormChange = (field: keyof StudyRequestData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.subject || !formData.gradeClass || !formData.chapterName) {
      setError("Please fill in at least Subject, Class, and Chapter Name.");
      return false;
    }
    setError(null);
    return true;
  };

  const addToHistory = (type: AppMode, content: any) => {
    const newId = Date.now().toString();
    const newItem: HistoryItem = { id: newId, type, title: formData.chapterName || 'Untitled Chapter', subtitle: `${formData.gradeClass} • ${formData.subject}`, timestamp: Date.now(), content, formData: { ...formData } };
    setHistory(prev => [newItem, ...prev]);
    setCurrentHistoryId(newId);
  };

  const handleQuizComplete = (score: number) => {
    if (currentHistoryId) {
      setHistory(prev => prev.map(item => item.id === currentHistoryId ? { ...item, score } : item));
      if (formData.questionCount === 20 && formData.difficulty === 'Hard' && (score/20) >= 0.75) {
          handleProfileSave({ ...userProfile, credits: userProfile.credits + 50 }, false);
          alert(`🎉 CHALLENGE MASTERED! You earned 50 bonus credits!`);
      }
    }
  };

  const deductCredit = (amount: number) => {
    if (userProfile.credits >= amount) {
      handleProfileSave({ ...userProfile, credits: userProfile.credits - amount }, false);
      return true;
    }
    return false;
  };

  const handleGenerate = async () => {
    if (!user) { setShowAuthModal(true); return; }
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    setExistingQuizScore(undefined);

    try {
      if (mode === AppMode.SUMMARY) {
        setSummaryContent('');
        const stream = await GeminiService.generateSummaryStream(formData);
        let text = '';
        for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) { text += c.text; setSummaryContent(text); }
        }
        addToHistory(AppMode.SUMMARY, text);
        deductCredit(10);
      } else if (mode === AppMode.ESSAY) {
        setEssayContent('');
        const stream = await GeminiService.generateEssayStream(formData);
        let text = '';
        for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) { text += c.text; setEssayContent(text); }
        }
        if (formData.includeImages) {
          const img = await GeminiService.generateImage(formData.chapterName);
          if (img) { text += `\n\n![${formData.chapterName}](${img})`; setEssayContent(text); }
        }
        addToHistory(AppMode.ESSAY, text);
        deductCredit(formData.includeImages ? 15 : 10);
      } else if (mode === AppMode.QUIZ) {
        const questions = await GeminiService.generateQuiz(formData);
        setQuizData(questions);
        addToHistory(AppMode.QUIZ, questions);
        deductCredit(10);
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Request failed.";
      if (msg.includes("API key not valid")) msg = "API_KEY_INVALID";
      else if (msg.includes("not enabled") || msg.includes("PERMISSION_DENIED") || msg.includes("Forbidden")) msg = "API_DISABLED";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await signOut(auth); setMode(AppMode.DASHBOARD); } catch (e) { console.error(e); }
  };

  const renderError = () => {
    if (!error) return null;
    if (error === "API_DISABLED") {
      return (
        <div className="bg-red-50 border border-red-100 p-8 rounded-3xl mb-8 flex flex-col gap-6 animate-in slide-in-from-top-4 shadow-xl text-center">
          <div className="flex flex-col items-center gap-4 text-red-800">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce">
               <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <p className="font-extrabold text-2xl tracking-tight">API Not Enabled</p>
              <p className="text-red-600 mt-2 max-w-md mx-auto">The "Generative Language API" is not enabled in your Google Cloud project. You must enable it to use AI features.</p>
            </div>
          </div>
          <a 
            href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/30"
          >
            Enable API Now
            <ExternalLink className="w-5 h-5" />
          </a>
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">GCP Console > APIs & Services > Library > Enable 'Generative Language API'</p>
        </div>
      );
    }
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 flex items-center gap-3 border border-red-100">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  };

  const navItems = [
    { id: AppMode.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppMode.ID_CARD, label: 'Student ID Card', icon: CreditCard },
    { id: AppMode.SUMMARY, label: 'Summary Generator', icon: FileText },
    { id: AppMode.QUIZ, label: 'Quiz Creator', icon: BrainCircuit },
    { id: AppMode.ESSAY, label: 'Essay Writer', icon: BookOpen },
    { id: AppMode.NOTES, label: 'Notes & Schedule', icon: Calendar },
    { id: AppMode.TUTOR, label: 'AI Tutor', icon: MessageCircle },
    { id: AppMode.ABOUT, label: 'About Us', icon: Info },
    { id: AppMode.SETTINGS, label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    if (loading) return <LoadingState mode={mode} />;
    switch (mode) {
      case AppMode.DASHBOARD: return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Welcome, {userProfile.displayName || 'Scholar'}! 👋</h2>
            <p className="text-slate-500 dark:text-slate-400">Ready to master your studies today?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {navItems.slice(1, 7).map(item => (
                <button 
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group text-left relative overflow-hidden"
                >
                   <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-2xl w-fit mb-4 text-primary-600 group-hover:scale-110 transition-transform">
                      <item.icon className="w-6 h-6" />
                   </div>
                   <h3 className="font-bold text-lg text-slate-800 dark:text-white">{item.label}</h3>
                   <p className="text-xs text-slate-500 mt-1">Start your session <ChevronRight className="w-3 h-3 inline ml-1" /></p>
                </button>
             ))}
          </div>
        </div>
      );
      case AppMode.SUMMARY: return (
        <div className="max-w-4xl mx-auto">
          {renderError()}
          {summaryContent ? <ResultsView title={formData.chapterName} content={summaryContent} type="Summary" isLoading={false} onBack={() => setSummaryContent('')} /> : 
          <><InputForm data={formData} mode={AppMode.SUMMARY} onChange={handleFormChange} onFillSample={() => setFormData(SAMPLE_DATA)} />
          <button onClick={handleGenerate} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" /> Generate Summary</button></>}
        </div>
      );
      case AppMode.QUIZ: return (
        <div className="max-w-4xl mx-auto">
          {renderError()}
          {quizData ? <QuizView questions={quizData} onReset={() => setQuizData(null)} onComplete={handleQuizComplete} existingScore={existingQuizScore} /> : 
          <><InputForm data={formData} mode={AppMode.QUIZ} onChange={handleFormChange} onFillSample={() => setFormData(SAMPLE_DATA)} />
          <button onClick={handleGenerate} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2"><BrainCircuit className="w-5 h-5" /> Generate Quiz</button></>}
        </div>
      );
      case AppMode.ESSAY: return (
        <div className="max-w-4xl mx-auto">
          {renderError()}
          {essayContent ? <ResultsView title={formData.chapterName} content={essayContent} type="Essay" isLoading={false} onBack={() => setEssayContent('')} /> : 
          <><InputForm data={formData} mode={AppMode.ESSAY} onChange={handleFormChange} onFillSample={() => setFormData(SAMPLE_DATA)} />
          <button onClick={handleGenerate} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2"><BookOpen className="w-5 h-5" /> Write Essay</button></>}
        </div>
      );
      case AppMode.TUTOR: return <TutorChat onDeductCredit={deductCredit} currentCredits={userProfile.credits} />;
      case AppMode.NOTES: return <NotesView userId={user?.uid || null} onDeductCredit={deductCredit} />;
      case AppMode.ID_CARD: return <IdCardView userProfile={userProfile} email={user?.email} />;
      case AppMode.PROFILE: return <ProfileView profile={userProfile} email={user?.email || 'Guest'} onSave={handleProfileSave} />;
      case AppMode.SETTINGS: return <SettingsView userProfile={userProfile} onLogout={handleLogout} onNavigateToProfile={() => setMode(AppMode.PROFILE)} onOpenPremium={() => setShowPremiumModal(true)} />;
      case AppMode.ABOUT: return <AboutView />;
      default: return <div className="text-center py-20 text-slate-400">Section not found.</div>;
    }
  };

  // Fixed Loader2 missing import by adding it to lucide-react imports above
  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary-500" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-300">
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => { setMode(AppMode.DASHBOARD); setIsSidebarOpen(false); }}>
            <Logo className="w-10 h-10" iconOnly />
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none">SJ TUTOR <span className="text-primary-600">AI</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Academic Partner</p>
            </div>
          </div>
          <nav className="flex-1 space-y-2">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setMode(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold ${mode === item.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <item.icon className="w-5 h-5" /> {item.label}
              </button>
            ))}
          </nav>
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
             <div className="flex items-center gap-3 px-2 mb-4">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance</p>
                   <p className="text-sm font-black text-slate-800 dark:text-white">{userProfile.credits} Credits</p>
                </div>
             </div>
             <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm"><LogOut className="w-5 h-5" /> Sign Out</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 lg:hidden">
           <Logo className="w-8 h-8" iconOnly />
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500"><Menu className="w-6 h-6" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">{renderContent()}</div>
      </main>
      {showAuthModal && <Auth onClose={() => setShowAuthModal(false)} onSignUpSuccess={handleSignUpSuccess} />}
      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} onPaymentSuccess={handlePaymentSuccess} />}
    </div>
  );
};

export default App;
