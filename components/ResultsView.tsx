import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Loader2, Volume2, Square, ArrowLeft, Download, Share2, 
  Mail, MessageCircle, Link, RefreshCw, Check, 
  Copy, Layers, ArrowRight, Eye, Sparkles, BookOpen, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { ExportModal } from './ExportModal';
import { useNotifications } from './NotificationContext';

interface ResultsViewProps {
  content: string;
  isLoading: boolean;
  title: string;
  type?: string; // 'Summary' | 'Essay' | 'Quiz' etc.
  onBack: () => void;
  isViewingShared?: boolean;
  onAddToMyList?: () => void;
  isAddedToList?: boolean;
  onSharePublicLink?: (type: string, title: string, content: any) => Promise<void> | void;
}

interface Flashcard {
  question: string;
  answer: string;
  difficulty: "Easy" | "Medium" | "Hard";
  color: string;
}

const generateFlashcardsFromContent = (text: string, fallbackTitle: string): Flashcard[] => {
  const cards: Flashcard[] = [];
  
  // Try regex matching: e.g. - **Term**: Definition or **Term**: Definition
  const boldPairs = text.match(/\*\*(.*?)\*\*[:-]\s*(.*?)(?=\n|$)/g);
  if (boldPairs) {
    boldPairs.forEach((pair) => {
      const match = pair.match(/\*\*(.*?)\*\*[:-]\s*(.*)/);
      if (match && match[1] && match[2] && match[2].length > 10) {
        cards.push({
          question: `What is the definition of "${match[1]}"?`,
          answer: match[2].replace(/[*_#`]/g, '').trim(),
          difficulty: cards.length % 3 === 0 ? "Easy" : cards.length % 3 === 1 ? "Medium" : "Hard",
          color: cards.length % 3 === 0 ? "border-blue-500 bg-blue-50/10 text-blue-600" : cards.length % 3 === 1 ? "border-purple-500 bg-purple-50/10 text-purple-600" : "border-cyan-500 bg-cyan-50/10 text-cyan-600"
        });
      }
    });
  }

  // Fallback cards if we couldn't parse enough
  if (cards.length < 3) {
    const topic = fallbackTitle || "this topic";
    const generalCards: Flashcard[] = [
      {
        question: `What are the primary key concepts and core themes discussed in "${topic}"?`,
        answer: `This summary focuses on breaking down the fundamental formulas, key dates, historical contexts, or structural definitions to help you retain maximum information for exam preparation.`,
        difficulty: "Easy",
        color: "border-blue-500 bg-blue-50/10 text-blue-600"
      },
      {
        question: `How can you apply the main principles of "${topic}" in homework or exams?`,
        answer: `Review the step-by-step calculations and conceptual summaries. Practice explaining these concepts out loud or rewriting them from memory without looking at your notes.`,
        difficulty: "Medium",
        color: "border-purple-500 bg-purple-50/10 text-purple-600"
      },
      {
        question: `What is the most critical takeaway or ultimate conclusion from "${topic}"?`,
        answer: `Understanding how all the moving parts connect—whether they are formula variables, historical motivations, or scientific processes—guarantees success in your final test series.`,
        difficulty: "Hard",
        color: "border-cyan-500 bg-cyan-50/10 text-cyan-600"
      }
    ];
    return [...cards, ...generalCards].slice(0, 5);
  }

  return cards.slice(0, 6);
};

const ResultsView: React.FC<ResultsViewProps> = ({ 
  content, 
  isLoading, 
  title, 
  type = 'Document', 
  onBack,
  isViewingShared = false,
  onAddToMyList,
  isAddedToList = false,
  onSharePublicLink
}) => {
  const { triggerToast } = useNotifications();
  const [isPlaying, setIsPlaying] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSharingPublic, setIsSharingPublic] = useState(false);

  const handleSharePublicLinkClick = async () => {
    if (isSharingPublic) return;
    setIsSharingPublic(true);
    console.log("ResultsView Share button click event detected.");
    try {
      if (onSharePublicLink) {
        const shareType = type === 'Summary' ? 'summary' : 'homework';
        await onSharePublicLink(shareType, title, content);
      } else {
        console.warn("onSharePublicLink prop is not provided to ResultsView.");
      }
    } catch (err) {
      console.error("Error inside ResultsView handleSharePublicLinkClick:", err);
    } finally {
      setIsSharingPublic(false);
    }
  };
  const contentRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Flashcards state
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Cleanup speech synthesis on unmount
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    }
  }, [isLoading, content]);

  // Parse content into study cards automatically when content is generated
  useEffect(() => {
    if (content) {
      setFlashcards(generateFlashcardsFromContent(content, title));
      setCurrentCardIdx(0);
      setIsFlipped(false);
    }
  }, [content, title]);

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      triggerToast('Not Supported 🚫', 'Text-to-speech is not supported in this browser context.', 'Important Alerts');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      if (!content) return;

      const textToRead = content
        .replace(/[*#_`]/g, '') // Remove formatting characters
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Keep link text, remove URL
        .replace(/\n/g, '. '); // Pause on newlines

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToRead);
      utteranceRef.current = utterance;

      utterance.rate = 1;
      utterance.pitch = 1;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        utterance.voice = englishVoice;
      }

      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis error:", e);
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      try {
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      } catch (e) {
        console.error("Speech Synthesis failed:", e);
        setIsPlaying(false);
        triggerToast('Tutor Audio Info 🎙️', "Text-to-speech could not start. Please click 'Open in New Tab' to bypass iframe security limits!", 'Important Alerts');
      }
    }
  };

  const handleSaveClick = () => {
    if (onAddToMyList) {
      onAddToMyList();
    } else {
      setLocalSaved(true);
      setTimeout(() => setLocalSaved(false), 4000);
    }
  };

  const handleShare = async (platform?: string) => {
    try {
      let shareUrl = window.location.origin;
      try {
        const response = await fetch('/api/auth/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: type.toUpperCase(),
            title: title,
            subtitle: `${type} Generated by SJ Tutor AI`,
            content: content
          })
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.id) {
              shareUrl = `${window.location.origin}?share=${data.id}`;
            }
          }
        }
      } catch (backendError) {
        console.warn("Sharing backend failed, using local share only", backendError);
      }

      const shareText = `${title} (${type})\n\n${content.substring(0, 300)}...\n\nRead more on SJ Tutor AI: ${shareUrl}`;
      const fullContent = `${title} (${type})\n\n${content}\n\nGenerated by SJ Tutor AI\n${shareUrl}`;

      if (!platform) {
        if (navigator.share) {
          try {
            await navigator.share({
              title: `SJ Tutor AI: ${title}`,
              text: fullContent,
              url: shareUrl,
            });
          } catch (err) {
            console.log("Share cancelled", err);
          }
        } else {
          try {
            await navigator.clipboard.writeText(fullContent);
            triggerToast('Shared Link Copied! 📋', 'Full content link was successfully copied to clipboard.', 'Important Alerts');
          } catch {
            triggerToast('Copy Failed', 'Failed to copy content to clipboard.', 'Important Alerts');
          }
        }
        return;
      }

      let url = '';
      switch(platform) {
        case 'whatsapp':
          url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
          break;
        case 'facebook':
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
          break;
        case 'gmail':
          url = `https://mail.google.com/mail/u/0/?view=cm&fs=1&su=${encodeURIComponent("SJ Tutor AI: " + title)}&body=${encodeURIComponent(fullContent)}`;
          break;
        case 'copy':
          try {
            await navigator.clipboard.writeText(shareUrl);
            triggerToast('Shared Link Copied! 📋', 'Public link was successfully copied to clipboard.', 'Important Alerts');
          } catch {
            triggerToast('Copy Failed', 'Failed to copy link to clipboard.', 'Important Alerts');
          }
          return;
      }
      
      if (url) window.open(url, '_blank');
    } catch (err: any) {
      console.error(err);
      triggerToast('Sharing Failed', 'Sharing failed: ' + err.message, 'Important Alerts');
    }
  };

  if (!content && !isLoading) return null;

  const currentCard = flashcards[currentCardIdx];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-800/60 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Back to Form"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col overflow-hidden text-left">
            <h3 className="font-bold text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-xs">{title}</h3>
            <span className="text-xs text-slate-500 font-medium font-mono uppercase tracking-wider">{type}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
          {!isLoading && content && (
            <>
              {/* "Study Flashcards 🎴" Toggle */}
              <button
                onClick={() => {
                  setShowFlashcards(!showFlashcards);
                  setIsFlipped(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-colors border shadow-sm ${
                  showFlashcards 
                    ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60' 
                    : 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800/60 hover:bg-primary-100/50'
                }`}
                title="Toggle interactive flashcards mode"
              >
                {showFlashcards ? <Eye className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                <span>{showFlashcards ? "View Notes" : "Study Flashcards"}</span>
              </button>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {/* Save Button */}
                <button
                  onClick={handleSaveClick}
                  disabled={isAddedToList || localSaved}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                    (isAddedToList || localSaved)
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 cursor-not-allowed shadow-none'
                      : 'bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border-slate-200 dark:border-slate-600 text-slate-750 dark:text-slate-300'
                  }`}
                  title={(isAddedToList || localSaved) ? "Saved to history" : "Save content"}
                >
                  <Check className={`w-3.5 h-3.5 ${(isAddedToList || localSaved) ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span>{(isAddedToList || localSaved) ? "Saved" : "Save"}</span>
                </button>

                {/* Export Button */}
                <button
                  onClick={() => setIsExportOpen(true)}
                  className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>Export</span>
                </button>

                {/* Copy Button */}
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(content);
                      triggerToast('Content Copied! 📋', 'Successfully copied generated notes to clipboard.', 'Important Alerts');
                    } catch {
                      triggerToast('Copy Failed', 'Failed to copy text to clipboard.', 'Important Alerts');
                    }
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>

                 {/* Share Link Button */}
                <button
                  onClick={handleSharePublicLinkClick}
                  disabled={isSharingPublic}
                  className="px-3 py-1.5 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-[75px]"
                >
                  {isSharingPublic ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isSharingPublic ? "Sharing..." : "Share"}</span>
                </button>
              </div>

              {/* Listen Button */}
              <button
                onClick={toggleSpeech}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition border shadow-sm ${
                  isPlaying 
                    ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
                    : 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800'
                }`}
              >
                {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isPlaying ? "Stop" : "Listen"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {isViewingShared && onAddToMyList && (
        <div className="bg-primary-50 dark:bg-slate-800 border-b border-primary-100 dark:border-slate-700 px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span role="img" aria-label="wave" className="text-xl">🎓</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Viewing Shared Document</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add this guide to your history to view offline or generate custom quizzes anytime!</p>
            </div>
          </div>
          <button
            onClick={onAddToMyList}
            disabled={isAddedToList}
            className={`w-full sm:w-auto px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition flex items-center justify-center gap-1 ${
              isAddedToList 
                ? 'bg-slate-200 text-slate-450 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-primary-600 hover:bg-primary-700 text-white transform hover:-translate-y-0.5'
            }`}
          >
            {isAddedToList ? '✓ In Your Study History' : '📥 Add to My Study List'}
          </button>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="p-6 sm:p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold animate-pulse">Generating your learning experience...</p>
          </div>
        ) : showFlashcards ? (
          // ==========================================
          // PREMIUM FLASHCARDS BOARD (USER REQUEST)
          // ==========================================
          <div className="max-w-md mx-auto py-4 text-center">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-primary-500" />
                Flashcard Deck
              </span>
              <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                Card {currentCardIdx + 1} of {flashcards.length}
              </span>
            </div>

            {/* The 3D Flippable Card with distinct colors and layout */}
            <div 
              className="relative w-full h-80 cursor-pointer mb-8"
              onClick={() => setIsFlipped(!isFlipped)}
              style={{ perspective: "1200px" }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="w-full h-full relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* 1. FRONT PANEL */}
                <div 
                  className={`absolute inset-0 p-8 rounded-[24px] border-2 bg-white dark:bg-slate-800 shadow-xl flex flex-col justify-between transition-shadow hover:shadow-2xl text-left`}
                  style={{ 
                    backfaceVisibility: "hidden", 
                    borderColor: currentCard?.difficulty === "Easy" ? "#2563EB" : currentCard?.difficulty === "Medium" ? "#7C3AED" : "#06B6D4"
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">Question</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      currentCard?.difficulty === "Easy" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" :
                      currentCard?.difficulty === "Medium" ? "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400" :
                      "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400"
                    }`}>
                      {currentCard?.difficulty}
                    </span>
                  </div>

                  <p className="text-lg font-bold text-slate-800 dark:text-white leading-relaxed my-4">
                    {currentCard?.question}
                  </p>

                  <div className="flex items-center gap-1 text-slate-400 text-xs font-medium italic mt-auto">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Click card to reveal answer
                  </div>
                </div>

                {/* 2. BACK PANEL */}
                <div 
                  className="absolute inset-0 p-8 rounded-[24px] border-2 bg-slate-950 text-white shadow-xl flex flex-col justify-between text-left"
                  style={{ 
                    backfaceVisibility: "hidden", 
                    transform: "rotateY(180deg)",
                    borderColor: currentCard?.difficulty === "Easy" ? "#2563EB" : currentCard?.difficulty === "Medium" ? "#7C3AED" : "#06B6D4"
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500 font-mono">Answer explanation</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 uppercase tracking-wider text-slate-400`}>
                      {currentCard?.difficulty}
                    </span>
                  </div>

                  <p className="text-sm md:text-base font-semibold text-slate-200 leading-relaxed my-4 overflow-y-auto max-h-[160px] pr-1">
                    {currentCard?.answer}
                  </p>

                  <div className="flex items-center gap-1 text-slate-500 text-xs font-medium italic mt-auto">
                    <Eye className="w-3.5 h-3.5 text-primary-400" />
                    Click card to hide answer
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Navigation buttons with slide animations */}
            <div className="flex justify-between gap-4">
              <button
                disabled={currentCardIdx === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentCardIdx((prev) => Math.max(0, prev - 1));
                  setIsFlipped(false);
                }}
                className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition disabled:opacity-30 disabled:cursor-not-allowed flex-1 flex items-center justify-center gap-1 shadow-xs"
              >
                Previous Card
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentCardIdx === flashcards.length - 1) {
                    setCurrentCardIdx(0);
                  } else {
                    setCurrentCardIdx((prev) => prev + 1);
                  }
                  setIsFlipped(false);
                }}
                className="px-5 py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex-1 flex items-center justify-center gap-1 shadow-sm hover:scale-[1.01]"
              >
                <span>{currentCardIdx === flashcards.length - 1 ? "Start Over" : "Next Card"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-150 dark:border-slate-800 flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Active Recall Study Tip</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Try to answer the question aloud or write it down BEFORE flipping the card. Doing so builds durable neural pathways!
                </p>
              </div>
            </div>
          </div>
        ) : (
          // ==========================================
          // STANDARD MARKDOWN CONTENT DISPLAY WITH RECHARTING
          // ==========================================
          <div className="prose prose-slate max-w-none dark:prose-invert text-left" ref={contentRef}>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
            
            {/* Unified Sharing Footer Options */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-8 mt-12">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-5">Quick Share Document</p>
              <div className="flex flex-wrap justify-center gap-3">
                  <button 
                    onClick={() => handleShare('whatsapp')} 
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full transition shadow-xs active:scale-95 border border-emerald-100/60" 
                    title="Share via WhatsApp"
                  >
                      <MessageCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold">WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => handleShare('facebook')} 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full transition shadow-xs active:scale-95 border border-blue-100/60" 
                    title="Share via Facebook"
                  >
                      <Share2 className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold">Facebook</span>
                  </button>
                  <button 
                    onClick={() => handleShare('gmail')} 
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full transition shadow-xs active:scale-95 border border-rose-100/60" 
                    title="Email via Gmail"
                  >
                      <Mail className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold">Gmail</span>
                  </button>
                  <button 
                    onClick={() => handleShare('copy')} 
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-900 transition shadow-sm active:scale-95" 
                    title="Copy Public Link"
                  >
                      <Link className="w-4 h-4" />
                      <span className="text-xs font-bold">Copy Link</span>
                  </button>
              </div>
              
              <div className="flex justify-center mt-6">
                <button 
                  onClick={onBack}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-2 group"
                >
                  <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                  Generate Another Version
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        contentType={type?.toLowerCase().includes('summary') ? 'summary' : 'homework'}
        contentData={content}
        title={title}
        metadata={{
          query: title
        }}
      />
    </div>
  );
};

export default ResultsView;
