
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

  // Check API Key immediately (using required process.env.API_KEY)
  useEffect(() => {
    if (!process.env.API_KEY) {
      console.warn("API_KEY is missing in environment variables!");
      setApiKeyMissing(true);
    }
  }, []);

  // Auth Listener
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

  // History Load Logic
  useEffect(() => {
    const storageKey = user ? `history_${user.uid}` : 'history_guest';
    const savedHistory = localStorage.getItem(storageKey);
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) setHistory(parsedHistory);
      } catch (e) { setHistory([]); }
    } else { setHistory([]); }
  }, [user]);

  // History Save Logic
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

  const deductCredit = (amount: number) => {
    if (userProfile.credits >= amount) {
      const updatedProfile = { ...userProfile, credits: userProfile.credits - amount };
      handleProfileSave(updatedProfile, false);
      return true;
    }
    return false;
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

  const handleGenerate = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    let cost = 10;
    if (mode === AppMode.SUMMARY) cost = 10;
    if (mode === AppMode.ESSAY) cost = formData.includeImages ? 15 : 10;
    if (mode === AppMode.QUIZ) {
      cost = 10 + Math.ceil((formData.questionCount || 5) / 2);
      if (formData.difficulty === 'Hard') cost += 5;
    }

    if (userProfile.credits < cost) {
      setError(`Insufficient credits. You need ${cost} credits.`);
      return;
    }
    
    if (!process.env.API_KEY) {
      setError("API Key Error: process.env.API_KEY is missing.");
      return;
    }

    if (!formData.subject || !formData.gradeClass || !formData.chapterName) {
      setError("Please fill in Subject, Class, and Chapter Name.");
      return;
    }
    
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
        deductCredit(cost);
      } else if (mode === AppMode.ESSAY) {
        setEssayContent('');
        const stream = await GeminiService.generateEssayStream(formData);
        let text = '';
        for await (const chunk of stream) {
            const c = chunk as GenerateContentResponse;
            if (c.text) { text += c.text; setEssayContent(text); }
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
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FFFAF0] flex flex-col items-center justify-center gap-4">
        <div className="relative">
             <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500 animate-bounce">
                <img src={SJTUTOR_AVATAR} alt="Loading..." className="w-full h-full object-cover" />
             </div>
             <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary-500 rounded-full animate-ping"></div>
        </div>
        <p className="text-slate-500 font-medium">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAF0] font-sans flex">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md">
               <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
             </div>
             <div>
               <h1 className="text-lg font-bold text-slate-900 leading-tight">SJ Tutor AI</h1>
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Study Buddy</p>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id !== AppMode.DASHBOARD && !user) setShowAuthModal(true);
                  else { setMode(item.id); setDashboardView('OVERVIEW'); setSummaryContent(''); setEssayContent(''); setQuizData(null); setError(null); }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${mode === item.id ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-3 border-t border-slate-100 space-y-2">
            {user ? (
               <>
                <button onClick={() => setMode(AppMode.PROFILE)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg ${mode === AppMode.PROFILE ? 'bg-slate-100' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {userProfile.photoURL ? <img src={userProfile.photoURL} alt="P" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold">U</span>}
                  </div>
                  <div className="flex-1 text-left overflow-hidden"><p className="text-xs font-medium truncate">{userProfile.displayName || 'Scholar'}</p></div>
                </button>
                <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg">
                  <LogOut className="w-3.5 h-3.5" />Sign Out
                </button>
               </>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium text-sm">Sign In</button>
            )}
            {user && <button onClick={() => setShowPremiumModal(true)} className="w-full py-2 bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 rounded-lg font-bold text-xs"><Crown className="w-3.5 h-3.5 inline mr-1" />Upgrade Plan</button>}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-14 flex items-center justify-between px-5 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 text-slate-500"><Menu className="w-5 h-5" /></button>
          <h2 className="text-base font-bold text-slate-800">{navItems.find(n => n.id === mode)?.label || 'SJ Tutor AI'}</h2>
          {user && <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full"><Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /><span className="text-xs font-bold">{userProfile.credits}</span></div>}
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <div className="max-w-5xl mx-auto">
             {mode === AppMode.DASHBOARD ? (
               <div className="space-y-6">
                  <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">Hey, I'm <span className="text-primary-600">SJ Tutor AI</span>!</h3>
                      <p className="text-slate-500 mb-6">Your personal study companion. Let's make learning exciting and effective.</p>
                      <button onClick={() => user ? setMode(AppMode.TUTOR) : setShowAuthModal(true)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-900/20"><MessageCircle className="w-5 h-5" />Chat with Me</button>
                    </div>
                    <img src={SJTUTOR_AVATAR} alt="Mascot" className="w-44 h-44 object-contain animate-blob" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {navItems.filter(n => n.id !== AppMode.DASHBOARD).map((stat, idx) => (
                      <button key={idx} onClick={() => user ? setMode(stat.id) : setShowAuthModal(true)} className="p-5 bg-[#FFFAF0] border border-stone-100 rounded-2xl shadow-sm text-left hover:shadow-md transition-all flex flex-col gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center border border-primary-100"><stat.icon className="w-5 h-5 text-primary-600" /></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p><span className="text-sm font-bold">Start Now</span></div>
                      </button>
                    ))}
                  </div>
               </div>
             ) : mode === AppMode.PROFILE ? (
               <ProfileView profile={userProfile} email={user?.email || null} onSave={handleProfileSave} isOnboarding={isNewUser} />
             ) : mode === AppMode.NOTES ? (
               <NotesView userId={user?.uid || null} onDeductCredit={deductCredit} />
             ) : mode === AppMode.TUTOR ? (
               <TutorChat onDeductCredit={deductCredit} currentCredits={userProfile.credits} />
             ) : (
               <div className="space-y-5">
                 {!((mode === AppMode.SUMMARY && summaryContent) || (mode === AppMode.ESSAY && essayContent) || (mode === AppMode.QUIZ && quizData)) && (
                   <InputForm data={formData} mode={mode} onChange={(f, v) => setFormData(p => ({ ...p, [f]: v }))} onFillSample={() => setFormData(SAMPLE_DATA)} disabled={loading} />
                 )}
                 {error && <div className="bg-red-50 p-4 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 font-bold"><AlertCircle className="w-5 h-5" />{error}</div>}
                 {loading && <LoadingState mode={mode} />}
                 {mode === AppMode.SUMMARY && summaryContent && <ResultsView content={summaryContent} isLoading={loading} title={formData.chapterName} type="Summary" onBack={() => setSummaryContent('')} />}
                 {mode === AppMode.ESSAY && essayContent && <ResultsView content={essayContent} isLoading={loading} title={formData.chapterName} type="Essay" onBack={() => setEssayContent('')} />}
                 {mode === AppMode.QUIZ && quizData && <QuizView questions={quizData} onReset={() => setQuizData(null)} onComplete={handleQuizComplete} existingScore={existingQuizScore} />}
               </div>
             )}
          </div>
        </div>
      </main>

      {showAuthModal && <Auth onClose={() => setShowAuthModal(false)} onSignUpSuccess={handleSignUpSuccess} />}
      {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} onPaymentSuccess={(c, p) => handleProfileSave({ ...userProfile, credits: userProfile.credits + c, planType: p })} />}
    </div>
  );
};

export default App;
