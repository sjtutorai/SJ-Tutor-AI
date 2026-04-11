
import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircle, XCircle, ArrowRight, RefreshCw, Facebook, MessageCircle, Link, Trophy, Star, Target, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface QuizViewProps {
  questions: QuizQuestion[];
  onReset: () => void;
  onComplete?: (score: number) => void;
  onGoToDashboard?: () => void;
  existingScore?: number;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, onReset, onComplete, onGoToDashboard, existingScore }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Sound Effects
  const playSound = (type: 'success' | 'positive' | 'motivational') => {
    const sounds = {
      success: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
      positive: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
      motivational: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
    };
    const audio = new Audio(sounds[type]);
    audio.play().catch(e => console.log('Audio play failed', e));
  };

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
      setQuizCompleted(true);
      const percentage = (score / questions.length) * 100;
      
      if (percentage >= 80) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#B7950B', '#975A16']
        });
        playSound('success');
      } else if (percentage >= 50) {
        playSound('positive');
      } else {
        playSound('motivational');
      }

      if (onComplete) {
        onComplete(score);
      }
    }
  };

  const handleShare = async (platform: string) => {
    try {
      // 1. Save to Firestore to get a unique public ID
      const docRef = await addDoc(collection(db, 'shares'), {
        type: 'QUIZ',
        title: 'Quiz Challenge',
        subtitle: `I scored ${score}/${questions.length} on this quiz!`,
        content: questions,
        createdAt: serverTimestamp()
      });

      const shareId = docRef.id;
      const shareUrl = `${window.location.origin}?share=${shareId}`;
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
                // Share cancelled
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

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    let feedback = {
      title: "Keep Practicing 💪",
      message: "You Can Do It!",
      color: "text-rose-600",
      bg: "bg-rose-50",
      icon: Target
    };

    if (percentage >= 80) {
      feedback = {
        title: "Excellent Work! 🎉",
        message: "You're a Master!",
        color: "text-amber-600",
        bg: "bg-amber-50",
        icon: Trophy
      };
    } else if (percentage >= 50) {
      feedback = {
        title: "Good Job! 👍",
        message: "Keep Improving",
        color: "text-blue-600",
        bg: "bg-blue-50",
        icon: Star
      };
    }

    return (
      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center relative overflow-hidden"
        >
          {/* Decorative Background */}
          <div className={`absolute top-0 left-0 w-full h-2 ${feedback.bg}`} />
          
          <div className={`w-20 h-20 ${feedback.bg} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner`}>
             <feedback.icon className={`w-10 h-10 ${feedback.color}`} />
          </div>

          <h2 className={`text-3xl font-bold ${feedback.color} mb-2`}>
            {feedback.title}
          </h2>
          <p className="text-slate-500 mb-8 font-medium text-lg">{feedback.message}</p>
          
          <div className="relative inline-block mb-10">
            <div className="text-6xl font-black text-slate-900 tracking-tighter">
              {score}<span className="text-2xl text-slate-300 font-normal ml-1">/ {questions.length}</span>
            </div>
            <div className="absolute -right-12 -top-4 bg-primary-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              {percentage}%
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 mb-10">
            <button
                onClick={onReset}
                className="flex-1 inline-flex items-center justify-center px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all shadow-lg hover:-translate-y-0.5"
            >
                <RefreshCw className="w-5 h-5 mr-2" />
                Retry Quiz
            </button>
            <button
                onClick={onGoToDashboard}
                className="flex-1 inline-flex items-center justify-center px-6 py-4 bg-white border-2 border-slate-100 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold transition-all hover:-translate-y-0.5"
            >
                <LayoutDashboard className="w-5 h-5 mr-2" />
                Dashboard
            </button>
          </div>

          <div className="border-t border-slate-50 pt-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Brag About It</p>
            <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => handleShare('whatsapp')} className="p-4 bg-[#25D366] text-white rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-green-500/20" title="WhatsApp">
                    <MessageCircle className="w-6 h-6 fill-current" />
                </button>
                <button onClick={() => handleShare('facebook')} className="p-4 bg-[#1877F2] text-white rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-blue-500/20" title="Facebook">
                    <Facebook className="w-6 h-6 fill-current" />
                </button>
                <button onClick={() => handleShare('copy')} className="p-4 bg-slate-800 text-white rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-slate-500/20" title="Copy Link">
                    <Link className="w-6 h-6" />
                </button>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden"
        >
            <div className="px-8 py-5 bg-slate-50 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Review Solutions
                </h3>
            </div>
            <div className="divide-y divide-slate-50">
                {questions.map((q, idx) => (
                    <div key={idx} className="p-8">
                        <p className="font-bold text-slate-800 mb-6 flex gap-3">
                            <span className="text-primary-500 font-mono">0{idx + 1}.</span>
                            {q.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            {q.options.map((opt, optIdx) => (
                                <div 
                                    key={optIdx} 
                                    className={`px-5 py-4 rounded-2xl border-2 text-sm flex justify-between items-center transition-all ${
                                        optIdx === q.correctAnswerIndex 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' 
                                        : 'bg-white border-slate-100 text-slate-400'
                                    }`}
                                >
                                    <span>{opt}</span>
                                    {optIdx === q.correctAnswerIndex && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                                </div>
                            ))}
                        </div>
                        <div className="p-5 bg-primary-50/50 rounded-2xl text-sm text-slate-600 border border-primary-100 leading-relaxed">
                            <span className="font-bold text-primary-700">Insight: </span>
                            {q.explanation}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Progress Bar */}
      <div className="w-full bg-slate-50 h-2">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          className="bg-primary-500 h-2"
        />
      </div>

      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center text-xs font-bold">
              {currentIndex + 1}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Question
            </span>
          </div>
          <div className="px-3 py-1 bg-slate-50 rounded-full text-xs font-bold text-slate-500">
            Score: {score}
          </div>
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-8 leading-tight">
          {currentQuestion.question}
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((option, idx) => {
            let optionClass = "border-slate-100 hover:border-primary-200 hover:bg-slate-50";
            let icon = null;

            if (showResult) {
              if (idx === currentQuestion.correctAnswerIndex) {
                optionClass = "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20";
                icon = <CheckCircle className="w-5 h-5 text-emerald-600" />;
              } else if (idx === selectedOption) {
                optionClass = "border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20";
                icon = <XCircle className="w-5 h-5 text-rose-600" />;
              } else {
                optionClass = "border-slate-50 opacity-50";
              }
            } else if (selectedOption === idx) {
               optionClass = "border-primary-500 bg-primary-50 ring-2 ring-primary-500/20";
            }

            return (
              <motion.button
                key={idx}
                whileHover={{ scale: showResult ? 1 : 1.01 }}
                whileTap={{ scale: showResult ? 1 : 0.99 }}
                onClick={() => handleOptionSelect(idx)}
                disabled={showResult}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex justify-between items-center ${optionClass}`}
              >
                <span className="font-bold">{option}</span>
                {icon}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {showResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">The Why</span>
                <p className="text-slate-700 leading-relaxed font-medium">{currentQuestion.explanation}</p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="inline-flex items-center px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-primary-500/25 hover:-translate-y-0.5"
                >
                  {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                  <ArrowRight className="w-5 h-5 ml-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizView;
