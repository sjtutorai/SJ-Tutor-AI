
import React, { useState, useEffect } from 'react';
import { AppMode, StudyRequestData, INITIAL_FORM_DATA, QuizQuestion, HistoryItem, UserProfile } from './types';
import InputForm from './components/InputForm';
import ResultsView from './components/ResultsView';
import QuizView from './components/QuizView';
import TutorChat from './components/TutorChat';
import ProfileView from './components/ProfileView';
import Auth from './components/Auth';
import PremiumModal from './components/PremiumModal';
import LoadingState from './components/LoadingState'; 
import NotesView from './components/NotesView';
import Logo from './components/Logo';
import { GeminiService } from './services/geminiService';
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
  Sun,
  Moon
} from 'lucide-react';
import { GenerateContentResponse } from '@google/genai';

// SJTutor Avatar Constant
export const SJTUTOR_AVATAR = "https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg";

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

const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // App State
  const [mode, setMode] = useState<AppMode>(AppMode.DASHBOARD);
  const [formData, setFormData] = useState<StudyRequestData>(INITIAL_FORM_DATA);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Profile State
  const initialProfileState: UserProfile = {
    displayName: '',
    phoneNumber: '',
    institution: '',
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

  // Theme effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check API Key immediately (using required process.env.API_KEY)
  useEffect(() => {
    if (!process.env.API_KEY) {
      console.warn("API_KEY is missing in environment variables!");
      setApiKeyMissing(true);
    }
  }, []);

  // Auth Listener with Safety Timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (authLoading) {
        console.warn("Auth check timed out, defaulting to guest.");
        setAuthLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      clearTimeout(timeoutId);
      
      if (!currentUser) {
        setIsNewUser(false);
        setUserProfile(initialProfileState);
        setMode(AppMode.DASHBOARD);
      }
    }, (err) => {
      console.error("Auth Error:", err);
      setAuthLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Profile Persistence Listener
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

  // History Persistence: Load Logic
  useEffect(() => {
    const storageKey = user ? `history_${user.uid}` : 'history_guest';
    const savedHistory = localStorage.getItem(storageKey);
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        }
      } catch (e) {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [user]);

  // History Persistence: Save Logic
  useEffect(() => {
    const storageKey = user ? `history_${user.uid}` : 'history_guest';
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [history, user]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleProfileSave = (newProfile: UserProfile, redirectDashboard = false) => {
    setUserProfile(newProfile);
    if (user) {
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(newProfile));
    }
    if (isNewUser) {
      setIsNewUser(false);
      setShowAuthModal(false);
      if (redirectDashboard) {
        setMode(AppMode.DASHBOARD);
      }
    }
  };

  const handleSignUpSuccess = () => {
    setIsNewUser(true);
    setUserProfile(initialProfileState);
    setShowAuthModal(false);
  };

  const handlePaymentSuccess = (creditsToAdd: number, planName: 'STARTER' | 'SCHOLAR' | 'ACHIEVER') => {
    const planTypeMap: Record<string, 'Starter' | 'Scholar' | 'Achiever'> = {
      'STARTER': 'Starter',
      'SCHOLAR': 'Scholar',
      'ACHIEVER': 'Achiever'
    };
    const updatedProfile: UserProfile = { 
      ...userProfile, 
      credits: userProfile.credits + creditsToAdd,
      planType: planTypeMap[planName]
    };
    handleProfileSave(updatedProfile);
  };

  const handleFormChange = (field: keyof StudyRequestData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFillSample = () => {
    setFormData(SAMPLE_DATA);
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
    const newItem: HistoryItem = {
      id: newId,
      type,
      title: formData.chapterName || 'Untitled Chapter',
      subtitle: `${formData.gradeClass} • ${formData.subject}`,
      timestamp: Date.now(),
      content,
      formData: { ...formData }
    };
    setHistory(prev => [newItem, ...prev]);
    setCurrentHistoryId(newId);
  };

  const handleQuizComplete = (score: number) => {
    if (currentHistoryId) {
      setHistory(prev => prev.map(item => 
        item.id === currentHistoryId ? { ...item, score } : item
      ));
    }
  };

  const calculateCost = (targetMode: AppMode, data: StudyRequestData): number => {
    if (targetMode === AppMode.SUMMARY) return 10;
    if (targetMode === AppMode.ESSAY) {
      return data.includeImages ? 15 : 10;
    }
    if (targetMode === AppMode.QUIZ) {
      let cost = 10;
      const qCount = data.questionCount || 5;
      cost += Math.ceil(qCount / 2); 
      if (data.difficulty === 'Hard') cost += 5; 
      return cost;
    }
    return 0;
  };

  const deductCredit = (amount: number) => {
    if (userProfile.credits >= amount) {
      const updatedProfile = { ...userProfile, credits: userProfile.credits - amount };
      handleProfileSave(updatedProfile, false);
      return true;
    }
    return false;
  };

  const handleGenerate = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const cost = calculateCost(mode, formData);
    if (userProfile.credits < cost) {
      setError(`Insufficient credits. This generation requires ${cost} credits, but you have ${userProfile.credits}. Upgrade to Premium for more.`);
      return;
    }
    
    if (!process.env.API_KEY) {
      setError("Configuration Error: API_KEY is missing. Please check your environment variables.");
      return;
    }

    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    setExistingQuizScore(undefined);
    setCurrentHistoryId(null);

    try {
      if (mode === AppMode.SUMMARY) {
        setSummaryContent('');
        const stream = await GeminiService.generateSummaryStream(formData);
        
        let text = '';
        for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) {
                text += c.text;
                setSummaryContent(text);
            }
        }
        addToHistory(AppMode.SUMMARY, text);
        deductCredit(cost);

      } else if (mode === AppMode.ESSAY) {
        setEssayContent('');
        const stream = await GeminiService.generateEssayStream(formData);
        
        let text = '';
         for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) {
                text += c.text;
                setEssayContent(text);
            }
        }

        if (formData.includeImages) {
          const imageBase64 = await GeminiService.generateImage(`${formData.chapterName} - ${formData.subject}`);
          if (imageBase64) {
            text += `\n\n![${formData.chapterName}](${imageBase64})`;
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
      console.error(err);
      let errorMessage = err.message || "Failed to generate content. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    if (item.formData) {
      setFormData(item.formData);
    }
    setCurrentHistoryId(item.id);

    if (item.type === AppMode.SUMMARY) {
      setSummaryContent(item.content);
      setMode(AppMode.SUMMARY);
    } else if (item.type === AppMode.ESSAY) {
      setEssayContent(item.content);
      setMode(AppMode.ESSAY);
    } else if (item.type === AppMode.QUIZ) {
      setQuizData(item.content);
      setExistingQuizScore(item.score);
      setMode(AppMode.QUIZ);
    } else if (item.type === AppMode.TUTOR) {
      setMode(AppMode.TUTOR);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMode(AppMode.DASHBOARD);
      setDashboardView('OVERVIEW');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navItems = [
    { id: AppMode.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppMode.SUMMARY, label: 'Summary Generator', icon: FileText },
    { id: AppMode.QUIZ, label: 'Quiz Creator', icon: BrainCircuit },
    { id: AppMode.ESSAY, label: 'Essay Writer', icon: BookOpen },
    { id: AppMode.NOTES, label: 'Notes & Schedule', icon: Calendar },
    { id: AppMode.TUTOR, label: 'AI Tutor', icon: MessageCircle },
  ];

  const renderDashboard = () => {
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
      { id: AppMode.SUMMARY, label: 'Summaries', count: stats.summaries, icon: FileText, color: 'text-amber-800 dark:text-amber-400', bg: 'bg-[#FDF5E6] dark:bg-slate-800' },
      { id: AppMode.QUIZ, label: 'Quizzes', count: stats.quizzes, icon: BrainCircuit, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-[#FDF5E6] dark:bg-slate-800' },
      { id: AppMode.ESSAY, label: 'Essays', count: stats.essays, icon: BookOpen, color: 'text-amber-600 dark:text-amber-200', bg: 'bg-[#FDF5E6] dark:bg-slate-800' },
      { id: AppMode.TUTOR, label: 'Chats', count: stats.chats, icon: MessageCircle, color: 'text-amber-900 dark:text-amber-500', bg: 'bg-[#FDF5E6] dark:bg-slate-800' },
      { id: AppMode.NOTES, label: 'Notes', count: noteCount, icon: Calendar, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-[#FDF5E6] dark:bg-slate-800' },
    ];

    if (dashboardView !== 'OVERVIEW') {
      const filteredHistory = history.filter(h => h.type === dashboardView);
      const categoryLabel = dashboardCards.find(c => c.id === dashboardView)?.label || 'History';
      
      return (
        <div className="relative z-10 animate-in fade-in slide-in-from-right-8 duration-500">
          <button 
            onClick={() => setDashboardView('OVERVIEW')}
            className="flex items-center text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-all group text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mr-2 border border-slate-100 dark:border-slate-700 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-400" />
            {categoryLabel} History
          </h3>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-5 text-sm">No {categoryLabel.toLowerCase()} found yet.</p>
              <button
                onClick={() => {
                  setMode(dashboardView);
                  setDashboardView('OVERVIEW');
                }}
                className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredHistory.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => loadHistoryItem(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-8 h-8 rounded-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                      {item.type === AppMode.QUIZ ? <BrainCircuit className="w-4 h-4" /> :
                       item.type === AppMode.SUMMARY ? <FileText className="w-4 h-4" /> :
                       item.type === AppMode.ESSAY ? <BookOpen className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-0.5 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span className="font-medium bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.subtitle}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative min-h-[500px]">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 space-y-6">
          {apiKeyMissing && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-3">
              <Key className="w-4 h-4 text-red-600" />
              <div>
                <h4 className="font-bold text-red-800 dark:text-red-300 text-sm">API_KEY Missing</h4>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Please check your environment variables.</p>
              </div>
            </div>
          )}

          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm overflow-hidden relative group">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 tracking-tight">
                    Hey, I'm <span className="text-primary-600">SJ Tutor AI</span>!
                  </h3>
                  <h4 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-3">
                    Welcome, <span className="text-primary-600">{user ? (userProfile.displayName || 'Scholar') : 'Guest'}</span>
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-5">
                    Your personal study companion. Let's make learning exciting and effective today.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={() => user ? setMode(AppMode.TUTOR) : setShowAuthModal(true)}
                        className="px-5 py-2.5 bg-slate-900 dark:bg-primary-600 text-white rounded-lg font-medium hover:scale-105 active:scale-95 transition-all shadow-lg text-sm flex items-center gap-2"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Chat with Me
                    </button>
                  </div>

                   {user && (
                       <div className="mt-5 flex items-center gap-2 text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg w-fit border border-primary-100 dark:border-primary-800/30">
                          <Zap className="w-3.5 h-3.5 fill-primary-500" />
                          <span className="font-semibold text-xs">{userProfile.credits} generations left</span>
                       </div>
                    )}
                </div>
                
                <div className="relative w-40 h-40 flex-shrink-0 animate-blob">
                     <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-contain drop-shadow-xl" />
                </div>
              </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 ml-1">Quick Actions</h3>
            {dashboardCards.map((stat, idx) => (
              <button 
                key={idx} 
                onClick={() => {
                    if (!user) setShowAuthModal(true);
                    else if (stat.id === AppMode.NOTES) setMode(AppMode.NOTES);
                    else setDashboardView(stat.id as AppMode);
                }}
                className="group relative p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
              >
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg} border border-slate-50 dark:border-slate-700`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</p>
                      <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{stat.count}</span>
                    </div>
                 </div>
                 <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (mode === AppMode.DASHBOARD) return renderDashboard();
    if (mode === AppMode.PROFILE) return <ProfileView profile={userProfile} email={user?.email || null} onSave={handleProfileSave} isOnboarding={isNewUser} />;
    if (mode === AppMode.NOTES) return <NotesView userId={user?.uid || null} onDeductCredit={deductCredit} />;
    if (mode === AppMode.TUTOR) return <TutorChat onDeductCredit={deductCredit} currentCredits={userProfile.credits} />;

    if (loading) return <LoadingState mode={mode} />;

    const hasResult = (mode === AppMode.SUMMARY && summaryContent) ||
                      (mode === AppMode.ESSAY && essayContent) ||
                      (mode === AppMode.QUIZ && quizData);

    const showInputForm = !hasResult && !(mode === AppMode.QUIZ && existingQuizScore !== undefined);

    return (
      <div className="space-y-5 animate-in fade-in duration-500">
        {showInputForm && (
            <InputForm data={formData} mode={mode} onChange={handleFormChange} onFillSample={handleFillSample} disabled={loading} />
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {!loading && !hasResult && !error && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
             <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full rounded-full object-cover" />
             </div>
             <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">Ready to Start?</h3>
             <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto text-sm">Fill in the details and I'll generate your personalized content.</p>
             <button onClick={handleGenerate} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-bold flex items-center gap-2 mx-auto text-sm">
                 <Sparkles className="w-4 h-4" />
                 Generate Now
             </button>
          </div>
        )}

        {mode === AppMode.SUMMARY && summaryContent && <ResultsView content={summaryContent} isLoading={loading} title={formData.chapterName} type="Summary" onBack={() => setSummaryContent('')} />}
        {mode === AppMode.ESSAY && essayContent && <ResultsView content={essayContent} isLoading={loading} title={formData.chapterName} type="Essay" onBack={() => setEssayContent('')} />}
        {mode === AppMode.QUIZ && quizData && <QuizView questions={quizData} onReset={() => setQuizData(null)} onComplete={handleQuizComplete} existingScore={existingQuizScore} />}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFAF0] dark:bg-slate-950 flex items-center justify-center flex-col gap-4 transition-colors">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500 animate-bounce">
           <img src={SJTUTOR_AVATAR} alt="Loading..." className="w-full h-full object-cover" />
        </div>
        <p className="text-slate-800 dark:text-slate-200 font-bold">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAF0] dark:bg-slate-950 font-sans flex transition-colors">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md">
                 <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
               </div>
               <div>
                 <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">SJ Tutor AI</h1>
                 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Your Study Buddy</p>
               </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = mode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id !== AppMode.DASHBOARD && !user) setShowAuthModal(true);
                    else {
                      setMode(item.id);
                      setDashboardView('OVERVIEW');
                      setSummaryContent('');
                      setEssayContent('');
                      setQuizData(null);
                      setError(null);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${isActive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {user ? (
               <>
                <button onClick={() => setMode(AppMode.PROFILE)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                    {userProfile.photoURL ? <img src={userProfile.photoURL} alt="P" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold">U</span>}
                  </div>
                  <div className="flex-1 text-left overflow-hidden"><p className="text-xs font-medium truncate">{userProfile.displayName || 'Scholar'}</p></div>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <LogOut className="w-3.5 h-3.5" />Sign Out
                </button>
               </>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-lg font-medium text-sm">Sign In</button>
            )}
            {user && <button onClick={() => setShowPremiumModal(true)} className="w-full py-2 bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 rounded-lg font-bold text-xs"><Crown className="w-3.5 h-3.5 inline mr-1" />Upgrade Plan</button>}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 text-slate-500 dark:text-slate-400"><Menu className="w-5 h-5" /></button>
             <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{navItems.find(n => n.id === mode)?.label || 'SJ Tutor AI'}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{userProfile.credits}</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto">
             {renderContent()}
          </div>
        </div>
      </main>

      {showAuthModal && <Auth onClose={() => setShowAuthModal(false)} onSignUpSuccess={handleSignUpSuccess} />}
      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} onPaymentSuccess={handlePaymentSuccess} />}
    </div>
  );
};

export default App;
