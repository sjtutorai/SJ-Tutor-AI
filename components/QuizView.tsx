import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { 
  CheckCircle, XCircle, ArrowRight, ArrowLeft, RefreshCw, Facebook, 
  Send, MessageCircle, Link, Share2, X, Trophy, Check, 
  Copy, Download, Timer, Sparkles, Award, ShieldAlert, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExportModal } from './ExportModal';
import confetti from 'canvas-confetti';

interface QuizViewProps {
  questions: QuizQuestion[];
  onReset: () => void;
  onComplete?: (score: number) => void;
  existingScore?: number;
  isViewingShared?: boolean;
  onAddToMyList?: () => void;
  isAddedToList?: boolean;
  onSharePublicLink?: (type: string, title: string, content: any) => void;
}

const LOADING_STEPS = [
  "Loading Questions...",
  "Preparing Timer...",
  "Randomizing Questions...",
  "Loading Images...",
  "Setting Difficulty...",
  "Almost Ready..."
];

const QuizView: React.FC<QuizViewProps> = ({ 
  questions, 
  onReset, 
  onComplete, 
  existingScore,
  isViewingShared = false,
  onAddToMyList,
  isAddedToList = false,
  onSharePublicLink
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(() => new Array(questions.length).fill(null));
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Loading screen states
  const [quizLoading, setQuizLoading] = useState(existingScore === undefined);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Result screen counting states
  const [countedScore, setCountedScore] = useState(0);
  const [ringProgress, setRingProgress] = useState(0);

  const handleSaveClick = () => {
    if (onAddToMyList) {
      onAddToMyList();
    } else {
      setLocalSaved(true);
      setTimeout(() => setLocalSaved(false), 4000);
    }
  };

  // 1. INTRO QUIZ LOADING SCREEN (ONLY IF NEW QUIZ)
  useEffect(() => {
    if (quizLoading) {
      const duration = 2200;
      const intervalTime = duration / LOADING_STEPS.length;

      // Cycle textual loading messages
      const stepInterval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, intervalTime);

      // Smooth progress count to 100%
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 1.5;
        });
      }, 30);

      const timeout = setTimeout(() => {
        setQuizLoading(false);
        clearInterval(stepInterval);
        clearInterval(progressInterval);
      }, duration);

      return () => {
        clearInterval(stepInterval);
        clearInterval(progressProgressInterval);
        clearTimeout(timeout);
      };
    }
  }, [quizLoading]);

  // Handle quiz loading interval ref fallback
  const progressProgressInterval = undefined;

  // Initialize view if there's an existing score (viewing history)
  useEffect(() => {
    if (existingScore !== undefined) {
      setScore(existingScore);
      setQuizCompleted(true);
      setShowResultModal(true);
    }
  }, [existingScore]);

  // 2. RESULT COUNTING ANIMATION & CONFETTI
  useEffect(() => {
    if (showResultModal) {
      const finalPercentage = Math.round((score / questions.length) * 100);
      
      // Reset counting values
      setCountedScore(0);
      setRingProgress(0);

      // Animate numerical score count
      let currentCount = 0;
      const countDuration = 1200;
      const stepTime = Math.max(Math.floor(countDuration / (score || 1)), 40);
      
      const countInterval = setInterval(() => {
        if (score === 0) {
          clearInterval(countInterval);
          return;
        }
        currentCount += 1;
        if (currentCount >= score) {
          setCountedScore(score);
          clearInterval(countInterval);
        } else {
          setCountedScore(currentCount);
        }
      }, stepTime);

      // Animate SVG Ring Fill
      const ringTimer = setTimeout(() => {
        setRingProgress(finalPercentage);
      }, 100);

      // Trigger premium confetti explosion if score is >= 80%
      if (finalPercentage >= 80) {
        const confettiTimer = setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#2563EB', '#7C3AED', '#06B6D4', '#10B981']
          });
        }, 400);
        return () => {
          clearInterval(countInterval);
          clearTimeout(ringTimer);
          clearTimeout(confettiTimer);
        };
      }

      return () => {
        clearInterval(countInterval);
        clearTimeout(ringTimer);
      };
    }
  }, [showResultModal, score, questions.length]);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (optionIndex: number) => {
    if (quizCompleted) return;
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Evaluate all answers!
      const finalScore = userAnswers.reduce((acc, ans, idx) => {
        return ans === questions[idx].correctAnswerIndex ? acc + 1 : acc;
      }, 0);
      setScore(finalScore);
      setQuizCompleted(true);
      setShowResultModal(true);
      if (onComplete) {
        onComplete(finalScore);
      }
    }
  };

  const handleShare = (platform: string) => {
    const text = `I scored ${score}/${questions.length} on my SJ Tutor AI Quiz! 🎓`;
    const shareUrl = `${window.location.origin}?share=quiz`;
    const shareTextWithLink = `${text}\nCheck it out here: ${shareUrl}`;
    
    let url = '';
    switch(platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTextWithLink)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareTextWithLink).then(() => {
          alert('Share link copied to clipboard!');
        });
        return;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
  };

  // ==========================================
  // RENDER: QUIZ INITIAL LOADING SCREEN
  // ==========================================
  if (quizLoading) {
    const particles = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1.5,
    }));

    return (
      <div className="relative p-12 bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950 text-white rounded-[24px] border border-slate-800 shadow-2xl min-h-[480px] flex flex-col items-center justify-center overflow-hidden">
        {/* Floating Background Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              animate={{ 
                y: [`${p.y}%`, `${p.y - 15}%`],
                opacity: [0, 0.4, 0]
              }}
              transition={{
                duration: 5 + Math.random() * 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute bg-blue-400 rounded-full"
              style={{
                left: `${p.x}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
              }}
            />
          ))}
        </div>

        {/* Floating Timer Icon */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute w-20 h-20 rounded-full border border-dashed border-blue-400/40"
          />
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-14 h-14 rounded-full bg-slate-900/90 border border-slate-800 flex items-center justify-center"
          >
            <Timer className="w-7 h-7 text-blue-400 animate-pulse" />
          </motion.div>
        </div>

        {/* Dynamic loading textual indicator */}
        <div className="h-6 mb-4 flex items-center justify-center z-10">
          <AnimatePresence mode="wait">
            <motion.h3
              key={loadingStepIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="text-lg font-bold text-slate-200 tracking-wide font-mono"
            >
              {LOADING_STEPS[loadingStepIdx]}
            </motion.h3>
          </AnimatePresence>
        </div>

        <p className="text-xs text-slate-400 max-w-xs text-center mb-8 z-10 leading-relaxed">
          Calibrating grading metrics, timers, and randomized academic selections...
        </p>

        {/* Circular Loading Progress */}
        <div className="relative w-20 h-20 flex items-center justify-center z-10">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="34"
              className="stroke-slate-800/60 fill-none"
              strokeWidth="4"
            />
            <motion.circle
              cx="40"
              cy="40"
              r="34"
              className="stroke-blue-500 fill-none"
              strokeWidth="4"
              strokeDasharray="213.52"
              strokeDashoffset={213.52 - (213.52 * loadingProgress) / 100}
              transition={{ ease: "linear" }}
            />
          </svg>
          <span className="absolute text-sm font-bold text-slate-300 font-mono">{Math.round(loadingProgress)}%</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: RESULTS COMPLETED OVERLAY / MODAL
  // ==========================================
  const renderResultModal = () => {
    const percentage = Math.round((score / questions.length) * 100);
    let message = "Good effort!";
    let BadgeIcon = Award;
    let badgeColor = "from-indigo-400 to-indigo-600 shadow-indigo-500/20";
    let badgeText = "Scholar Explorer";

    if (percentage >= 90) {
      message = "Academic Genius! Perfect score!";
      BadgeIcon = Star;
      badgeColor = "from-amber-400 to-amber-600 shadow-amber-500/20";
      badgeText = "Summa Cum Laude";
    } else if (percentage >= 80) {
      message = "Excellent work! High honors!";
      BadgeIcon = Trophy;
      badgeColor = "from-blue-400 to-blue-600 shadow-blue-500/20";
      badgeText = "Honor Roll Student";
    } else if (percentage >= 50) {
      message = "Keep practicing, you are getting there!";
      BadgeIcon = CheckCircle;
      badgeColor = "from-emerald-400 to-emerald-600 shadow-emerald-500/20";
      badgeText = "Knowledge Achiever";
    } else {
      BadgeIcon = ShieldAlert;
      badgeColor = "from-slate-400 to-slate-600 shadow-slate-500/20";
      badgeText = "Determination Badge";
    }

    return (
      <AnimatePresence>
        {showResultModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 30, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.94, y: 30, filter: "blur(4px)" }}
              transition={{ type: "spring", damping: 20, stiffness: 120 }}
              className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl overflow-hidden max-w-lg w-full relative border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setShowResultModal(false)}
                className="absolute top-5 right-5 p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors z-20 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 text-center">
                {/* 1. GORGEOUS POPPING BADGE & SCORE CIRCLE */}
                <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
                  {/* SVG Circular Fill Progress */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                      strokeWidth="6"
                    />
                    <motion.circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-primary-500 fill-none"
                      strokeWidth="6"
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: 402.12 }}
                      animate={{ strokeDashoffset: 402.12 - (402.12 * ringProgress) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeDasharray="402.12"
                    />
                  </svg>

                  {/* Popping Award/Trophy Badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.4, stiffness: 180, damping: 15 }}
                    className={`relative w-24 h-24 bg-gradient-to-br ${badgeColor} rounded-full flex items-center justify-center shadow-lg z-10 text-white`}
                  >
                    <BadgeIcon className="w-11 h-11" />
                    
                    {/* Tiny glowing star badge decoration */}
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 p-1 rounded-full border-2 border-white dark:border-slate-900"
                    >
                      <Sparkles className="w-3 h-3 fill-current" />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Badge title popup */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-slate-800 text-primary-600 dark:text-primary-400 rounded-full text-xs font-black uppercase tracking-wider mb-3 border border-primary-100 dark:border-slate-700 shadow-sm"
                >
                  <Award className="w-3.5 h-3.5" />
                  {badgeText}
                </motion.div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  Quiz Completed!
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium italic text-sm">&quot;{message}&quot;</p>
                
                {/* 2. SCORE BOX WITH COUNTING ANIMATION */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 mb-6 border border-slate-100 dark:border-slate-800"
                >
                  <div className="text-5xl font-black text-primary-600 dark:text-primary-400 mb-0.5 tracking-tighter">
                    {countedScore}<span className="text-2xl text-slate-300 dark:text-slate-600 font-normal">/{questions.length}</span>
                  </div>
                  <div className="flex justify-center gap-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                    <span>Score: {countedScore}</span>
                    <span>•</span>
                    <span>Accuracy: {percentage}%</span>
                  </div>
                </motion.div>

                {/* 3. BUTTONS ANIMATE UPWARD */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Save Button */}
                    <button
                      onClick={handleSaveClick}
                      disabled={isAddedToList || localSaved}
                      className={`p-3 border rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-xs transition ${
                        (isAddedToList || localSaved)
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 cursor-not-allowed shadow-none'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:scale-[1.02]'
                      }`}
                    >
                      <Check className={`w-4 h-4 ${(isAddedToList || localSaved) ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span>{(isAddedToList || localSaved) ? "Saved" : "Save Score"}</span>
                    </button>

                    {/* Premium Export Button */}
                    <button
                      onClick={() => setIsExportOpen(true)}
                      className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-sm transition hover:scale-[1.02]"
                    >
                      <Download className="w-4 h-4 text-amber-500" />
                      <span>Export Quiz</span>
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={async () => {
                        try {
                          let quizText = "🧠 SJ Tutor AI Quiz Challenge 🧠\n\n";
                          questions.forEach((q, i) => {
                            quizText += `Q${i+1}: ${q.question}\n`;
                            q.options.forEach((opt, j) => {
                              quizText += `   ${String.fromCharCode(65+j)}) ${opt}\n`;
                            });
                            quizText += `\n`;
                          });
                          await navigator.clipboard.writeText(quizText);
                          alert("Quiz copied to clipboard!");
                        } catch {
                          alert("Failed to copy quiz.");
                        }
                      }}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-xs transition hover:scale-[1.02]"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Quiz</span>
                    </button>

                    {/* Share Link Button */}
                    <button
                      onClick={() => onSharePublicLink && onSharePublicLink('quiz', questions[0]?.question ? `Quiz: ${questions[0].question.substring(0, 35)}...` : 'AI Quiz Challenge', questions)}
                      className="p-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-sm transition hover:scale-[1.02]"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Link</span>
                    </button>
                  </div>

                  <button
                    onClick={onReset}
                    className="flex items-center justify-center px-8 py-3.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl font-bold transition-all hover:scale-[1.01] active:scale-95 w-full shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake Another Quiz
                  </button>

                  {/* Individual statistics sharing */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Quick Share Score</p>
                    <div className="flex justify-center gap-3">
                      {['whatsapp', 'facebook', 'telegram', 'copy'].map(plat => (
                        <button 
                          key={plat}
                          onClick={() => handleShare(plat)} 
                          className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 transition-all hover:scale-110"
                        >
                          {plat === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                          {plat === 'facebook' && <Facebook className="w-5 h-5" />}
                          {plat === 'telegram' && <Send className="w-5 h-5" />}
                          {plat === 'copy' && <Link className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {renderResultModal()}

      {isViewingShared && onAddToMyList && (
        <div className="bg-primary-50 dark:bg-slate-800 border border-primary-100 dark:border-slate-700 px-6 py-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <span role="img" aria-label="gift" className="text-xl">✨</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Viewing Shared Quiz</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">This AI-generated interactive quiz was shared with you. Save it to practice later!</p>
            </div>
          </div>
          <button
            onClick={onAddToMyList}
            disabled={isAddedToList}
            className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 ${
              isAddedToList 
                ? 'bg-slate-200 text-slate-450 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-primary-600 hover:bg-primary-700 text-white transform hover:-translate-y-0.5'
            }`}
          >
            {isAddedToList ? '✓ Added to Study History' : '📥 Add to My Study List'}
          </button>
        </div>
      )}
      
      {quizCompleted && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Review Answers
            </h3>
            <button 
              onClick={() => setShowResultModal(true)}
              className="text-primary-600 font-bold text-sm hover:underline"
            >
              View Final Score
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {questions.map((q, idx) => {
              const userAnswer = userAnswers[idx];
              const isCorrect = userAnswer === q.correctAnswerIndex;
              const isSkipped = userAnswer === null;

              return (
                <div key={idx} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex gap-3 text-left">
                      <span className="text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">{idx + 1}</span>
                      {q.question}
                    </p>
                    
                    <div>
                      {isSkipped ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 rounded-full text-xs font-black">
                          Skipped
                        </span>
                      ) : isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-black">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-750 dark:text-rose-400 rounded-full text-xs font-black">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          Incorrect
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pl-8 mb-4">
                    {q.options.map((opt, optIdx) => {
                      let optionStyle = "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400";
                      let indicatorIcon = null;

                      if (optIdx === q.correctAnswerIndex) {
                        optionStyle = "bg-emerald-50/70 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold";
                        indicatorIcon = <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
                      } else if (optIdx === userAnswer) {
                        optionStyle = "bg-rose-50/70 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-350 font-bold";
                        indicatorIcon = <XCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />;
                      }

                      return (
                        <div 
                          key={optIdx} 
                          className={`px-4 py-3 rounded-xl border text-sm flex justify-between items-center transition-all ${optionStyle}`}
                        >
                          <span>{opt}</span>
                          {indicatorIcon}
                        </div>
                      );
                    })}
                  </div>
                  <div className="ml-8 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-sm text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 italic text-left">
                    <span className="font-bold text-slate-700 dark:text-slate-300 not-italic">Quick Tip: </span>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              onClick={onReset}
              className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Ready for another challenge?
            </button>
          </div>
        </div>
      )}

      {/* Main Active Quiz Screen */}
      <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${quizCompleted ? 'hidden' : 'block'}`}>
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
          <div 
            className="bg-primary-600 h-1.5 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-bold text-primary-600 uppercase tracking-wider bg-primary-50 px-2 py-1 rounded">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>{userAnswers.filter(a => a !== null).length} Answered</span>
              <span>•</span>
              <span>{userAnswers.filter((a, i) => a === null && i < currentIndex).length} Skipped</span>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-6 text-left">
            {currentQuestion?.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion?.options.map((option, idx) => {
              const isSelected = userAnswers[currentIndex] === idx;
              let optionClass = "border-slate-200 dark:border-slate-800 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300";
              
              if (isSelected) {
                optionClass = "border-primary-500 bg-primary-50 dark:bg-primary-950/20 ring-1 ring-primary-500 text-primary-700 dark:text-primary-300 font-semibold";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all flex justify-between items-center hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${optionClass}`}
                >
                  <span className="font-medium">{option}</span>
                  {isSelected && <CheckCircle className="w-5 h-5 text-primary-500" />}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
            {/* Back Button */}
            {currentIndex > 0 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Previous
              </button>
            ) : (
              <div /> // spacer
            )}

            {/* Next or Skip Button */}
            <div className="flex items-center gap-3">
              {userAnswers[currentIndex] === null ? (
                <button
                  onClick={handleNext}
                  className="inline-flex items-center px-5 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Skip Question
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="inline-flex items-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs transition shadow-md shadow-primary-500/10 hover:scale-102 active:scale-95 cursor-pointer"
                >
                  {currentIndex === questions.length - 1 ? 'Finish & Evaluate' : 'Next Question'}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        contentType="quiz"
        contentData={questions}
        title="Interactive Quiz"
        metadata={{
          score: `${score}/${questions.length}`
        }}
      />
    </div>
  );
};

export default QuizView;
