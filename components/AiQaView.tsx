import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Mic, MicOff, Copy, Sparkles, Volume2,
  Trash2, Zap, RefreshCw, CornerDownRight, User, Compass
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UserProfile } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface AiQaViewProps {
  userId: string | null;
  userProfile: UserProfile;
  onDeductCredit: (amount: number) => boolean;
}

interface ThreadMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  type?: 'QUICK' | 'DETAILED' | 'EXAM_PREP';
  similarQuestions?: string[];
  isLoading?: boolean;
}

export const AiQaView: React.FC<AiQaViewProps> = ({ 
  userId, 
  userProfile, 
  onDeductCredit 
}) => {
  const [query, setQuery] = useState('');
  const [gradeClass, setGradeClass] = useState(userProfile.grade || '10th');
  const [language, setLanguage] = useState('English');
  const [answerFormat, setAnswerFormat] = useState<'QUICK' | 'DETAILED' | 'EXAM_FORMAT'>('DETAILED');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  
  // Conversation Messages list
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [chatIsThinking, setChatIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Speech Recognition for Web Voice Inputs
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check voice support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setIsRecording(true);
        setRecordingError('');
      };

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        if (text) {
          setQuery(prev => prev ? `${prev} ${text}` : text);
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech Recognition Error:", err);
        setRecordingError("Could not capture voice clear text.");
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }

    // Load conversation history from local storage
    const key = userId ? `qa_thread_${userId}` : 'qa_thread_guest';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setThread(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Welcome message from SJ tutor assistant
      setThread([
        {
          id: 'welcome',
          role: 'model',
          text: `Namaste, I am your SJ academic AI Q&A Assistant. 🎓\n\nAsk me any questions from Mathematics, Science, Grammar, Kannada, Chemistry, or Social Sciences, or paste equations to get instant answers! I can explain complicated topics, write step-by-step procedures, and even formulate proper board exam writeups.`,
          timestamp: Date.now()
        }
      ]);
    }
  }, [userId]);

  // Sync with local Storage
  useEffect(() => {
    if (thread.length > 0) {
      const key = userId ? `qa_thread_${userId}` : 'qa_thread_guest';
      localStorage.setItem(key, JSON.stringify(thread));
    }
  }, [thread, userId]);

  // Scroll downwards when new responses arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thread, chatIsThinking]);

  // Toggle capturing Voice input
  const handleToggleVoiceInput = () => {
    if (!isVoiceSupported || !recognitionRef.current) {
      alert("Browser Speech inputs are not supported or permissions are restricted.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      if (language === 'Hindi') {
        recognitionRef.current.lang = 'hi-IN';
      } else if (language === 'Kannada') {
        recognitionRef.current.lang = 'kn-IN';
      } else {
        recognitionRef.current.lang = 'en-US';
      }
      recognitionRef.current.start();
    }
  };

  const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not available inside workspace.");
    }
    return new GoogleGenAI({ apiKey });
  };

  // Run Question Q&A
  const handleAskQuestion = async (selectedQuery?: string) => {
    const activeQuery = selectedQuery || query;
    if (!activeQuery.trim()) return;

    const cost = 5;
    if (!onDeductCredit(cost)) {
      alert(`Notice: Asking a new AI Question requires ${cost} credits.`);
      return;
    }

    // Clear main input if not clicking similar questions
    if (!selectedQuery) {
      setQuery('');
    }

    const newUserMessage: ThreadMessage = {
      id: Date.now().toString() + '-user',
      role: 'user',
      text: activeQuery,
      timestamp: Date.now(),
      type: answerFormat
    };

    setThread(prev => [...prev, newUserMessage]);
    setChatIsThinking(true);

    try {
      const ai = getAIClient();
      
      // format configurations instructions
      const formatPrompts = {
        QUICK: 'Provide a brief, simplified direct summary answer. Minimize filler text.',
        DETAILED: 'Provide a deep explanations. Use clear subheadings, list formulas, definitions, step-by-step mathematical solutions (if math/science equations are present), and illustrative examples.',
        EXAM_FORMAT: 'Format as a standard textbook board exam write-up. Highlight headings like "(A) Key Concept", "(B) Step-by-Step Proof/Points", "(C) Diagram Details (if any)", and "(D) Final Conclusion" to secure maximum marks.'
      };

      // Assemble chat history context
      const previousTalkLog = thread
        .slice(-6)
        .map(msg => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.text}`)
        .join('\n\n');

      const systemPrompt = `
        You are SJ Tutor AI, an elite academic advisor. You answer conceptual questions based on Grade ${gradeClass} levels.
        
        CRITICAL GUIDELINES:
        1. Keep definitions and technical details age-appropriate. Explain terms simply.
        2. Answer strictly in ${language}.
        3. Match selected formatting style: ${formatPrompts[answerFormat]}
        4. If the question is about Mathematics or Sciences, write out steps logical and format equations neatly using code block formatting.
        5. DO NOT just feed standard answers; encourage curiosity and explain why things work!
        6. Keep output formatting beautifully structured with clear titles and markdown lists.
      `;

      const mainPrompt = `
        ${previousTalkLog}

        Student's Question: "${activeQuery}"
        Current Grade: ${gradeClass}
        Required Format: ${answerFormat}

        Response output (Make sure it has a summary/conclusion box at the end):
      `;

      // 1. Generate core Answer response
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: mainPrompt,
        config: {
          systemInstruction: systemPrompt
        }
      });

      const text = response.text || '';

      // 2. Generate 3 similar questions to practice in background
      let questionsList: string[] = [];
      try {
        const questionPrompt = `Based on this question: "${activeQuery}", output exactly 3 educational similar/followup questions for Grade ${gradeClass} student to expand their query. Output as JSON array.`;
        const qResponse = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: questionPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        });
        if (qResponse.text) {
          questionsList = JSON.parse(qResponse.text.trim());
        }
      } catch (qErr) {
        console.warn("Could not retrieve similar questions", qErr);
      }

      const modelResponse: ThreadMessage = {
        id: Date.now().toString() + '-model',
        role: 'model',
        text: text,
        timestamp: Date.now(),
        similarQuestions: questionsList
      };

      setThread(prev => [...prev, modelResponse]);
    } catch (err: any) {
      console.error(err);
      const errResponse: ThreadMessage = {
        id: Date.now().toString() + '-error',
        role: 'model',
        text: `Error connecting to GenAI: ${err.message || 'Please check your connection.'}`,
        timestamp: Date.now()
      };
      setThread(prev => [...prev, errResponse]);
    } finally {
      setChatIsThinking(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your Q&A chat history?")) {
      const key = userId ? `qa_thread_${userId}` : 'qa_thread_guest';
      localStorage.removeItem(key);
      setThread([
        {
          id: 'welcome',
          role: 'model',
          text: `Welcome back to SJ academic AI Q&A Assistant. Ask me anything!`,
          timestamp: Date.now()
        }
      ]);
    }
  };

  const handleReadResponse = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // clean text from markdown brackets
    const cleanText = text.replace(/[*#_`~-]/g, '').substring(0, 3000);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (language === 'Hindi') utterance.lang = 'hi-IN';
    else if (language === 'Kannada') utterance.lang = 'kn-IN';
    else utterance.lang = 'en-IN';

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto md:p-4 animate-in fade-in duration-350">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-850 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-1" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Question & Answers</h1>
            <p className="text-sm text-slate-400">Continuous academic chat tutor. Answers tailored to your class syllabus.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleClearHistory}
            className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-red-400 text-slate-400 rounded-xl border border-slate-700/60 transition-all"
            title="Reset Chat Stream"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-705/60 font-mono text-xs font-semibold text-emerald-400">
            <Zap className="w-4 h-4 fill-emerald-400" />
            <span>Credits: {userProfile.credits}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFTSIDE BAR: OPTIONS CONFIGS */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-205 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-333 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
              <Compass className="w-4 h-4 text-emerald-500" /> Syllabus Filters
            </h3>

            {/* CLASS SELECTOR */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Class</label>
              <select
                value={gradeClass}
                onChange={e => setGradeClass(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-1.5 focus:ring-emerald-500 text-xs font-bold dark:text-white cursor-pointer"
              >
                <option value="5th Grade">Primary (Class 5)</option>
                <option value="8th Grade">Middle (Class 8)</option>
                <option value="10th Grade">Secondary (Class 10 - CBSE/State)</option>
                <option value="12th Grade">Pre-University (Class 12 - PU Board)</option>
                <option value="Graduate">Degree / Engineering / GK</option>
              </select>
            </div>

            {/* RESPONSE MODE */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Answer Writing Style</label>
              <div className="space-y-1.5 mt-1">
                {[
                  { id: 'QUICK', label: 'Quick Fact Summary', desc: 'Direct, focused and simple summaries' },
                  { id: 'DETAILED', label: 'Comprehensive Proofs', desc: 'Step-by-step logic, layouts and examples' },
                  { id: 'EXAM_FORMAT', label: 'Board Exam Layout', desc: 'Perfect academic presentation (CBSE layout)' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setAnswerFormat(mode.id as any)}
                    className={`w-full p-2.5 border rounded-2xl text-left transition-all ${answerFormat === mode.id ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-semibold shadow-sm' : 'border-slate-100 dark:border-slate-700 bg-transparent text-slate-500 dark:text-slate-400'}`}
                  >
                    <p className="text-xs font-bold">{mode.label}</p>
                    <p className="text-[9px] text-slate-411 opacity-80 mt-0.5 leading-normal">{mode.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* LANGUAGE SELECT */}
            <div className="space-y-1 pt-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Answer Language</label>
              <div className="flex gap-2.5 flex-wrap">
                {[
                  { id: 'English', label: 'English' },
                  { id: 'Hindi', label: 'हिन्दी' },
                  { id: 'Kannada', label: 'ಕನ್ನಡ' }
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-tight border transition-all ${language === lang.id ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHTSIDE BAR: MAIN CONTINUOUS STUDY CHAT STREAM */}
        <div className="lg:col-span-8 flex flex-col h-[650px] bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-705 shadow-sm overflow-hidden">
          
          {/* CHAT MESSAGES LOG CONTAINER */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {thread.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div 
                  key={msg.id || index}
                  className={`flex gap-4 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-xs font-bold ${isUser ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-emerald-500" />}
                  </div>

                  <div className="space-y-4">
                    <div className={`p-5 rounded-3xl text-sm border ${isUser ? 'bg-slate-900 border-slate-850 text-white rounded-tr-none' : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 rounded-tl-none'}`}>
                      <style>{`
                        .qa-chat-reader-box p { margin-bottom: 10px; line-height: 1.6; }
                        .qa-chat-reader-box code { background: #fee2e2/30; color: #dc2626; padding: 2px 5px; font-family: monospace; border-radius: 4px; }
                        .qa-chat-reader-box ul { list-style-type: decimal; margin-left: 20px; margin-bottom: 10px; }
                        .qa-chat-reader-box h3 { font-weight: bold; font-size: 1.05rem; margin-top: 14px; margin-bottom: 6px; color: #047857; }
                      `}</style>
                      <div className="qa-chat-reader-box markdown-body">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>

                      {/* COPY & TTS BUTTONS LIST for Assistant Answers */}
                      {!isUser && (
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-200/55 dark:border-slate-800/80 text-xs">
                          <button
                            onClick={() => handleReadResponse(msg.text)}
                            className="bg-transparent hover:text-emerald-500 text-slate-400 font-extrabold flex items-center gap-1 rounded"
                          >
                            <Volume2 className="w-3.5 h-3.5" /> Read Aloud
                          </button>
                          
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              alert("Answer copied to clipboard!");
                            }}
                            className="bg-transparent hover:text-emerald-500 text-slate-400 font-extrabold flex items-center gap-1 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Answers
                          </button>
                        </div>
                      )}
                    </div>

                    {/* SUGGESTED SIMILAR QUESTIONS LIST */}
                    {!isUser && msg.similarQuestions && msg.similarQuestions.length > 0 && (
                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Practice Related Questions:</p>
                        <div className="flex flex-col gap-1.5">
                          {msg.similarQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAskQuestion(q)}
                              className="text-left py-2 px-3 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900/50 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 hover:border-emerald-300 transition-all font-semibold"
                            >
                              <CornerDownRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span className="truncate">{q}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* THINKING STATE LOADER */}
            {chatIsThinking && (
              <div className="flex gap-4 max-w-[85%] mr-auto">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                </div>
                <div className="p-4 px-5 bg-slate-50/50 dark:bg-slate-900/40 rounded-3xl rounded-tl-none border border-slate-100 dark:border-slate-800 animate-pulse flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                  </div>
                  <span className="text-xs text-slate-411 font-medium italic">Tutor formulation in progress...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* VOICE INPUT STICKY CAPTION / FEEDBACK BAR */}
          {isRecording && (
            <div className="px-6 py-2 bg-red-500/15 text-red-600 font-extrabold text-[10px] uppercase tracking-widest flex items-center justify-between border-t border-slate-100">
              <span className="flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Capturing Voice Audio Input... Please speak clearly now.
              </span>
              <button onClick={() => recognitionRef.current.stop()} className="text-[9px] underline">Stop Voice Capture</button>
            </div>
          )}

          {/* INPUT FORM FIELD area */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800">
            <div className="flex items-center gap-2 relative">
              <button
                onClick={handleToggleVoiceInput}
                className={`p-3 rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 hover:bg-slate-300 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                title={isRecording ? "Stop Speech Translation" : "Ask Question via Voice Speech-To-Text Input"}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                placeholder="Type your question or academic doubts here..."
                disabled={chatIsThinking}
                className="flex-1 pl-4 pr-12 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-1.5 focus:ring-emerald-500 text-sm dark:text-white"
              />

              <button
                onClick={() => handleAskQuestion()}
                disabled={chatIsThinking || !query.trim()}
                className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 active:scale-95 disabled:scale-100 transition-all rounded-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {recordingError && <p className="text-[10px] text-red-500 font-bold mt-1.5">{recordingError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
