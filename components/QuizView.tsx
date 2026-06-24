
import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, ArrowRight, RefreshCw, Facebook, Send, MessageCircle, Link, Share2, X, Trophy, Check, Copy, Download, Clock, AlertTriangle, TrendingUp, Sparkles, BookOpen, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [fillInAnswer, setFillInAnswer] = useState('');
  const [isFillInCorrect, setIsFillInCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // Countdown timer and tracking
  const [timeLeft, setTimeLeft] = useState<number>(questions.length * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [userQuestionStatuses, setUserQuestionStatuses] = useState<Record<number, 'correct' | 'incorrect' | 'skipped'>>({});
  const [isSkipped, setIsSkipped] = useState(false);

  // Timer intervals
  useEffect(() => {
    if (quizCompleted || existingScore !== undefined) return;

    const countdownTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          // Time is up! Trigger auto-completion
          setQuizCompleted(true);
          setShowResultModal(true);
          if (onComplete) {
            onComplete(score);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const elapsedTimer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
      clearInterval(elapsedTimer);
    };
  }, [quizCompleted, existingScore, score, onComplete]);

  // Initialize view if there's an existing score (viewing history)
  useEffect(() => {
    if (existingScore !== undefined) {
      setScore(existingScore);
      setQuizCompleted(true);
      setShowResultModal(true);
    } else {
      // Reset state for new quiz
      setCurrentIndex(0);
      setScore(0);
      setQuizCompleted(false);
      setShowResult(false);
      setSelectedOption(null);
      setFillInAnswer('');
      setIsFillInCorrect(null);
      setIsSkipped(false);
      setUserQuestionStatuses({});
      setTimeLeft(questions.length * 60);
      setElapsedSeconds(0);
      setShowResultModal(false);
    }
  }, [existingScore, questions]);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    const isCorrect = index === currentQuestion.correctAnswerIndex;
    setUserQuestionStatuses(prev => ({ ...prev, [currentIndex]: isCorrect ? 'correct' : 'incorrect' }));
    if (isCorrect) {
      setScore(s => s + 1);
    }
  };

  const handleFillInSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (showResult || !fillInAnswer.trim()) return;

    const cleanUser = fillInAnswer.trim().toLowerCase();
    const cleanCorrect = (currentQuestion.correctAnswerText || '').trim().toLowerCase();
    
    let isCorrect = cleanUser === cleanCorrect;
    if (!isCorrect && Array.isArray(currentQuestion.acceptedAnswers)) {
      isCorrect = currentQuestion.acceptedAnswers.some(
        ans => ans.trim().toLowerCase() === cleanUser
      );
    }

    setIsFillInCorrect(isCorrect);
    setShowResult(true);
    setUserQuestionStatuses(prev => ({ ...prev, [currentIndex]: isCorrect ? 'correct' : 'incorrect' }));
    if (isCorrect) {
      setScore(s => s + 1);
    }
  };

  const handleSkip = () => {
    if (showResult) return;
    setIsSkipped(true);
    setUserQuestionStatuses(prev => ({ ...prev, [currentIndex]: 'skipped' }));
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setFillInAnswer('');
      setIsFillInCorrect(null);
      setIsSkipped(false);
      setShowResult(false);
    } else {
      setQuizCompleted(true);
      setShowResultModal(true);
      if (onComplete) {
        onComplete(score);
      }
    }
  };

  const handleShare = async (platform: string) => {
    try {
      // 1. Save to backend to get a unique public ID
      let shareId = '';
      try {
        const response = await fetch('/api/auth/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'QUIZ',
            title: 'Quiz Challenge',
            subtitle: `I scored ${score}/${questions.length} on this quiz!`,
            content: questions
          })
        });

        const contentType = response.headers.get("content-type");
        if (response.ok && contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          shareId = data.id;
        } else {
          console.warn("Backend share endpoint failed or returned non-JSON. Falling back to local share.");
        }
      } catch (e) {
        console.warn("Backend sharing unavailable, falling back to local share", e);
      }

      const shareUrl = shareId ? `${window.location.origin}?share=${shareId}` : window.location.origin;
      const text = `I scored ${score}/${questions.length} on my SJ Tutor AI Quiz! 🎓`;
      const shareTextWithLink = `${text}\nCheck it out here: ${shareUrl}`;
      
      let url = '';
      switch(platform) {
        case 'whatsapp':
          url = `https://wa.me/?text=${encodeURIComponent(shareTextWithLink)}`;
          break;
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
          break;
        case 'telegram':
            url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
            break;
        case 'gmail':
             url = `https://mail.google.com/mail/u/0/?view=cm&fs=1&su=${encodeURIComponent("My SJ Tutor AI Score")}&body=${encodeURIComponent(shareTextWithLink)}`;
             break;
        case 'email':
          url = `mailto:?subject=My SJ Tutor AI Score&body=${encodeURIComponent(shareTextWithLink)}`;
          break;
        case 'instagram':
            navigator.clipboard.writeText(shareTextWithLink);
            alert("Score and link copied! Open Instagram to paste and share.");
            url = 'https://instagram.com';
            break;
                case 'copy':
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'My SJ Tutor AI Score',
                          text: text,
                          url: shareUrl,
                        });
                        return;
                      } catch (err) {
                        console.debug("Native share canceled or failed", err);
                      }
                    }
            navigator.clipboard.writeText(shareUrl);
            alert("Share link copied to clipboard!");
            return;
      }
      
      if (url) window.open(url, '_blank');
    } catch (err: any) {
      console.error(err);
      alert('Sharing failed: ' + err.message);
    }
  };

  const percentage = Math.round((score / questions.length) * 100);
  let message = "Good effort!";
  if (percentage >= 80) message = "Excellent work!";
  else if (percentage >= 50) message = "Keep practicing!";

  const detailedTopics = (() => {
    const topics: Record<string, { total: number; correct: number; incorrect: number; skipped: number }> = {};
    questions.forEach((q, idx) => {
      const topicName = q.topic || 'General Concepts';
      if (!topics[topicName]) {
        topics[topicName] = { total: 0, correct: 0, incorrect: 0, skipped: 0 };
      }
      topics[topicName].total += 1;
      const status = userQuestionStatuses[idx];
      if (status === 'correct') {
        topics[topicName].correct += 1;
      } else if (status === 'skipped') {
        topics[topicName].skipped += 1;
      } else {
        topics[topicName].incorrect += 1;
      }
    });
    return topics;
  })();

  let totalSkipped = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  Object.values(detailedTopics).forEach(topic => {
    totalSkipped += topic.skipped;
    totalCorrect += topic.correct;
    totalIncorrect += topic.incorrect;
  });

  const formatSeconds = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const renderResultModal = () => {
    return (
      <AnimatePresence>
        {showResultModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-xl w-full relative border border-white/10 my-8 max-h-[90vh] flex flex-col"
            >
              <button 
                onClick={() => setShowResultModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-20 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="overflow-y-auto p-6 md:p-8 flex-1">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl relative">
                   <Trophy className="w-10 h-10 text-white" />
                   <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="absolute -right-1 -bottom-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white dark:border-slate-900"
                   >
                    <CheckCircle className="w-4 h-4" />
                   </motion.div>
                </div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight text-center">
                  Quiz Completed!
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium italic text-center">&quot;{message}&quot;</p>
                
                {/* Visual Performance Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  {/* Score Card */}
                  <div className="bg-primary-50/50 dark:bg-primary-950/10 rounded-2xl p-4 border border-primary-100/30 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                    <Trophy className="w-4 h-4 text-primary-500 mb-1" />
                    <div className="text-2xl font-black text-primary-600 dark:text-primary-400 mb-0.5 tracking-tighter">
                      {score}<span className="text-xs text-slate-450 dark:text-slate-500 font-normal">/{questions.length}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider font-extrabold">Score: {percentage}%</p>
                  </div>

                  {/* Speed/Timer Card */}
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl p-4 border border-indigo-100/30 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                    <Clock className="w-4 h-4 text-indigo-500 mb-1" />
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mb-0.5 tracking-tight">
                      {formatSeconds(elapsedSeconds)}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider font-extrabold">Speed: {Math.round(elapsedSeconds / questions.length)}s / q</p>
                  </div>

                  {/* Distribution Card */}
                  <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500 mb-1" />
                    <div className="flex gap-2 text-xs font-black mb-0.5">
                      <span className="text-emerald-600 dark:text-emerald-400">{totalCorrect}✓</span>
                      <span className="text-rose-500">{totalIncorrect}✗</span>
                      {totalSkipped > 0 && <span className="text-amber-500">{totalSkipped}↷</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 uppercase tracking-wider font-extrabold">Correct • Wrong • Skip</p>
                  </div>
                </div>

                {/* Topic Breakdown Card */}
                <div className="bg-slate-50/50 dark:bg-slate-850/40 rounded-2xl p-5 mb-6 border border-slate-150 dark:border-slate-800 text-left">
                  <div className="flex items-center gap-1.5 mb-4">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Topic Performance Analysis</h3>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(detailedTopics).map(([topicName, topicStats]) => {
                      const accuracy = Math.round((topicStats.correct / topicStats.total) * 100);
                      
                      let badgeColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
                      let badgeText = "Needs Practice";
                      let barColor = "bg-rose-500";
                      
                      if (accuracy >= 80) {
                        badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
                        badgeText = "Mastered";
                        barColor = "bg-emerald-500";
                      } else if (accuracy >= 50) {
                        badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
                        badgeText = "Proficient";
                        barColor = "bg-amber-500";
                      }

                      return (
                        <div key={topicName} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{topicName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 dark:text-slate-450 font-semibold">{topicStats.correct}/{topicStats.total} ({accuracy}%)</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${badgeColor}`}>
                                {badgeText}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${accuracy}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recommendation block */}
                  {(() => {
                    let lowestTopic = '';
                    let lowestAcc = 101;
                    Object.entries(detailedTopics).forEach(([name, stats]) => {
                      const acc = (stats.correct / stats.total) * 100;
                      if (acc < lowestAcc) {
                        lowestAcc = acc;
                        lowestTopic = name;
                      }
                    });

                    if (lowestAcc < 80 && lowestTopic) {
                      return (
                        <div className="mt-4 p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-xs flex items-start gap-2 text-slate-600 dark:text-slate-400">
                          <Lightbulb className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                          <p>
                            <span className="font-bold text-indigo-800 dark:text-indigo-300">Focus Tip:</span> Review concepts in <strong className="font-extrabold text-indigo-700 dark:text-indigo-400">{lowestTopic}</strong> to boost retention and raise your accuracy score!
                          </p>
                        </div>
                      );
                    } else if (lowestAcc >= 80) {
                      return (
                        <div className="mt-4 p-3 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs flex items-start gap-2 text-slate-600 dark:text-slate-400">
                          <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <p>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">Perfect Streak!</span> You demonstrated excellent mastery across all topic areas. Keep this up!
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Specific Action Buttons in Completion flow */}
                <div className="space-y-3 mb-6 text-left">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Quiz Options & Actions</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {/* Save Button */}
                    <button
                      onClick={() => alert("🎉 Your quiz performance and academic credits are safely saved in your Study History dashboard!")}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-755 dark:text-slate-255 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Save Score</span>
                    </button>

                    {/* Download TXT Button */}
                    <button
                      onClick={() => {
                        let printContent = `SJ TUTOR AI - INTERACTIVE QUIZ SHEET\n`;
                        printContent += `------------------------------------\n\n`;
                        questions.forEach((q, idx) => {
                          printContent += `${idx + 1}. ${q.question}\n`;
                          if (q.type === 'fill-in-the-blank') {
                            printContent += `   Correct Answer: ${q.correctAnswerText}\n`;
                          } else {
                            q.options.forEach((opt, optIdx) => {
                              printContent += `   [${optIdx === q.correctAnswerIndex ? 'X' : ' '}] ${opt}\n`;
                            });
                          }
                          printContent += `   Explanation: ${q.explanation}\n\n`;
                        });
                        const element = document.createElement("a");
                        const file = new Blob([printContent], { type: "text/plain;charset=utf-8" });
                        element.href = URL.createObjectURL(file);
                        element.download = `SJTutorAI-Quiz-${Date.now()}.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-755 dark:text-slate-255 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-indigo-500" />
                      <span>Download TXT</span>
                    </button>

                    {/* Download Word Button */}
                    <button
                      onClick={() => {
                        let formattedContent = `
                          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                            <head>
                              <title>Interactive Quiz</title>
                              <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                                h1 { color: #1a202c; border-bottom: 2px solid #5a67d8; padding-bottom: 10px; font-size: 22px; }
                                .question-block { margin-bottom: 25px; page-break-inside: avoid; }
                                .question { font-weight: bold; color: #2d3748; margin-bottom: 8px; }
                                .options { margin-left: 20px; margin-bottom: 8px; }
                                .option { margin-bottom: 4px; }
                                .correct { font-weight: bold; color: #38a169; }
                                .explanation { font-style: italic; color: #718096; font-size: 13px; margin-top: 4px; }
                                hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
                              </style>
                            </head>
                            <body>
                              <h1>Interactive Quiz - SJ Tutor AI</h1>
                              <p>Generated on ${new Date().toLocaleDateString()}</p>
                              <hr />
                        `;

                        questions.forEach((q, idx) => {
                          formattedContent += `
                            <div class="question-block">
                              <div class="question">${idx + 1}. ${q.question}</div>
                              <div class="options">
                          `;
                          if (q.type === 'fill-in-the-blank') {
                            formattedContent += `<div class="option correct">Correct Answer: ${q.correctAnswerText}</div>`;
                          } else {
                            q.options.forEach((opt, optIdx) => {
                              const isCorrect = optIdx === q.correctAnswerIndex;
                              formattedContent += `
                                <div class="option">
                                  <span>[${isCorrect ? '✔' : ' '}]</span> ${opt}
                                  ${isCorrect ? ' <span class="correct">(Correct Answer)</span>' : ''}
                                </div>
                              `;
                            });
                          }
                          formattedContent += `
                              </div>
                              <div class="explanation"><strong>Explanation:</strong> ${q.explanation}</div>
                            </div>
                          `;
                        });

                        formattedContent += `
                              <hr />
                              <p style="font-size: 11px; text-align: center; color: #a0aec0;">Keep up the learning streak! Powered by SJ Tutor AI.</p>
                            </body>
                          </html>
                        `;

                        const element = document.createElement("a");
                        const file = new Blob(['\ufeff' + formattedContent], { type: "application/msword;charset=utf-8" });
                        element.href = URL.createObjectURL(file);
                        element.download = `SJTutorAI-Quiz-${Date.now()}.doc`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-755 dark:text-slate-255 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-blue-500" />
                      <span>Download Word</span>
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={async () => {
                        try {
                          let quizText = "🧠 SJ Tutor AI Quiz Challenge 🧠\n\n";
                          questions.forEach((q, i) => {
                            quizText += `Q${i+1}: ${q.question}\n`;
                            if (q.type === 'fill-in-the-blank') {
                              quizText += `   Correct: ${q.correctAnswerText}\n`;
                            } else {
                              q.options.forEach((opt, j) => {
                                quizText += `   ${String.fromCharCode(65+j)}) ${opt}\n`;
                              });
                            }
                            quizText += `\n`;
                          });
                          await navigator.clipboard.writeText(quizText);
                          alert("Quiz copied to clipboard!");
                        } catch {
                          alert("Failed to copy quiz.");
                        }
                      }}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-755 dark:text-slate-255 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Quiz</span>
                    </button>

                    {/* Share Public Link Button */}
                    <button
                      onClick={() => onSharePublicLink && onSharePublicLink('quiz', questions[0]?.question ? `Quiz: ${questions[0].question.substring(0, 35)}...` : 'AI Quiz Challenge', questions)}
                      className="p-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition hover:scale-[1.02] active:scale-95 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Link</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-center mb-6">
                  <button
                      onClick={onReset}
                      className="flex items-center justify-center px-8 py-3.5 bg-slate-800 dark:bg-slate-700 hover:brightness-110 text-white rounded-xl font-bold transition-all active:scale-95 w-full shadow-sm cursor-pointer text-sm"
                  >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retake Another Quiz
                  </button>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-4 text-center">Quick Share Score</p>
                  <div className="flex justify-center gap-3">
                      {['whatsapp', 'facebook', 'telegram', 'copy'].map(plat => (
                        <button 
                          key={plat}
                          onClick={() => handleShare(plat)} 
                          className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 transition-all hover:scale-110 cursor-pointer"
                        >
                          {plat === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                          {plat === 'facebook' && <Facebook className="w-5 h-5" />}
                          {plat === 'telegram' && <Send className="w-5 h-5" />}
                          {plat === 'copy' && <Link className="w-5 h-5" />}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="space-y-6">
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
        <div className="space-y-6">
          {/* On-Page Visual Report Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Performance Report
              </h3>
              <button
                onClick={onReset}
                className="px-4 py-2 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 dark:bg-slate-800 dark:text-primary-400 rounded-lg transition"
              >
                Take New Quiz
              </button>
            </div>

            {/* Visual Performance Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Score Card */}
              <div className="bg-primary-50/50 dark:bg-primary-950/10 rounded-2xl p-5 border border-primary-100/30 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                <Trophy className="w-5 h-5 text-primary-500 mb-2" />
                <div className="text-3xl font-black text-primary-600 dark:text-primary-400 mb-0.5 tracking-tighter">
                  {score}<span className="text-sm text-slate-400 dark:text-slate-500 font-normal">/{questions.length}</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-550 uppercase tracking-wider font-extrabold">Accuracy: {percentage}%</p>
              </div>

              {/* Speed/Timer Card */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl p-5 border border-indigo-100/30 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                <Clock className="w-5 h-5 text-indigo-500 mb-2" />
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mb-0.5 tracking-tight">
                  {formatSeconds(elapsedSeconds)}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-550 uppercase tracking-wider font-extrabold">Average Pace: {Math.round(elapsedSeconds / questions.length)}s / q</p>
              </div>

              {/* Distribution Card */}
              <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-center items-center text-center">
                <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
                <div className="flex gap-3 text-lg font-black mb-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">{totalCorrect}✓</span>
                  <span className="text-rose-500">{totalIncorrect}✗</span>
                  {totalSkipped > 0 && <span className="text-amber-500">{totalSkipped}↷</span>}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-550 uppercase tracking-wider font-extrabold">Answer Distribution</p>
              </div>
            </div>

            {/* Topic Breakdown Card */}
            <div className="bg-slate-50/50 dark:bg-slate-850/40 rounded-2xl p-5 border border-slate-150 dark:border-slate-800 text-left">
              <div className="flex items-center gap-1.5 mb-4">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Topic Performance Analysis</h3>
              </div>

              <div className="space-y-4">
                {Object.entries(detailedTopics).map(([topicName, topicStats]) => {
                  const accuracy = Math.round((topicStats.correct / topicStats.total) * 100);
                  
                  let badgeColor = "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
                  let badgeText = "Needs Practice";
                  let barColor = "bg-rose-500";
                  
                  if (accuracy >= 80) {
                    badgeColor = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
                    badgeText = "Mastered";
                    barColor = "bg-emerald-500";
                  } else if (accuracy >= 50) {
                    badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
                    badgeText = "Proficient";
                    barColor = "bg-amber-500";
                  }

                  return (
                    <div key={topicName} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-md">{topicName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-450 font-semibold">{topicStats.correct}/{topicStats.total} ({accuracy}%)</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${badgeColor}`}>
                            {badgeText}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${accuracy}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recommendation block */}
              {(() => {
                let lowestTopic = '';
                let lowestAcc = 101;
                Object.entries(detailedTopics).forEach(([name, stats]) => {
                  const acc = (stats.correct / stats.total) * 100;
                  if (acc < lowestAcc) {
                    lowestAcc = acc;
                    lowestTopic = name;
                  }
                });

                if (lowestAcc < 80 && lowestTopic) {
                  return (
                    <div className="mt-4 p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl text-xs flex items-start gap-2 text-slate-600 dark:text-slate-400">
                      <Lightbulb className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <p>
                        <span className="font-bold text-indigo-800 dark:text-indigo-300">Focus Tip:</span> Review concepts in <strong className="font-extrabold text-indigo-700 dark:text-indigo-400">{lowestTopic}</strong> to boost retention and raise your accuracy score!
                      </p>
                    </div>
                  );
                } else if (lowestAcc >= 80) {
                  return (
                    <div className="mt-4 p-3 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs flex items-start gap-2 text-slate-600 dark:text-slate-400">
                      <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">Perfect Streak!</span> You demonstrated excellent mastery across all topic areas. Keep this up!
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Answers Review Area */}
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
                    View Options & Actions
                  </button>
              </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {questions.map((q, idx) => (
                    <div key={idx} className="p-6">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex gap-3">
                            <span className="text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sm">{idx + 1}</span>
                            {q.question}
                        </p>
                        {q.type === 'fill-in-the-blank' ? (
                          <div className="space-y-2 pl-8 mb-4">
                            <div className="px-4 py-3 rounded-xl border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex justify-between items-center">
                              <span>Correct Answer: {q.correctAnswerText}</span>
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </div>
                            {Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 1 && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Accepted alternatives: {q.acceptedAnswers.filter(ans => ans.toLowerCase() !== q.correctAnswerText?.toLowerCase()).join(', ')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2 pl-8 mb-4">
                            {q.options && q.options.map((opt, optIdx) => (
                                <div 
                                    key={optIdx} 
                                    className={`px-4 py-3 rounded-xl border text-sm flex justify-between items-center transition-all ${
                                        optIdx === q.correctAnswerIndex 
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold' 
                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                >
                                    <span>{opt}</span>
                                    {optIdx === q.correctAnswerIndex && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                </div>
                            ))}
                          </div>
                        )}
                        <div className="ml-8 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-sm text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 italic">
                            <span className="font-bold text-slate-700 dark:text-slate-300 not-italic">Quick Tip: </span>
                            {q.explanation}
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
               <button
                  onClick={onReset}
                  className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Ready for another challenge?
                </button>
            </div>
          </div>
        </div>
      )}

      <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${quizCompleted ? 'hidden' : 'block'}`}>
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
          <div 
            className="bg-primary-600 h-1.5 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider bg-primary-50 dark:bg-slate-800 px-2 py-1 rounded">
                Question {currentIndex + 1} of {questions.length}
              </span>
              {currentQuestion.topic && (
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1 border border-indigo-100 dark:border-slate-700">
                  <BookOpen className="w-3 h-3" />
                  Topic: {currentQuestion.topic}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Countdown Timer with warning styling when <30s remaining */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border ${
                timeLeft < 30 
                  ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900/40 dark:text-rose-400 animate-pulse ring-2 ring-rose-500/20' 
                  : 'bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                Score: {score}
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 leading-snug">
            {currentQuestion.question}
          </h3>

          {currentQuestion.type === 'fill-in-the-blank' ? (
            <form onSubmit={handleFillInSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={fillInAnswer}
                  onChange={(e) => setFillInAnswer(e.target.value)}
                  disabled={showResult}
                  placeholder="Type your answer here..."
                  autoFocus
                  className={`w-full px-4 py-3.5 rounded-xl border-2 bg-white dark:bg-slate-900 text-slate-850 dark:text-white font-medium text-base focus:outline-none transition-all ${
                    showResult
                      ? isFillInCorrect
                        ? "border-emerald-500 bg-emerald-50/20 text-emerald-850 dark:text-emerald-300 ring-1 ring-emerald-500"
                        : "border-rose-500 bg-rose-50/20 text-rose-850 dark:text-rose-300 ring-1 ring-rose-500"
                      : "border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-slate-700"
                  }`}
                />
                {showResult && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isFillInCorrect ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                )}
              </div>

              {!showResult && (
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!fillInAnswer.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white font-bold rounded-xl transition shadow-sm hover:shadow-md disabled:opacity-50 select-none cursor-pointer"
                  >
                    Submit Answer
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition duration-200 cursor-pointer"
                  >
                    Skip Question
                  </button>
                </div>
              )}

              {showResult && !isFillInCorrect && !isSkipped && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-sm font-semibold rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                  <span>Correct Answer: <strong className="font-extrabold">{currentQuestion.correctAnswerText}</strong></span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-3">
              {currentQuestion.options && currentQuestion.options.map((option, idx) => {
                let optionClass = "border-slate-200 dark:border-slate-850 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200";
                let icon = null;

                if (showResult) {
                  if (idx === currentQuestion.correctAnswerIndex) {
                    optionClass = "border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-300";
                    icon = <CheckCircle className="w-5 h-5 text-emerald-600" />;
                  } else if (idx === selectedOption) {
                    optionClass = "border-rose-500 bg-rose-50/50 text-rose-800 ring-1 ring-rose-500 dark:bg-rose-950/20 dark:text-rose-300";
                    icon = <XCircle className="w-5 h-5 text-rose-600" />;
                  } else {
                    optionClass = "border-slate-100 dark:border-slate-850 opacity-40";
                  }
                } else if (selectedOption === idx) {
                   optionClass = "border-primary-500 bg-primary-50 ring-1 ring-primary-500 dark:bg-primary-950/20 dark:text-primary-300";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={showResult}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all flex justify-between items-center cursor-pointer ${optionClass}`}
                  >
                    <span className="font-medium">{option}</span>
                    {icon}
                  </button>
                );
              })}

              {!showResult && (
                <div className="flex justify-end pt-3">
                  <button
                    onClick={handleSkip}
                    className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition duration-200 cursor-pointer"
                  >
                    Skip Question
                  </button>
                </div>
              )}
            </div>
          )}

          {showResult && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-2">
              {isSkipped && (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 rounded-xl text-sm flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-300">Question Skipped</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                      {currentQuestion.type === 'fill-in-the-blank' 
                        ? `You skipped this question. The correct answer is "${currentQuestion.correctAnswerText}".` 
                        : `You skipped this question. The correct answer is option "${String.fromCharCode(65 + currentQuestion.correctAnswerIndex)}: ${currentQuestion.options[currentQuestion.correctAnswerIndex]}".`}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Explanation
                </span>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{currentQuestion.explanation}</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="inline-flex items-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20"
                >
                  {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizView;
