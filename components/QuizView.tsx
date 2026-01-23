
import React, { useState, useEffect } from 'react';
import { QuizQuestion, SJTUTOR_AVATAR } from '../types';
import { CheckCircle, XCircle, ArrowRight, RefreshCw, Facebook, Instagram, Mail, Send, MessageCircle, Link } from 'lucide-react';

interface QuizViewProps {
  questions: QuizQuestion[];
  onReset: () => void;
  onComplete?: (score: number) => void;
  existingScore?: number;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, onReset, onComplete, existingScore }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Initialize view if there's an existing score (viewing history)
  useEffect(() => {
    if (existingScore !== undefined) {
      setScore(existingScore);
      setQuizCompleted(true);
    } else {
      // Reset state for new quiz
      setCurrentIndex(0);
      setScore(0);
      setQuizCompleted(false);
      setShowResult(false);
      setSelectedOption(null);
    }
  }, [existingScore, questions]);

  const currentQuestion = questions[currentIndex];

  const handleOptionSelect = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
    setShowResult(true);
    if (index === currentQuestion.correctAnswerIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      const finalScore = score + (selectedOption === currentQuestion.correctAnswerIndex ? 0 : 0);
      setQuizCompleted(true);
      if (onComplete) {
        onComplete(score);
      }
    }
  };

  const handleShare = async (platform: string) => {
    // Use window.location.href to ensure full URL is captured (better for deep links/different environments)
    const appUrl = window.location.href; 
    const text = `I scored ${score}/${questions.length} on my SJ Tutor AI Quiz! 🎓`;
    const shareTextWithLink = `${text}\nCheck it out here: ${appUrl}`;
    
    let shareUrl = '';
    switch(platform) {
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareTextWithLink)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'telegram':
          shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(text)}`;
          break;
      case 'gmail':
           // Use /u/0/ to target default logged-in account and avoid potential redirect loops/404s
           shareUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&su=${encodeURIComponent("My SJ Tutor AI Score")}&body=${encodeURIComponent(shareTextWithLink)}`;
           break;
      case 'email':
        shareUrl = `mailto:?subject=My SJ Tutor AI Score&body=${encodeURIComponent(shareTextWithLink)}`;
        break;
      case 'instagram':
          navigator.clipboard.writeText(shareTextWithLink);
          alert("Score and link copied! Open Instagram to paste and share.");
          shareUrl = 'https://instagram.com';
          break;
      case 'copy':
          // Try Native Share API first (Mobile friendly)
          if (navigator.share) {
            try {
              await navigator.share({
                title: 'My SJ Tutor AI Score',
                text: text,
                url: appUrl,
              });
              return; // Success
            } catch (err) {
              // Fallback if user cancels or error
              console.log("Share failed, falling back to clipboard");
            }
          }
          // Clipboard Fallback
          navigator.clipboard.writeText(shareTextWithLink);
          alert("Score and link copied to clipboard!");
          return;
    }
    
    if (shareUrl) window.open(shareUrl, '_blank');
  };

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    let message = "Good effort!";
    if (percentage >= 80) message = "Excellent work!";
    else if (percentage >= 50) message = "Keep practicing!";

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg overflow-hidden">
             <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Result Time!
          </h2>
          <p className="text-slate-500 mb-8 font-medium">{message}</p>
          
          <div className="text-5xl font-bold text-slate-900 mb-2 tracking-tight">{score} <span className="text-3xl text-slate-300 font-normal">/ {questions.length}</span></div>
          <p className="text-sm text-slate-400 uppercase tracking-wide font-medium mb-8">Score Achieved</p>

          <button
            onClick={onReset}
            className="mb-10 inline-flex items-center px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-primary-500/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {existingScore !== undefined ? 'Retake Quiz' : 'Take Another Quiz'}
          </button>

          <div className="border-t border-slate-100 pt-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Share Score</p>
            <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => handleShare('whatsapp')} className="p-3 bg-[#25D366] text-white rounded-full hover:scale-110 transition-transform shadow-sm hover:shadow-md" title="WhatsApp">
                    <MessageCircle className="w-5 h-5 fill-current" />
                </button>
                <button onClick={() => handleShare('facebook')} className="p-3 bg-[#1877F2] text-white rounded-full hover:scale-110 transition-transform shadow-sm hover:shadow-md" title="Facebook">
                    <Facebook className="w-5 h-5 fill-current" />
                </button>
                <button onClick={() => handleShare('instagram')} className="p-3 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-full hover:scale-110 transition-transform shadow-sm hover:shadow-md" title="Instagram">
                    <Instagram className="w-5 h-5" />
                </button>
                <button onClick={() => handleShare('telegram')} className="p-3 bg-[#0088cc] text-white rounded-full hover:scale-110 transition-transform shadow-sm hover:shadow-md" title="Telegram">
                    <Send className="w-5 h-5 fill-current" />
                </button>
                <button onClick={() => handleShare('gmail')} className="p-3 bg-[#EA4335] text-white rounded-full hover:scale-110 transition-transform shadow-sm hover:shadow-md" title="Gmail">
                    <Mail className="w-5 h-5 fill-current" />
                </button>
                <button onClick={() => handleShare('email')} className="p-3 bg-slate-500 text-white rounded-full hover:scale-110 transition-transform shadow-sm hover:shadow-md" title="Email">
                    <Mail className="w-5 h-5" />
                </button>
                <button onClick={() => handleShare('copy')} className="p-3 bg-slate-800 text-white rounded-full hover:scale-110 transition-transform shadow-sm hover:shadow-md" title="Copy Link / Share">
                    <Link className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Correct Answers & Explanations
                </h3>
            </div>
            <div className="divide-y divide-slate-100">
                {questions.map((q, idx) => (
                    <div key={idx} className="p-6">
                        <p className="font-semibold text-slate-800 mb-4 flex gap-2">
                            <span className="text-slate-400 font-mono">{idx + 1}.</span>
                            {q.question}
                        </p>
                        <div className="space-y-2 pl-6 mb-4">
                            {q.options.map((opt, optIdx) => (
                                <div 
                                    key={optIdx} 
                                    className={`px-4 py-3 rounded-lg border text-sm flex justify-between items-center ${
                                        optIdx === q.correctAnswerIndex 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' 
                                        : 'bg-white border-slate-100 text-slate-500 opacity-75'
                                    }`}
                                >
                                    <span>{opt}</span>
                                    {optIdx === q.correctAnswerIndex && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                </div>
                            ))}
                        </div>
                        <div className="ml-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 border border-slate-100">
                            <span className="font-bold text-slate-700">Explanation: </span>
                            {q.explanation}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-1.5">
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
          <span className="text-sm font-medium text-slate-500">Score: {score}</span>
        </div>

        <h3 className="text-xl font-semibold text-slate-800 mb-6">
          {currentQuestion.question}
        </h3>

        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            let optionClass = "border-slate-200 hover:border-primary-300 hover:bg-slate-50";
            let icon = null;

            if (showResult) {
              if (idx === currentQuestion.correctAnswerIndex) {
                optionClass = "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500";
                icon = <CheckCircle className="w-5 h-5 text-emerald-600" />;
              } else if (idx === selectedOption) {
                optionClass = "border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500";
                icon = <XCircle className="w-5 h-5 text-rose-600" />;
              } else {
                optionClass = "border-slate-100 opacity-50";
              }
            } else if (selectedOption === idx) {
               optionClass = "border-primary-500 bg-primary-50 ring-1 ring-primary-500";
            }

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={showResult}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all flex justify-between items-center ${optionClass}`}
              >
                <span className="font-medium">{option}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-2">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
              <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Explanation</span>
              <p className="text-slate-700">{currentQuestion.explanation}</p>
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
  );
};

export default QuizView;
