
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
import { onAuthStateChanged, User, signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
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
  ExternalLink
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

  // Initial Boot Logging
  useEffect(() => {
    console.log("[App] Initializing SJ Tutor AI...");
    if (!process.env.API_KEY) {
      console.warn("[App] API_KEY is missing in environment variables!");
      setApiKeyMissing(true);
    }
  }, []);

  // MASTER AUTH HANDLER: Handles both initial load, state changes, and magic links
  useEffect(() => {
    const initAuth = async () => {
      console.log("[App] Setting up auth listeners...");
      
      // 1. Check if returning from a magic link
      if (isSignInWithEmailLink(auth, window.location.href)) {
        console.log("[App] Magic link detected. Finalizing verification...");
        setAuthLoading(true);
        
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          // If the link was opened in a different browser, prompt for email
          email = window.prompt('Please confirm your email address for sign-in:');
        }

        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            console.log("[App] Magic link login successful.");
            // Clean the URL from the magic link parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (err: any) {
            console.error("[App] Magic link verification error:", err);
            setError("The sign-in link has expired or was already used. Please request a new one.");
            setAuthLoading(false);
          }
        } else {
          console.warn("[App] No email provided for magic link confirmation.");
          setAuthLoading(false);
        }
      }

      // 2. Set up the long-running auth listener
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log("[App] Auth state changed:", currentUser ? `Logged in: ${currentUser.uid}` : "Logged out");
        setUser(currentUser);
        setAuthLoading(false);
        
        if (!currentUser) {
          setIsNewUser(false);
          setUserProfile(initialProfileState);
          setMode(AppMode.DASHBOARD);
        }
      }, (err) => {
        console.error("[App] Auth listener error:", err);
        setAuthLoading(false);
      });

      return unsubscribe;
    };

    const unsubscribePromise = initAuth();
    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, []);

  // Profile Persistence Listener
  useEffect(() => {
    if (user) {
      console.log("[App] Loading profile data for:", user.uid);
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
          console.error("[App] Profile parse error", e);
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
        console.error("[App] History parse error", e);
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [user]);

  // History Persistence: Save Logic
  useEffect(() => {
    if (history.length > 0) {
      const storageKey = user ? `history_${user.uid}` : 'history_guest';
      localStorage.setItem(storageKey, JSON.stringify(history));
    }
  }, [history, user]);

  const handleProfileSave = (newProfile: UserProfile, redirectDashboard = false) => {
    console.log("[App] Updating user profile.");
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
    console.log("[App] Onboarding process started.");
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
      setError("Please fill in Subject, Class, and Chapter Name.");
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

    const cost = calculateCost(mode, formData);
    if (userProfile.credits < cost) {
      setError(`Insufficient credits. You need ${cost} credits.`);
      return;
    }
    
    if (!process.env.API_KEY) {
      setError("API_KEY missing.");
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
      console.error("[App] Generation error:", err);
      let errorMessage = err.message || "Failed to generate content.";
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
      console.log("[App] Sign out initiated.");
      await signOut(auth);
      setMode(AppMode.DASHBOARD);
      setDashboardView('OVERVIEW');
    } catch (error) {
      console.error("[App] Logout error", error);
    }
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
      { id: AppMode.SUMMARY, label: 'Summaries', count: stats.summaries, icon: FileText, color: 'text-amber-800', bg: 'bg-[#FDF5E6]' },
      { id: AppMode.QUIZ, label: 'Quizzes', count: stats.quizzes, icon: BrainCircuit, color: 'text-amber-700', bg: 'bg-[#FDF5E6]' },
      { id: AppMode.ESSAY, label: 'Essays', count: stats.essays, icon: BookOpen, color: 'text-amber-600', bg: 'bg-[#FDF5E6]' },
      { id: AppMode.TUTOR, label: 'Chats', count: stats.chats, icon: MessageCircle, color: 'text-amber-900', bg: 'bg-[#FDF5E6]' },
      { id: AppMode.NOTES, label: 'Notes', count: noteCount, icon: Calendar, color: 'text-emerald-700', bg: 'bg-[#FDF5E6]' },
    ];

    if (dashboardView !== 'OVERVIEW') {
      const filteredHistory = history.filter(h => h.type === dashboardView);
      return (
        <div className="relative z-10 animate-in fade-in slide-in-from-right-8 duration-500">
          <button 
            onClick={() => setDashboardView('OVERVIEW')}
            className="flex items-center text-slate-500 hover:text-primary-600 mb-6 group text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center mr-2 border border-slate-100 group-hover:border-primary-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium">Back</span>
          </button>

          <div className="grid gap-4">
            {filteredHistory.map((item, idx) => (
              <div 
                key={item.id} 
                className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex justify-between items-center group cursor-pointer"
                onClick={() => loadHistoryItem(item)}
              >
                <div>
                  <h4 className="font-semibold text-slate-800">{item.title}</h4>
                  <p className="text-xs text-slate-500">{item.subtitle}</p>
                </div>
                <Eye className="w-4 h-4 text-slate-300 group-hover:text-primary-600" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="relative z-10 space-y-6">
        <div className="animate-fade-in-up bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 group">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold text-slate-800 mb-1">Hey, Scholar!</h3>
              <p className="text-slate-500 mb-5">Welcome back to SJ Tutor AI. Ready to study?</p>
              <button 
                onClick={() => { if (!user) setShowAuthModal(true); else setMode(AppMode.TUTOR); }}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm transition-transform hover:scale-105 active:scale-95"
              >
                Chat with Me
              </button>
            </div>
            <div className="relative w-32 h-32 md:w-48 md:h-48 flex-shrink-0 animate-blob">
                 <img src={SJTUTOR_AVATAR} alt="Mascot" className="relative w-full h-full object-contain drop-shadow-lg" />
            </div>
        </div>

        <div className="flex flex-col gap-3">
          {dashboardCards.map((stat, idx) => (
            <button 
              key={idx} 
              onClick={() => {
                  if (!user) setShowAuthModal(true);
                  else if (stat.id === AppMode.NOTES) setMode(AppMode.NOTES);
                  else setDashboardView(stat.id as AppMode);
              }}
              className="p-4 rounded-xl bg-white border border-stone-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between group"
            >
               <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg} shadow-sm border border-stone-100`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</p>
                    <span className="text-xl font-bold text-slate-800">{stat.count}</span>
                  </div>
               </div>
               <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (mode === AppMode.DASHBOARD) return renderDashboard();
    if (mode === AppMode.PROFILE) return <ProfileView profile={userProfile} email={user?.email || user?.phoneNumber || null} onSave={handleProfileSave} isOnboarding={isNewUser} />;
    if (mode === AppMode.NOTES) return <NotesView userId={user?.uid || null} onDeductCredit={deductCredit} />;
    if (mode === AppMode.TUTOR) return <TutorChat onDeductCredit={deductCredit} currentCredits={userProfile.credits} />;
    if (loading) return <LoadingState mode={mode} />;

    const hasResult = (mode === AppMode.SUMMARY && summaryContent) || (mode === AppMode.ESSAY && essayContent) || (mode === AppMode.QUIZ && quizData);

    return (
      <div className="space-y-5 animate-in fade-in duration-500">
        {!hasResult && <InputForm data={formData} mode={mode} onChange={handleFormChange} onFillSample={handleFillSample} disabled={loading} />}
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{error}</div>}
        
        {mode === AppMode.SUMMARY && summaryContent && <ResultsView content={summaryContent} isLoading={loading} title={formData.chapterName} type="Summary" onBack={() => setSummaryContent('')} />}
        {mode === AppMode.ESSAY && essayContent && <ResultsView content={essayContent} isLoading={loading} title={formData.chapterName} type="Essay" onBack={() => setEssayContent('')} />}
        {mode === AppMode.QUIZ && quizData && <QuizView questions={quizData} onReset={() => setQuizData(null)} onComplete={handleQuizComplete} existingScore={existingQuizScore} />}

        {!hasResult && !loading && (
          <button onClick={handleGenerate} className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all uppercase tracking-widest text-sm">Generate {mode}</button>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFAF0] flex items-center justify-center">
        <div className="relative">
             <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500 animate-bounce">
                <img src={SJTUTOR_AVATAR} alt="Loading..." className="w-full h-full object-cover" />
             </div>
             <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary-500 rounded-full animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAF0] font-sans selection:bg-primary-100 selection:text-primary-900 flex">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} shadow-2xl lg:shadow-none`}>
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-slate-100">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md flex-shrink-0">
                 <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
               </div>
               <div>
                 <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">SJ Tutor AI</h1>
                 <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Your AI Buddy</p>
               </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              const isActive = mode === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id !== AppMode.DASHBOARD && !user) {
                      setShowAuthModal(true);
                      setIsSidebarOpen(false);
                    } else {
                      setMode(item.id);
                      setDashboardView('OVERVIEW');
                      setSummaryContent('');
                      setEssayContent('');
                      setQuizData(null);
                      setExistingQuizScore(undefined);
                      setCurrentHistoryId(null);
                      setError(null);
                      setFormData(INITIAL_FORM_DATA);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm ${
                    isActive 
                      ? 'bg-primary-50 text-primary-700 font-semibold shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-100 space-y-2">
            {user ? (
               <>
                <button
                   onClick={() => setMode(AppMode.PROFILE)} 
                   className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${mode === AppMode.PROFILE ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <div className="w-7 h-7 rounded-full bg-primary-100 border border-primary-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {userProfile.photoURL ? (
                      <img src={userProfile.photoURL} alt="User" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-primary-700 text-[10px]">{(userProfile.displayName || user.email || user.phoneNumber || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden text-xs">
                    <p className="font-medium truncate">{userProfile.displayName || 'Scholar'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email || user.phoneNumber}</p>
                  </div>
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
               </>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-colors text-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-14 flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
             >
               <Menu className="w-5 h-5" />
             </button>
             <h2 className="text-base font-bold text-slate-800">
               {mode === AppMode.DASHBOARD ? 'SJ Tutor AI' : 
                (navItems.find(n => n.id === mode)?.label || 'SJ Tutor AI')}
             </h2>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-slate-700">{userProfile.credits}</span>
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

      {showAuthModal && (
        <Auth 
          onClose={() => setShowAuthModal(false)} 
          onSignUpSuccess={handleSignUpSuccess}
        />
      )}
      
      {showPremiumModal && (
        <PremiumModal 
          onClose={() => setShowPremiumModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default App;
