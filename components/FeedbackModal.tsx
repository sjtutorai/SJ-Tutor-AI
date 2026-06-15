import React, { useState } from 'react';
import { X, Star, Sparkles, Loader2, Heart, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiService } from '../services/geminiService';

interface FeedbackModalProps {
  onClose: () => void;
}

interface AIAnalysis {
  sentiment: string;
  keyIssues: string[];
  coachReply: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      // Analyze with AI using custom prompt
      const result = await GeminiService.analyzeFeedback(feedbackText, rating);
      setAnalysis(result);
      setHasSubmitted(true);
    } catch (err) {
      console.error(err);
      // Fallback
      setAnalysis({
        sentiment: rating >= 4 ? "Positive" : "Constructive",
        keyIssues: ["General App Usage"],
        coachReply: "Thank you for your valuable feedback! I will continue working hard to support your academic journey."
      });
      setHasSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full relative border border-slate-200 dark:border-slate-800 my-8"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
              <MessageSquare className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Student Feedback Center</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Share your experience & let AI analyze it</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <AnimatePresence mode="wait">
            {!hasSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Star rating selector */}
                <div className="space-y-2.5 text-center">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    How would you rate your learning today?
                  </label>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Select 1 to 5 stars depending on your journey</p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setRating(index)}
                        onMouseEnter={() => setHoverRating(index)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 hover:scale-125 hover:rotate-6 transition-transform cursor-pointer text-slate-300 focus:outline-none"
                      >
                        <Star
                          className={`w-10 h-10 transition-colors ${
                            index <= (hoverRating || rating)
                              ? 'fill-amber-400 text-amber-500'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <motion.p 
                      initial={{ scale: 0.9 }} 
                      animate={{ scale: 1 }} 
                      className="text-xs font-bold text-amber-500 mt-2"
                    >
                      {rating === 1 && "😢 Needs Improvement"}
                      {rating === 2 && "🙁 Just Okay"}
                      {rating === 3 && "😐 Average Experience"}
                      {rating === 4 && "😋 Good & Productive!"}
                      {rating === 5 && "🔥 Incredible Study Session!"}
                    </motion.p>
                  )}
                </div>

                {/* Text area */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    What can we improve? Or what did you love?
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="We use AI to read and answer comments. Write anything about lesson summaries, daily homework, quiz difficulty, or AI interactions..."
                    className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none resize-none transition-all placeholder:text-slate-400"
                  />
                  <div className="flex justify-end">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {feedbackText.length} characters
                    </span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/10 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>AI is Analyzing Feedbacks...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                      <span>Submit & Analyze with AI</span>
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Thank You Card */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-2 border border-emerald-100 dark:border-emerald-800">
                    <Heart className="w-8 h-8 text-emerald-500 fill-emerald-500 animate-bounce" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">Feedback Logged Successfully!</h4>
                  <p className="text-xs text-slate-500">Your opinion creates a better AI Tutor.</p>
                </div>

                {/* AI Analysis Result Section */}
                <div className="p-5 rounded-2xl border border-primary-100 dark:border-primary-950/40 bg-gradient-to-br from-primary-50/50 to-white dark:from-primary-950/10 dark:to-slate-900/40 space-y-4">
                  <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-300">
                    <Sparkles className="w-4 h-4 text-purple-500 animate-spin" />
                    <span className="text-xs font-black uppercase tracking-widest">Real-time IA Interpretation</span>
                  </div>

                  {analysis && (
                    <div className="space-y-4">
                      {/* Sentiment pill */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="text-xs font-bold text-slate-500">Expressed Sentiment</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          analysis.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          analysis.sentiment === 'Negative' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' :
                          'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}>
                          {analysis.sentiment}
                        </span>
                      </div>

                      {/* Hot topics block */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identified Themes</span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.keyIssues.map((issue, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Coach reply */}
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Response from SJ Lead Tutor AI</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 leading-relaxed shadow-sm">
                          &quot;{analysis.coachReply}&quot;
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setRating(0);
                      setFeedbackText('');
                      setHasSubmitted(false);
                      setAnalysis(null);
                    }}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Give Another Feedback
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default FeedbackModal;
