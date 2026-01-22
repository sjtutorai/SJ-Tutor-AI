
import React, { useState, useEffect } from 'react';
import { 
  AppMode, 
  StudyRequestData, 
  INITIAL_FORM_DATA, 
  QuizQuestion, 
  UserProfile,
  HistoryItem,
  SJTUTOR_AVATAR
} from './types';
import { GeminiService } from './services/geminiService';
import { SettingsService } from './services/settingsService';
import InputForm from './components/InputForm';
import ResultsView from './components/ResultsView';
import QuizView from './components/QuizView';
import TutorChat from './components/TutorChat';
import Auth from './components/Auth';
import ProfileView from './components/ProfileView';
import LoadingState from './components/LoadingState';
import PremiumModal from './components/PremiumModal';
import NotesView from './components/NotesView';
import SettingsView from './components/SettingsView';
import Logo from './components/Logo';
import { 
  Menu, X, LogOut, User, Settings, LayoutDashboard, 
  FileText, BrainCircuit, BookOpen, MessageCircle, 
  Calendar, Zap, ChevronRight, Plus, ArrowLeft, Clock, Eye 
} from 'lucide-react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { GenerateContentResponse } from '@google/genai';

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Scholar',
  phoneNumber: '',
  institution: '',
  grade: '',
  bio: 'Ready to learn!',
  credits: 10, // Free starting credits
  planType: 'Free'
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

function App() {
  // Auth & User State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // App Navigation State
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [dashboardView, setDashboardView] = useState<AppMode | 'OVERVIEW'>('OVERVIEW');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Content Generation State
  const [formData, setFormData] = useState<StudyRequestData>(INITIAL_FORM_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Results State
  const [summaryContent, setSummaryContent] = useState('');
  const [essayContent, setEssayContent] = useState('');
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [existingQuizScore, setExistingQuizScore] = useState<number | undefined>(undefined);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  // Theme Management
  useEffect(() => {
    const applyTheme = () => {
      const settings = SettingsService.getSettings();
      const theme = settings.appearance.theme;
      const primaryColorName = settings.appearance.primaryColor || 'Gold';
      
      const root = window.document.documentElement;
      
      // Apply Dark/Light Mode
      const isDark = theme === 'Dark' || (theme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Apply Color Variables
      const palette = THEME_COLORS[primaryColorName] || THEME_COLORS['Gold'];
      Object.entries(palette).forEach(([shade, value]) => {
        root.style.setProperty(`--color-primary-${shade}`, value);
      });
    };

    // Apply initially
    applyTheme();

    // Listen for settings changes from SettingsService
    window.addEventListener('settings-changed', applyTheme);
    
    // Listen for system changes if needed
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
       if (SettingsService.getSettings().appearance.theme === 'System') applyTheme();
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    
    return () => {
      window.removeEventListener('settings-changed', applyTheme);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load user profile from local storage for now (would be DB in real app)
        const savedProfile = localStorage.getItem(`profile_${currentUser.uid}`);
        if (savedProfile) {
          setUserProfile(JSON.parse(savedProfile));
        } else {
          // Initialize default profile for new user
          setUserProfile(prev => ({ 
             ...prev, 
             displayName: currentUser.displayName || 'Scholar',
             photoURL: currentUser.photoURL || undefined
          }));
        }

        // Load History
        const savedHistory = localStorage.getItem(`history_${currentUser.uid}`);
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        
        setShowAuthModal(false);
      } else {
        setUserProfile(DEFAULT_PROFILE);
        setHistory([]);
        setMode(AppMode.DASHBOARD);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save profile changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(userProfile));
    }
  }, [userProfile, user]);

  // Save history changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`history_${user.uid}`, JSON.stringify(history));
    }
  }, [history, user]);

  const handleInputChange = (field: keyof StudyRequestData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const deductCredits = (amount: number): boolean => {
    if (userProfile.credits >= amount) {
      setUserProfile(prev => ({ ...prev, credits: prev.credits - amount }));
      return true;
    }
    setShowPremiumModal(true);
    return false;
  };

  const addToHistory = (type: AppMode, title: string, subtitle: string, content: any, score?: number) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      type,
      title,
      subtitle,
      timestamp: Date.now(),
      content,
      formData: { ...formData },
      score
    };
    setHistory(prev => [newItem, ...prev]);
    setCurrentHistoryId(newItem.id);
  };

  const handleGenerate = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!formData.subject || !formData.chapterName) {
      setError("Please fill in at least the Subject and Chapter Name.");
      return;
    }

    setError(null);
    setSummaryContent('');
    setEssayContent('');
    setQuizData(null);
    setIsLoading(true);
    setCurrentHistoryId(null); // Reset history ID so we know this is a fresh generation

    try {
      if (mode === AppMode.SUMMARY) {
        if (!deductCredits(10)) { setIsLoading(false); return; }
        
        const stream = await GeminiService.generateSummaryStream(formData);
        let text = '';
        for await (const chunk of stream) {
            const responseChunk = chunk as GenerateContentResponse;
            if (responseChunk.text) {
                text += responseChunk.text;
                setSummaryContent(text);
            }
        }
        addToHistory(AppMode.SUMMARY, formData.chapterName, formData.subject, text);

      } else if (mode === AppMode.ESSAY) {
        const cost = formData.includeImages ? 15 : 10;
        if (!deductCredits(cost)) { setIsLoading(false); return; }

        const stream = await GeminiService.generateEssayStream(formData);
        let text = '';
        for await (const chunk of stream) {
            const responseChunk = chunk as GenerateContentResponse;
            if (responseChunk.text) {
                text += responseChunk.text;
                setEssayContent(text);
            }
        }
        
        // Generate Image if requested
        if (formData.includeImages) {
           const imageBase64 = await GeminiService.generateImage(`${formData.chapterName} - ${formData.subject}`);
           if (imageBase64) {
              const imageMarkdown = `\n\n![Generated Image](${imageBase64})\n\n`;
              text = imageMarkdown + text;
              setEssayContent(text);
           }
        }
        addToHistory(AppMode.ESSAY, formData.chapterName, formData.subject, text);

      } else if (mode === AppMode.QUIZ) {
        let cost = 10;
        const qCount = formData.questionCount || 5;
        cost += Math.ceil(qCount / 2);
        if (formData.difficulty === 'Hard') cost += 5;

        if (!deductCredits(cost)) { setIsLoading(false); return; }

        const questions = await GeminiService.generateQuiz(formData);
        setQuizData(questions);
        // History for quiz is added when completed/viewed results usually, 
        // but here we add it initially. Score updated later.
        // We'll handle saving quiz history on completion to include score.
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please check your inputs or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = (score: number) => {
    // Check for reward on fresh quiz attempt
    const questionsCount = quizData?.length || 0;
    const isPerfectScore = score === questionsCount;
    
    // Only reward if it's a fresh quiz (no history ID yet) and perfect score
    if (!currentHistoryId && isPerfectScore && questionsCount > 0) {
       setUserProfile(prev => ({
          ...prev,
          credits: prev.credits + 5
       }));
       // Note: The UI feedback for this is handled in QuizView via props, 
       // but we updated the profile here.
    }

    if (!currentHistoryId) {
      // New Quiz
      addToHistory(AppMode.QUIZ, formData.chapterName, formData.subject, quizData, score);
    } else {
      // Update existing history item
      addToHistory(AppMode.QUIZ, formData.chapterName, formData.subject, quizData, score);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setMode(item.type);
    setFormData(item.formData || INITIAL_FORM_DATA);
    setCurrentHistoryId(item.id);
    
    if (item.type === AppMode.SUMMARY) setSummaryContent(item.content);
    else if (item.type === AppMode.ESSAY) setEssayContent(item.content);
    else if (item.type === AppMode.QUIZ) {
      setQuizData(item.content);
      setExistingQuizScore(item.score);
    }
    
    setDashboardView('OVERVIEW'); // Reset dashboard view if navigating from there
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMode(AppMode.DASHBOARD);
    setUserProfile(DEFAULT_PROFILE);
  };

  const fillSampleData = () => {
    setFormData({
      subject: 'Physics',
      gradeClass: '10th',
      board: 'CBSE',
      language: 'English',
      chapterName: 'Light - Reflection and Refraction',
      author: 'NCERT',
      questionCount: 5,
      difficulty: 'Medium',
      includeImages: false
    });
  };

  const renderSidebar = () => (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
           <Logo showText textColor="text-slate-900 dark:text-white" />
           <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500 dark:text-slate-400">
             <X className="w-6 h-6" />
           </button>
        </div>

        <div className="px-4 mb-6">
          <div className="bg-primary-50 dark:bg-slate-800 rounded-xl p-4 border border-primary-100 dark:border-slate-700">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center border border-primary-100 dark:border-slate-600 shadow-sm overflow-hidden">
                   {user ? (
                     <img src={userProfile.photoURL || SJTUTOR_AVATAR} alt="Profile" className="w-full h-full object-cover" />
                   ) : (
                     <User className="w-5 h-5 text-primary-300 dark:text-slate-400" />
                   )}
                </div>
                <div className="overflow-hidden">
                   <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{user ? userProfile.displayName : 'Guest'}</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user ? userProfile.planType : 'Sign in to save'}</p>
                </div>
             </div>
             
             {user ? (
               <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg px-3 py-1.5 border border-primary-100 dark:border-slate-700">
                  <div className="flex items-center gap-1.5">
                     <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                     <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{userProfile.credits} Credits</span>
                  </div>
                  <button 
                    onClick={() => setShowPremiumModal(true)}
                    className="text-[10px] font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 uppercase"
                  >
                    + Add
                  </button>
               </div>
             ) : (
               <button 
                 onClick={() => setShowAuthModal(true)}
                 className="w-full py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors"
               >
                 Sign In / Join
               </button>
             )}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
           <button 
             onClick={() => { setMode(AppMode.DASHBOARD); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === AppMode.DASHBOARD ? 'bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
           >
             <LayoutDashboard className="w-4 h-4" />
             Dashboard
           </button>
           
           <div className="pt-4 pb-2 px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Create</div>
           
           <button 
             onClick={() => { setMode(AppMode.SUMMARY); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === AppMode.SUMMARY ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
           >
             <FileText className="w-4 h-4" />
             Summary Generator
           </button>
           <button 
             onClick={() => { setMode(AppMode.QUIZ); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === AppMode.QUIZ ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
           >
             <BrainCircuit className="w-4 h-4" />
             Quiz Maker
           </button>
           <button 
             onClick={() => { setMode(AppMode.ESSAY); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === AppMode.ESSAY ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
           >
             <BookOpen className="w-4 h-4" />
             Essay Writer
           </button>
           <button 
             onClick={() => { setMode(AppMode.TUTOR); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === AppMode.TUTOR ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
           >
             <MessageCircle className="w-4 h-4" />
             AI Tutor Chat
           </button>

           <div className="pt-4 pb-2 px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tools</div>

           <button 
             onClick={() => { setMode(AppMode.NOTES); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === AppMode.NOTES ? 'bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
           >
             <Calendar className="w-4 h-4" />
             Planner & Notes
           </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
           {user && (
             <button 
               onClick={() => { setMode(AppMode.PROFILE); setIsSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === AppMode.PROFILE ? 'bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
             >
               <User className="w-4 h-4" />
               Profile
             </button>
           )}
           <button 
             onClick={() => { setMode(AppMode.SETTINGS); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === AppMode.SETTINGS ? 'bg-slate-100 dark:bg-slate-800 text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
           >
             <Settings className="w-4 h-4" />
             Settings
           </button>
           {user && (
             <button 
               onClick={handleLogout}
               className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
             >
               <LogOut className="w-4 h-4" />
               Sign Out
             </button>
           )}
        </div>
      </aside>
    </>
  );

  const renderDashboard = () => {
    // Determine the count for Notes locally
    const noteCount = (() => {
       try {
         const key = user ? `notes_${user.uid}` : 'notes_guest';
         const saved = localStorage.getItem(key);
         return saved ? JSON.parse(saved).length : 0;
       } catch { return 0; }
    })();

    const stats = {
      summaries: history.filter(h => h.type === AppMode.SUMMARY).length,
      quizzes: history.filter(h => h.type === AppMode.QUIZ).length,
      essays: history.filter(h => h.type === AppMode.ESSAY).length,
      chats: history.filter(h => h.type === AppMode.TUTOR).length,
    };

    const dashboardCards = [
      { id: AppMode.SUMMARY, label: 'Summaries', count: stats.summaries, icon: FileText, color: 'text-amber-800 dark:text-amber-300', bg: 'bg-[#FDF5E6] dark:bg-amber-900/30' },
      { id: AppMode.QUIZ, label: 'Quizzes', count: stats.quizzes, icon: BrainCircuit, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-[#FDF5E6] dark:bg-amber-900/30' },
      { id: AppMode.ESSAY, label: 'Essays', count: stats.essays, icon: BookOpen, color: 'text-amber-600 dark:text-amber-500', bg: 'bg-[#FDF5E6] dark:bg-amber-900/30' },
      { id: AppMode.TUTOR, label: 'Chats', count: stats.chats, icon: MessageCircle, color: 'text-amber-900 dark:text-amber-200', bg: 'bg-[#FDF5E6] dark:bg-amber-900/30' },
      { id: AppMode.NOTES, label: 'Notes', count: noteCount, icon: Calendar, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-[#FDF5E6] dark:bg-emerald-900/30' },
    ];

    if (dashboardView !== 'OVERVIEW') {
      const filteredHistory = history.filter(h => h.type === dashboardView);
      const categoryLabel = dashboardCards.find(c => c.id === dashboardView)?.label || 'History';
      const getSingularName = (view: AppMode) => {
        switch(view) {
            case AppMode.SUMMARY: return 'Summary';
            case AppMode.QUIZ: return 'Quiz';
            case AppMode.ESSAY: return 'Essay';
            case AppMode.TUTOR: return 'Chat';
            default: return 'Item';
        }
      };

      return (
        <div className="relative z-10 animate-in fade-in slide-in-from-right-8 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
          <button 
            onClick={() => setDashboardView('OVERVIEW')}
            className="flex items-center text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-all hover:-translate-x-1 group text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mr-2 border border-slate-100 dark:border-slate-700 group-hover:border-primary-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-400" />
            {categoryLabel} History
          </h3>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl border border-slate-200/60 dark:border-slate-700 border-dashed animate-in zoom-in duration-500">
              <div className="w-16 h-16 bg-primary-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-100 dark:border-slate-600 p-1">
                 <Logo className="w-full h-full" iconOnly />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-5 text-sm">No {categoryLabel.toLowerCase()} found yet.</p>

              <button
                onClick={() => {
                  setSummaryContent('');
                  setEssayContent('');
                  setQuizData(null);
                  setExistingQuizScore(undefined);
                  setCurrentHistoryId(null);
                  setError(null);
                  setFormData(INITIAL_FORM_DATA);
                  setMode(dashboardView as AppMode);
                  setDashboardView('OVERVIEW');
                }}
                className="inline-flex items-center px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20 shadow-primary-500/20 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New {getSingularName(dashboardView as AppMode)}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredHistory.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex justify-between items-center group cursor-pointer"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => loadHistoryItem(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center bg-primary-100 dark:bg-slate-700 text-primary-600 dark:text-primary-400`}>
                      {item.type === AppMode.QUIZ ? <BrainCircuit className="w-4 h-4" /> :
                       item.type === AppMode.SUMMARY ? <FileText className="w-4 h-4" /> :
                       item.type === AppMode.ESSAY ? <BookOpen className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-white mb-0.5 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span className="font-medium bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">{item.subtitle}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        {item.type === AppMode.QUIZ && item.score !== undefined && (
                          <span className="flex items-center gap-1 text-primary-600 font-bold bg-primary-50 dark:bg-slate-900 px-2 py-0.5 rounded-full">
                            Score: {item.score}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <Eye className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Hero Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 dark:bg-slate-700 rounded-full -mr-16 -mt-16 blur-3xl opacity-60 group-hover:scale-110 transition-transform duration-700"></div>
           
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                 <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
                   Welcome to <span className="text-primary-600 dark:text-primary-400">SJ Tutor AI</span>
                 </h2>
                 <p className="text-slate-500 dark:text-slate-400 text-lg mb-6 max-w-3xl">
                   {user 
                     ? `Welcome back, ${userProfile.displayName || 'Scholar'}! Ready to continue your learning journey?` 
                     : "Your intelligent study companion. Generate summaries, take quizzes, write essays, and chat with an AI Tutor."}
                 </p>
                 
                 <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {user ? (
                       <button 
                          onClick={() => setMode(AppMode.TUTOR)}
                          className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:hover:bg-slate-600 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                       >
                          <MessageCircle className="w-4 h-4" />
                          Chat with Tutor
                       </button>
                    ) : (
                       <button 
                          onClick={() => setShowAuthModal(true)}
                          className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                       >
                          <LogOut className="w-4 h-4 rotate-180" />
                          Sign In / Sign Up
                       </button>
                    )}
                 </div>
              </div>
              
              <div className="relative w-32 h-32 md:w-48 md:h-48 flex-shrink-0">
                 <div className="absolute inset-0 bg-primary-200 dark:bg-primary-900 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                 <Logo className="w-full h-full shadow-xl" iconOnly />
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {dashboardCards.map((card) => (
            <button
              key={card.id}
              onClick={() => {
                 if (!user) {
                    setShowAuthModal(true);
                    return;
                 }
                 if (card.id === AppMode.NOTES) {
                    setMode(AppMode.NOTES);
                 } else {
                    setDashboardView(card.id);
                 }
              }}
              className={`p-5 rounded-xl border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all hover:shadow-md text-left group bg-white dark:bg-slate-800 shadow-sm border-slate-100 dark:border-slate-700 relative overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${card.color}`}>
                 <card.icon className="w-16 h-16" />
              </div>
              <div className="flex justify-between items-start mb-3 relative z-10">
                 <div className={`p-2.5 rounded-lg shadow-sm ${card.color} ${card.bg}`}>
                    <card.icon className="w-5 h-5" />
                 </div>
                 <span className="text-2xl font-bold text-slate-800 dark:text-white">{card.count}</span>
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 relative z-10">{card.label}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1 relative z-10">
                View Details <ChevronRight className="w-3 h-3" />
              </p>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in slide-in-from-bottom-6 duration-700">
           <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              Quick Actions
           </h3>
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button 
                onClick={() => {
                   if(!user) setShowAuthModal(true);
                   else setMode(AppMode.SUMMARY);
                }} 
                className="p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-amber-100 dark:hover:border-amber-900 group"
              >
                 <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                 </div>
                 New Summary
              </button>
              <button 
                onClick={() => {
                   if(!user) setShowAuthModal(true);
                   else setMode(AppMode.QUIZ);
                }} 
                className="p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-emerald-100 dark:hover:border-emerald-900 group"
              >
                 <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <BrainCircuit className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                 </div>
                 New Quiz
              </button>
               <button 
                onClick={() => {
                   if(!user) setShowAuthModal(true);
                   else setMode(AppMode.ESSAY);
                }} 
                className="p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-blue-100 dark:hover:border-blue-900 group"
              >
                 <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                 </div>
                 Write Essay
              </button>
              <button 
                onClick={() => {
                   if(!user) setShowAuthModal(true);
                   else setMode(AppMode.TUTOR);
                }} 
                className="p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-400 rounded-xl text-sm font-medium transition-colors text-slate-600 dark:text-slate-300 flex flex-col items-center gap-2 border border-slate-100 dark:border-slate-600 hover:border-purple-100 dark:hover:border-purple-900 group"
              >
                 <div className="p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                 </div>
                 Ask Tutor
              </button>
           </div>
        </div>
      </div>
    );
  };

  const getMainContent = () => {
    if (isLoading) return <LoadingState mode={mode} />;

    switch (mode) {
      case AppMode.DASHBOARD:
        return renderDashboard();
      case AppMode.SUMMARY:
        return summaryContent ? (
          <ResultsView 
            content={summaryContent} 
            isLoading={false} 
            title={formData.chapterName}
            type="Summary"
            onBack={() => setSummaryContent('')} 
          />
        ) : (
          <div className="w-full h-full">
            <InputForm 
              data={formData} 
              mode={mode} 
              onChange={handleInputChange} 
              onFillSample={fillSampleData}
            />
            {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl mb-4 text-sm">{error}</div>}
            <button onClick={handleGenerate} className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all flex justify-center items-center gap-2">
              <Zap className="w-5 h-5" />
              Generate Summary (10 Credits)
            </button>
          </div>
        );
      case AppMode.ESSAY:
        return essayContent ? (
          <ResultsView 
            content={essayContent} 
            isLoading={false} 
            title={formData.chapterName}
            type="Essay"
            onBack={() => setEssayContent('')} 
          />
        ) : (
          <div className="w-full h-full">
             <InputForm 
              data={formData} 
              mode={mode} 
              onChange={handleInputChange}
              onFillSample={fillSampleData}
            />
            {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl mb-4 text-sm">{error}</div>}
            <button onClick={handleGenerate} className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all flex justify-center items-center gap-2">
              <Zap className="w-5 h-5" />
              Generate Essay (10 Credits)
            </button>
          </div>
        );
      case AppMode.QUIZ:
        return quizData ? (
          <QuizView 
            questions={quizData} 
            onReset={() => {
                setQuizData(null);
                setExistingQuizScore(undefined);
            }} 
            onComplete={handleQuizComplete}
            existingScore={existingQuizScore}
          />
        ) : (
          <div className="w-full h-full">
             <InputForm 
              data={formData} 
              mode={mode} 
              onChange={handleInputChange}
              onFillSample={fillSampleData}
            />
            {error && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl mb-4 text-sm">{error}</div>}
            <button onClick={handleGenerate} className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all flex justify-center items-center gap-2">
              <Zap className="w-5 h-5" />
              Generate Quiz ({10 + Math.ceil((formData.questionCount || 5)/2) + (formData.difficulty === 'Hard' ? 5 : 0)} Credits)
            </button>
          </div>
        );
      case AppMode.TUTOR:
        return <TutorChat onDeductCredit={deductCredits} currentCredits={userProfile.credits} />;
      case AppMode.PROFILE:
        return (
           <ProfileView 
              profile={userProfile} 
              email={user?.email || null} 
              onSave={(p, redirect) => {
                 setUserProfile(p);
                 if (redirect) setMode(AppMode.DASHBOARD);
              }} 
           />
        );
      case AppMode.NOTES:
        return <NotesView userId={user?.uid || null} onDeductCredit={deductCredits} />;
      case AppMode.SETTINGS:
        return (
          <SettingsView 
             userProfile={userProfile} 
             onLogout={handleLogout} 
             onNavigateToProfile={() => setMode(AppMode.PROFILE)}
             onOpenPremium={() => setShowPremiumModal(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {renderSidebar()}

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 relative">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
               <Menu className="w-6 h-6" />
             </button>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight hidden sm:block">
               {mode === AppMode.DASHBOARD ? 'Dashboard' : 
                mode === AppMode.SUMMARY ? 'Summary Generator' : 
                mode === AppMode.QUIZ ? 'Quiz Master' : 
                mode === AppMode.ESSAY ? 'Essay Writer' :
                mode === AppMode.TUTOR ? 'AI Tutor' :
                mode === AppMode.NOTES ? 'My Notes & Plans' :
                mode === AppMode.PROFILE ? 'My Profile' : 'Settings'}
             </h1>
          </div>
          
          <div className="flex items-center gap-3">
             {mode !== AppMode.DASHBOARD && (
               <button 
                  onClick={() => setMode(AppMode.DASHBOARD)}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
               >
                 <LayoutDashboard className="w-4 h-4" />
                 Dashboard
               </button>
             )}
          </div>
        </header>

        {getMainContent()}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <Auth 
           onClose={() => setShowAuthModal(false)} 
           onSignUpSuccess={(data) => {
               if (data) {
                   setUserProfile(prev => ({ ...prev, ...data }));
               }
               setShowAuthModal(false);
           }} 
        />
      )}

      {/* Premium Modal */}
      {showPremiumModal && (
         <PremiumModal 
            onClose={() => setShowPremiumModal(false)}
            onPaymentSuccess={(credits, planName) => {
               setUserProfile(prev => ({
                   ...prev,
                   credits: prev.credits + credits,
                   planType: planName === 'STARTER' ? 'Starter' : planName === 'SCHOLAR' ? 'Scholar' : 'Achiever'
               }));
            }}
         />
      )}
    </div>
  );
}

export default App;
