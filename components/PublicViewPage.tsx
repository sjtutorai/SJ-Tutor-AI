import React, { useState, useEffect } from 'react';
import { getSharedContent, incrementSharedViews, incrementSharedLikes, SharedContentData } from '../utils/firebaseUtils';
import { 
  Heart, Eye, Calendar, Sparkles, Copy, Check, 
  BrainCircuit, FileText, BookOpen, MessageCircle, ArrowRight, CheckCircle, XCircle 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Logo from './Logo';

interface PublicViewPageProps {
  shareId: string;
  onGoHome?: () => void;
}

const PublicViewPage: React.FC<PublicViewPageProps> = ({ shareId, onGoHome }) => {
  const [data, setData] = useState<SharedContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Quiz specific gameplay state
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    const loadShared = async () => {
      setLoading(true);
      try {
        const item = await getSharedContent(shareId);
        if (item) {
          setData(item);
          // Increment the view count once per visit
          await incrementSharedViews(shareId);
          setData(prev => prev ? { ...prev, views: prev.views + 1 } : null);
        } else {
          setError("This shared study material could not be found, or it may have been deleted by the owner.");
        }
      } catch (err) {
        console.error("Error fetching shared item:", err);
        setError("Unable to process request. Check connection.");
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      loadShared();
    }
  }, [shareId]);

  const handleLike = async () => {
    if (hasLiked || !data) return;
    try {
      await incrementSharedLikes(shareId);
      setData(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
      setHasLiked(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const getFriendlyType = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'quiz': return 'Practice Quiz';
      case 'summary': return 'Study Summary';
      case 'homework': return 'Solved Homework';
      case 'tutor': return 'AI Tutor Dialogues';
      case 'notes': return 'Academic Note';
      default: return 'Study Material';
    }
  };

  const getContentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'quiz': return <BrainCircuit className="w-6 h-6 text-indigo-500" />;
      case 'summary': return <FileText className="w-6 h-6 text-amber-500" />;
      case 'homework': return <BookOpen className="w-6 h-6 text-emerald-500" />;
      case 'tutor': return <MessageCircle className="w-6 h-6 text-sky-500" />;
      default: return <Sparkles className="w-6 h-6 text-orange-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center py-20 px-4">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-500 animate-bounce">
            <Logo className="w-full h-full" iconOnly />
          </div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary-500 rounded-full animate-ping"></div>
        </div>
        <p className="text-slate-800 dark:text-slate-200 font-bold animate-pulse text-lg">
          Loading Public Shared Material...
        </p>
        <p className="text-sm text-slate-400 mt-2">Checking Zero-Trust Firestore endpoints</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white">Content Unavailable</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{error || "The link is expired or broken."}</p>
        <button 
          onClick={onGoHome}
          className="mt-6 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
        >
          Go back to SJ Tutor AI
        </button>
      </div>
    );
  }

  // Handle Quiz Gameplay Selection
  const handleQuizAnswer = (idx: number) => {
    if (showAnswer) return;
    setSelectedOpt(idx);
    setShowAnswer(true);
    const questionsList = Array.isArray(data.content) ? data.content : [];
    const correctIndex = questionsList[quizIndex]?.correctAnswerIndex;
    if (idx === correctIndex) {
      setQuizScore(s => s + 1);
    }
  };

  const nextQuizItem = () => {
    const questionsList = Array.isArray(data.content) ? data.content : [];
    if (quizIndex < questionsList.length - 1) {
      setQuizIndex(prev => prev + 1);
      setSelectedOpt(null);
      setShowAnswer(false);
    } else {
      setQuizDone(true);
    }
  };

  const restartQuiz = () => {
    setQuizIndex(0);
    setSelectedOpt(null);
    setShowAnswer(false);
    setQuizScore(0);
    setQuizDone(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary-100 dark:selection:bg-primary-900/50 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Notion/Google Classroom style header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-primary-500 bg-white shadow-xs">
            <Logo className="w-full h-full" iconOnly />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-1.5 leading-none">
              SJ Tutor AI <span className="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full uppercase tracking-widest font-black">Shared</span>
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">AI Study Engagement Platform</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button 
              onClick={onGoHome}
              className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Sign In / Learn
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        
        {/* Decorative Top Accent Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm overflow-hidden relative mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-3">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-500/10 text-primary-700 dark:text-primary-300 rounded-full text-xs font-black uppercase tracking-wider">
                {getContentIcon(data.type)}
                {getFriendlyType(data.type)}
              </div>
              
              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white leading-tight">
                {data.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(data.createdAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="text-primary-600 dark:text-primary-400 font-bold">
                  Shared Publicly
                </span>
              </div>
            </div>

            {/* Quick Analytics & Actions */}
            <div className="flex flex-wrap items-center sm:flex-col sm:items-end gap-3 shrink-0">
              {/* Copy Share URL */}
              <button 
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                  copied 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-primary-500 hover:bg-primary-600 text-white'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5 animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Link Copied!" : "Copy Share Link"}
              </button>

              <div className="flex items-center gap-3">
                {/* Views Counter */}
                <div className="flex items-center gap-1 px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs font-bold border border-slate-200/50 dark:border-slate-700/50">
                  <Eye className="w-3.5 h-3.5" />
                  {data.views} views
                </div>

                {/* Likes Counter Button */}
                <button 
                  onClick={handleLike}
                  disabled={hasLiked}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    hasLiked
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-none'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/20 hover:border-rose-200/30 active:scale-95'
                  }`}
                  title="Like this shared resource"
                >
                  <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  {data.likes} likes
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-md p-6 sm:p-10">
          
          {/* RENDER DYNAMIC CORE ACCORDING TO TYPE */}
          {data.type === 'quiz' ? (
            /* INTERACTIVE QUIZZIZ STYLE PRACTICE GAMEPLAY */
            <div className="space-y-6">
              {(() => {
                const questionsList = Array.isArray(data.content) ? data.content : [];
                if (questionsList.length === 0) return <p className="text-center text-slate-400">Empty quiz questions.</p>;
                
                if (quizDone) {
                  return (
                    <div className="text-center py-10 max-w-md mx-auto space-y-6">
                      <div className="w-20 h-20 bg-primary-500/10 text-primary-500 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
                        🏆
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">Practice Score Completed!</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          You scored <span className="font-extrabold text-primary-500">{quizScore} / {questionsList.length}</span> correct answers on this practice run!
                        </p>
                      </div>
                      <button 
                        onClick={restartQuiz}
                        className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Play Again
                      </button>
                    </div>
                  );
                }

                const currentItem = questionsList[quizIndex];
                if (!currentItem) return null;

                return (
                  <div className="space-y-6">
                    {/* Header bar tracking */}
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Question {quizIndex + 1} of {questionsList.length}
                      </span>
                      <span className="text-xs font-black bg-primary-500/10 text-primary-600 px-2.5 py-1 rounded-full uppercase">
                        Correct: {quizScore}
                      </span>
                    </div>

                    {/* Question text */}
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-relaxed">
                      {currentItem.question}
                    </h3>

                    {/* Options list */}
                    <div className="grid grid-cols-1 gap-3">
                      {currentItem.options?.map((opt: string, oIdx: number) => {
                        const isSelected = selectedOpt === oIdx;
                        const isCorrectAnswer = oIdx === currentItem.correctAnswerIndex;
                        const showsErrorAndIncorrect = showAnswer && isSelected && !isCorrectAnswer;
                        const showsSuccessAndCorrect = showAnswer && isCorrectAnswer;

                        let cardStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-700";
                        if (showsSuccessAndCorrect) {
                          cardStyle = "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300";
                        } else if (showsErrorAndIncorrect) {
                          cardStyle = "bg-rose-500/10 border-rose-500/45 text-rose-800 dark:text-rose-300";
                        } else if (showAnswer) {
                          cardStyle = "border-slate-100 dark:border-slate-850 opacity-60"; // faded out
                        } else if (isSelected) {
                          cardStyle = "border-primary-500 dark:border-primary-500 ring-2 ring-primary-500/10 scale-102";
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleQuizAnswer(oIdx)}
                            disabled={showAnswer}
                            className={`w-full text-left p-4 rounded-xl border font-semibold flex items-center justify-between transition-all duration-200 ${cardStyle}`}
                          >
                            <span className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border text-xs text-slate-500 font-bold uppercase shrink-0">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              {opt}
                            </span>
                            {showsSuccessAndCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
                            {showsErrorAndIncorrect && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Key explanations on showAnswer */}
                    {showAnswer && (
                      <div className="p-4 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 rounded-2xl animate-in slide-in-from-top-3 duration-300 space-y-2">
                        <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                          💡 Explanation & Key takeaway:
                        </p>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {currentItem.explanation || currentItem.answerKeyExplanation || "The selected correct option has been validated for educational concepts."}
                        </p>
                      </div>
                    )}

                    {/* Next arrow trigger */}
                    {showAnswer && (
                      <button
                        onClick={nextQuizItem}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer text-sm"
                      >
                        {quizIndex < questionsList.length - 1 ? "Next Question" : "Complete Run"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : data.type === 'tutor' ? (
            /* BEAUTIFUL CHAT DISCUSSION TIMELINE FOR AI TUTOR DIALOGUES */
            <div className="space-y-6">
              <div className="p-4 bg-sky-500/5 rounded-2xl border border-sky-500/10 text-center mb-6">
                <p className="text-xs text-sky-600 dark:text-sky-400 font-extrabold uppercase tracking-widest mb-1">
                  💬 Saved Conversation Session dialogue
                </p>
                <p className="text-xs text-slate-400 font-medium">This is a view-only dialogue history logged from the SJ AI Tutor engine.</p>
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                  const msgs = Array.isArray(data.content?.messages) 
                    ? data.content.messages 
                    : Array.isArray(data.content) 
                      ? data.content 
                      : [];
                  if (msgs.length === 0) return <p className="text-slate-400 text-center">No conversational dialogue log.</p>;

                  return msgs.map((msg: any, mIdx: number) => {
                    const isAi = msg.role === 'model' || msg.role === 'assistant';
                    return (
                      <div 
                        key={mIdx} 
                        className={`flex items-start gap-3.5 max-w-[85%] ${isAi ? '' : 'ml-auto flex-row-reverse'}`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-xs ${
                          isAi ? 'bg-primary-500 text-white' : 'bg-slate-800 text-white'
                        }`}>
                          {isAi ? "🤖" : "👤"}
                        </div>

                        {/* Message box */}
                        <div className={`p-4 rounded-2xl flex flex-col space-y-1.5 shadow-xs text-sm leading-relaxed ${
                          isAi 
                            ? 'bg-slate-50 dark:bg-slate-800/80 dark:border-slate-800 border-slate-100 text-slate-800 dark:text-slate-100 rounded-tl-none' 
                            : 'bg-primary-550 text-white rounded-tr-none'
                        }`}>
                          <div className="markdown-body">
                            <ReactMarkdown>{msg.text || msg.content || ""}</ReactMarkdown>
                          </div>
                          <span className={`block text-[9px] mt-0.5 text-right font-medium text-slate-400 ${
                            isAi ? 'text-slate-400' : 'text-primary-200'
                          }`}>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            /* STANDARD MARKDOWN FORMAT FOR SUMMARY, HOMEWORK, ESSAYS, ETC. */
            <div className="markdown-body text-slate-700 bg-white dark:bg-slate-900 leading-relaxed max-w-none text-base pr-2 select-text">
              <ReactMarkdown>{typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2)}</ReactMarkdown>
            </div>
          )}

        </div>

        {/* Footer Brand Credit */}
        <footer className="text-center py-10 space-y-4">
          <p className="text-xs text-slate-400 font-medium">
            This study helper was safely compiled by SJ Tutor AI, an automated education system.
          </p>
          <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-full border overflow-hidden shrink-0">
              <Logo className="w-full h-full" iconOnly />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">Create your own material!</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">SJ Tutor AI allows students to instantly solve homework, summarize chapters, & practice adaptive quizzes.</p>
            </div>
          </div>
        </footer>

      </main>

    </div>
  );
};

export default PublicViewPage;
