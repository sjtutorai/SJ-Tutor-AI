
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
import LandingPage from './components/LandingPage';
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
  CreditCard
} from 'lucide-react';
import { GenerateContentResponse } from '@google/genai';

const THEME_COLORS: Record<string, Record<string, string>> = {
  Gold: { 50: '#FFFAF0', 100: '#FDF5E6', 200: '#FEEBC8', 300: '#FBD38D', 400: '#F6AD55', 500: '#D4AF37', 600: '#B7950B', 700: '#975A16', 800: '#744210', 900: '#742A2A' },
  Blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
  Emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' },
  Violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' },
  Rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' }
};

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  
  // Initialize form data with language/board from settings
  const [formData, setFormData] = useState<StudyRequestData>(() => {
    const s = SettingsService.getSettings();
    return {
      ...INITIAL_FORM_DATA,
      language: s.learning.language || INITIAL_FORM_DATA.language,
      board: s.learning.board || 'CBSE'
    };
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: '', phoneNumber: '', institution: '', credits: 100, bio: '', planType: 'Free'
  });

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

  // Notification Timer
  const lastNotificationCheck = useRef(Date.now());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const lastCheck = lastNotificationCheck.current;
      const key = user ? `reminders_${user.uid}` : 'reminders_guest';
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const items = JSON.parse(stored);
          items.forEach((item: any) => {
            if (!item.completed && item.dueTime) {
              const due = new Date(item.dueTime).getTime();
              if (due > lastCheck && due <= now) {
                if (Notification.permission === "granted") {
                  new Notification("SJ Tutor AI Reminder", { body: item.task, icon: SJTUTOR_AVATAR });
                }
              }
            }
          });
        }
      } catch (e) {}
      lastNotificationCheck.current = now;
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const syncSettings = () => {
      const s = SettingsService.getSettings();
      setFormData(prev => ({ ...prev, language: s.learning.language, board: s.learning.board }));
    };
    syncSettings();
    window.addEventListener('settings-changed', syncSettings);
    return () => window.removeEventListener('settings-changed', syncSettings);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const s = SettingsService.getSettings();
      const isDark = s.appearance.theme === 'Dark' || (s.appearance.theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
      const palette = THEME_COLORS[s.appearance.primaryColor || 'Gold'] || THEME_COLORS['Gold'];
      Object.entries(palette).forEach(([shade, value]) => document.documentElement.style.setProperty(`--color-primary-${shade}`, value));
      document.documentElement.style.setProperty('--font-sans', s.appearance.fontFamily || 'Inter');
    };
    applyTheme();
    window.addEventListener('settings-changed', applyTheme);
    return () => window.removeEventListener('settings-changed', applyTheme);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`profile_${user.uid}`);
      if (saved) setUserProfile(JSON.parse(saved));
      const hist = localStorage.getItem(`history_${user.uid}`);
      if (hist) setHistory(JSON.parse(hist));
    }
  }, [user]);

  useEffect(() => {
    if (user) localStorage.setItem(`history_${user.uid}`, JSON.stringify(history));
  }, [history, user]);

  const handleProfileSave = (p: UserProfile, r = false) => {
    setUserProfile(p);
    if (user) localStorage.setItem(`profile_${user.uid}`, JSON.stringify(p));
    if (r) setMode(AppMode.DASHBOARD);
  };

  const handleFormChange = (f: keyof StudyRequestData, v: any) => setFormData(prev => ({ ...prev, [f]: v }));

  /**
   * Generates a contextually accurate education example based on 
   * the student's preferred subject, grade, and board.
   */
  const handleFillSample = () => {
    const s = SettingsService.getSettings();
    const subject = s.learning.preferredSubject || 'Science';
    const grade = s.learning.grade || '10th';
    const board = s.learning.board || 'CBSE';
    const language = s.learning.language || 'English';

    let chapter = "Introduction to Academic Learning";
    const subLower = subject.toLowerCase();
    const gradeNum = parseInt(grade.replace(/\D/g, '')) || 10;

    if (subLower.includes('science')) {
      if (gradeNum <= 5) chapter = "Living and Non-Living Things";
      else if (gradeNum <= 8) chapter = "Synthetic Fibres and Plastics";
      else if (gradeNum === 9) chapter = "Matter in Our Surroundings";
      else if (gradeNum === 10) chapter = "Life Processes: Nutrition and Respiration";
      else chapter = "The Fundamental Unit of Life: Cell Biology";
    } else if (subLower.includes('math')) {
      if (gradeNum <= 5) chapter = "Fractions and Decimals";
      else if (gradeNum <= 8) chapter = "Algebraic Expressions";
      else if (gradeNum === 10) chapter = "Trigonometric Ratios and Identities";
      else chapter = "Linear Equations and Quadratic Formulas";
    } else if (subLower.includes('history') || subLower.includes('social')) {
      if (gradeNum <= 8) chapter = "The Mughal Empire";
      else if (gradeNum === 9) chapter = "The French Revolution and Democracy";
      else if (gradeNum === 10) chapter = "Nationalism in India: Civil Disobedience";
      else chapter = "Modern World History: World War II";
    } else if (subLower.includes('geography')) {
      if (gradeNum <= 8) chapter = "Natural Vegetation and Wildlife";
      else if (gradeNum === 10) chapter = "Resources and Development";
      else chapter = "Climate: Global Patterns";
    } else if (subLower.includes('computer') || subLower.includes('coding')) {
      if (gradeNum <= 8) chapter = "Introduction to Scratch Programming";
      else if (gradeNum <= 10) chapter = "Basic HTML and CSS Structure";
      else chapter = "Introduction to Python: Loops and Logic";
    } else if (subLower.includes('english')) {
      chapter = "Modern Literature: Poetical Devices and Prose";
    }

    setFormData({
      ...INITIAL_FORM_DATA,
      subject,
      gradeClass: grade,
      board,
      language,
      chapterName: chapter,
      questionCount: mode === AppMode.QUIZ ? 10 : 5,
      difficulty: s.learning.difficulty || 'Medium',
      includeImages: mode === AppMode.ESSAY
    });
  };

  const handleGenerate = async () => {
    if (!user) { setShowAuthModal(true); return; }
    const cost = mode === AppMode.SUMMARY ? 10 : mode === AppMode.ESSAY ? (formData.includeImages ? 15 : 10) : 12;
    if (userProfile.credits < cost) { setError(`Need ${cost} credits.`); return; }
    if (!formData.subject || !formData.gradeClass || !formData.chapterName) { setError("Fill required fields."); return; }
    
    setLoading(true); setError(null);
    try {
      if (mode === AppMode.SUMMARY) {
        setSummaryContent('');
        const stream = await GeminiService.generateSummaryStream(formData);
        let t = '';
        for await (const c of stream) { if (c.text) { t += c.text; setSummaryContent(t); } }
        addToHistory(AppMode.SUMMARY, t);
        handleProfileSave({ ...userProfile, credits: userProfile.credits - cost });
      } else if (mode === AppMode.ESSAY) {
        setEssayContent('');
        const stream = await GeminiService.generateEssayStream(formData);
        let t = '';
        for await (const c of stream) { if (c.text) { t += c.text; setEssayContent(t); } }
        if (formData.includeImages) {
          const img = await GeminiService.generateImage(`${formData.chapterName} - ${formData.subject}`);
          if (img) { t += `\n\n![Image](${img})`; setEssayContent(t); }
        }
        addToHistory(AppMode.ESSAY, t);
        handleProfileSave({ ...userProfile, credits: userProfile.credits - cost });
      } else if (mode === AppMode.QUIZ) {
        const qs = await GeminiService.generateQuiz(formData);
        setQuizData(qs);
        addToHistory(AppMode.QUIZ, qs);
        handleProfileSave({ ...userProfile, credits: userProfile.credits - cost });
      }
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const addToHistory = (type: AppMode, content: any) => {
    const item: HistoryItem = {
      id: Date.now().toString(),
      type, title: formData.chapterName, subtitle: `${formData.gradeClass} • ${formData.subject}`,
      timestamp: Date.now(), content, formData: { ...formData }
    };
    setHistory([item, ...history]);
    setCurrentHistoryId(item.id);
  };

  const navItems = [
    { id: AppMode.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppMode.ID_CARD, label: 'Student ID', icon: CreditCard },
    { id: AppMode.SUMMARY, label: 'Summary Gen', icon: FileText },
    { id: AppMode.QUIZ, label: 'Quiz Creator', icon: BrainCircuit },
    { id: AppMode.ESSAY, label: 'Essay Writer', icon: BookOpen },
    { id: AppMode.NOTES, label: 'Notes', icon: Calendar },
    { id: AppMode.TUTOR, label: 'AI Tutor', icon: MessageCircle },
    { id: AppMode.ABOUT, label: 'About', icon: Info },
    { id: AppMode.SETTINGS, label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    if (loading) return <LoadingState mode={mode} />;
    if (!user && mode === AppMode.DASHBOARD) return <LandingPage onGetStarted={() => setShowAuthModal(true)} />;
    
    switch (mode) {
      case AppMode.SUMMARY:
        return summaryContent ? <ResultsView title={formData.chapterName} content={summaryContent} type="Summary" isLoading={false} onBack={() => setSummaryContent('')} /> : 
        <div className="max-w-4xl mx-auto"><InputForm data={formData} mode={AppMode.SUMMARY} onChange={handleFormChange} onFillSample={handleFillSample} />
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}<button onClick={handleGenerate} className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold flex justify-center gap-2"><Sparkles className="w-5 h-5" /> Generate Summary</button></div>;
      case AppMode.ESSAY:
        return essayContent ? <ResultsView title={formData.chapterName} content={essayContent} type="Essay" isLoading={false} onBack={() => setEssayContent('')} /> : 
        <div className="max-w-4xl mx-auto"><InputForm data={formData} mode={AppMode.ESSAY} onChange={handleFormChange} onFillSample={handleFillSample} />
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}<button onClick={handleGenerate} className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold flex justify-center gap-2"><BookOpen className="w-5 h-5" /> Write Essay</button></div>;
      case AppMode.QUIZ:
        return quizData ? <QuizView questions={quizData} onReset={() => setQuizData(null)} onComplete={(s) => history.map(h => h.id === currentHistoryId ? {...h, score: s} : h)} existingScore={existingQuizScore} /> : 
        <div className="max-w-4xl mx-auto"><InputForm data={formData} mode={AppMode.QUIZ} onChange={handleFormChange} onFillSample={handleFillSample} />
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}<button onClick={handleGenerate} className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold flex justify-center gap-2"><BrainCircuit className="w-5 h-5" /> Generate Quiz</button></div>;
      /* Fixed: Corrected 'userProfileProfile' to 'userProfile' on the next line */
      case AppMode.TUTOR: return <TutorChat currentCredits={userProfile.credits} onDeductCredit={(a) => { if(userProfile.credits >= a) { handleProfileSave({...userProfile, credits: userProfile.credits - a}); return true; } return false; }} />;
      case AppMode.NOTES: return <NotesView userId={user?.uid || null} onDeductCredit={(a) => { if(userProfile.credits >= a) { handleProfileSave({...userProfile, credits: userProfile.credits - a}); return true; } return false; }} />;
      case AppMode.PROFILE: return <ProfileView profile={userProfile} email={user?.email || 'Guest'} onSave={handleProfileSave} />;
      case AppMode.SETTINGS: return <SettingsView userProfile={userProfile} onLogout={async () => { await signOut(auth); setMode(AppMode.DASHBOARD); }} onNavigateToProfile={() => setMode(AppMode.PROFILE)} onOpenPremium={() => setShowPremiumModal(true)} />;
      case AppMode.ABOUT: return <AboutView />;
      case AppMode.ID_CARD: return <IdCardView userProfile={userProfile} email={user?.email} />;
      default: return <div className="text-center py-20"><h2 className="text-2xl font-bold">Welcome, {userProfile.displayName || 'Scholar'}!</h2><p className="text-slate-500">Pick a module from the sidebar to start.</p></div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-slate-100 transition-colors">
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col p-5">
          <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => setMode(AppMode.DASHBOARD)}><Logo className="w-10 h-10" iconOnly /><div><h1 className="text-lg font-bold leading-none">SJ Tutor AI</h1><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Study Buddy</p></div></div>
          <nav className="flex-1 space-y-1">{navItems.map(n => <button key={n.id} onClick={() => { setMode(n.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === n.id ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><n.icon className="w-4 h-4" /> {n.label}</button>)}</nav>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-between px-6 backdrop-blur-md">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-100 dark:border-amber-800"><Zap className="w-4 h-4 text-amber-500 fill-amber-500" /><span className="text-xs font-bold text-amber-700 dark:text-amber-400">{userProfile.credits}</span></div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{renderContent()}</div>
      </main>
      {showAuthModal && <Auth onClose={() => setShowAuthModal(false)} onSignUpSuccess={(d) => handleProfileSave({...userProfile, ...d})} />}
      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} onPaymentSuccess={(c, p) => handleProfileSave({...userProfile, credits: userProfile.credits + c, planType: p})} />}
    </div>
  );
};

export default App;
