
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

  // Check API Key immediately (using required process.env.GEMINI_API_KEY)
  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is missing in environment variables!");
      setApiKeyMissing(true);
    }
  }, []);

  // Handle Magic Link Completion
  useEffect(() => {
    const handleSignInLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        if (email) {
          try {
            setAuthLoading(true);
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            // Remove the link from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (err: any) {
            console.error("Magic link sign-in error:", err);
            setError("Failed to complete magic link sign-in. The link may have expired.");
          } finally {
            setAuthLoading(false);
          }
        }
      }
    };
    handleSignInLink();
  }, []);

  // Auth Listener with Safety Timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (authLoading) {
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

  // Close sidebar on mode change for mobile
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
    
    if (!process.env.GEMINI_API_KEY) {
      setError("Configuration Error: GEMINI_API_KEY is missing. Please check your environment variables.");
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
      
      let errorMessage = err.message || "Failed to generate content. Please check your inputs and try again.";

      try {
         const parsed = JSON.parse(errorMessage);
         if (parsed.error?.message) {
            errorMessage = parsed.error.message;
         }
      } catch (e) {}
      
      if (errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
        errorMessage = "QUOTA_EXHAUSTED";
      } else if (errorMessage.includes("Generative Language API has not been used") || errorMessage.includes("PERMISSION_DENIED")) {
        errorMessage = "API_DISABLED";
      } else if (errorMessage.includes("API key not valid") || errorMessage.includes("GEMINI_API_KEY_INVALID")) {
        errorMessage = "GEMINI_API_KEY_INVALID_ERROR";
      }

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
            className="flex items-center text-slate-500 hover:text-primary-600 mb-6 transition-all hover:-translate-x-1 group text-sm"
          >
            <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center mr-2 border border-slate-100 group-hover:border-primary-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-400" />
            {categoryLabel} History
          </h3>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 bg-white/60 backdrop-blur-md rounded-xl border border-slate-200/60 border-dashed animate-in zoom-in duration-500">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-100 p-1">
                 <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full rounded-full object-cover" />
              </div>
              <p className="text-slate-500 font-medium mb-5 text-sm">No {categoryLabel.toLowerCase()} found yet.</p>

              <button
                onClick={() => {
                  setSummaryContent('');
                  setEssayContent('');
                  setQuizData(null);
                  setExistingQuizScore(undefined);
                  setCurrentHistoryId(null);
                  setError(null);
                  setFormData(INITIAL_FORM_DATA);
                  setMode(dashboardView);
                  setDashboardView('OVERVIEW');
                }}
                className="inline-flex items-center px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New {getSingularName(dashboardView)}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredHistory.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="bg-white/80 backdrop-blur-sm p-5 rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 flex justify-between items-center group cursor-pointer"
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onClick={() => loadHistoryItem(item)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center bg-primary-100 text-primary-600`}>
                      {item.type === AppMode.QUIZ ? <BrainCircuit className="w-4 h-4" /> :
                       item.type === AppMode.SUMMARY ? <FileText className="w-4 h-4" /> :
                       item.type === AppMode.ESSAY ? <BookOpen className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-0.5 group-hover:text-primary-700 transition-colors">{item.title}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded">{item.subtitle}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                        {item.type === AppMode.QUIZ && item.score !== undefined && (
                          <span className="flex items-center gap-1 text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded-full">
                            Score: {item.score}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <Eye className="w-4 h-4 text-primary-600" />
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
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 space-y-6">
          {apiKeyMissing && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 shadow-sm">
              <div className="bg-red-100 p-1.5 rounded-full">
                <Key className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-red-800 text-sm">GEMINI_API_KEY Missing</h4>
                <p className="text-xs text-red-600 mt-0.5">
                  The AI features will not work because the <code>GEMINI_API_KEY</code> environment variable is missing. 
                </p>
              </div>
            </div>
          )}

          <div className="animate-fade-in-up bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden relative group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-100/40 to-transparent rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">
                    Hey, I'm <span className="text-primary-600">SJ Tutor AI</span>!
                  </h3>
                  <h4 className="text-lg font-medium text-slate-600 mb-3">
                    Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">{user ? (userProfile.displayName || 'Scholar') : 'Guest'}</span>
                  </h4>
                  <p className="text-slate-500 text-base leading-relaxed mb-5">
                    {user ? "I'm ready to help you ace your studies. What are we working on today?" : "I'm your AI study companion. Sign in to unlock my full potential!"}
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={() => {
                        if (!user) setShowAuthModal(true);
                        else setMode(AppMode.TUTOR);
                        }}
                        className="group relative px-5 py-2.5 bg-slate-900 text-white rounded-lg font-medium overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20 text-sm"
                    >
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <span className="flex items-center gap-2 relative z-10">
                        <MessageCircle className="w-4 h-4" />
                        Chat with Me
                        </span>
                    </button>
                    {!user && (
                        <button 
                            onClick={() => setShowAuthModal(true)}
                            className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm text-sm"
                        >
                            Sign In / Sign Up
                        </button>
                    )}
                  </div>

                   {user && (
                       <div className="mt-5 flex items-center gap-2 text-primary-700 bg-primary-50/80 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit border border-primary-100">
                          <Zap className="w-3.5 h-3.5 fill-primary-500 text-primary-500" />
                          <span className="font-semibold text-xs">{userProfile.credits} generations remaining</span>
                       </div>
                    )}
                </div>
                
                <div className="relative w-40 h-40 md:w-56 md:h-56 flex-shrink-0 animate-blob">
                     <div className="absolute inset-0 bg-primary-200 rounded-full blur-2xl opacity-50"></div>
                     <img 
                        src={SJTUTOR_AVATAR} 
                        alt="SJ Tutor AI Mascot" 
                        className="relative w-full h-full object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
                     />
                </div>
              </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-700 ml-1">Quick Actions</h3>
            {dashboardCards.map((stat, idx) => (
              <button 
                key={idx} 
                onClick={() => {
                    if (!user) setShowAuthModal(true);
                    else if (stat.id === AppMode.NOTES) setMode(AppMode.NOTES);
                    else setDashboardView(stat.id as AppMode);
                }}
                className={`group relative p-4 rounded-xl bg-[#FFFAF0] border border-stone-100/60 shadow-sm hover:shadow-md transition-all duration-300 text-left w-full overflow-hidden flex items-center justify-between`}
                style={{ animationDelay: `${(idx + 1) * 150}ms` }}
              >
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg} shadow-sm border border-stone-100`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</p>
                      <span className="text-xl font-bold text-slate-800 tracking-tight">
                        {stat.count}
                      </span>
                    </div>
                 </div>
                 
                 {user && (stat.id === AppMode.TUTOR || stat.id === AppMode.NOTES) ? (
                     <div className="flex items-center gap-1 px-2.5 py-1 bg-primary-100/50 rounded-full text-[10px] font-semibold text-primary-700">
                        <span>{stat.id === AppMode.NOTES ? 'Open Notes' : 'View History'}</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                    </div>
                 ) : user && (
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400 transition-colors" />
                 )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (mode === AppMode.DASHBOARD) {
      return renderDashboard();
    }

    if (mode === AppMode.PROFILE) {
      return (
        <ProfileView 
          profile={userProfile} 
          email={user?.email || null} 
          onSave={handleProfileSave} 
          isOnboarding={isNewUser}
        />
      );
    }

    if (mode === AppMode.NOTES) {
      return (
        <NotesView 
          userId={user?.uid || null} 
          onDeductCredit={deductCredit}
        />
      );
    }

    if (mode === AppMode.TUTOR) {
      return <TutorChat onDeductCredit={deductCredit} currentCredits={userProfile.credits} />;
    }

    if (loading) {
      return <LoadingState mode={mode} />;
    }

    const hasResult = (mode === AppMode.SUMMARY && summaryContent) ||
                      (mode === AppMode.ESSAY && essayContent) ||
                      (mode === AppMode.QUIZ && quizData);

    const showEmptyState = !loading && !hasResult;

    const showInputForm = !hasResult && !(mode === AppMode.QUIZ && existingQuizScore !== undefined);

    const renderError = () => {
       if (error === "QUOTA_EXHAUSTED") {
          return (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-xl shadow-sm flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Daily Quota Reached</h3>
                  <p className="text-sm text-amber-800">You've reached the free daily limit for this AI model.</p>
                </div>
              </div>
              <div className="pl-12 text-xs">Please try again in a few minutes or tomorrow.</div>
            </div>
          );
       }
       
       if (error === "API_DISABLED") {
          return (
            <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-xl shadow-sm flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base">API Not Enabled</h3>
                  <p className="text-sm text-red-700">The Google Generative AI API is disabled.</p>
                </div>
              </div>
            </div>
          );
       } 

       if (error) {
         return (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium text-sm">{error}</p>
          </div>
         );
       }
       return null;
    };

    return (
      <div className="space-y-5 animate-in fade-in duration-500">
        {showInputForm && (
            <InputForm 
              data={formData} 
              mode={mode}
              onChange={handleFormChange}
              onFillSample={handleFillSample}
              disabled={loading}
            />
        )}

        {renderError()}

        {showEmptyState && !error && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm">
             <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-lg overflow-hidden">
                <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
             </div>
             <h3 className="text-base font-semibold text-slate-800 mb-1">Ready to Start?</h3>
             <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
               Enter your study details above and I'll generate your personalized content immediately.
             </p>
             <button 
                type="button"
                onClick={handleGenerate}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-primary-500/25 flex items-center gap-2 text-sm"
               >
                 <Sparkles className="w-4 h-4" />
                 Generate Now
               </button>
          </div>
        )}

        {mode === AppMode.SUMMARY && summaryContent && (
          <ResultsView 
            content={summaryContent} 
            isLoading={loading} 
            title={formData.chapterName}
            type="Summary"
            onBack={() => setSummaryContent('')}
          />
        )}
        
        {mode === AppMode.ESSAY && essayContent && (
          <ResultsView 
            content={essayContent} 
            isLoading={loading} 
            title={formData.chapterName} 
            type="Essay"
            onBack={() => setEssayContent('')}
          />
        )}

        {mode === AppMode.QUIZ && quizData && (
          <QuizView 
            questions={quizData} 
            onReset={() => setQuizData(null)}
            onComplete={handleQuizComplete}
            existingScore={existingQuizScore}
          />
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
                 <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">AI Study Buddy</p>
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
                      <span className="font-bold text-primary-700 text-[10px]">{(userProfile.displayName || user.email || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden text-xs">
                    <p className="font-medium truncate">{userProfile.displayName || 'Scholar'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
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
             
            {user && (
              <button 
                onClick={() => setShowPremiumModal(true)}
                className="w-full py-2 bg-gradient-to-r from-amber-200 to-yellow-400 hover:from-amber-300 hover:to-yellow-500 text-amber-900 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5" />
                Upgrade Plan
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
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full">
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
