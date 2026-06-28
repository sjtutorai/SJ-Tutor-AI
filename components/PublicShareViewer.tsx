import React, { useState, useEffect } from "react";
import { 
  getSharedContent, 
  incrementViewCount, 
  incrementLikeCount, 
  incrementShareCount 
} from "../utils/firebaseUtils";
import { 
  Sparkles, 
  Eye, 
  Heart, 
  Share2, 
  BrainCircuit, 
  FileText, 
  BookOpen, 
  MessageSquare, 
  Calendar, 
  ChevronRight,
  Check,
  AlertTriangle,
  Lightbulb,
  Award
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PublicShareViewerProps {
  shareId: string;
  onGoToApp?: () => void;
}

export const PublicShareViewer: React.FC<PublicShareViewerProps> = ({ 
  shareId,
  onGoToApp
}) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [copied, setCopied] = useState(false);
  
  const formatDate = (val: any) => {
    if (!val) return "Today";
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "Academic Resource";
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Academic Resource";
    }
  };

  // Quiz specific states
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    const loadSharedData = async () => {
      setLoading(true);
      try {
        let data = await getSharedContent(shareId);
        
        // Fallback to Express backend if not found in Firestore
        if (!data) {
          try {
            const response = await fetch(`/api/auth/share/${shareId}`);
            if (response.ok) {
              const resData = await response.json();
              if (resData.success && resData.data) {
                data = resData.data;
              }
            }
          } catch (apiErr) {
            console.warn("PublicShareViewer fallback API failed:", apiErr);
          }
        }

        if (data) {
          setContent(data);
          setLikesCount(data.likes || 0);
          setSharesCount(data.sharesCount || 0);
          
          // Increment view count on load (asynchronously if Firebase supports it)
          try {
            await incrementViewCount(shareId);
          } catch (e) {
            console.warn("Could not increment view count", e);
          }
        }
      } catch (err) {
        console.error("Error loading shared content:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (shareId) {
      loadSharedData();
    }
  }, [shareId]);

  const handleLike = async () => {
    if (hasLiked) return;
    try {
      setHasLiked(true);
      setLikesCount(prev => prev + 1);
      await incrementLikeCount(shareId);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleShare = async () => {
    const link = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `SJ Tutor AI: ${content?.title || "Shared Content"}`,
          text: `Check out this ${content?.type || "learning content"} on SJ Tutor AI!`,
          url: link
        });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      
      // Update share analytics
      setSharesCount(prev => prev + 1);
      await incrementShareCount(shareId);
    } catch (e) {
      console.warn("Share cancelled or failed", e);
    }
  };

  const handleQuizAnswer = (qIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
  };

  const calculateSubmittingQuiz = () => {
    const questions = content?.content?.questions || content?.content || [];
    if (!questions || questions.length === 0) return;
    
    let correct = 0;
    questions.forEach((q: any, idx: number) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correct++;
      }
    });
    
    setQuizScore(correct);
    setQuizSubmitted(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "quiz":
        return <BrainCircuit className="w-5 h-5 text-orange-500" />;
      case "summary":
        return <FileText className="w-5 h-5 text-amber-500" />;
      case "homework":
        return <BookOpen className="w-5 h-5 text-emerald-500" />;
      case "tutor":
        return <MessageSquare className="w-5 h-5 text-indigo-500" />;
      default:
        return <FileText className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type?.toLowerCase()) {
      case "quiz":
        return "bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30";
      case "summary":
        return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30";
      case "homework":
        return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30";
      case "tutor":
        return "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30";
      default:
        return "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800";
    }
  };

  const getTypeNameAtBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case "quiz":
        return "Interactive AI Quiz";
      case "summary":
        return "Instant AI Summary";
      case "homework":
        return "AI Homework Help";
      case "tutor":
        return "Tutor Chat Transcript";
      default:
        return "Shared Study Resource";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 dark:text-slate-400 mt-4 font-semibold text-sm animate-pulse">
          Opening educational resource...
        </p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 text-center">
        <div className="w-16 h-16 bg-red-55 border border-red-100 dark:border-red-950/30 rounded-full flex items-center justify-center mb-4 p-2 text-red-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-850 dark:text-white mb-2">Content Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 text-sm">
          This shared link may have expired, been deleted by its owner, or is set to private.
        </p>
        <button
          onClick={onGoToApp}
          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow hover:shadow-lg transition"
        >
          Go to SJ Tutor AI
        </button>
      </div>
    );
  }

  const renderContentBody = () => {
    const rawData = content.content;
    const typeLower = content.type?.toLowerCase();

    if (typeLower === "summary" || typeof rawData === "string") {
      const textToRender = typeof rawData === "string" ? rawData : (rawData.content || rawData.summary || "");
      return (
        <div className="markdown-body text-slate-855 dark:text-slate-200 leading-relaxed text-sm md:text-base space-y-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{textToRender}</ReactMarkdown>
        </div>
      );
    }

    if (typeLower === "homework") {
      return (
        <div className="space-y-6 text-slate-800 dark:text-slate-200">
          {rawData.query && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Homework Problem</span>
              <p className="text-sm font-semibold italic text-slate-700 dark:text-slate-300">&ldquo;{rawData.query}&rdquo;</p>
            </div>
          )}
          {rawData.solution && (
            <div className="markdown-body space-y-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{rawData.solution}</ReactMarkdown>
            </div>
          )}
          {rawData.content && typeof rawData.content === "string" && (
            <div className="markdown-body space-y-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{rawData.content}</ReactMarkdown>
            </div>
          )}
        </div>
      );
    }

    if (typeLower === "quiz") {
      const questions = rawData.questions || rawData || [];
      return (
        <div className="space-y-8">
          <div className="flex items-center gap-3 p-4 bg-primary-50/50 dark:bg-slate-900/50 rounded-xl border border-primary-100/30 dark:border-slate-800 mb-2">
            <Award className="w-5 h-5 text-primary-500 flex-shrink-0" />
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Test your understanding of <strong className="text-slate-800 dark:text-white">&ldquo;{content.title}&rdquo;</strong>. Answer the questions below and hit Submit for results and explanations!
            </p>
          </div>

          <div className="space-y-6">
            {questions.map((q: any, qIdx: number) => {
              const isCorrect = selectedAnswers[qIdx] === q.correctAnswerIndex;
              const hasAnswered = selectedAnswers[qIdx] !== undefined;
              return (
                <div 
                  key={qIdx} 
                  className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <p className="font-bold text-slate-850 dark:text-white mb-4 flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {qIdx + 1}
                    </span>
                    <span className="text-sm md:text-base">{q.question}</span>
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {q.options.map((opt: string, optIdx: number) => {
                      const isSelected = selectedAnswers[qIdx] === optIdx;
                      let optionStyle = "border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800";
                      
                      if (isSelected) {
                        optionStyle = "bg-primary-50 dark:bg-primary-955 border-primary-500 text-primary-700 dark:text-primary-300 font-semibold shadow-inner";
                      }
                      
                      if (quizSubmitted) {
                        if (optIdx === q.correctAnswerIndex) {
                          optionStyle = "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold";
                        } else if (isSelected && !isCorrect) {
                          optionStyle = "bg-red-50 dark:bg-red-950/20 border-red-500 text-red-700 dark:text-red-400";
                        }
                      }
                      
                      return (
                        <button
                          key={optIdx}
                          disabled={quizSubmitted}
                          onClick={() => handleQuizAnswer(qIdx, optIdx)}
                          className={`w-full py-3 px-4 rounded-xl border text-left text-sm transition-all focus:outline-none flex items-center gap-2.5 ${optionStyle}`}
                        >
                          <span className="text-xs font-bold text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && hasAnswered && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 animate-in slide-in-from-top-1">
                      <div className="flex gap-2 text-xs mb-1.5 font-bold">
                        {isCorrect ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">✓ Correct Answer</span>
                        ) : (
                          <span className="text-red-650 dark:text-red-400 flex items-center gap-1">✗ Incorrect (Selected {String.fromCharCode(65 + (selectedAnswers[qIdx] || 0))})</span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
                        <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{q.explanation}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!quizSubmitted ? (
            <div className="flex justify-center pt-2">
              <button
                disabled={Object.keys(selectedAnswers).length < questions.length}
                onClick={calculateSubmittingQuiz}
                className="w-full max-w-xs py-3.5 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 disabled:opacity-50 text-white rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all"
              >
                Submit Answers
              </button>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 text-center animate-in zoom-in-95">
              <span className="text-xs uppercase font-extrabold text-slate-450 tracking-widest block mb-1">Your Results</span>
              <p className="text-4xl md:text-5xl font-extrabold text-primary-600 dark:text-primary-400">{quizScore} / {questions.length}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {quizScore === questions.length ? "Incredible work! Perfect score! 🌟" : quizScore >= questions.length / 2 ? "Good job! Keep practicing for perfection! 📚" : "Review the explanations above to level up!"}
              </p>
              
              <button
                onClick={() => {
                  setSelectedAnswers({});
                  setQuizSubmitted(false);
                  setQuizScore(0);
                }}
                className="mt-4 px-5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                Retake Quiz
              </button>
            </div>
          )}
        </div>
      );
    }

    if (typeLower === "tutor") {
      const messages = rawData.messages || [];
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">
            <MessageSquare className="w-4 h-4 text-primary-500" />
            <span>Chat transcript with AI Tutor</span>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {messages.map((m: any, idx: number) => {
              const isUser = m.role === "user";
              return (
                <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${isUser ? "bg-primary-600 text-white rounded-br-none" : "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-850 dark:text-slate-200 rounded-bl-none shadow-sm"}`}>
                    <span className="block text-[9px] uppercase font-bold tracking-widest opacity-60 mb-1">{isUser ? "Student" : "SJ Tutor AI"}</span>
                    <div className="markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Dynamic Navigation Top-Bar */}
      <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-150 dark:border-slate-800 z-50 py-3 px-4 md:px-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onGoToApp}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-500 to-primary-700 flex items-center justify-center text-white border border-primary-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
              SJ Tutor AI
            </h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Public Classroom Viewer
            </span>
          </div>
        </div>

        <button
          onClick={onGoToApp}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors"
        >
          <span>Open Full Tool</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8">
        
        {/* Modern Presentation Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm mb-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${getTypeStyle(content.type)}`}>
              {getTypeIcon(content.type)}
              <span>{getTypeNameAtBadge(content.type)}</span>
            </div>
            
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(content.createdAt)}
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-850 dark:text-white tracking-tight leading-tight mb-4">
            {content.title}
          </h2>

          <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-5"></div>

          {/* Engagement Analytics & Social Interaction Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 font-mono bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800" title="Total Views">
                <Eye className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{content.views || 0}</span>
                <span className="text-[10px] uppercase text-slate-400 font-bold ml-1">Views</span>
              </div>

              <button 
                onClick={handleLike}
                disabled={hasLiked}
                className={`flex items-center gap-1.5 font-mono px-2.5 py-1.5 rounded-xl border transition-all ${
                  hasLiked 
                    ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 text-rose-500" 
                    : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-105 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-600"
                }`}
                title="Like resource"
              >
                <Heart className={`w-4 h-4 ${hasLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                <span className={`font-semibold ${hasLiked ? "text-rose-500" : "text-slate-700 dark:text-slate-300"}`}>{likesCount}</span>
                <span className="text-[10px] uppercase font-bold ml-1">{hasLiked ? "Liked" : "Likes"}</span>
              </button>
              
              <div className="flex items-center gap-1.5 font-mono bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800" title="Times Copied or Shared">
                <Share2 className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{sharesCount}</span>
                <span className="text-[10px] uppercase text-slate-400 font-bold ml-1">Shares</span>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-bold text-xs md:text-sm px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Resource</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Shared Content Body Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
          {renderContentBody()}
        </div>

        {/* Call to action card footer */}
        <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-primary-500 to-indigo-650 text-white shadow-md text-center">
          <h4 className="text-lg font-extrabold mb-1">Create Your Own Lessons & Quizzes!</h4>
          <p className="text-xs md:text-sm opacity-90 max-w-lg mx-auto mb-4">
            SJ Tutor AI help schools and students level up with instant syllabus planning, summarized video insights, adaptive testing, and responsive 24/7 AI learning tutors.
          </p>
          <button
            onClick={onGoToApp}
            className="px-6 py-2.5 bg-white text-primary-700 hover:bg-slate-50 font-extrabold text-sm rounded-xl tracking-tight transition-all shadow"
          >
            Get Started Free
          </button>
        </div>
      </main>

      {/* Humble Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-900 text-center text-xs text-slate-400 mt-12 bg-white dark:bg-slate-900">
        <p>© 2026 SJ Tutor AI. Empowering custom and fast classroom learning workflows.</p>
      </footer>
    </div>
  );
};
