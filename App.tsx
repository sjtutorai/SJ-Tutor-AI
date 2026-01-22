
import React, { useState, useEffect, useRef } from 'react';
import { AppMode, StudyRequestData, INITIAL_FORM_DATA, QuizQuestion, HistoryItem, UserProfile, SJTUTOR_AVATAR, ReminderItem } from './types';
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
  Bell
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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [formData, setFormData] = useState<StudyRequestData>(INITIAL_FORM_DATA);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({ displayName: '', phoneNumber: '', institution: '', bio: '', photoURL: '', credits: 100, planType: 'Free' });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [summaryContent, setSummaryContent] = useState('');
  const [essayContent, setEssayContent] = useState('');
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastReminderCheck = useRef(Date.now());

  // Generate Unique SJ Student ID
  const generateStudentId = (name?: string) => {
     const prefix = (name || 'USER').toUpperCase().split(' ')[0].substring(0, 5);
     const random = Math.floor(1000 + Math.random() * 9000);
     return `SJS-${prefix}-${random}`;
  };

  // Background Notification Worker
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const lastCheck = lastReminderCheck.current;
      const key = user ? `reminders_${user.uid}` : 'reminders_guest';
      
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const items: ReminderItem[] = JSON.parse(stored);
          items.forEach(item => {
            if (!item.completed && item.dueTime) {
              const due = new Date(item.dueTime).getTime();
              if (due > lastCheck && due <= now) {
                if (Notification.permission === "granted") {
                  new Notification("SJ Tutor AI: Time to Study!", {
                    body: item.aiMessage || item.task,
                    icon: SJTUTOR_AVATAR
                  });
                }
              }
            }
          });
        }
      } catch (e) { console.error(e); }
      lastReminderCheck.current = now;
    }, 15000); // Check every 15s

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const applyTheme = () => {
      const settings = SettingsService.getSettings();
      const isDark = settings.appearance.theme === 'Dark' || (settings.appearance.theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
      const palette = THEME_COLORS[settings.appearance.primaryColor || 'Gold'];
      Object.entries(palette).forEach(([shade, value]) => document.documentElement.style.setProperty(`--color-primary-${shade}`, value));
    };
    applyTheme();
    window.addEventListener('settings-changed', applyTheme);
    return () => window.removeEventListener('settings-changed', applyTheme);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        const savedProfile = localStorage.getItem(`profile_${currentUser.uid}`);
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          // If profile exists but no custom ID, generate one
          if (!parsed.customId) {
             parsed.customId = generateStudentId(parsed.displayName || currentUser.displayName || '');
             localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(parsed));
          }
          setUserProfile(parsed);
        } else {
          // Initialize new profile with ID
          const newProfile: UserProfile = {
             displayName: currentUser.displayName || '',
             customId: generateStudentId(currentUser.displayName || ''),
             phoneNumber: '',
             institution: '',
             bio: '',
             credits: 100,
             planType: 'Free'
          };
          setUserProfile(newProfile);
          localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(newProfile));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const deductCredit = (amount: number) => {
    if (userProfile.credits >= amount) {
      const updated = { ...userProfile, credits: userProfile.credits - amount };
      setUserProfile(updated);
      if (user) localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updated));
      return true;
    }
    return false;
  };

  const handleGenerate = async () => {
    if (!user) { setShowAuthModal(true); return; }
    const cost = mode === AppMode.SUMMARY ? 10 : 15;
    if (userProfile.credits < cost) { setError(`Need ${cost} credits.`); return; }
    setLoading(true);
    setError(null);
    try {
      if (mode === AppMode.SUMMARY) {
        const stream = await GeminiService.generateSummaryStream(formData);
        let text = '';
        for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          if (c.text) { text += c.text; setSummaryContent(text); }
        }
        deductCredit(cost);
      } else if (mode === AppMode.QUIZ) {
        const questions = await GeminiService.generateQuiz(formData);
        setQuizData(questions);
        deductCredit(cost);
      }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-primary-50">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex text-slate-900 dark:text-slate-100 transition-all duration-300">
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b flex items-center gap-3 cursor-pointer" onClick={() => setMode(AppMode.DASHBOARD)}>
          <Logo className="w-10 h-10" iconOnly />
          <h1 className="text-lg font-bold">SJ Tutor AI</h1>
        </div>
        <nav className="p-3 space-y-1">
          {[
            { id: AppMode.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
            { id: AppMode.SUMMARY, label: 'Summary', icon: FileText },
            { id: AppMode.QUIZ, label: 'Quiz', icon: BrainCircuit },
            { id: AppMode.NOTES, label: 'Notes & Reminders', icon: Bell },
            { id: AppMode.TUTOR, label: 'AI Tutor', icon: MessageCircle },
            { id: AppMode.SETTINGS, label: 'Settings', icon: Settings },
          ].map(item => (
            <button key={item.id} onClick={() => setMode(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === item.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-5 flex items-center justify-between sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setIsSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full border">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold">{userProfile.credits}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {loading ? <LoadingState mode={mode} /> : (
            mode === AppMode.DASHBOARD ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <h2 className="text-2xl font-bold">Study Dashboard</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { id: AppMode.SUMMARY, label: 'Summary', icon: FileText, color: 'text-blue-600' },
                    { id: AppMode.QUIZ, label: 'Quizzes', icon: BrainCircuit, color: 'text-emerald-600' },
                    { id: AppMode.NOTES, label: 'Reminders', icon: Bell, color: 'text-amber-600' },
                    { id: AppMode.TUTOR, label: 'AI Tutor', icon: MessageCircle, color: 'text-purple-600' },
                  ].map(stat => (
                    <button key={stat.id} onClick={() => setMode(stat.id)} className="p-5 bg-white dark:bg-slate-800 rounded-2xl border hover:shadow-md transition-all text-left group">
                      <stat.icon className={`w-8 h-8 ${stat.color} mb-3 group-hover:scale-110 transition-transform`} />
                      <h4 className="font-bold">{stat.label}</h4>
                    </button>
                  ))}
                </div>
              </div>
            ) : mode === AppMode.NOTES ? <NotesView userId={user?.uid || null} onDeductCredit={deductCredit} /> :
            mode === AppMode.SUMMARY ? (
              summaryContent ? <ResultsView title={formData.chapterName} content={summaryContent} type="Summary" isLoading={false} onBack={() => setSummaryContent('')} /> :
              <div className="max-w-4xl mx-auto space-y-4">
                <InputForm data={formData} mode={AppMode.SUMMARY} onChange={(f, v) => setFormData(prev => ({ ...prev, [f]: v }))} onFillSample={() => setFormData({subject: 'History', gradeClass: '10th', board: 'CBSE', language: 'English', chapterName: 'The French Revolution'})} />
                <button onClick={handleGenerate} className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" /> Generate Summary</button>
              </div>
            ) : mode === AppMode.QUIZ ? (
              quizData ? <QuizView questions={quizData} onReset={() => setQuizData(null)} /> :
              <div className="max-w-4xl mx-auto space-y-4">
                <InputForm data={formData} mode={AppMode.QUIZ} onChange={(f, v) => setFormData(prev => ({ ...prev, [f]: v }))} />
                <button onClick={handleGenerate} className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><BrainCircuit className="w-5 h-5" /> Generate Quiz</button>
              </div>
            ) : mode === AppMode.TUTOR ? <TutorChat onDeductCredit={deductCredit} currentCredits={userProfile.credits} /> :
            mode === AppMode.SETTINGS ? <SettingsView userProfile={userProfile} onLogout={() => auth.signOut()} onNavigateToProfile={() => setMode(AppMode.PROFILE)} onOpenPremium={() => setShowPremiumModal(true)} /> :
            mode === AppMode.PROFILE ? <ProfileView profile={userProfile} email={user?.email || ''} onSave={p => setUserProfile(p)} /> :
            <AboutView />
          )}
        </div>
      </main>
      {showAuthModal && <Auth onClose={() => setShowAuthModal(false)} />}
      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} onPaymentSuccess={c => setUserProfile({...userProfile, credits: userProfile.credits + c})} />}
    </div>
  );
};

export default App;
