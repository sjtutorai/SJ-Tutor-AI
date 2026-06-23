import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  HistoryItem, 
  AppMode, 
} from '../types';
import { 
  Brain, 
  RotateCcw, 
  Sparkles, 
  BookOpen, 
  Check, 
  Volume2, 
  HelpCircle, 
  Award,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { GeminiService } from '../services/geminiService';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  sourceTitle: string;
  status?: 'new' | 'mastered' | 'review';
}

interface FlashcardsViewProps {
  history: HistoryItem[];
  onBackToDashboard: () => void;
}

// Fallback high-yield academic sample decks
const SAMPLE_DECKS: Record<string, Flashcard[]> = {
  "Science: Mitosis & Meiosis": [
    { id: "s1", front: "Mitosis", back: "A process of cell duplication, or reproduction, during which one cell gives rise to two genetically identical daughter cells.", sourceTitle: "Science: Cells" },
    { id: "s2", front: "Meiosis", back: "A division of a germ cell involving two divisions of the nucleus and giving rise to four gametes, each possessing half the number of chromosomes of the original cell.", sourceTitle: "Science: Cells" },
    { id: "s3", front: "Prophase", back: "The first stage of cell division, during which chromosomes become visible as paired chromatids and the nuclear envelope disappears.", sourceTitle: "Science: Cells" },
    { id: "s4", front: "Metaphase", back: "The second stage of cell division, during which the chromosomes become attached to the spindle fibers and align in the center of the cell.", sourceTitle: "Science: Cells" },
    { id: "s5", front: "Anaphase", back: "The stage of meiotic or mitotic cell division in which the chromosomes move away from one another to opposite poles of the spindle.", sourceTitle: "Science: Cells" }
  ],
  "Physics: Laws of Motion": [
    { id: "p1", front: "Newton's First Law", back: "An object remains in a state of rest or of uniform motion in a straight line unless compelled to change that state by forces impressed upon it.", sourceTitle: "Physics: Motion" },
    { id: "p2", front: "Newton's Second Law", back: "The rate of change of momentum of an object is proportional to the applied unbalanced force in the direction of the force. (F = ma)", sourceTitle: "Physics: Motion" },
    { id: "p3", front: "Newton's Third Law", back: "For every action, there is an equal and opposite reaction.", sourceTitle: "Physics: Motion" },
    { id: "p4", front: "Inertia", back: "The natural tendency of an object to resist changes in its state of motion or rest.", sourceTitle: "Physics: Motion" },
    { id: "p5", front: "Momentum", back: "The quantity of motion of a moving body, measured as a product of its mass and velocity. (p = mv)", sourceTitle: "Physics: Motion" }
  ],
  "Math: Quadratic Equations": [
    { id: "m1", front: "Quadratic Formula", back: "The solution formula for ax² + bx + c = 0, expressed as x = [-b ± √(b² - 4ac)] / 2a.", sourceTitle: "Math: Quadratics" },
    { id: "m2", front: "Discriminant", back: "The value (b² - 4ac) under the radical in the quadratic formula. It determines the number and nature of the roots.", sourceTitle: "Math: Quadratics" },
    { id: "m3", front: "Real & Distinct Roots", back: "The state when the discriminant is strictly greater than zero (b² - 4ac > 0), resulting in two unique real solutions.", sourceTitle: "Math: Quadratics" },
    { id: "m4", front: "Real & Equal Roots", back: "The state when the discriminant is exactly zero (b² - 4ac = 0), resulting in exactly one real repeating root solution.", sourceTitle: "Math: Quadratics" },
    { id: "m5", front: "Imaginary Roots", back: "The state when the discriminant is less than zero (b² - 4ac < 0), meaning there are no real roots, only complex / imaginary ones.", sourceTitle: "Math: Quadratics" }
  ]
};

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ history, onBackToDashboard }) => {
  const [summaries, setSummaries] = useState<HistoryItem[]>([]);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string>("all");
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState({ mastered: 0, review: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [activeDeckName, setActiveDeckName] = useState<string>("");
  
  // Custom Topic Generator
  const [customTopic, setCustomTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [speechPlaying, setSpeechPlaying] = useState(false);

  // Load summaries from history
  useEffect(() => {
    const summaryItems = history.filter((item) => item.type === AppMode.SUMMARY);
    setSummaries(summaryItems);
    
    if (summaryItems.length > 0) {
      loadDeckFromSelection("all", summaryItems);
    } else {
      // Use standard default sample deck if no history is present
      setSelectedSummaryId("sample_mitosis");
      setDeck(SAMPLE_DECKS["Science: Mitosis & Meiosis"]);
      setActiveDeckName("Science: Mitosis & Meiosis (Sample)");
    }
  }, [history]);

  // Clean speech synthesis if playing
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const parseFlashcards = (textContent: string, titleName: string): Flashcard[] => {
    const cards: Flashcard[] = [];
    if (!textContent) return cards;

    const lines = textContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Pattern 1: **Term**: Definition or - **Term**: Definition
      const boldColonMatch = trimmed.match(/^(?:[-*]\s*)?\*\*(.*?)\*\*:\s*(.+)$/);
      if (boldColonMatch) {
        const front = boldColonMatch[1].trim();
        const back = boldColonMatch[2].trim().replace(/[*#]/g, '');
        if (front && back && front.length < 60 && back.length > 5) {
          cards.push({
            id: `fc_${Math.random().toString(36).substr(2, 9)}`,
            front,
            back,
            sourceTitle: titleName
          });
          continue;
        }
      }

      // Pattern 2: **Term** - Definition or - **Term** - Definition
      const boldDashMatch = trimmed.match(/^(?:[-*]\s*)?\*\*(.*?)\*\*\s*-\s*(.+)$/);
      if (boldDashMatch) {
        const front = boldDashMatch[1].trim();
        const back = boldDashMatch[2].trim().replace(/[*#]/g, '');
        if (front && back && front.length < 60 && back.length > 5) {
          cards.push({
            id: `fc_${Math.random().toString(36).substr(2, 9)}`,
            front,
            back,
            sourceTitle: titleName
          });
          continue;
        }
      }

      // Pattern 3: - Term: Definition or * Term: Definition
      const listColonMatch = trimmed.match(/^[-*]\s*([^:*]+):\s*(.+)$/);
      if (listColonMatch) {
        const front = listColonMatch[1].trim();
        const back = listColonMatch[2].trim().replace(/[*#]/g, '');
        if (front && back && front.length < 50 && back.length > 8) {
          cards.push({
            id: `fc_${Math.random().toString(36).substr(2, 9)}`,
            front,
            back,
            sourceTitle: titleName
          });
          continue;
        }
      }
    }

    // Fallback parser if we get very few cards: Find bold words anywhere
    if (cards.length < 4) {
      const allBold = [...textContent.matchAll(/\*\*(.*?)\*\*/g)].map(m => m[1].trim());
      const uniqueBold = Array.from(new Set(allBold)).filter(b => b.length > 2 && b.length < 45);
      
      for (const term of uniqueBold) {
        const idx = textContent.indexOf(`**${term}**`);
        if (idx !== -1) {
          const context = textContent.substring(idx + term.length + 4, idx + term.length + 220).trim();
          const firstBreakpoint = context.search(/[.\n]/);
          const definition = firstBreakpoint !== -1 
            ? context.substring(0, firstBreakpoint).replace(/^[:\-\s]*/, '').trim()
            : context.replace(/^[:\-\s]*/, '').trim();
          
          if (definition && definition.length > 8 && definition.length < 180) {
            cards.push({
              id: `fc_${Math.random().toString(36).substr(2, 9)}`,
              front: term,
              back: definition,
              sourceTitle: titleName
            });
          }
        }
      }
    }

    return cards.slice(0, 15); // Max 15 highly focused cards
  };

  const loadDeckFromSelection = (id: string, itemsList: HistoryItem[] = summaries) => {
    window.speechSynthesis.cancel();
    setSpeechPlaying(false);
    setIsFlipped(false);
    setCurrentIndex(0);
    setScore({ mastered: 0, review: 0 });
    setIsFinished(false);

    if (id === "all") {
      let combined: Flashcard[] = [];
      itemsList.forEach((item) => {
        if (item.content && typeof item.content === 'string') {
          combined = [...combined, ...parseFlashcards(item.content, item.title)];
        }
      });

      if (combined.length > 0) {
        setDeck(combined);
        setActiveDeckName("All Extracted History Terms");
      } else {
        setDeck(SAMPLE_DECKS["Science: Mitosis & Meiosis"]);
        setActiveDeckName("Science: Mitosis & Meiosis (Sample)");
      }
    } else if (id.startsWith("sample_")) {
      const key = id === "sample_mitosis" 
        ? "Science: Mitosis & Meiosis" 
        : id === "sample_motion" 
        ? "Physics: Laws of Motion" 
        : "Math: Quadratic Equations";
      setDeck(SAMPLE_DECKS[key]);
      setActiveDeckName(`${key} (Sample)`);
    } else {
      const selectedItem = itemsList.find((item) => item.id === id);
      if (selectedItem && selectedItem.content && typeof selectedItem.content === 'string') {
        const extracted = parseFlashcards(selectedItem.content, selectedItem.title);
        if (extracted.length > 0) {
          setDeck(extracted);
          setActiveDeckName(selectedItem.title);
        } else {
          // If extraction yielded 0 items, use fallback
          setDeck(SAMPLE_DECKS["Science: Mitosis & Meiosis"]);
          setActiveDeckName(`${selectedItem.title} (With general Cell Science concepts)`);
        }
      }
    }
  };

  const handleLevelTag = (status: 'mastered' | 'review') => {
    setIsFlipped(false);
    window.speechSynthesis.cancel();
    setSpeechPlaying(false);

    setDeck(prev => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], status };
      return updated;
    });

    if (status === 'mastered') {
      setScore(prev => ({ ...prev, mastered: prev.mastered + 1 }));
    } else {
      setScore(prev => ({ ...prev, review: prev.review + 1 }));
    }

    if (currentIndex + 1 < deck.length) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 150);
    } else {
      setTimeout(() => {
        setIsFinished(true);
      }, 150);
    }
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setSpeechPlaying(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setScore({ mastered: 0, review: 0 });
    setIsFinished(false);
    setDeck(prev => prev.map(c => ({ ...c, status: undefined })));
  };

  // Text to Speech
  const readCardSpeaker = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speechPlaying) {
      window.speechSynthesis.cancel();
      setSpeechPlaying(false);
      return;
    }

    const text = isFlipped ? deck[currentIndex].back : deck[currentIndex].front;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onend = () => setSpeechPlaying(false);
    utterance.onerror = () => setSpeechPlaying(false);
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeechPlaying(true);
  };

  // Generate Flashcards through AI
  const handleGenerateCustomDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim() || isGenerating) return;

    setIsGenerating(true);
    setGenError("");
    window.speechSynthesis.cancel();
    setSpeechPlaying(false);

    try {
      // Grab Gemini AI model to generate contents
      const response = await GeminiService.processNoteAI(
        `Generate academic flashcards for Topic: ${customTopic}`,
        'summarize'
      );

      if (response) {
        const customExtracted = parseFlashcards(response, customTopic);
        if (customExtracted.length > 0) {
          setDeck(customExtracted);
          setActiveDeckName(`AI Generated: ${customTopic}`);
          setCurrentIndex(0);
          setIsFlipped(false);
          setScore({ mastered: 0, review: 0 });
          setIsFinished(false);
          setCustomTopic("");
        } else {
          setGenError("We generated responses but couldn't parse the key terminology. Please define other terms.");
        }
      } else {
        setGenError("Empty response was returned by AI. Please try again.");
      }
    } catch (err: any) {
      console.error("Custom topic generation failed:", err);
      // Give realistic mock fallback so user isn't stuck if client key fails
      const fallbackDecks: Record<string, Flashcard[]> = {
        "photosynthesis": [
          { id: "fc_tp1", front: "Chlorophyll", back: "The green pigment found in chloroplasts of algae and plants that absorbs light energy.", sourceTitle: "Photosynthesis" },
          { id: "fc_tp2", front: "Stomata", back: "Microscopic pores on leaf surfaces that regulate carbon dioxide entry and oxygen exit.", sourceTitle: "Photosynthesis" },
          { id: "fc_tp3", front: "Light-dependent Reactions", back: "Stages of photosynthesis that convert light energy into chemical energy (ATP/NADPH).", sourceTitle: "Photosynthesis" },
          { id: "fc_tp4", front: "Calvin Cycle", back: "Chemical reactions that convert carbon dioxide and other compounds into glucose.", sourceTitle: "Photosynthesis" }
        ],
        "cells": [
          { id: "fc_c1", front: "Osmosis", back: "Diffusion of solvent molecules through a semi-permeable membrane from lower to higher concentration.", sourceTitle: "Cells" },
          { id: "fc_c2", front: "Active Transport", back: "Movement of molecules across a cell membrane from low to high concentration using cellular ATP energy.", sourceTitle: "Cells" }
        ]
      };
      const query = customTopic.toLowerCase();
      const matchKey = Object.keys(fallbackDecks).find(k => query.includes(k));
      if (matchKey) {
        setDeck(fallbackDecks[matchKey]);
        setActiveDeckName(`Custom Topic: ${customTopic}`);
        setCurrentIndex(0);
        setIsFlipped(false);
        setScore({ mastered: 0, review: 0 });
        setIsFinished(false);
        setCustomTopic("");
      } else {
        setGenError("Failed to initialize generator. Try using another prompt or check connection.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const progressPct = deck.length > 0 ? (currentIndex / deck.length) * 100 : 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 shadow-sm">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row items-baseline justify-between gap-3 mb-6 border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div className="text-left">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-extrabold text-sm mb-1 uppercase tracking-wider">
            <Brain className="w-5 h-5 text-amber-500 fill-amber-550/10" />
            <span>Interactive Space</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-850 dark:text-white tracking-tight flex items-center gap-2">
            Dynamic Flashcard Mode
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mt-1 font-medium">
            Review terminology mined automatically from your summaries or query the AI for customizable academic cards instantly!
          </p>
        </div>
        <button
          onClick={onBackToDashboard}
          className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Control Board: Deck Selection & custom creators */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Deck Select Card */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-5 rounded-xl shadow-xs text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Selection Deck
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-450 dark:text-slate-400 uppercase mb-1.5">Mined Summaries</label>
                <select
                  value={selectedSummaryId}
                  onChange={(e) => {
                    setSelectedSummaryId(e.target.value);
                    loadDeckFromSelection(e.target.value);
                  }}
                  className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white outline-none focus:border-primary-500"
                >
                  {summaries.length > 0 && (
                    <>
                      <option value="all">Mined: All Summaries ({summaries.length})</option>
                      {summaries.map((s) => (
                        <option key={s.id} value={s.id}>
                          Mined: {s.title}
                        </option>
                      ))}
                    </>
                  )}
                  {summaries.length === 0 && (
                     <option value="" disabled>No history summaries exists yet</option>
                  )}
                  <option value="" disabled className="text-slate-400">--- Premium Sample Decks ---</option>
                  <option value="sample_mitosis">Sample: Cells & Mitosis</option>
                  <option value="sample_motion">Sample: Laws of Motion</option>
                  <option value="sample_quadratics">Sample: Quadratic Equations</option>
                </select>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

              {/* Status statistics block */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-medium">Selected Deck:</span>
                  <span className="text-slate-800 dark:text-white font-extrabold max-w-[160px] truncate text-right">{activeDeckName || "None selected"}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-medium">Terms count:</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{deck.length} terms</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Mastered:</span>
                  <span className="font-black text-emerald-600">{score.mastered}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">Need Review:</span>
                  <span className="font-black text-amber-600">{score.review}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Deck custom generator */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-5 rounded-xl shadow-xs text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> AI Deck Generator
            </h3>
            <p className="text-[11px] text-slate-450 dark:text-slate-400 leading-relaxed mb-4">
              Enter any educational topic below (e.g., &quot;Photosynthesis&quot;, &quot;Ancient Rome&quot;, &quot;C++ Loops&quot;) and our AI will harvest high-yield revision flashcards on the fly.
            </p>

            <form onSubmit={handleGenerateCustomDeck} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Human Digestive System"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-8 py-2.5 text-slate-800 dark:text-white"
                  disabled={isGenerating}
                />
              </div>

              {genError && (
                <div className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-1.5 rounded-lg border border-red-100 dark:border-red-950">
                  {genError}
                </div>
              )}

              <button
                type="submit"
                disabled={isGenerating || !customTopic.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 disabled:opacity-40 text-slate-900 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Harvesting Cards...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Craft AI Flashcards
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Right workspace: interactive canvas card container */}
        <div className="lg:col-span-8 flex flex-col items-center">
          
          {deck.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/90 w-full min-h-[380px] rounded-2xl flex flex-col items-center justify-center text-center p-8 border border-slate-200 dark:border-slate-700/80">
              <HelpCircle className="w-12 h-12 text-slate-400 animate-bounce mb-3" />
              <h4 className="text-base font-extrabold text-slate-850 dark:text-white">Ready for Flashcards?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-450 max-w-sm mt-1.5 leading-relaxed">
                We couldn&apos;t mine any definition cards from your study logs yet. Create summaries in the <b>Instant Summary</b> tab, select a <b>Premium Sample Deck</b>, or command the <b>AI Deck Generator</b>!
              </p>
            </div>
          ) : isFinished ? (
            <div className="bg-white dark:bg-slate-800/90 w-full min-h-[380px] rounded-2xl flex flex-col items-center justify-center text-center p-8 border border-slate-200 dark:border-slate-700/80 animate-in zoom-in-95 duration-300">
              <div className="relative mb-3">
                <Award className="w-14 h-14 text-amber-550 animate-pulse" />
                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-800 text-[10px]">✓</div>
              </div>
              <h4 className="text-lg font-black text-slate-850 dark:text-white">Deck Complete! Great Studying!</h4>
              <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 max-w-sm">
                You successfully indexed through this revision catalog. Repetition solidifies memory paths.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full max-w-xs my-6">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-950/40 p-3.5 rounded-xl">
                  <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Mastered</span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{score.mastered}</span>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-950/40 p-3.5 rounded-xl">
                  <span className="block text-[10px] text-amber-600 font-bold uppercase tracking-wider">Need Review</span>
                  <span className="text-lg font-black text-amber-700 dark:text-amber-400">{score.review}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" /> Restart Stack
                </button>
                <button
                  onClick={onBackToDashboard}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold rounded-xl text-xs transition active:scale-95"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-5">
              
              {/* Progress counter & title */}
              <div className="w-full flex items-center justify-between text-xs px-1">
                <span className="text-slate-450 font-bold uppercase tracking-wider">Working card: {currentIndex + 1} / {deck.length}</span>
                <span className="text-slate-450 font-bold">Source: <b className="text-slate-700 dark:text-slate-300">{deck[currentIndex].sourceTitle}</b></span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-205 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Interactive Flip Card */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ perspective: 1000 }}
                className="w-full h-[260px] sm:h-[300px] cursor-pointer"
              >
                <motion.div
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="w-full h-full relative"
                >
                  
                  {/* Front: Key Term */}
                  <div 
                    style={{ backfaceVisibility: "hidden" }}
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-between p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md text-center"
                  >
                    <div className="w-full flex justify-between items-center text-slate-350">
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Front (Term)</span>
                      <button 
                        onClick={readCardSpeaker}
                        className={`p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600 transition-colors ${speechPlaying ? 'text-primary-600 dark:text-primary-400 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800' : ''}`}
                        title="Read this aloud"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="my-auto py-4">
                      <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-relaxed max-w-lg">
                        {deck[currentIndex].front}
                      </h3>
                    </div>

                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider animate-pulse mb-1">
                      Click anywhere on the card to Flip
                    </p>
                  </div>

                  {/* Back: Explanation / Definition */}
                  <div 
                    style={{ 
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)"
                    }}
                    className="absolute inset-0 bg-amber-50/10 dark:bg-slate-850/60 rounded-2xl flex flex-col items-center justify-between p-6 sm:p-8 border border-amber-300/30 dark:border-slate-700 shadow-md text-center backdrop-blur-md"
                  >
                    <div className="w-full flex justify-between items-center text-slate-405">
                      <span className="text-[10px] uppercase font-black tracking-widest text-[#B7950B] font-bold">Back (Definition)</span>
                      <button 
                        onClick={readCardSpeaker}
                        className={`p-1.5 rounded-full hover:bg-amber-100/10 hover:text-slate-600 transition-colors ${speechPlaying ? 'text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-805' : ''}`}
                        title="Read definition aloud"
                      >
                        <Volume2 className="w-4 h-4 text-amber-650" />
                      </button>
                    </div>

                    <div className="my-auto py-3 max-w-xl">
                      <p className="text-sm sm:text-base md:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed text-center px-2">
                        {deck[currentIndex].back}
                      </p>
                    </div>

                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">
                      Click to flip back
                    </p>
                  </div>

                </motion.div>
              </div>

              {/* Assessment Action Row */}
              <div className="flex justify-center items-center gap-4 py-2">
                <button
                  onClick={() => handleLevelTag('review')}
                  className="px-4.5 py-3 border border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-400 bg-amber-50/20 hover:bg-amber-50/40 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-sm min-w-[130px] justify-center"
                >
                  😕 Need Practice
                </button>
                <button
                  onClick={() => handleLevelTag('mastered')}
                  className="px-5 py-3 border border-emerald-300 dark:border-emerald-900 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-md min-w-[130px] justify-center"
                >
                  <Check className="w-4 h-4 fill-current text-white" /> Got It! Mastered
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
