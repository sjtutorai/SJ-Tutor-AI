import React, { useState, useEffect } from "react";
import { 
  getSharedContent, 
  incrementViewCount, 
  incrementLikeCount, 
  incrementShareCount,
  recordSharedContentViewer
} from "../utils/firebaseUtils";
import { auth, db } from "../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
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
  Lock,
  Unlock,
  User,
  UserCheck,
  Edit3,
  Trophy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  GraduationCap
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNotifications } from "./NotificationContext";

interface PublicShareViewerProps {
  shareId: string;
  onGoToApp?: () => void;
}

const VIEWER_NAME_STORAGE_KEY = "sjtutor_viewer_name";
const VIEWER_ROLE_STORAGE_KEY = "sjtutor_viewer_role";

export const PublicShareViewer: React.FC<PublicShareViewerProps> = ({ 
  shareId,
  onGoToApp
}) => {
  const { triggerToast } = useNotifications();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // Viewer Registration State for Continuous Watching
  const [viewerName, setViewerName] = useState<string>(() => {
    return localStorage.getItem(VIEWER_NAME_STORAGE_KEY) || auth.currentUser?.displayName || "";
  });
  const [viewerRole, setViewerRole] = useState<string>(() => {
    return localStorage.getItem(VIEWER_ROLE_STORAGE_KEY) || "Student";
  });
  const [nameInput, setNameInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("Student");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [registrationError, setRegistrationError] = useState("");

  // Quiz View Mode: 'review' (view student score & answers) | 'interactive' (try quiz yourself)
  const [quizViewMode, setQuizViewMode] = useState<"review" | "interactive">("review");
  const [interactiveAnswers, setInteractiveAnswers] = useState<Record<number, number>>({});
  const [interactiveSubmitted, setInteractiveSubmitted] = useState(false);
  const [interactiveScore, setInteractiveScore] = useState(0);

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
          
          // Increment view count on load
          try {
            await incrementViewCount(shareId);
          } catch (e) {
            console.warn("Could not increment view count", e);
          }

          // If viewer is already registered, record their presence
          const savedViewerName = localStorage.getItem(VIEWER_NAME_STORAGE_KEY) || auth.currentUser?.displayName;
          if (savedViewerName) {
            recordSharedContentViewer(shareId, savedViewerName, auth.currentUser?.uid).catch(() => {});
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

  // Handle Viewer Registration
  const handleRegisterViewer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) {
      setRegistrationError("Please enter your name to continue watching.");
      return;
    }
    if (cleanName.length < 2) {
      setRegistrationError("Name must be at least 2 characters long.");
      return;
    }

    setIsRegistering(true);
    try {
      localStorage.setItem(VIEWER_NAME_STORAGE_KEY, cleanName);
      localStorage.setItem(VIEWER_ROLE_STORAGE_KEY, selectedRole);
      setViewerName(cleanName);
      setViewerRole(selectedRole);
      setRegistrationError("");
      setShowEditNameModal(false);

      // Record viewer in database
      recordSharedContentViewer(shareId, cleanName, auth.currentUser?.uid).catch(() => {});

      triggerToast(
        `Welcome, ${cleanName}! 🎉`,
        "Full quiz submission and continuous study watching unlocked.",
        "Study Reminders"
      );
    } catch (err) {
      console.error("Failed to register viewer name:", err);
    } finally {
      setIsRegistering(false);
    }
  };

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
      
      setSharesCount(prev => prev + 1);
      await incrementShareCount(shareId);
    } catch (e) {
      console.warn("Share cancelled or failed", e);
    }
  };

  const handleInteractiveAnswer = (qIndex: number, optionIndex: number) => {
    if (interactiveSubmitted) return;
    setInteractiveAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleInteractiveSubmit = () => {
    const rawData = content?.content;
    const questions = rawData?.questions || (Array.isArray(rawData) ? rawData : []);
    if (!questions || questions.length === 0) return;
    
    let correct = 0;
    questions.forEach((q: any, idx: number) => {
      if (interactiveAnswers[idx] === q.correctAnswerIndex) {
        correct++;
      }
    });
    
    setInteractiveScore(correct);
    setInteractiveSubmitted(true);
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
        return "Interactive AI Quiz & Score Card";
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

  // Score Grade Helper
  const getScoreGrade = (percentage: number) => {
    if (percentage >= 90) return { label: "Mastery (A+)", color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800", icon: "🏆" };
    if (percentage >= 75) return { label: "Proficient (A)", color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800", icon: "🥇" };
    if (percentage >= 60) return { label: "Good Effort (B)", color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800", icon: "🥈" };
    if (percentage >= 40) return { label: "Developing (C)", color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800", icon: "🥉" };
    return { label: "Needs Practice", color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800", icon: "📚" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 dark:text-slate-400 mt-4 font-semibold text-sm animate-pulse">
          Opening educational resource & score submission...
        </p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 text-center">
        <div className="w-16 h-16 bg-red-50 border border-red-100 dark:border-red-950/30 rounded-full flex items-center justify-center mb-4 p-2 text-red-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-2">Content Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 text-sm">
          This shared content is no longer available or has been removed.
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

  if (content.isPublic === false) {
    const isOwner = auth.currentUser?.uid === content.ownerId || auth.currentUser?.uid === content.ownerUid;
    
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 text-center">
        <div className="w-16 h-16 bg-amber-50 border border-amber-100 dark:border-amber-950/30 rounded-full flex items-center justify-center mb-4 p-2 text-amber-500">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-2">This content is private.</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 text-sm">
          Only the owner can view or change this setting.
        </p>
        {isOwner && (
          <button
            onClick={async () => {
              try {
                await updateDoc(doc(db, "sharedContent", shareId), { isPublic: true });
                setContent({ ...content, isPublic: true });
              } catch (e) {
                console.error("Failed to make public:", e);
                triggerToast("Privacy Error", "Could not update privacy setting.", "Important Alerts");
              }
            }}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            Make Public
          </button>
        )}
        {!isOwner && (
          <button
            onClick={onGoToApp}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm shadow transition"
          >
            Return Home
          </button>
        )}
      </div>
    );
  }

  const renderContentBody = () => {
    const rawData = content.content;
    const typeLower = content.type?.toLowerCase();

    // ==========================================
    // RENDER: QUIZ WITH SCORE & USER ANSWERS
    // ==========================================
    if (typeLower === "quiz") {
      const isObjectPayload = rawData && typeof rawData === "object" && !Array.isArray(rawData);
      const questions: any[] = isObjectPayload ? (rawData.questions || []) : (Array.isArray(rawData) ? rawData : []);
      
      // Extract Student Score & Submitter Info
      const userScore = isObjectPayload && rawData.userScore !== undefined 
        ? rawData.userScore 
        : (content.score !== undefined ? content.score : undefined);
      
      const totalQuestions = questions.length;
      const percentage = isObjectPayload && rawData.percentage !== undefined
        ? rawData.percentage
        : (userScore !== undefined && totalQuestions > 0 ? Math.round((userScore / totalQuestions) * 100) : undefined);
      
      // Extract Student's Selected Answers
      const userAnswers: (number | null)[] = isObjectPayload && rawData.userAnswers
        ? (Array.isArray(rawData.userAnswers) ? rawData.userAnswers : Object.values(rawData.userAnswers))
        : [];
      
      const submitterName = (isObjectPayload && rawData.submitterName) || content.submitterName || content.ownerDisplayName || "Student";
      const subjectTag = isObjectPayload && rawData.subject;
      const gradeClassTag = isObjectPayload && rawData.gradeClass;
      const completedAtTime = (isObjectPayload && rawData.completedAt) || content.createdAt;

      // Check if registration is completed to unlock full questions
      const hasRegistered = !!viewerName;
      // If not registered, we show question 0 as preview teaser, and gate questions 1...N
      const previewLimit = hasRegistered ? questions.length : 1;

      const gradeInfo = percentage !== undefined ? getScoreGrade(percentage) : null;

      return (
        <div className="space-y-8">
          {/* Top Viewer Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
                {hasRegistered ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Viewer Status:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {hasRegistered ? `Watching as: ${viewerName} (${viewerRole})` : "Guest Viewer (Register to unlock continuous watching)"}
                </span>
              </div>
            </div>

            {hasRegistered ? (
              <button
                onClick={() => {
                  setNameInput(viewerName);
                  setSelectedRole(viewerRole);
                  setShowEditNameModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-600 font-semibold transition-all shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary-500" />
                <span>Edit Name</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setNameInput("");
                  setShowEditNameModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-all shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Register Name to Watch</span>
              </button>
            )}
          </div>

          {/* ========================================================= */}
          {/* USER SCORE SHOWCASE CARD (Displayed when user scored)     */}
          {/* ========================================================= */}
          {userScore !== undefined && (
            <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-primary-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-primary-950/20 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Left: Score Badge & Submitter Info */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex flex-col items-center justify-center shadow-md flex-shrink-0">
                    <Trophy className="w-6 h-6 md:w-8 md:h-8 mb-0.5 text-amber-300" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-primary-100">Quiz Score</span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Official Submission
                      </span>
                      {gradeInfo && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border flex items-center gap-1 ${gradeInfo.color}`}>
                          <span>{gradeInfo.icon}</span>
                          <span>{gradeInfo.label}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {userScore} <span className="text-lg md:text-xl text-slate-400 font-semibold">/ {totalQuestions}</span>
                      {percentage !== undefined && (
                        <span className="ml-3 text-lg md:text-xl text-primary-600 dark:text-primary-400 font-extrabold">
                          ({percentage}%)
                        </span>
                      )}
                    </h3>

                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                        <GraduationCap className="w-4 h-4 text-primary-500" />
                        Taken by {submitterName}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(completedAtTime)}
                      </span>
                    </p>

                    {(subjectTag || gradeClassTag) && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {gradeClassTag && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                            Class: {gradeClassTag}
                          </span>
                        )}
                        {subjectTag && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                            Subject: {subjectTag}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Accuracy & Quick Stats */}
                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 gap-3">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Performance</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {userScore} Correct • {Math.max(0, totalQuestions - userScore)} Incorrect
                    </span>
                  </div>

                  {/* Mode Selector Buttons */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setQuizViewMode("review")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        quizViewMode === "review"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Student Answers
                    </button>
                    <button
                      onClick={() => setQuizViewMode("interactive")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        quizViewMode === "interactive"
                          ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                      }`}
                    >
                      Try Quiz Yourself
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 1: REVIEW STUDENT ANSWERS & EXPLANATIONS             */}
          {/* ========================================================= */}
          {quizViewMode === "review" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary-500" />
                  Question-by-Question Breakdown & Student Answers
                </h4>
                <span className="text-xs text-slate-500 font-medium">
                  {questions.length} Questions Total
                </span>
              </div>

              {questions.slice(0, previewLimit).map((q: any, qIdx: number) => {
                const studentAnswerIdx = userAnswers && userAnswers[qIdx] !== undefined && userAnswers[qIdx] !== null 
                  ? userAnswers[qIdx] 
                  : undefined;
                const studentAnswered = studentAnswerIdx !== undefined;
                const studentIsCorrect = studentAnswered && studentAnswerIdx === q.correctAnswerIndex;

                return (
                  <div 
                    key={qIdx} 
                    className="p-5 md:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-all"
                  >
                    {/* Question Header */}
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-black flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                        {qIdx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white text-base md:text-lg leading-snug">
                          {q.question}
                        </p>
                        
                        {/* Student Result Banner */}
                        {studentAnswered && (
                          <div className="mt-2 flex items-center gap-2">
                            {studentIsCorrect ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                {submitterName} Answered Correctly (Option {String.fromCharCode(65 + studentAnswerIdx!)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                {submitterName} Answered: Option {String.fromCharCode(65 + studentAnswerIdx!)} (Incorrect)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {q.options?.map((opt: string, optIdx: number) => {
                        const isStudentAnswer = studentAnswerIdx === optIdx;
                        const isCorrectAnswer = q.correctAnswerIndex === optIdx;

                        let cardStyle = "bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300";
                        let badgeText = "";
                        let badgeStyle = "";

                        if (isCorrectAnswer) {
                          cardStyle = "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/80 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500/30";
                          badgeText = "✓ Correct Answer";
                          badgeStyle = "bg-emerald-600 text-white";
                        }

                        if (isStudentAnswer) {
                          if (isStudentAnswer && isCorrectAnswer) {
                            badgeText = `✓ ${submitterName}'s Answer (Correct)`;
                            badgeStyle = "bg-emerald-700 text-white font-extrabold";
                          } else {
                            cardStyle = "bg-rose-50/80 dark:bg-rose-950/30 border-rose-500/80 text-rose-900 dark:text-rose-200 font-semibold ring-1 ring-rose-500/30";
                            badgeText = `✗ ${submitterName}'s Selected Answer`;
                            badgeStyle = "bg-rose-600 text-white font-extrabold";
                          }
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3.5 rounded-xl border text-left text-sm relative flex flex-col justify-between gap-2 transition-all ${cardStyle}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-md bg-white/80 dark:bg-slate-800 text-xs font-black text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="leading-snug">{opt}</span>
                            </div>

                            {badgeText && (
                              <div className="flex justify-end">
                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeStyle}`}>
                                  {badgeText}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {q.explanation && (
                      <div className="mt-3 p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                              Explanation & Learning Notes:
                            </span>
                            <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {q.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ========================================================= */}
              {/* CONTINUOUS WATCHING / VIEWER REGISTRATION GATE           */}
              {/* ========================================================= */}
              {!hasRegistered && questions.length > 1 && (
                <div className="mt-8 p-6 md:p-8 bg-gradient-to-tr from-slate-900 via-primary-950 to-slate-900 text-white rounded-2xl md:rounded-3xl border border-primary-500/30 shadow-xl text-center space-y-5 animate-in fade-in-50 duration-500">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-primary-500 to-indigo-500 flex items-center justify-center text-white shadow-lg">
                    <UserCheck className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-xl md:text-2xl font-black tracking-tight">
                      Register Your Name to Watch Continuously
                    </h3>
                    <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto mt-1.5 leading-relaxed">
                      You are viewing 1 of {questions.length} questions. Please enter your name below to unlock the remaining {questions.length - 1} questions, full student responses, and study continuously.
                    </p>
                  </div>

                  <form onSubmit={handleRegisterViewer} className="max-w-md mx-auto space-y-4">
                    <div>
                      <label className="block text-left text-xs font-bold text-slate-300 mb-1.5">
                        Your Full Name:
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => {
                            setNameInput(e.target.value);
                            setRegistrationError("");
                          }}
                          placeholder="e.g. Alex Rivera or Prof. Smith"
                          className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                        />
                      </div>
                      {registrationError && (
                        <p className="text-left text-xs text-rose-400 mt-1.5 font-semibold">
                          {registrationError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-left text-xs font-bold text-slate-300 mb-1.5">
                        I am viewing as:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {["Student", "Teacher", "Peer", "Parent"].map((role) => (
                          <button
                            type="button"
                            key={role}
                            onClick={() => setSelectedRole(role)}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border ${
                              selectedRole === role
                                ? "bg-primary-500 border-primary-400 text-white shadow-xs"
                                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white"
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {isRegistering ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Unlock All Questions & Watch Continuously</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 2: INTERACTIVE TEST YOURSELF MODE                    */}
          {/* ========================================================= */}
          {quizViewMode === "interactive" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-primary-500" />
                    Interactive Challenge Mode
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your answers below and submit to compare your score with {submitterName}!
                  </p>
                </div>
              </div>

              {questions.map((q: any, qIdx: number) => {
                const isSelected = interactiveAnswers[qIdx] !== undefined;
                const isCorrect = interactiveAnswers[qIdx] === q.correctAnswerIndex;

                return (
                  <div 
                    key={qIdx} 
                    className="p-5 md:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white text-base md:text-lg">
                        {q.question}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options?.map((opt: string, optIdx: number) => {
                        const isOptionChosen = interactiveAnswers[qIdx] === optIdx;
                        let optionStyle = "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800";

                        if (isOptionChosen) {
                          optionStyle = "bg-primary-50 dark:bg-primary-950 border-primary-500 text-primary-700 dark:text-primary-300 font-bold ring-1 ring-primary-500/20";
                        }

                        if (interactiveSubmitted) {
                          if (optIdx === q.correctAnswerIndex) {
                            optionStyle = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold";
                          } else if (isOptionChosen && !isCorrect) {
                            optionStyle = "bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-800 dark:text-rose-300";
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={interactiveSubmitted}
                            onClick={() => handleInteractiveAnswer(qIdx, optIdx)}
                            className={`w-full py-3.5 px-4 rounded-xl border text-left text-sm transition-all flex items-center gap-2.5 ${optionStyle}`}
                          >
                            <span className="text-xs font-bold text-slate-400">{String.fromCharCode(65 + optIdx)}.</span>
                            <span className="flex-1 leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {interactiveSubmitted && isSelected && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className={`text-xs font-bold block mb-1 ${isCorrect ? "text-emerald-600" : "text-rose-600"}`}>
                          {isCorrect ? "✓ You answered correctly!" : `✗ Incorrect (You chose ${String.fromCharCode(65 + interactiveAnswers[qIdx])})`}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Submit Interactive Quiz Button */}
              {!interactiveSubmitted ? (
                <div className="flex justify-center pt-4">
                  <button
                    disabled={Object.keys(interactiveAnswers).length < questions.length}
                    onClick={handleInteractiveSubmit}
                    className="w-full max-w-sm py-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-base font-extrabold shadow-md transition-all active:scale-95"
                  >
                    Submit My Answers & Compare Score
                  </button>
                </div>
              ) : (
                <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 animate-in zoom-in-95">
                  <span className="text-xs uppercase font-extrabold text-slate-400 tracking-widest block">
                    Your Challenge Results
                  </span>
                  <p className="text-4xl md:text-5xl font-black text-primary-600 dark:text-primary-400">
                    {interactiveScore} / {questions.length}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {userScore !== undefined ? (
                      interactiveScore > userScore 
                        ? `🎉 Awesome! You scored higher than ${submitterName} (${userScore}/${questions.length})!`
                        : interactiveScore === userScore
                        ? `🤝 Tie game! You matched ${submitterName}'s score of ${userScore}/${questions.length}!`
                        : `Good try! ${submitterName} scored ${userScore}/${questions.length}. Keep learning!`
                    ) : (
                      "Great job completing the challenge!"
                    )}
                  </p>
                  
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setInteractiveAnswers({});
                        setInteractiveSubmitted(false);
                        setInteractiveScore(0);
                      }}
                      className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                    >
                      Retake Challenge
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ==========================================
    // RENDER: SUMMARY & STUDY MATERIAL
    // ==========================================
    if (typeLower === "summary" || typeof rawData === "string") {
      const textToRender = typeof rawData === "string" ? rawData : (rawData.content || rawData.summary || "");
      return (
        <div className="markdown-body text-slate-800 dark:text-slate-200 leading-relaxed text-sm md:text-base space-y-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{textToRender}</ReactMarkdown>
        </div>
      );
    }

    // ==========================================
    // RENDER: HOMEWORK HELP
    // ==========================================
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

    // ==========================================
    // RENDER: TUTOR TRANSCRIPT
    // ==========================================
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
      <header className="sticky top-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-50 py-3 px-4 md:px-6 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onGoToApp}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-500 to-primary-700 flex items-center justify-center text-white border border-primary-200 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">
              SJ Tutor AI
            </h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
              Public Quiz & Classroom Viewer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {viewerName && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <UserCheck className="w-3.5 h-3.5 text-primary-500" />
              <span>{viewerName}</span>
            </span>
          )}

          <button
            onClick={onGoToApp}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs md:text-sm font-bold transition-all shadow-xs"
          >
            <span>Open SJ Tutor AI</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-6 py-8">
        
        {/* Modern Presentation Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xs mb-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${getTypeStyle(content.type)}`}>
              {getTypeIcon(content.type)}
              <span>{getTypeNameAtBadge(content.type)}</span>
            </div>
            
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(content.createdAt)}
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            {content.title}
          </h2>

          <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-5"></div>

          {/* Engagement Analytics & Social Interaction Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 font-mono bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800" title="Total Views">
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
                    : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600"
                }`}
                title="Like resource"
              >
                <Heart className={`w-4 h-4 ${hasLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                <span className={`font-semibold ${hasLiked ? "text-rose-500" : "text-slate-700 dark:text-slate-300"}`}>{likesCount}</span>
                <span className="text-[10px] uppercase font-bold ml-1">{hasLiked ? "Liked" : "Likes"}</span>
              </button>
              
              <div className="flex items-center gap-1.5 font-mono bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800" title="Times Copied or Shared">
                <Share2 className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">{sharesCount}</span>
                <span className="text-[10px] uppercase text-slate-400 font-bold ml-1">Shares</span>
              </div>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white font-bold text-xs md:text-sm px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all"
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-xs">
          {renderContentBody()}
        </div>

        {/* Call to action card footer */}
        <div className="mt-10 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 text-white shadow-md text-center space-y-3">
          <h4 className="text-xl font-black">Ready to Level Up Your Own Grades?</h4>
          <p className="text-xs md:text-sm text-primary-100 max-w-lg mx-auto leading-relaxed">
            Generate customized AI quizzes, instant chapter summaries, and step-by-step homework solutions with SJ Tutor AI.
          </p>
          <div className="pt-2">
            <button
              onClick={onGoToApp}
              className="px-6 py-3 bg-white text-primary-700 hover:bg-primary-50 font-extrabold text-sm rounded-xl tracking-tight transition-all shadow-sm active:scale-95"
            >
              Launch SJ Tutor AI Free
            </button>
          </div>
        </div>
      </main>

      {/* Edit Viewer Name Modal Dialog */}
      {showEditNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary-500" />
                Viewer Name Registration
              </h3>
              <button
                onClick={() => setShowEditNameModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterViewer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Your Full Name:
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    setRegistrationError("");
                  }}
                  placeholder="e.g. Alex Rivera or Prof. Smith"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                />
                {registrationError && (
                  <p className="text-xs text-rose-500 mt-1 font-semibold">
                    {registrationError}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Role:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["Student", "Teacher", "Peer", "Parent"].map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border ${
                        selectedRole === role
                          ? "bg-primary-600 border-primary-500 text-white shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditNameModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Save & Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 dark:border-slate-900 text-center text-xs text-slate-400 mt-12 bg-white dark:bg-slate-900">
        <p>© 2026 SJ Tutor AI. Empowering custom and fast classroom learning workflows.</p>
      </footer>
    </div>
  );
};
