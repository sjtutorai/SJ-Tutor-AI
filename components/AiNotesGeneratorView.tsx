import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, Sparkles, BookOpen, Download, Volume2,
  FileText, List, Layers, HelpCircle, CheckCircle2, Bookmark,
  Award, Zap, RotateCcw, AlertCircle, RefreshCw, PenTool,
  FileSpreadsheet, Play, Pause, Square, Loader2, Lock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { NoteItem, UserProfile } from '../types';
import { SettingsService } from '../services/settingsService';
import { GoogleGenAI, Type } from "@google/genai";

interface AiNotesGeneratorViewProps {
  userId: string | null;
  userProfile: UserProfile;
  onDeductCredit: (amount: number) => boolean;
  onSaveToLibrary?: (note: NoteItem) => void;
}

const SUBJECTS = [
  'Science', 'Mathematics', 'Social Science', 'English', 
  'Hindi', 'Kannada', 'Computer Science', 'General Knowledge'
];

type NotesStyle = 'Short' | 'Detailed' | 'BulletPoints' | 'Summary' | 'FormulaSheet' | 'MindMap';

const NOTES_STYLES: { id: NotesStyle; label: string; desc: string; icon: any }[] = [
  { id: 'Short', label: 'Short Revision Notes', desc: 'Dense, core formulas & key terms', icon: Zap },
  { id: 'Detailed', label: 'Detailed Study Guide', desc: 'Thorough, complete topic explanations', icon: BookOpen },
  { id: 'BulletPoints', label: 'Bullet Point Summary', desc: 'Fast, highly scannable bullet points', icon: List },
  { id: 'Summary', label: 'Chapter Summary', desc: 'Quick chapter overview with takeaways', icon: FileText },
  { id: 'FormulaSheet', label: 'Formula & Key Points Sheet', desc: 'Table format of formulas and definitions', icon: FileSpreadsheet },
  { id: 'MindMap', label: 'Mind Map (Hierarchical) Notes', desc: 'Visual connections & hierarchical map list', icon: Layers }
];

export const AiNotesGeneratorView: React.FC<AiNotesGeneratorViewProps> = ({ 
  userId, 
  userProfile, 
  onDeductCredit,
  onSaveToLibrary
}) => {
  // Config state
  const [subject, setSubject] = useState('Science');
  const [board, setBoard] = useState(userProfile.board || 'CBSE');
  const [chapterName, setChapterName] = useState('');
  const [topic, setTopic] = useState(''); // Optional secondary detail paragraph reference
  const [author, setAuthor] = useState(userProfile.displayName || '');
  const [notesStyle, setNotesStyle] = useState<NotesStyle>('Detailed');
  
  // Fixed state synchronized with Profile & Settings
  const [gradeClass, setGradeClass] = useState(userProfile.grade || SettingsService.getSettings().learning.grade || '10th');
  const [language, setLanguage] = useState(SettingsService.getSettings().learning.language || 'English');

  useEffect(() => {
    setGradeClass(userProfile.grade || SettingsService.getSettings().learning.grade || '10th');
    setBoard(userProfile.board || 'CBSE');
    if (userProfile.displayName && !author) {
      setAuthor(userProfile.displayName);
    }
  }, [userProfile]);

  useEffect(() => {
    const syncSettings = () => {
      const settings = SettingsService.getSettings();
      setLanguage(settings.learning.language || 'English');
      if (!userProfile.grade) {
        setGradeClass(settings.learning.grade || '10th');
      }
    };
    window.addEventListener('settings-changed', syncSettings);
    return () => window.removeEventListener('settings-changed', syncSettings);
  }, [userProfile]);
  
  // Generation & display state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');

  // Voice Read-Aloud (Speech Synthesis) State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // AI-Powered Enhancements state
  const [activeEnhancement, setActiveEnhancement] = useState<'NONE' | 'FLASHCARDS' | 'MCQ' | 'EXERCISES' | 'PRACTICE_SET'>('NONE');
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Enhancement outputs
  const [flashcards, setFlashcards] = useState<{ front: string; back: string }[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const [mcqQuestions, setMcqQuestions] = useState<{
    id: number;
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
    selectedAnswer?: number;
    checked?: boolean;
  }[]>([]);
  
  const [exercises, setExercises] = useState<{
    type: 'fill_blanks' | 'true_false' | 'short_qna';
    question: string;
    options?: string[]; // for true_false
    answer: string;
    explanation: string;
    userAnswer?: string;
    isCorrect?: boolean;
    checked?: boolean;
  }[]>([]);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // helper to get client API key
  const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key missing in environment settings.");
    }
    return new GoogleGenAI({ apiKey });
  };

  // 1. Generate core study notes
  const handleGenerateNotes = async () => {
    if (!chapterName.trim()) {
      setError('Please provide a Chapter Name.');
      return;
    }

    const cost = 8;
    if (!onDeductCredit(cost)) {
      setError(`Notice: This premium notes generation requires ${cost} study credits.`);
      return;
    }

    setError('');
    setIsGenerating(true);
    setGeneratedContent('');
    setIsSaved(false);
    setActiveEnhancement('NONE');

    // Stop speaking if playing
    handleStopSpeaking();

    const steps = [
      'Analyzing curriculum & learning objectives...',
      'Structuring notes template & academic tags...',
      'Adapting note complexity for class level...',
      'Highlighting important definitions, formulae & exam pointers...',
      'Polishing study sheet layout...'
    ];

    let stepIndex = 0;
    setCurrentStep(steps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      setCurrentStep(steps[stepIndex]);
    }, 2500);

    try {
      const ai = getAIClient();
      
      const stylePrompts = {
        Short: 'Create extremely brief, bullet-pointed "Revision Box" style notes. Focus entirely on core definitions, critical rules, equations, and fast revision memory elements.',
        Detailed: 'Create highly detailed, thorough academic notes explaining definitions, theories, proofs, mechanisms, background, and practical real-world applications.',
        BulletPoints: 'Create a clean list of chronological bullet points summarizing the core concepts. Use emojis for scannable visual anchors.',
        Summary: 'Provide a complete chapter-summary sheet. Include standard summary headings: Introduction, Core Concepts, Learning Objectives, Timeline/Developments, and Important Reminders.',
        FormulaSheet: 'Create a highly structured cheat sheet focusing on mathematics and science. Highlight critical formulas in tables along with descriptions of individual variables and units.',
        MindMap: 'Create notes in a hierarchical, indented visual list structure to represent parent-child concept visual maps. Start with outer core branches down to nested sub-topics.'
      };

      const prompt = `
        You are an elite academic tutor of standard ${board || 'CBSE/ICSE'} curriculums. Generate a high-quality, comprehensive, and perfectly formatted student study notes set based on:
        
        CHAPTER NAME: "${chapterName}"
        SUBJECT: ${subject}
        BOARD: ${board}
        STUDENT CLASSIFICATION: Grade/Class ${gradeClass}
        PREFERRED LANGUAGE: ${language}
        ${author ? `AUTHOR/PREPARED BY: ${author}` : ''}
        ${topic.trim() ? `ADDITIONAL CONTEXT / PASTE CONTENT: "${topic}"` : ''}
        NOTES FORMAT SPECIFICATION: ${notesStyle} (${stylePrompts[notesStyle]})

        CRITICAL OUTPUT REQUIREMENTS:
        1. Keep the complexity and grade-level vocabulary perfectly tuned for Grade ${gradeClass} level. 
        2. Format using rich, beautiful markdown. Use clear headings (#, ##, ###), bold key concepts, and formatted lists.
        3. Highlight important math-equations, physics/chem formulas, laws, or core facts using beautifully styled layout blockquotes or tables. Add a specific "📝 Formula Cheat-Box" or "💡 Key Concept Box" where appropriate.
        4. Add high-value "[EMBEDDED EXAM TIP]" notes specifically warning students about common class mistakes, vital questions, and writing formats.
        5. Write the ENTIRE notes set in ${language}. If the language is Hindi or Kannada, ensure the grammatical structure and local terms are flawless.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are SJ Tutor AI, an elite educational system. Your output notes are structured, neat, and immediately ready to read, study, and print.`
        }
      });

      const text = response.text;
      if (text) {
        setGeneratedContent(text);
      } else {
        throw new Error("Generative engine returned empty notes response.");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Generation failed: ${err.message || 'Check your internet connection.'}`);
    } finally {
      clearInterval(stepInterval);
      setIsGenerating(false);
    }
  };

  // 2. TTS Voice Read-Aloud
  const handleToggleSpeak = () => {
    if (!synthRef.current) return;

    if (isSpeaking) {
      if (isPaused) {
        synthRef.current.resume();
        setIsPaused(false);
      } else {
        synthRef.current.pause();
        setIsPaused(true);
      }
      return;
    }

    const cleanText = generatedContent
      .replace(/[*#_`~-]/g, '') // remove markdown symbols
      .substring(0, 4000);   // clamp length for speech engine safety

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Choose appropriate voice/pitch
    if (language === 'Hindi') {
      utterance.lang = 'hi-IN';
    } else if (language === 'Kannada') {
      utterance.lang = 'kn-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    setIsPaused(false);
    synthRef.current.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  // 3. Save to Personal Notes Library
  const handleSaveToPersonalLibrary = () => {
    if (!generatedContent || isSaved) return;

    const baseTags = ['AI Generated', subject, notesStyle];
    if (board) baseTags.push(board);
    if (author) baseTags.push(`By ${author}`);

    const newNote: NoteItem = {
      id: Date.now().toString(),
      title: `${chapterName} (${notesStyle}) Notes`,
      content: generatedContent,
      subject: subject,
      chapter: chapterName,
      template: notesStyle === 'FormulaSheet' ? 'Formula' : 'Theory',
      status: 'New',
      isFavorite: false,
      date: Date.now(),
      tags: baseTags
    };

    // Save notes standard layout to local storage
    const storageKey = `notes_${userId || 'guest'}`;
    const savedNotes = localStorage.getItem(storageKey);
    const existingList: NoteItem[] = savedNotes ? JSON.parse(savedNotes) : [];
    
    const updatedList = [newNote, ...existingList];
    localStorage.setItem(storageKey, JSON.stringify(updatedList));

    if (onSaveToLibrary) {
      onSaveToLibrary(newNote);
    }

    setIsSaved(true);
  };

  // 4. Copy to Clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 5. Download as HTML / Print friendly
  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${topic} Notes - SJ Tutor AI</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            h1 { color: #b45309; border-bottom: 2px solid #fbbf24; padding-bottom: 8px; }
            h2 { color: #1e3a8a; margin-top: 24px; }
            h3 { color: #0f766e; }
            code, pre { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
            blockquote { border-left: 4px solid #f59e0b; padding-left: 16px; margin-left: 0; background: #fffbeb; padding-top: 8px; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f8fafc; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; font-size: 12px; color: #94a3b8; font-weight: bold;">
            SJ TUTOR AI • ACADEMIC NOTES
          </div>
          <h1>${topic}</h1>
          <div style="font-size: 14px; font-weight: bold; color: #64748b; margin-bottom: 20px;">
            Subject: ${subject} • Grade Class: ${gradeClass} • Notes format: ${notesStyle}
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
          <div>
            ${generatedContent
              .replace(/# (.*)/g, '<h1>$1</h1>')
              .replace(/## (.*)/g, '<h2>$1</h2>')
              .replace(/### (.*)/g, '<h3>$1</h3>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/- (.*)/g, '<li>$1</li>')
              .replace(/\[EMBEDDED EXAM TIP\]/g, '<blockquote style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 10px;"><strong>⚠️ Exam Tip:</strong> ')
              .replace(/\[WRITE HERE\]/g, '________')
              .replace(/\n\n/g, '<br/><br/>')
            }
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // AI-Powered Enhancements Generators

  // A. Generate Flashcards
  const handleEnhanceFlashcards = async () => {
    const cost = 5;
    if (!onDeductCredit(cost)) {
      setError(`Enhancement requires ${cost} credits.`);
      return;
    }

    setIsEnhancing(true);
    setActiveEnhancement('FLASHCARDS');
    setError('');

    try {
      const ai = getAIClient();
      const prompt = `
        Based ONLY on these study notes, generate a set of 10 high-value academic flashcards in JSON array format.
        Each card object must have exact fields "front" and "back".
        
        NOTES MATERIAL:
        ${generatedContent}
        
        Keep front sides as direct definitions, questions, or formulas, and back sides as concise answer cards including keys/definitions.
        Output ONLY strict JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                front: { type: Type.STRING },
                back: { type: Type.STRING }
              },
              required: ["front", "back"]
            }
          }
        }
      });

      if (response.text) {
        setFlashcards(JSON.parse(response.text.trim()));
        setCurrentFlashcardIndex(0);
        setIsFlipped(false);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate digital flashcards. Try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  // B. Generate Practice MCQs
  const handleEnhanceMCQ = async () => {
    const cost = 5;
    if (!onDeductCredit(cost)) {
      setError(`Enhancement requires ${cost} credits.`);
      return;
    }

    setIsEnhancing(true);
    setActiveEnhancement('MCQ');
    setError('');

    try {
      const ai = getAIClient();
      const prompt = `
        Based on these study notes, create 5 high-quality conceptual Multiple Choice Questions (MCQs) for grade level ${gradeClass}.
        Return ONLY valid JSON array with structures:
        { id: number, question: string, options: string[], answerIndex: number, explanation: string }
        
        NOTES:
        ${generatedContent}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
              },
              required: ["id", "question", "options", "answerIndex", "explanation"]
            }
          }
        }
      });

      if (response.text) {
        setMcqQuestions(JSON.parse(response.text.trim()));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate MCQs.");
    } finally {
      setIsEnhancing(false);
    }
  };

  // C. Generate Exercises (Fill gaps, True/False, Q&A)
  const handleEnhanceExercises = async (type: 'EXERCISES' | 'PRACTICE_SET') => {
    const cost = 5;
    if (!onDeductCredit(cost)) {
      setError(`Enhancement requires ${cost} credits.`);
      return;
    }

    setIsEnhancing(true);
    setActiveEnhancement(type);
    setError('');

    try {
      const ai = getAIClient();
      const prompt = type === 'EXERCISES' ? `
        Based on these notes, generate a set of 5 mixed interactive exercises:
        - 2 Fill in the Blanks questions
        - 2 True or False questions
        - 1 Short Answer Conceptual question
        
        Return JSON array:
        { type: "fill_blanks" | "true_false" | "short_qna", question: string, options: string[] (for true_false: ["True", "False"]), answer: string, explanation: string }
        
        NOTES:
        ${generatedContent}
      ` : `
        Generate a Chapter-wise Practice Set with Important Exam Questions based on these study notes.
        Include 5 questions with step-by-step model writing guidelines to secure top grades.
        
        Return JSON array:
        { type: "short_qna", question: string, answer: string, explanation: string }
        
        NOTES:
        ${generatedContent}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["type", "question", "answer", "explanation"]
            }
          }
        }
      });

      if (response.text) {
        setExercises(JSON.parse(response.text.trim()));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate exercise set.");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto md:p-4 animate-in fade-in duration-300">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-1" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Study Notes Generator</h1>
            <p className="text-sm text-slate-400">Unlock high-quality conceptual study sheets powered by SJ Tutor AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700/60 font-mono text-xs font-semibold text-amber-400 self-start md:self-center">
          <Zap className="w-4 h-4 fill-amber-400" />
          <span>Credits Remaining: {userProfile.credits}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CONTROLS */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <PenTool className="w-5 h-5 text-amber-500" /> Notes Settings
            </h2>
            
            {/* CHAPTER NAME */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Chapter Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Life Processes, Light Reflection..."
                value={chapterName}
                onChange={e => setChapterName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium dark:text-white transition-all"
              />
            </div>

            {/* SUBJECT */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Subject</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium dark:text-white cursor-pointer"
              >
                {SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* BOARD */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Education Board</label>
              <select
                value={board}
                onChange={e => setBoard(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium dark:text-white cursor-pointer"
              >
                <option value="CBSE">CBSE (Central Board)</option>
                <option value="ICSE">ICSE / ISC</option>
                <option value="State Board">State Board</option>
                <option value="IGCSE">Cambridge / IGCSE</option>
                <option value="IB">IB (International Baccalaureate)</option>
              </select>
            </div>

            {/* AUTHOR (OPTIONAL) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Author (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Self, SJ Tutor AI..."
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium dark:text-white transition-all"
              />
            </div>

            {/* ADDITIONAL TOPIC DETAILS / TEXT CONTEXT */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">Focus Topics or Paste Content (Optional)</label>
              <textarea
                placeholder="e.g. Focus specifically on aerobic vs anaerobic respiration. You can also paste textbook paragraphs here."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium resize-none h-20 dark:text-white transition-all"
              />
            </div>

            {/* FIXED GRADE AND LANGUAGES FROM PROFILE/SETTINGS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Fixed Class (Profile)</label>
                <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 select-none">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{gradeClass}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider dark:text-slate-500">Fixed Lang (Settings)</label>
                <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 select-none">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language}</span>
                </div>
              </div>
            </div>

            {/* FORMAT STYLE SELECTOR */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400 block">Select Note Style</label>
              <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {NOTES_STYLES.map(style => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setNotesStyle(style.id)}
                      className={`flex items-start gap-3 p-3 rounded-2xl text-left border transition-all ${notesStyle === style.id ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-800 dark:text-amber-300' : 'bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                    >
                      <div className={`p-2 rounded-xl transition-all ${notesStyle === style.id ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold tracking-tight truncate">{style.label}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">{style.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-red-100 dark:border-red-900/40">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* GENERATE BUTTON */}
            <button
              onClick={handleGenerateNotes}
              disabled={isGenerating || !topic.trim()}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none group"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Structuring Notes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 group-hover:animate-pulse text-amber-100" />
                  <span>Generate Notes (8 Credits)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW & ENHANCEMENTS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* LOADER STAT */}
          {isGenerating && (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-5 animate-pulse min-h-[400px]">
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center border-4 border-amber-100 dark:border-amber-900 animate-bounce">
                <Sparkles className="w-10 h-10 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Formulating Comprehensive Notes</h3>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold animate-pulse">{currentStep}</p>
                <div className="w-64 h-2 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full animate-infinite-loading w-1/3" />
                </div>
              </div>
            </div>
          )}

          {/* INITIAL EMPTY STATE */}
          {!isGenerating && !generatedContent && (
            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-4 min-h-[400px]">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-slate-400">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Active Generator Standby</h3>
                <p className="text-sm text-slate-500 mt-1">Provide a topic or textbook section on the left sidebar to generate chapter summaries, key rules, and exam practice cards instantly.</p>
              </div>
            </div>
          )}

          {/* GENERATED NOTES DISPLAY */}
          {generatedContent && !isGenerating && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden flex flex-col min-h-[500px]">
              
              {/* DISPLAY UTILS BAR */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                
                {/* Voice & PDF operations */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleSpeak}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all ${isSpeaking ? 'bg-red-500 text-white' : 'bg-amber-100 hover:bg-amber-200/80 text-amber-800'}`}
                  >
                    {isSpeaking ? (
                      isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isSpeaking ? (isPaused ? 'Resume Read-Aloud' : 'Pause Read-Aloud') : 'Read Notes Aloud'}</span>
                  </button>

                  {isSpeaking && (
                    <button
                      onClick={handleStopSpeaking}
                      className="p-1 px-2.5 bg-slate-200 hover:bg-slate-300 rounded-full text-xs text-slate-700 font-bold flex items-center gap-1"
                    >
                      <Square className="w-3 h-3 text-red-500 fill-red-500" /> Stop
                    </button>
                  )}
                </div>

                {/* Print / Save Operation */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownloadPDF}
                    className="p-2 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                    title="Print / Save Notes as PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={handleCopyToClipboard}
                    className="p-2 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1"
                    title="Copy to clipboard"
                  >
                    {copied ? <span className="text-[10px] font-bold text-emerald-500">Copied!</span> : <Copy className="w-4 h-4" />}
                  </button>

                  <button 
                    onClick={handleSaveToPersonalLibrary}
                    disabled={isSaved}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm ${isSaved ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 cursor-not-allowed border border-emerald-300' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{isSaved ? 'Saved to Library' : 'Add to personal library'}</span>
                  </button>
                </div>
              </div>

              {/* RENDER BOX */}
              <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[600px] custom-scrollbar dark:text-slate-100">
                <style>{`
                  .study-notes-render h1 { font-size: 1.8rem; font-weight: 800; color: #b45309; margin-bottom: 12px; }
                  .study-notes-render h2 { font-size: 1.4rem; font-weight: 700; color: #1e3a8a; margin-top: 24px; margin-bottom: 8px; }
                  .study-notes-render h3 { font-size: 1.15rem; font-weight: 700; color: #0f766e; margin-top: 16px; margin-bottom: 6px; }
                  .study-notes-render p { margin-bottom: 14px; font-size: 0.95rem; line-height: 1.6; color: #334155; }
                  .dark .study-notes-render p { color: #cbd5e1; }
                  .study-notes-render ul { list-style-type: disc; margin-left: 20px; margin-bottom: 14px; }
                  .study-notes-render li { margin-bottom: 6px; font-size: 0.95rem; }
                  .study-notes-render blockquote { border-left: 4px solid #f59e0b; padding-left: 16px; margin: 16px 0; background: #fffbeb; padding-top: 8px; padding-bottom: 8px; border-radius: 4px; font-style: italic; }
                  .dark .study-notes-render blockquote { background: #451a03/20; border-left-color: #d97706; }
                  .study-notes-render table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 16px; }
                  .study-notes-render th, .study-notes-render td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 0.9rem; }
                  .dark .study-notes-render th, .dark .study-notes-render td { border-color: #475569; }
                  .study-notes-render th { background: #f8fafc; font-weight: bold; }
                  .dark .study-notes-render th { background: #1e293b; }
                `}</style>
                <div className="study-notes-render markdown-body">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </div>
              </div>

              {/* AI INTERACTIVE ACTIONS HEADER */}
              <div className="px-6 py-4 bg-amber-500/10 dark:bg-amber-500/5 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Digital Revision Suite</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleEnhanceFlashcards} 
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-500" /> Flashcards
                  </button>
                  <button 
                    onClick={handleEnhanceMCQ} 
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500" /> Practice MCQs
                  </button>
                  <button 
                    onClick={() => handleEnhanceExercises('EXERCISES')} 
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Mixed Exercises
                  </button>
                  <button 
                    onClick={() => handleEnhanceExercises('PRACTICE_SET')} 
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-orange-500" /> Exam Practice Set
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE ENHANCEMENTS BOX */}
          <AnimatePresence>
            {activeEnhancement !== 'NONE' && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-amber-200 dark:border-slate-700 shadow-lg p-6 space-y-6"
              >
                {isEnhancing ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest animate-pulse">Engaging Smart AI Assistant...</p>
                  </div>
                ) : (
                  <>
                    {/* FLASHCARDS INTERACTIVE COMPONENT */}
                    {activeEnhancement === 'FLASHCARDS' && flashcards.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-indigo-500" /> Interactive Flashcards (Practice)
                          </h3>
                          <span className="text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-bold px-3 py-1 rounded-full">
                            {currentFlashcardIndex + 1} / {flashcards.length}
                          </span>
                        </div>

                        {/* CARD BOX */}
                        <div 
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="w-full min-h-[220px] rounded-2xl bg-gradient-to-br from-indigo-50/20 to-indigo-100/10 dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center justify-center text-center cursor-pointer select-none transition-all hover:scale-[1.01] active:scale-[0.99] relative"
                        >
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={isFlipped ? 'back' : 'front'}
                              initial={{ rotationY: -90, opacity: 0 }}
                              animate={{ rotationY: 0, opacity: 1 }}
                              exit={{ rotationY: 90, opacity: 0 }}
                              className="space-y-4"
                            >
                              <p className="text-xs text-indigo-500 uppercase font-extrabold tracking-widest">{isFlipped ? 'Answer Key' : 'Flash Concept'}</p>
                              <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">{isFlipped ? flashcards[currentFlashcardIndex].back : flashcards[currentFlashcardIndex].front}</p>
                            </motion.div>
                          </AnimatePresence>
                          <span className="absolute bottom-3 text-[10px] text-slate-400 font-semibold tracking-wider flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Click card container to flip
                          </span>
                        </div>

                        {/* CONTROLS */}
                        <div className="flex justify-between items-center pt-2">
                          <button
                            disabled={currentFlashcardIndex === 0}
                            onClick={() => { setCurrentFlashcardIndex(currentFlashcardIndex - 1); setIsFlipped(false); }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold disabled:opacity-40"
                          >
                            Previous Card
                          </button>
                          
                          <button
                            onClick={() => { setCurrentFlashcardIndex(0); setIsFlipped(false); }}
                            className="text-xs text-slate-500 hover:text-amber-500 flex items-center gap-1 font-semibold"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Restart Session
                          </button>

                          <button
                            disabled={currentFlashcardIndex === flashcards.length - 1}
                            onClick={() => { setCurrentFlashcardIndex(currentFlashcardIndex + 1); setIsFlipped(false); }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40"
                          >
                            Next Card
                          </button>
                        </div>
                      </div>
                    )}

                    {/* MCQS PRACTICE COMPONENT */}
                    {activeEnhancement === 'MCQ' && mcqQuestions.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-blue-500" /> Notes Concept Practice MCQs
                          </h3>
                          <button
                            onClick={handleEnhanceMCQ}
                            className="text-xs text-slate-500 hover:text-amber-500 flex items-center gap-1 font-semibold"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh Questions
                          </button>
                        </div>

                        <div className="space-y-5">
                          {mcqQuestions.map((q, qIndex) => (
                            <div key={q.id} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                              <p className="font-bold text-slate-800 dark:text-white text-sm">{qIndex + 1}. {q.question}</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {q.options.map((opt, optIndex) => {
                                  const isSelected = q.selectedAnswer === optIndex;
                                  const isCorrect = q.answerIndex === optIndex;
                                  
                                  let optionStyle = 'border-slate-200 hover:border-blue-400 dark:border-slate-700';
                                  if (q.checked) {
                                    if (isCorrect) {
                                      optionStyle = 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-300';
                                    } else if (isSelected) {
                                      optionStyle = 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-800 dark:text-red-300';
                                    }
                                  } else if (isSelected) {
                                    optionStyle = 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-300';
                                  }

                                  return (
                                    <button
                                      key={optIndex}
                                      disabled={q.checked}
                                      onClick={() => {
                                        setMcqQuestions(mcqQuestions.map(mq => mq.id === q.id ? { ...mq, selectedAnswer: optIndex } : mq));
                                      }}
                                      className={`p-3.5 rounded-xl text-left text-xs font-semibold border transition-all ${optionStyle}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* ACTIONS */}
                              {!q.checked ? (
                                <button
                                  disabled={q.selectedAnswer === undefined}
                                  onClick={() => {
                                    setMcqQuestions(mcqQuestions.map(mq => mq.id === q.id ? { ...mq, checked: true } : mq));
                                  }}
                                  className="px-3 py-1.5 bg-slate-700 text-white hover:bg-slate-800 rounded-lg text-xs font-bold disabled:opacity-40"
                                >
                                  Submit Answer
                                </button>
                              ) : (
                                <div className="p-3.5 rounded-xl bg-orange-50/40 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                  <p className="font-bold text-amber-800 dark:text-amber-400">Explanation Note:</p>
                                  <p>{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MIXED EXERCISES & EXAM PRACTICE SETS */}
                    {(activeEnhancement === 'EXERCISES' || activeEnhancement === 'PRACTICE_SET') && exercises.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {activeEnhancement === 'EXERCISES' ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Chapter Interactive Exercises
                              </>
                            ) : (
                              <>
                                <Award className="w-5 h-5 text-orange-500" /> Exam Practice Set (Model Answers)
                              </>
                            )}
                          </h3>
                        </div>

                        <div className="space-y-5">
                          {exercises.map((item, idx) => (
                            <div key={idx} className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                                  {item.type.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 dark:text-white text-sm">{idx + 1}. {item.question}</p>

                              {/* True/False buttons */}
                              {item.type === 'true_false' && (
                                <div className="flex gap-2">
                                  {['True', 'False'].map(opt => (
                                    <button
                                      key={opt}
                                      disabled={item.checked}
                                      onClick={() => {
                                        setExercises(exercises.map((ex, exIdx) => exIdx === idx ? { ...ex, userAnswer: opt } : ex));
                                      }}
                                      className={`px-4 py-2 border rounded-xl font-bold text-xs ${item.userAnswer === opt ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white'}`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Fill in Blanks / Question input */}
                              {item.type !== 'true_false' && (
                                <input
                                  type="text"
                                  placeholder="Type your study response here..."
                                  value={item.userAnswer || ''}
                                  disabled={item.checked}
                                  onChange={e => {
                                    setExercises(exercises.map((ex, exIdx) => exIdx === idx ? { ...ex, userAnswer: e.target.value } : ex));
                                  }}
                                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs dark:text-white"
                                />
                              )}

                              {!item.checked ? (
                                <button
                                  disabled={!item.userAnswer}
                                  onClick={() => {
                                    setExercises(exercises.map((ex, exIdx) => exIdx === idx ? { ...ex, checked: true } : ex));
                                  }}
                                  className="px-3.5 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-bold"
                                >
                                  Submit Answer & Reveal
                                </button>
                              ) : (
                                <div className="p-4 rounded-xl bg-emerald-50/20 border border-emerald-500/30 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                                  <p className="font-bold text-emerald-800 dark:text-emerald-400">Correct Answer Reference:</p>
                                  <p className="font-semibold text-slate-800 dark:text-white">{item.answer}</p>
                                  <p className="text-slate-500 mt-1"><strong>Explanation / Hint:</strong> {item.explanation}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
