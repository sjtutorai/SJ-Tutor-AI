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
  questionCount: 10,
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
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [needsKeySelection, setNeedsKeySelection] = useState(false);

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

  // Check API Key Status
  useEffect(() => {
    const checkKey = async () => {
        if (!process.env.API_KEY) {
            setApiKeyMissing(true);
        }
        // Use aistudio global if available for "private" key selection
        if ((window as any).aistudio) {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setNeedsKeySelection(!hasKey);
        }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
        setNeedsKeySelection(false);
    }
  };

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
                  new Notification("SJ Tutor AI Reminder", { body: item.task, icon: SJTUTOR_AVATAR });
                }
              }
            }
          });
        }
      } catch (e) { console.error("Error checking reminders", e); }
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
      if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
      const palette = THEME_COLORS[primaryColorName] || THEME_COLORS['Gold'];
      Object.entries(palette).forEach(([shade, value]) => root.style.setProperty(`--color-primary-${shade}`, value));
      const formattedFont = fontFamily.includes(' ') ? `'${fontFamily}'` : fontFamily;
      root.style.setProperty('--font-sans', formattedFont);
      if (animationsEnabled) body.classList.remove('reduce-motion'); else body.classList.add('reduce-motion');
    };
    applyTheme();
    window.addEventListener('settings-changed', applyTheme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => { if (SettingsService.getSettings().appearance.theme === 'System') applyTheme(); };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => {
      window.removeEventListener('settings-changed', applyTheme);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    const timeoutId = setTimeout(() => { if (authLoading) setAuthLoading(false); }, 4000);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      clearTimeout(timeoutId); 
      if (!currentUser) {
        setIsNewUser(false);
        setUserProfile(initialProfileState);
        setMode(AppMode.DASHBOARD);
      }
    }, (err) => { setAuthLoading(false); clearTimeout(timeoutId); });
    return () => { unsubscribe(); clearTimeout(timeoutId); };
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
        } catch (e) { console.error("Failed to parse profile", e); }
      } else {
        setUserProfile({ ...initialProfileState, displayName: user.displayName || '', photoURL: user.photoURL || '', credits: 100 });
      }
    }
  }, [user]);

  // History Persistence
  useEffect(() => {
    const storageKey = user ? `history_${user.uid}` : 'history_guest';
    const savedHistory = localStorage.getItem(storageKey);
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) setHistory(parsedHistory);
      } catch (e) { setHistory([]); }
    } else setHistory([]);
  }, [user]);

  useEffect(() => {
    const storageKey = user ? `history_${user.uid}` : 'history_guest';
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [history, user]);

  const handleProfileSave = (newProfile: UserProfile, redirectDashboard = false) => {
    setUserProfile(newProfile);
    if (user) localStorage.setItem(`profile_${user.uid}`, JSON.stringify(newProfile));
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

  const deductCredit = (amount: number) => {
    if (userProfile.credits >= amount) {
      handleProfileSave({ ...userProfile, credits: userProfile.credits - amount }, false);
      return true;
    }
    return false;
  };

  const calculateCost = (targetMode: AppMode, data: StudyRequestData): number => {
    if (targetMode === AppMode.SUMMARY) return 10;
    
    if (targetMode === AppMode.ESSAY) {
      return 10 + (data.includeImages ? 5 : 0);
    }
    
    if (targetMode === AppMode.QUIZ) {
      // Challenge Mode: 10+ Hard questions is Free to enter
      if ((data.questionCount || 0) >= 10 && data.difficulty === 'Hard') return 0;
      
      let cost = 10;
      const qCount = data.questionCount || 5;
      if (qCount > 10) cost += 5;
      if (data.difficulty === 'Hard') cost += 5;
      return cost;
    }
    return 0;
  };

  const addToHistory = (type: AppMode, content: any) => {
    const newId = Date.now().toString();
    setHistory(prev => [{ id: newId, type, title: formData.chapterName || 'Untitled', subtitle: `${formData.gradeClass} • ${formData.subject}`, timestamp: Date.now(), content, formData: { ...formData } }, ...prev]);
    setCurrentHistoryId(newId);
  };

  const handleQuizComplete = (score: number) => {
    if (currentHistoryId) {
      setHistory(prev => prev.map(item => item.id === currentHistoryId ? { ...item, score } : item));

      // Challenge Logic: 10+ Questions, Hard Difficulty, >75% Score
      if ((formData.questionCount || 0) >= 10 && formData.difficulty === 'Hard') {
        const total = formData.questionCount || 10;
        const percentage = (score / total) * 100;
        
        if (percentage > 75) {
            const bonus = 50;
            const newCredits = userProfile.credits + bonus;
            handleProfileSave({ ...userProfile, credits: newCredits }, false);
            
            setTimeout(() => {
              alert(`🎉 CHALLENGE MASTERED! 🎉\n\nYou scored ${score}/${total} (${percentage.toFixed(0)}%) and earned ${bonus} credits!`);
            }, 1000);
        } else {
             setTimeout(() => {
              alert(`Challenge Attempted: You scored ${percentage.toFixed(0)}%. Score >75% to earn the 50 credit bonus! Keep practicing!`);
            }, 1000);
        }
      }
    }
  };

  const handleGenerate = async () => {
    if (!user) { setShowAuthModal(true); return; }
    
    const cost = calculateCost(mode, formData);
    if (userProfile.credits < cost) { setError(`Insufficient credits. Requires ${cost}, you have ${userProfile.credits}.`); return; }
    if (!process.env.API_KEY && needsKeySelection) { setError("Please select an API Key from Settings to continue."); return; }
    if (!formData.subject || !formData.gradeClass || !formData.chapterName) { setError("Fill in Subject, Class, and Chapter."); return; }
    
    setLoading(true);
    setError(null);
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
        deductCredit(cost);
      } else if (mode === AppMode.ESSAY) {
        setEssayContent('');
        const stream = await GeminiService.generateEssayStream(formData);
        let text = '';
         for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) { text += c.text; setEssayContent(text); }
        }
        
        // Handle Essay Image Generation
        if (formData.includeImages) {
          try {
             const imageBase64 = await GeminiService.generateImage(`${formData.chapterName} - ${formData.subject}`);
             if (imageBase64) { 
               text += `\n\n![${formData.chapterName} Illustration](${imageBase64})`; 
               setEssayContent(text); 
             }
          } catch (e) {
             console.error("Image gen failed", e);
             text += `\n\n*(Image generation failed, but here is your essay)*`;
             setEssayContent(text); 
          }
        }
        
        addToHistory(AppMode.ESSAY, text);
        deductCredit(cost);
      } else if (mode === AppMode.QUIZ) {
        setQuizData(null);
        const questions = await GeminiService.generateQuiz(formData);
        setQuizData(questions);
        addToHistory(AppMode.QUIZ, questions);
        deductCredit(cost);
      }
    } catch (err: any) {
      let errorMessage = err.message || "Failed to generate content.";
      if (errorMessage.includes("Requested entity was not found")) {
         setNeedsKeySelection(true);
         errorMessage = "API key configuration issue. Please re-select your API key in Settings.";
      }
      setError(errorMessage);
    } finally { setLoading(false); }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    if (item.formData) setFormData(item.formData);
    setCurrentHistoryId(item.id);
    if (item.type === AppMode.SUMMARY) { setSummaryContent(item.content); setMode(AppMode.SUMMARY); }
    else if (item.type === AppMode.ESSAY) { setEssayContent(item.content); setMode(AppMode.ESSAY); }
    else if (item.type === AppMode.QUIZ) { setQuizData(item.content); setExistingQuizScore(item.score); setMode(AppMode.QUIZ); }
    else if (item.type === AppMode.TUTOR) setMode(AppMode.TUTOR);
  };

  const handleLogout = async () => { try { await signOut(auth); setMode(AppMode.DASHBOARD); setDashboardView('OVERVIEW'); } catch (error) { } };

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

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Welcome back, {userProfile.displayName || 'Scholar'}! 👋</h2>
           <p className="text-slate-500 dark:text-slate-400">Ready to learn something new today?</p>
        </div>
        {needsKeySelection && (
           <button onClick={handleSelectKey} className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold animate-pulse">
              <Key className="w-3.5 h-3.5" /> Re-link API Key
           </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {navItems.filter(i => ![AppMode.DASHBOARD, AppMode.ABOUT, AppMode.SETTINGS].includes(i.id)).map((card) => (
          <button
            key={card.id}
            onClick={() => {
               if (card.id === AppMode.ID_CARD && !user) { setShowAuthModal(true); return; }
               setMode(card.id as AppMode);
            }}
            className="p-5 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all text-left group overflow-hidden relative"
          >
             <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                <card.icon className="w-16 h-16" />
             </div>
             <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="p-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                   <card.icon className="w-5 h-5" />
                </div>
             </div>
             <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{card.label}</h4>
             <p className="text-xs text-slate-500 flex items-center gap-1">Open tool <ChevronRight className="w-3 h-3" /></p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading && mode !== AppMode.TUTOR && !summaryContent && !essayContent && !quizData) {
      return <LoadingState mode={mode} />;
    }

    if (error && !loading) {
      return (
        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/50 p-6 rounded-2xl mb-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-rose-800 dark:text-rose-200">Something went wrong</h3>
            <p className="text-rose-600 dark:text-rose-400 text-sm mt-1">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    const renderInputSection = (modeLabel: string) => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <InputForm 
          data={formData} 
          mode={mode} 
          onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))} 
          onFillSample={() => setFormData(SAMPLE_DATA)} 
          disabled={loading} 
        />
        <button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
          Generate {modeLabel}
        </button>
      </div>
    );

    switch (mode) {
      case AppMode.DASHBOARD:
        return renderDashboard();
      case AppMode.SUMMARY:
        return summaryContent ? (
          <ResultsView content={summaryContent} isLoading={loading} title={formData.chapterName || 'Summary'} type="Summary" onBack={() => { setSummaryContent(''); setMode(AppMode.SUMMARY); }} />
        ) : renderInputSection("Summary");
      case AppMode.ESSAY:
        return essayContent ? (
          <ResultsView content={essayContent} isLoading={loading} title={formData.chapterName || 'Essay'} type="Essay" onBack={() => { setEssayContent(''); setMode(AppMode.ESSAY); }} />
        ) : renderInputSection("Essay");
      case AppMode.QUIZ:
        return quizData ? (
          <QuizView 
            questions={quizData} 
            onReset={() => { setQuizData(null); setExistingQuizScore(undefined); }} 
            onComplete={(score) => handleQuizComplete(score)}
            existingScore={existingQuizScore}
          />
        ) : renderInputSection("Quiz");
      case AppMode.TUTOR:
        return <TutorChat onDeductCredit={deductCredit} currentCredits={userProfile.credits} />;
      case AppMode.PROFILE:
        return <ProfileView profile={userProfile} email={user?.email || null} onSave={handleProfileSave} isOnboarding={isNewUser} />;
      case AppMode.NOTES:
        return <NotesView userId={user?.uid || null} onDeductCredit={deductCredit} />;
      case AppMode.SETTINGS:
        return <SettingsView userProfile={userProfile} onLogout={handleLogout} onNavigateToProfile={() => setMode(AppMode.PROFILE)} onOpenPremium={() => setShowPremiumModal(true)} />;
      case AppMode.ABOUT:
        return <AboutView />;
      case AppMode.ID_CARD:
        return <IdCardView userProfile={userProfile} email={user?.email || null} />;
      default:
        return renderDashboard();
    }
  };

  if (authLoading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><Logo className="animate-bounce" iconOnly /></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans flex text-slate-900 dark:text-slate-100">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col p-4">
          <div className="mb-8 cursor-pointer" onClick={() => setMode(AppMode.DASHBOARD)}>
            <Logo showText />
          </div>
          <div className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { if (item.id !== AppMode.DASHBOARD && item.id !== AppMode.ABOUT && !user) setShowAuthModal(true); else setMode(item.id); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${mode === item.id ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            {user ? (
               <button onClick={() => setMode(AppMode.PROFILE)} className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">{(userProfile.displayName || 'U').charAt(0)}</div>
                  <div className="text-left"><p className="text-xs font-bold">{userProfile.displayName || 'Scholar'}</p></div>
               </button>
            ) : <button onClick={() => setShowAuthModal(true)} className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-bold">Sign In</button>}
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-5 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu className="w-5 h-5" /></button>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{navItems.find(n => n.id === mode)?.label || 'SJ Tutor AI'}</h2>
          <div className="flex items-center gap-3">
             {needsKeySelection && <button onClick={handleSelectKey} className="p-2 text-amber-500 hover:bg-amber-50 rounded-full" title="Set API Key"><Key className="w-5 h-5" /></button>}
             {user && <div className="flex items-center gap-1 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs font-bold"><Zap className="w-3 h-3 fill-current" /> {userProfile.credits}</div>}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
           <div className="max-w-4xl mx-auto">{renderContent()}</div>
        </div>
      </main>
      {showAuthModal && <Auth onClose={() => setShowAuthModal(false)} onSignUpSuccess={handleSignUpSuccess} />}
      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} onPaymentSuccess={handlePaymentSuccess} />}
    </div>
  );
};

export default App;