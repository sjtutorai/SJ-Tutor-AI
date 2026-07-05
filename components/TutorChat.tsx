import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, SJTUTOR_AVATAR } from '../types';
import { GeminiService } from '../services/geminiService';
import { 
  Send, 
  User as UserIcon, 
  Loader2, 
  Mic, 
  MicOff, 
  Sparkles, 
  AlertCircle, 
  Share2, 
  Save, 
  Check, 
  Star, 
  Bookmark, 
  X, 
  Trash2,
  Download,
  Copy,
  Volume2,
  VolumeX,
  RotateCw,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  FileText,
  StopCircle,
  ArrowUpRight,
  Info,
  Clock,
  Plus,
  BrainCircuit,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExportModal } from './ExportModal';
import { SettingsService } from '../services/settingsService';
import { jsPDF } from 'jspdf';

function getDynamicSampleQuestions(subject: string, grade: string): string[] {
  const normSubject = subject.toLowerCase().trim();
  const normGrade = grade.toLowerCase().trim();

  if (normSubject.includes("math") || normSubject.includes("algebra") || normSubject.includes("geometry") || normSubject.includes("trig") || normSubject.includes("calculus") || normSubject.includes("arithmetic")) {
    if (normGrade.includes("10") || normGrade.includes("11") || normGrade.includes("12") || normGrade.includes("high")) {
      return [
        `Solve a quadratic equation step-by-step for ${grade} Math.`,
        `Explain trigonometric ratios (sin, cos, tan) and how to remember them.`,
        `What is coordinate geometry? Solve an example problem.`,
        `Explain the concept of Arithmetic Progression (AP) with formulas.`,
        `Show me how to prove Pythagoras' theorem and apply it.`
      ];
    } else {
      return [
        `Explain fractions and decimals with easy real-life examples.`,
        `How do we find the area and perimeter of a circle?`,
        `What are rational numbers? Provide 3 examples.`,
        `Help me understand simple interest and compound interest formulas.`,
        `What is algebraic factoring? Factorise x² + 5x + 6.`
      ];
    }
  }

  if (normSubject.includes("physics") || normSubject.includes("mechanics") || normSubject.includes("electricity") || normSubject.includes("light")) {
    return [
      `Explain Ohm's Law and the relationship between voltage, current, and resistance.`,
      `What are Newton's three laws of motion? Give daily life examples.`,
      `Explain the reflection and refraction of light with key differences.`,
      `What is electromagnetic induction? How does a generator work?`,
      `Explain kinetic energy and potential energy with their formulas.`
    ];
  }

  if (normSubject.includes("chemistry") || normSubject.includes("chemical") || normSubject.includes("acid")) {
    return [
      `What is the difference between ionic and covalent bonding?`,
      `Explain how to balance chemical equations with a simple guide.`,
      `What are acids, bases, and salts? How is pH measured?`,
      `Explain the modern periodic table structure and its trends.`,
      `What is a redox (oxidation-reduction) reaction? Give an example.`
    ];
  }

  if (normSubject.includes("biology") || normSubject.includes("bio") || normSubject.includes("botany") || normSubject.includes("zoology") || normSubject.includes("plant") || normSubject.includes("animal")) {
    return [
      `Explain the process of photosynthesis and its chemical equation.`,
      `What is the difference between animal cells and plant cells?`,
      `Explain the structure and function of DNA and RNA.`,
      `Describe the process of cell division (Mitosis vs Meiosis).`,
      `Explain the human digestive system and how enzymes work.`
    ];
  }

  if (normSubject.includes("social") || normSubject.includes("history") || normSubject.includes("geography") || normSubject.includes("civics") || normSubject.includes("political") || normSubject.includes("economics") || normSubject.includes("sst")) {
    return [
      `What are the core features of the Indian Constitution?`,
      `Explain the causes and impact of the French Revolution.`,
      `What is the difference between renewable and non-renewable natural resources?`,
      `Explain the water cycle and its importance to Earth's climate.`,
      `What is democracy? Discuss its key advantages and disadvantages.`
    ];
  }

  if (normSubject.includes("english") || normSubject.includes("lang") || normSubject.includes("grammar") || normSubject.includes("literature") || normSubject.includes("writing")) {
    return [
      `Explain active and passive voice with clear practice examples.`,
      `What is the difference between a metaphor and a simile? Give examples.`,
      `How do I write a compelling essay introduction and conclusion?`,
      `What are parts of speech? Briefly explain pronouns and prepositions.`,
      `Explain tense rules in English grammar (Present, Past, Future).`
    ];
  }

  if (normSubject.includes("computer") || normSubject.includes("coding") || normSubject.includes("programming") || normSubject.includes("python") || normSubject.includes("java") || normSubject.includes("html") || normSubject.includes("css") || normSubject.includes("javascript") || normSubject.includes("js")) {
    return [
      `What are the four pillars of Object-Oriented Programming (OOP)?`,
      `Explain the difference between a list (array) and a dictionary (hashmap).`,
      `What is database normalization? Why is it important?`,
      `Explain compiled vs interpreted programming languages.`,
      `How does a binary search algorithm work? What is its time complexity?`
    ];
  }

  const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
  return [
    `What are the most important fundamental concepts in ${capSubject} for ${grade}?`,
    `Explain a tricky chapter from my ${grade} ${capSubject} syllabus.`,
    `Give me an interesting quiz question from ${capSubject} to test my understanding.`,
    `What are the best study techniques or tricks to master ${capSubject} in ${grade}?`,
    `Can you explain a real-world application of ${capSubject} that we see everyday?`
  ];
}

interface AttachedFile {
  name: string;
  type: string;
  dataUrl: string;
  textContent?: string;
  size?: number;
}

interface TutorChatProps {
  onDeductCredit: (amount: number) => boolean;
  currentCredits: number;
  onSaveSession: (messages: ChatMessage[]) => void;
  initialMessages?: ChatMessage[];
  onSharePublicLink?: (type: string, title: string, content: any) => void;
  recentSessions?: any[];
  activeSessionId?: string | null;
  onSelectSession?: (id: string | null) => void;
  onCreateQuiz?: () => void;
}

// Extends standard ChatMessage with premium features
interface ExtendedChatMessage extends ChatMessage {
  id: string;
  isStreaming?: boolean;
  liked?: boolean;
  disliked?: boolean;
  suggestions?: string[];
  thinkingStepsFinished?: boolean;
}

const TutorChat: React.FC<TutorChatProps> = (props) => {
  const { 
    onDeductCredit, 
    onSaveSession, 
    initialMessages, 
    recentSessions, 
    activeSessionId, 
    onSelectSession,
    onCreateQuiz
  } = props;

  const { subject, grade, sampleQuestions } = React.useMemo(() => {
    const settings = SettingsService.getSettings();
    const sub = settings.learning.preferredSubject || "Science";
    const grd = settings.learning.grade || "10th";
    return {
      subject: sub,
      grade: grd,
      sampleQuestions: getDynamicSampleQuestions(sub, grd)
    };
  }, []);

  const [messages, setMessages] = useState<ExtendedChatMessage[]>(() => {
    if (initialMessages) {
      return initialMessages.map((m, i) => ({
        id: m.id || `msg-${i}-${Date.now()}`,
        role: m.role,
        text: m.text,
        images: m.images,
        timestamp: m.timestamp || Date.now(),
        suggestions: m.suggestions
      }));
    }
    return [
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'model',
        text: `Hi there! I'm **SJ Tutor AI**, your premium, intelligent learning companion. 🎓\n\nI have fully customized our lesson for your **${grade} Grade ${subject}** studies. What are we exploring today? Let's break it down step-by-step together!`,
        timestamp: Date.now()
      }
    ];
  });
  
  const [loadedSessionId, setLoadedSessionId] = useState<string | null | undefined>(activeSessionId);
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(true);

  // Sync messages state when switching sessions
  useEffect(() => {
    if (activeSessionId !== loadedSessionId) {
      setLoadedSessionId(activeSessionId);
      if (initialMessages && initialMessages.length > 0) {
        setMessages(initialMessages.map((m, i) => ({
          id: m.id || `msg-${i}-${Date.now()}`,
          role: m.role,
          text: m.text,
          images: m.images,
          timestamp: m.timestamp || Date.now(),
          suggestions: m.suggestions
        })));
      } else {
        setMessages([
          {
            id: `msg-welcome-${Date.now()}`,
            role: 'model',
            text: `Hi there! I'm **SJ Tutor AI**, your premium, intelligent learning companion. 🎓\n\nI have fully customized our lesson for your **${grade} Grade ${subject}** studies. What are we exploring today? Let's break it down step-by-step together!`,
            timestamp: Date.now()
          }
        ]);
      }
      setShowResumePrompt(false);
    }
  }, [activeSessionId, initialMessages, loadedSessionId, grade, subject]);

  const messagesRef = useRef<ExtendedChatMessage[]>(messages);
  const [isSaved, setIsSaved] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [starredTimestamps, setStarredTimestamps] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('sjtutor_starred_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Sync starred messages to localStorage
  useEffect(() => {
    localStorage.setItem('sjtutor_starred_messages', JSON.stringify(starredTimestamps));
  }, [starredTimestamps]);

  // Auto-save on unmount
  useEffect(() => {
    return () => {
      if (messagesRef.current.length > 1) { 
        onSaveSession(messagesRef.current);
      }
    };
  }, []);

  // Auto-save periodically (every 30 seconds) if changed
  useEffect(() => {
    const interval = setInterval(() => {
      if (messagesRef.current.length > 1) {
        onSaveSession(messagesRef.current);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const initialInputRef = useRef('');
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Advanced states
  const [thinkingStep, setThinkingStep] = useState<'thinking' | 'analyzing' | 'generating' | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const isGeneratingRef = useRef<boolean>(false);
  const currentStreamIdRef = useRef<string | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handlers
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const isText = file.type.startsWith('text/') || 
                     file.name.endsWith('.csv') || 
                     file.name.endsWith('.json') || 
                     file.name.endsWith('.js') || 
                     file.name.endsWith('.ts') || 
                     file.name.endsWith('.py') || 
                     file.name.endsWith('.java') || 
                     file.name.endsWith('.cpp') || 
                     file.name.endsWith('.css') || 
                     file.name.endsWith('.html');

      if (isImg) {
        reader.onloadend = () => {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            dataUrl: reader.result as string,
            size: file.size
          }]);
        };
        reader.readAsDataURL(file);
      } else if (isPdf) {
        reader.onloadend = () => {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            dataUrl: reader.result as string,
            size: file.size
          }]);
        };
        reader.readAsDataURL(file);
      } else if (isText) {
        reader.onloadend = () => {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            dataUrl: '',
            textContent: reader.result as string,
            size: file.size
          }]);
        };
        reader.readAsText(file);
      } else {
        // Fallback for other files (read metadata)
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          type: file.type,
          dataUrl: '',
          textContent: `[Binary File ${file.name} - Size ${file.size} bytes]`,
          size: file.size
        }]);
      }
    });
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and Drop Zone
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const toggleStar = (timestamp: number) => {
    setStarredTimestamps(prev => 
      prev.includes(timestamp)
        ? prev.filter(t => t !== timestamp)
        : [...prev, timestamp]
    );
  };

  const clearAllBookmarks = () => {
    if (window.confirm("Are you sure you want to clear all bookmarked messages?")) {
      setStarredTimestamps([]);
    }
  };

  // Scroll to bottom on new message or during stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, thinkingStep]);

  // Helper to format duration in MM:SS
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording Duration Stopwatch Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isListening) {
      setRecordingDuration(0);
      timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isListening]);

  // Premium Speech Recognition with Live Accumulation and Interim Results
  useEffect(() => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    if (!isListening) return;

    const rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      let sessionFinal = '';
      let sessionInterim = '';
      for (let i = 0; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          sessionFinal += e.results[i][0].transcript;
        } else {
          sessionInterim += e.results[i][0].transcript;
        }
      }

      setInput(() => {
        const base = initialInputRef.current.trim();
        const finalTrimmed = sessionFinal.trim();
        return base ? base + ' ' + finalTrimmed : finalTrimmed;
      });
      setInterimTranscript(sessionInterim);
    };

    rec.onerror = (err: any) => {
      console.warn("Speech recognition error:", err);
      setIsListening(false);
      const errorType = err.error;
      if (errorType === 'not-allowed') {
        setVoiceError("Microphone access is restricted inside the preview window. Click the 'Open in New Tab' button on top of the screen to grant microphone permissions!");
      } else if (errorType === 'no-speech') {
        console.log("No speech detected.");
      } else {
        setVoiceError(`Voice detection issue: ${errorType || 'please try again'}.`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    try {
      rec.start();
    } catch (e) {
      console.error("Speech recognition start failed:", e);
      setIsListening(false);
      setVoiceError("Could not start speech recognition in this browser.");
    }

    return () => {
      try {
        rec.stop();
      } catch (err) {
        console.warn("Speech recognition stop error", err);
      }
    };
  }, [isListening]);

  const toggleVoiceInput = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("Speech recognition is not supported in this browser. Please try Google Chrome or Microsoft Edge.");
      return;
    }
    setVoiceError(null); // Clear previous voice error when toggling
    if (!isListening) {
      initialInputRef.current = input;
      setInterimTranscript('');
    }
    setIsListening(!isListening);
  };

  const handleShareChat = () => {
    if (messages.length === 0) {
      alert("No messages to share yet.");
      return;
    }
    if (props.onSharePublicLink) {
      const firstUserMsg = messages.find(m => m.role === 'user')?.text || '';
      const topicSnippet = firstUserMsg ? `"${firstUserMsg.substring(0, 30)}..."` : 'AI Lesson';
      props.onSharePublicLink(
        "tutor",
        `Tutor Session: ${topicSnippet}`,
        { messages }
      );
    } else {
      const transcript = messages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n\n');
      navigator.clipboard.writeText(transcript)
        .then(() => alert("Chat transcript copied to clipboard!"))
        .catch(() => alert("Failed to copy transcript."));
    }
  };

  const handleSave = () => {
    onSaveSession(messages);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // STOP Generation
  const handleStopGenerating = () => {
    isGeneratingRef.current = false;
    setIsTyping(false);
    setThinkingStep(null);
    setMessages(prev => prev.map(m => {
      if (m.id === currentStreamIdRef.current) {
        return { ...m, isStreaming: false };
      }
      return m;
    }));
  };

  // CORE STREAM GENERATION LOGIC
  const sendMessageToAi = async (textToSend: string, isRegeneratingMessageId?: string) => {
    if (isGeneratingRef.current && !isRegeneratingMessageId) return;
    setError(null);

    // Credit Check
    const success = onDeductCredit(1);
    if (!success) {
      setError("❌ Insufficient credits! Please unlock a reward or complete a study cycle to get more credits.");
      return;
    }

    // Capture attached files
    const activeFiles = [...attachedFiles];
    setAttachedFiles([]); // clear upload array

    const userMessageId = `msg-user-${Date.now()}`;
    const modelMessageId = isRegeneratingMessageId || `msg-model-${Date.now()}`;
    currentStreamIdRef.current = modelMessageId;

    if (!isRegeneratingMessageId) {
      // Append user message
      const imgUrls = activeFiles.filter(f => f.type.startsWith('image/')).map(f => f.dataUrl);
      const newUserMsg: ExtendedChatMessage = {
        id: userMessageId,
        role: 'user',
        text: textToSend,
        images: imgUrls.length > 0 ? imgUrls : undefined,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newUserMsg]);
    }

    setIsTyping(true);
    isGeneratingRef.current = true;

    // STEP-BY-STEP STAGGERED THINKING STEP TRANSITIONS
    setThinkingStep('thinking');
    await new Promise(r => setTimeout(r, 1000));
    if (!isGeneratingRef.current) return;

    setThinkingStep('analyzing');
    await new Promise(r => setTimeout(r, 1000));
    if (!isGeneratingRef.current) return;

    setThinkingStep('generating');
    await new Promise(r => setTimeout(r, 800));
    if (!isGeneratingRef.current) return;

    // Hide thinking indicator once we initiate streaming
    setThinkingStep(null);

    // Initial placeholder model response
    if (isRegeneratingMessageId) {
      setMessages(prev => prev.map(m => {
        if (m.id === isRegeneratingMessageId) {
          return { ...m, text: '', isStreaming: true };
        }
        return m;
      }));
    } else {
      setMessages(prev => [...prev, {
        id: modelMessageId,
        role: 'model',
        text: '',
        isStreaming: true,
        timestamp: Date.now()
      }]);
    }

    try {
      // Prepare image base64 elements separately if needed
      const imgDataList = activeFiles.filter(f => f.type.startsWith('image/')).map(f => f.dataUrl);
      
      // Get conversation history up to the current point
      const activeHistory = isRegeneratingMessageId
        ? messagesRef.current.filter(m => m.id !== isRegeneratingMessageId)
        : messagesRef.current;

      const stream = await GeminiService.chatWithTutorStream(textToSend, activeHistory, imgDataList, activeFiles);
      
      let accumulatedText = "";
      for await (const chunk of stream) {
        if (!isGeneratingRef.current) {
          break; // User stopped generation
        }
        const chunkText = chunk.text || "";
        accumulatedText += chunkText;

        setMessages(prev => prev.map(m => {
          if (m.id === modelMessageId) {
            return { ...m, text: accumulatedText };
          }
          return m;
        }));
      }

      // Generation Complete: append custom smart suggestions
      const smartSuggestions = generateSmartSuggestionsForTopic(textToSend, accumulatedText);
      setMessages(prev => prev.map(m => {
        if (m.id === modelMessageId) {
          return { 
            ...m, 
            isStreaming: false, 
            suggestions: smartSuggestions,
            thinkingStepsFinished: true
          };
        }
        return m;
      }));

    } catch (err: any) {
      console.error("Streaming error:", err);
      let errorText = "⚠️ Something went wrong with SJ Tutor AI. Please verify your connection or click Retry.";
      const rawMsg = String(err?.message || err || '');

      if (rawMsg.includes("API key not valid") || rawMsg.includes("API_KEY_MISSING")) {
        errorText = "⚠️ Config Error: Please verify that you have configured a valid Gemini API Key in the Secrets panel.";
      }

      setMessages(prev => prev.map(m => {
        if (m.id === modelMessageId) {
          return { ...m, text: errorText, isStreaming: false };
        }
        return m;
      }));
    } finally {
      setIsTyping(false);
      isGeneratingRef.current = false;
    }
  };

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isTyping) return;
    sendMessageToAi(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to generate dynamic context suggestions
  const generateSmartSuggestionsForTopic = (query: string, reply: string): string[] => {
    const q = query.toLowerCase();
    const suggestions = ["Explain more", "Simplify this explanation", "Create Quiz", "Practice Questions"];
    if (q.includes("math") || q.includes("formula") || reply.includes("=") || reply.includes("+")) {
      suggestions.push("Show another example");
    }
    if (q.includes("code") || q.includes("program") || reply.includes("```")) {
      suggestions.push("Optimize this code", "Explain line-by-line");
    }
    if (reply.length > 500) {
      suggestions.push("Summarize in 3 bullet points");
    }
    return suggestions.slice(0, 4);
  };

  // Premium message action: Copy
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Premium message action: Download PDF
  const handleDownloadPdf = (text: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("SJ Tutor AI - Premium Study Notes", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Subject: ${subject}`, 14, 26);
    doc.line(14, 29, 196, 29);

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    const cleanText = text.replace(/[*#`~_]/g, ''); // strip markdown
    const lines = doc.splitTextToSize(cleanText, 180);
    
    let y = 36;
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 6.5;
    });

    doc.save(`sjtutor_notes_${Date.now()}.pdf`);
  };

  // Premium message action: Download Markdown
  const handleDownloadMarkdown = (text: string) => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sjtutor_notes_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Premium message action: Read Aloud
  const handleReadAloud = (id: string, text: string) => {
    if (speakingId === id) {
      try {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (err) {
        console.warn("Speech synthesis cancel failed:", err);
      }
      setSpeakingId(null);
      return;
    }

    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        setVoiceError("Text-to-speech (Listen) is not fully supported in this browser context.");
        return;
      }
      window.speechSynthesis.cancel(); // stop anything else first
      const cleanText = text.replace(/[#*`~_()]/g, '').replace(/\[/g, '').replace(/\]/g, ''); // strip syntax
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      utterance.onend = () => {
        setSpeakingId(null);
      };
      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        setSpeakingId(null);
      };

      speechUtteranceRef.current = utterance;
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech synthesis failed to start:", e);
      setSpeakingId(null);
      setVoiceError("Text-to-speech could not start in this browser context.");
    }
  };

  // Premium message action: Regenerate
  const handleRegenerate = (id: string) => {
    const originalUserIndex = messages.findIndex(m => m.id === id);
    if (originalUserIndex === -1) return;
    
    // Find the latest user prompt preceding this response
    let lastUserPrompt = "";
    for (let i = originalUserIndex; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserPrompt = messages[i].text;
        break;
      }
    }

    if (!lastUserPrompt) return;
    sendMessageToAi(lastUserPrompt, id);
  };

  // Premium message action: Toggle reactions
  const handleReaction = (id: string, type: 'like' | 'dislike') => {
    setMessages(prev => prev.map(m => {
      if (m.id === id) {
        if (type === 'like') {
          return { ...m, liked: !m.liked, disliked: false };
        } else {
          return { ...m, disliked: !m.disliked, liked: false };
        }
      }
      return m;
    }));
  };

  // User Message Action: Edit Prompt
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const startEditingPrompt = (msg: ExtendedChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  const handleSaveEditedPrompt = (id: string) => {
    if (!editingText.trim()) return;
    setEditingMessageId(null);

    // Filter messages up to the edited one
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;

    // Update the message and slice the rest of the thread
    const sliceHistory = messages.slice(0, msgIndex);
    setMessages(sliceHistory);
    sendMessageToAi(editingText);
  };



  return (
    <div className="h-[calc(100vh-140px)] flex bg-slate-50 dark:bg-slate-950 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative font-sans">
      
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div 
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/5 backdrop-blur-md z-30 flex flex-col items-center justify-center border-4 border-dashed border-primary-500 rounded-2xl animate-in fade-in"
        >
          <Paperclip className="w-16 h-16 text-primary-600 animate-bounce mb-4" />
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Drop your files here</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Support Images, PDFs, and Study documents</p>
        </div>
      )}

      {/* Primary Chat Area */}
      <div 
        onDragOver={handleDragOver}
        className="flex-1 flex flex-col min-w-0 h-full relative"
      >
        {/* Sleek Glassmorphic Header */}
        <div className="px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-primary-500 to-amber-500 rounded-xl text-white shadow-lg shadow-primary-500/25">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">SJ Tutor AI</span>
                <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-[10px] font-bold">PRO</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Interactive Tutor in {subject} ({grade})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onCreateQuiz && (
              <button 
                onClick={onCreateQuiz} 
                className="p-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95" 
                title="Create a Quiz"
              >
                <BrainCircuit className="w-4 h-4 animate-pulse" />
                <span className="text-xs font-black hidden md:inline">Create Quiz</span>
              </button>
            )}
            <button 
              onClick={handleSave} 
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${isSaved ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' : 'text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`} 
              title="Save Session"
            >
              {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved && <span className="text-xs font-black">Saved</span>}
            </button>
            <button 
              onClick={handleShareChat} 
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all" 
              title="Share Session"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsExportOpen(true)} 
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-all" 
              title="Export Lesson"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${showBookmarks ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' : 'text-slate-500 dark:text-slate-400 hover:text-amber-550 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="Starred Lessons"
            >
              <Star className={`w-4 h-4 ${showBookmarks ? 'fill-amber-400 text-amber-500' : ''}`} />
              <span className="text-xs font-black hidden md:inline">Bookmarks</span>
            </button>
            <button
              onClick={() => setIsSessionsOpen(!isSessionsOpen)}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${isSessionsOpen ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/20' : 'text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="View Tutor Sessions"
            >
              <Clock className="w-4 h-4" />
              <span className="text-xs font-black hidden md:inline">My Sessions</span>
              {recentSessions && recentSessions.length > 0 && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary-500" />
              )}
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/40 dark:bg-slate-950/20">
          {/* Resume Session Prompt card */}
          {activeSessionId === null && messages.length === 1 && recentSessions && recentSessions.length > 0 && showResumePrompt && (
            (() => {
              const lastSession = recentSessions[0];
              return (
                <div className="bg-gradient-to-r from-amber-50 to-primary-50 dark:from-slate-900 dark:to-slate-950 border border-amber-100 dark:border-slate-800 rounded-2xl p-5 shadow-md max-w-2xl mx-auto mb-4 animate-in fade-in slide-in-from-top-3 duration-300">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-450 flex-shrink-0">
                      <Bookmark className="w-5 h-5 fill-amber-500/20" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-sm font-black text-slate-800 dark:text-white">
                        Resume your previous study session? 🎓
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 leading-relaxed">
                        You have an ongoing continuous chat session on <span className="font-bold text-amber-700 dark:text-amber-400">&quot;{lastSession.title}&quot;</span> ({lastSession.subtitle}) from {new Date(lastSession.timestamp).toLocaleDateString()} at {new Date(lastSession.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.
                      </p>
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() => {
                            if (onSelectSession) onSelectSession(lastSession.id);
                            setShowResumePrompt(false);
                          }}
                          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black rounded-lg transition shadow-sm hover:shadow active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Resume Session
                        </button>
                        <button
                          onClick={() => setShowResumePrompt(false)}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-350 dark:bg-slate-850 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          Start Fresh Chat
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowResumePrompt(false)}
                      className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()
          )}

          {messages.map((msg) => {
            const isStarred = starredTimestamps.includes(msg.timestamp);
            return (
              <div
                key={msg.id}
                className={`flex gap-4 relative group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI Avatar */}
                {msg.role === 'model' && (
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 shadow-sm">
                    <img src={SJTUTOR_AVATAR} alt="AI" className="w-full h-full object-cover" />
                  </div>
                )}
                
                {/* Message Bubble Column */}
                <div className="flex flex-col max-w-[85%] relative">
                  
                  {/* Inline Prompt Editor for user */}
                  {editingMessageId === msg.id ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-lg flex flex-col gap-2 min-w-[300px]">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full text-sm outline-none bg-transparent resize-none text-slate-800 dark:text-white"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button onClick={() => setEditingMessageId(null)} className="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 font-bold">Cancel</button>
                        <button onClick={() => handleSaveEditedPrompt(msg.id)} className="px-3 py-1.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700">Save & Resubmit</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl px-5 py-3.5 shadow-sm text-[15px] leading-relaxed relative border ${
                        msg.role === 'user'
                          ? 'bg-primary-600 border-primary-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-none'
                      }`}
                    >
                      {/* Attached images */}
                      {msg.images && msg.images.map((img, i) => (
                        <div key={i} className="mb-3 max-w-sm overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
                          <img src={img} alt="Attachment" className="w-full h-auto" />
                        </div>
                      ))}

                      {/* Content rendering */}
                      {msg.role === 'model' ? (
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-4 bg-primary-500 animate-pulse ml-0.5 rounded-full" />
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}

                      {/* Floating actions and Reaction tags */}
                      {msg.role === 'model' && !msg.isStreaming && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap justify-between items-center gap-2">
                          {/* Left reaction actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleReaction(msg.id, 'like')}
                              className={`p-1.5 rounded-lg transition-colors ${msg.liked ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                              title="Like response"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReaction(msg.id, 'dislike')}
                              className={`p-1.5 rounded-lg transition-colors ${msg.disliked ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                              title="Dislike response"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleReadAloud(msg.id, msg.text)}
                              className={`p-1.5 rounded-lg transition-colors ${speakingId === msg.id ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/20 animate-pulse' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                              title={speakingId === msg.id ? "Stop voice synthesis" : "Read Response Aloud"}
                            >
                              {speakingId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Right download & save actions */}
                          <div className="flex items-center gap-1 text-slate-450">
                            <button
                              onClick={() => handleDownloadMarkdown(msg.text)}
                              className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 text-[11px] font-bold border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-1 transition"
                            >
                              Markdown
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(msg.text)}
                              className="px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 text-[11px] font-bold border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-1 transition"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => handleRegenerate(msg.id)}
                              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-primary-600 rounded-lg transition"
                              title="Regenerate this answer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggestion tags block for student action queries */}
                  {msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => sendMessageToAi(suggestion)}
                          className="px-3 py-1 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-full transition shadow-xs flex items-center gap-1"
                        >
                          <span>{suggestion}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message footer timestamp & user actions */}
                  <div className="mt-1 flex items-center gap-2 self-end text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    
                    {msg.role === 'user' && editingMessageId !== msg.id && (
                      <button 
                        onClick={() => startEditingPrompt(msg)}
                        className="text-slate-400 hover:text-primary-600 flex items-center gap-0.5 ml-1"
                        title="Edit prompt"
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Edit
                      </button>
                    )}
                    
                    {msg.role === 'model' && (
                      <button
                        onClick={() => toggleStar(msg.timestamp)}
                        className={`hover:scale-110 transition flex items-center gap-0.5 ml-1 ${isStarred ? 'text-amber-500 font-bold' : 'text-slate-400 hover:text-amber-500'}`}
                      >
                        <Star className={`w-3 h-3 ${isStarred ? 'fill-amber-400' : ''}`} />
                        {isStarred ? "Starred" : "Star"}
                      </button>
                    )}
                  </div>

                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-300/60 dark:border-slate-700/60">
                    <UserIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                )}
              </div>
            );
          })}
          
          {/* MULTI-STEP ANIMATED STAGGERED THINKING INDICATOR */}
          {thinkingStep && (
            <div className="flex gap-4 justify-start items-start">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 shadow-sm">
                <img src={SJTUTOR_AVATAR} alt="AI" className="w-full h-full object-cover" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex flex-col gap-3 min-w-[260px] animate-pulse">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                  <span className="text-sm font-black text-slate-800 dark:text-white">SJ Tutor AI</span>
                </div>
                
                {/* Thinking steps sequence progress */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${thinkingStep === 'thinking' ? 'bg-primary-500 scale-125 animate-ping' : 'bg-emerald-500'}`} />
                    <span className={`font-black ${thinkingStep === 'thinking' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-450 dark:text-slate-500'}`}>Thinking...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${thinkingStep === 'analyzing' ? 'bg-primary-500 scale-125 animate-ping' : thinkingStep === 'generating' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                    <span className={`font-black ${thinkingStep === 'analyzing' ? 'text-primary-600 dark:text-primary-400' : thinkingStep === 'generating' ? 'text-slate-450 dark:text-slate-500' : 'text-slate-300 dark:text-slate-700'}`}>Analyzing your question...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${thinkingStep === 'generating' ? 'bg-primary-500 scale-125 animate-ping' : 'bg-slate-200 dark:bg-slate-800'}`} />
                    <span className={`font-black ${thinkingStep === 'generating' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-300 dark:text-slate-700'}`}>Generating the best answer...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fallback sample questions */}
          {messages.length === 1 && !isTyping && !thinkingStep && (
            <div className="space-y-4 mt-4 ml-12">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Info className="w-3.5 h-3.5" />
                <span>Recommended for your {subject} Syllabus ({grade})</span>
              </div>

              {onCreateQuiz && (
                <div className="p-4 bg-gradient-to-r from-primary-50 to-amber-50 dark:from-slate-900/60 dark:to-slate-950/60 border border-primary-100/60 dark:border-slate-800 rounded-2xl max-w-2xl mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary-100 dark:bg-primary-950/40 rounded-xl text-primary-600 dark:text-primary-450 flex-shrink-0">
                      <BrainCircuit className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">Ready for a challenge?</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Generate a personalized, grade-aligned interactive quiz on this topic!</p>
                    </div>
                  </div>
                  <button
                    onClick={onCreateQuiz}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-black rounded-xl transition shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer self-stretch sm:self-auto text-center justify-center whitespace-nowrap"
                  >
                    Create Quiz
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessageToAi(q)}
                    className="text-left text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 hover:shadow-xs transition duration-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Control Console */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          
          {/* Active file list */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 py-1">
              {attachedFiles.map((file, fIdx) => (
                <div 
                  key={fIdx}
                  className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 relative group animate-in slide-in-from-bottom-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs"
                >
                  {file.type.startsWith('image/') ? (
                    <img src={file.dataUrl} alt="Attached" className="w-5 h-5 rounded object-cover" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary-500" />
                  )}
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button 
                    onClick={() => removeFile(fIdx)}
                    className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 rounded-full transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Floating error bar */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-xl flex items-center justify-between text-xs text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-bottom-2 font-bold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button 
                onClick={() => {
                  const lastUser = [...messages].reverse().find(m => m.role === 'user');
                  if (lastUser) sendMessageToAi(lastUser.text);
                }}
                className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white rounded-lg transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Floating voice error bar */}
          {voiceError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-bottom-2 font-bold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{voiceError}</span>
              </div>
              <button 
                onClick={() => setVoiceError(null)}
                className="px-2.5 py-1 bg-rose-650 hover:bg-rose-700 text-white rounded-lg transition"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Voice-to-Text Recording Panel */}
          {isListening && (
            <div className="flex flex-col gap-1.5 p-3.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/60 rounded-xl animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Voice Dictation Active
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono ml-1">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setInput(initialInputRef.current);
                      setIsListening(false);
                      setInterimTranscript('');
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-red-500 transition px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setIsListening(false);
                      setInterimTranscript('');
                    }}
                    className="text-[11px] font-black text-rose-650 dark:text-rose-450 hover:text-rose-700 transition px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs"
                  >
                    Done Recording
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-1.5">
                {/* Audio voice waves animation */}
                <div className="flex items-end gap-1 h-3.5 w-10 flex-shrink-0">
                  <span className="w-1 bg-rose-500 rounded-full animate-pulse h-2"></span>
                  <span className="w-1 bg-rose-600 rounded-full animate-pulse h-3.5" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-1 bg-rose-500 rounded-full animate-pulse h-2.5" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1 bg-rose-400 rounded-full animate-pulse h-1.5" style={{ animationDelay: '0.3s' }}></span>
                </div>
                
                <div className="text-xs text-slate-650 dark:text-slate-405 leading-relaxed font-semibold italic truncate flex-1">
                  {interimTranscript ? `"${interimTranscript}"` : "Go ahead, speak your question clearly..."}
                </div>
              </div>
            </div>
          )}

          <div className="relative flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => handleFilesSelected(e.target.files)} 
              multiple
              className="hidden" 
            />
            
            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 transition-colors shadow-xs"
              title="Add PDF, Images, or Code"
              disabled={isTyping || thinkingStep !== null}
            >
              <Paperclip className="w-4 h-4" />
            </button>
 
            {/* Voice Input */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-3 rounded-xl border transition-all duration-200 shadow-xs relative ${
                isListening 
                  ? 'bg-rose-550 border-rose-550 text-white hover:bg-rose-600 shadow-md shadow-rose-550/20' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
              title={isListening ? "Stop Voice Recording" : "Voice Recording (Dictation)"}
              disabled={isTyping || thinkingStep !== null}
            >
              {isListening ? (
                <>
                  <span className="absolute -inset-0.5 bg-rose-500/30 rounded-xl animate-ping opacity-60"></span>
                  <MicOff className="w-4 h-4 relative z-10" />
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Input Text Box */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Dictating your query..." : "Ask SJ Tutor AI about concepts, formulas, code, or tasks..."}
              className="w-full pl-4 pr-12 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none text-[14px] max-h-32 text-slate-900 dark:text-white placeholder:text-slate-400"
              rows={1}
              disabled={isTyping || thinkingStep !== null}
            />

            {/* Stop Generation or Send button */}
            {isGeneratingRef.current || thinkingStep !== null ? (
              <button
                onClick={handleStopGenerating}
                className="absolute right-2 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 rounded-lg transition-colors flex items-center justify-center"
                title="Stop generation"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || isTyping}
                className="absolute right-2 p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
            <span>💻 Supports PDF, TXT, CSV, Code, Images</span>
            <span className="text-primary-600 dark:text-primary-400">SJ Tutor AI Engine v3.5</span>
          </div>

        </div>
      </div>

      {/* Starred Bookmarks Drawer */}
      {showBookmarks && (
        <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right duration-200 z-20 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-black text-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Bookmarks ({starredTimestamps.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              {starredTimestamps.length > 0 && (
                <button
                  onClick={clearAllBookmarks}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 rounded-lg transition"
                  title="Clear Bookmarks"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => setShowBookmarks(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {starredTimestamps.length === 0 ? (
            <div className="text-center py-20 text-slate-400 space-y-3 px-4 flex-1 flex flex-col justify-center items-center">
              <Bookmark className="w-12 h-12 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-black text-slate-600 dark:text-slate-400">No bookmarks saved yet</p>
              <p className="text-[11px] text-slate-400 leading-normal">Hover or select individual tutor response blocks, then click &quot;Star&quot; or &quot;Bookmark&quot; to save core revision notes!</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {messages.filter(msg => starredTimestamps.includes(msg.timestamp)).map((msg) => (
                <div key={msg.id} className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${msg.role === 'user' ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                      {msg.role === 'user' ? 'You' : 'AI Tutor'}
                    </span>
                    <button 
                      onClick={() => toggleStar(msg.timestamp)} 
                      className="text-amber-500 hover:text-slate-450 transition"
                      title="Remove Bookmark"
                    >
                      <Star className="w-4 h-4 fill-amber-400" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 self-end font-bold">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sleek Sidebar Drawer for Sessions History */}
      {isSessionsOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            onClick={() => setIsSessionsOpen(false)}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs z-20 md:hidden"
          />
          {/* Drawer Body */}
          <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right duration-200 z-20 shadow-xl absolute right-0 top-0 bottom-0">
            {/* Drawer Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-slate-800 dark:text-white font-black text-sm">
                <Clock className="w-4 h-4 text-primary-500" />
                <span>Tutor Sessions ({recentSessions?.length || 0})</span>
              </div>
              <button
                onClick={() => setIsSessionsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* New Session Button */}
            <button
              onClick={() => {
                if (onSelectSession) onSelectSession(null);
                setIsSessionsOpen(false);
                setShowResumePrompt(false);
              }}
              className="w-full mb-4 p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Start New Session
            </button>

            <div className="pt-2 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Chats</span>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {recentSessions && recentSessions.length > 0 ? (
                recentSessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <button
                      key={session.id}
                      onClick={() => {
                        if (onSelectSession) onSelectSession(session.id);
                        setIsSessionsOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-1 relative overflow-hidden cursor-pointer ${
                        isActive
                          ? 'bg-primary-50/70 border-primary-300 dark:bg-primary-950/20 dark:border-primary-900'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary-500" />
                      )}
                      <span className={`text-xs font-bold leading-tight line-clamp-1 ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {session.title || "Untitled Lesson"}
                      </span>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span className="line-clamp-1">{session.subtitle || "AI Tutor Session"}</span>
                        <span className="whitespace-nowrap ml-1">{new Date(session.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">No previous sessions yet.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        contentType="tutor"
        contentData={messages}
        title="AI Tutor Chat Session"
        metadata={{
          subject: subject,
          grade: grade
        }}
      />
    </div>
  );
};

export default TutorChat;
