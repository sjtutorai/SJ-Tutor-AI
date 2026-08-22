import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import Logo from './Logo';
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
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  Maximize2,
  Minimize2,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExportModal } from './ExportModal';
import { ChatBackgroundModal, ChatBgSettings } from './ChatBackgroundModal';
import { SettingsService } from '../services/settingsService';
import { jsPDF } from 'jspdf';
import { VoiceDictationSession } from '../services/audioService';

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

  const capSubject = subject ? (subject.charAt(0).toUpperCase() + subject.slice(1)) : 'General Studies';
  return [
    `What are the most important fundamental concepts in ${capSubject} for ${grade}?`,
    `Explain a tricky chapter from my ${grade} ${capSubject} syllabus.`,
    `Give me an interesting quiz question from ${capSubject} to test my understanding.`,
    `What are the best study techniques or tricks to master ${capSubject} in ${grade}?`,
    `Can you explain a real-world application of ${capSubject} that we see everyday?`
  ];
}

/**
 * Derives a clean, descriptive AI Session title based on user questions in the chat
 */
export function generateSessionTitleFromChat(
  messages: ChatMessage[],
  fallbackSubject: string = "Science",
  fallbackGrade: string = "10th"
): string {
  const userMessages = messages.filter(m => m.role === 'user' && m.text && m.text.trim().length > 0);
  if (userMessages.length === 0) {
    return `${fallbackSubject} (${fallbackGrade})`;
  }

  const firstUserText = userMessages[0].text.trim();

  // If user attached files without text or with default text
  if (firstUserText.startsWith("Examine and explain this attached image/file") || firstUserText.startsWith("[Binary File")) {
    return `File Analysis • ${fallbackSubject}`;
  }

  // Remove common question prefixes, filler words, and clean up
  let cleaned = firstUserText
    .replace(/^([#*`\s]+)/, '')
    .replace(/^(can you |could you |please |help me |i want to learn |i need help with |explain |what is |what are |tell me about |how do (i|we)|how does |solve |teach me |guide me on |discuss |give me |define |summarize |write a |show me )\s*/i, '')
    .replace(/^(the concept of |an overview of |details on |step[- ]by[- ]step )\s*/i, '')
    .replace(/[?.!;,]+$/, '')
    .trim();

  if (cleaned.length < 3) {
    cleaned = firstUserText.replace(/[?.!;,]+$/, '').trim();
  }

  const lower = cleaned.toLowerCase();
  if (lower === 'hi' || lower === 'hello' || lower === 'hey' || cleaned.length < 3) {
    if (userMessages.length > 1) {
      const nextUserText = userMessages[1].text.trim();
      if (nextUserText.length > 3) {
        return generateSessionTitleFromChat(userMessages.slice(1), fallbackSubject, fallbackGrade);
      }
    }
    return `${fallbackSubject} Study Session`;
  }

  // Capitalize properly
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  // Truncate at word boundary if too long (max 44 chars)
  if (cleaned.length > 44) {
    const truncated = cleaned.substring(0, 44);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 22) {
      cleaned = truncated.substring(0, lastSpace) + '...';
    } else {
      cleaned = truncated + '...';
    }
  }

  return cleaned;
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
  onSaveSession: (messages: ChatMessage[], sessionTitle?: string, sessionId?: string) => void;
  initialMessages?: ChatMessage[];
  onSharePublicLink?: (type: string, title: string, content: any) => Promise<void> | void;
  recentSessions?: any[];
  fullHistory?: any[];
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
    fullHistory, 
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

  // Stable session identifier across continuous messages
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    if (activeSessionId) return activeSessionId;
    if (recentSessions && recentSessions.length > 0) {
      return recentSessions[0].id;
    }
    try {
      const saved = localStorage.getItem('sjtutor_active_chat_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.sessionId && Array.isArray(parsed?.messages) && parsed.messages.length > 1) {
          return parsed.sessionId;
        }
      }
    } catch (e) {
      console.debug("No previous chat session state", e);
    }
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  });

  const [sessionTitle, setSessionTitle] = useState<string>(() => {
    if (activeSessionId && recentSessions) {
      const found = recentSessions.find(s => s.id === activeSessionId);
      if (found?.title) return found.title;
    }
    if (recentSessions && recentSessions.length > 0 && recentSessions[0].title) {
      return recentSessions[0].title;
    }
    try {
      const saved = localStorage.getItem('sjtutor_active_chat_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.sessionTitle) return parsed.sessionTitle;
      }
    } catch (e) {
      console.debug("No previous chat session title", e);
    }
    return `${subject} (${grade})`;
  });

  const [messages, setMessages] = useState<ExtendedChatMessage[]>(() => {
    if (initialMessages && initialMessages.length > 0) {
      return initialMessages.map((m, i) => ({
        id: m.id || `msg-${i}-${Date.now()}`,
        role: m.role,
        text: m.text,
        images: m.images,
        timestamp: m.timestamp || Date.now(),
        suggestions: m.suggestions
      }));
    }
    if (recentSessions && recentSessions.length > 0 && recentSessions[0].content?.messages?.length > 0) {
      return recentSessions[0].content.messages.map((m: any, i: number) => ({
        id: m.id || `msg-${i}-${Date.now()}`,
        role: m.role,
        text: m.text,
        images: m.images,
        timestamp: m.timestamp || Date.now(),
        suggestions: m.suggestions,
        liked: m.liked,
        disliked: m.disliked,
      }));
    }
    // Check if we have an autosaved ongoing active session in localStorage to recover from accidental refresh
    try {
      const saved = localStorage.getItem('sjtutor_active_chat_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.messages) && parsed.messages.length > 1) {
          return parsed.messages.map((m: any, i: number) => ({
            id: m.id || `msg-${i}-${Date.now()}`,
            role: m.role,
            text: m.text,
            images: m.images,
            timestamp: m.timestamp || Date.now(),
            suggestions: m.suggestions,
            liked: m.liked,
            disliked: m.disliked,
          }));
        }
      }
    } catch (e) {
      console.warn("Could not load autosaved chat state", e);
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
  
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(true);
  const [isBgModalOpen, setIsBgModalOpen] = useState(false);

  // Background Settings with Local Persistence
  const [tutorBgSettings, setTutorBgSettings] = useState<ChatBgSettings>(() => {
    try {
      const saved = localStorage.getItem('sjtutor_ai_chat_bg');
      return saved ? JSON.parse(saved) : { imageUrl: '', bgColor: '', overlayOpacity: 0.35, blur: 0 };
    } catch {
      return { imageUrl: '', bgColor: '', overlayOpacity: 0.35, blur: 0 };
    }
  });

  const handleSaveTutorBg = (settings: ChatBgSettings) => {
    setTutorBgSettings(settings);
    try {
      localStorage.setItem('sjtutor_ai_chat_bg', JSON.stringify(settings));
    } catch (err) {
      console.error('Failed to save tutor background', err);
    }
  };

  const handleClearTutorBg = () => {
    const defaultSettings: ChatBgSettings = { imageUrl: '', bgColor: '', overlayOpacity: 0.35, blur: 0 };
    setTutorBgSettings(defaultSettings);
    try {
      localStorage.removeItem('sjtutor_ai_chat_bg');
    } catch (err) {
      console.error('Failed to clear tutor background', err);
    }
  };

  // Sync messages state when switching sessions from sidebar or history
  useEffect(() => {
    if (activeSessionId && activeSessionId !== currentSessionIdRef.current) {
      setLoadedSessionId(activeSessionId);
      setCurrentSessionId(activeSessionId);
      currentSessionIdRef.current = activeSessionId;
      const matched = recentSessions?.find(s => s.id === activeSessionId);
      if (matched?.title) {
        setSessionTitle(matched.title);
        sessionTitleRef.current = matched.title;
      }
      if (matched?.content?.messages && Array.isArray(matched.content.messages)) {
        setMessages(matched.content.messages.map((m: any, i: number) => ({
          id: m.id || `msg-${i}-${Date.now()}`,
          role: m.role,
          text: m.text,
          images: m.images,
          timestamp: m.timestamp || Date.now(),
          suggestions: m.suggestions,
          liked: m.liked,
          disliked: m.disliked,
        })));
      } else if (initialMessages && initialMessages.length > 0) {
        setMessages(initialMessages.map((m, i) => ({
          id: m.id || `msg-${i}-${Date.now()}`,
          role: m.role,
          text: m.text,
          images: m.images,
          timestamp: m.timestamp || Date.now(),
          suggestions: m.suggestions
        })));
      }
      setShowResumePrompt(false);
    }
  }, [activeSessionId, initialMessages, recentSessions]);

  const messagesRef = useRef<ExtendedChatMessage[]>(messages);
  const currentSessionIdRef = useRef<string>(currentSessionId);
  const sessionTitleRef = useRef<string>(sessionTitle);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    sessionTitleRef.current = sessionTitle;
  }, [sessionTitle]);

  const [isSaved, setIsSaved] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [enlargedMessage, setEnlargedMessage] = useState<ExtendedChatMessage | null>(null);
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

  // Comprehensive Auto-Save Function: persists to localStorage and notifies App.tsx
  const performAutoSave = React.useCallback((msgs: ExtendedChatMessage[]) => {
    if (msgs.length <= 1) return;

    const derivedTitle = generateSessionTitleFromChat(msgs, subject, grade);
    setSessionTitle(derivedTitle);
    sessionTitleRef.current = derivedTitle;

    const payload = {
      sessionId: currentSessionIdRef.current,
      sessionTitle: derivedTitle,
      messages: msgs,
      lastUpdated: Date.now(),
      subject,
      grade,
    };

    try {
      localStorage.setItem('sjtutor_active_chat_state', JSON.stringify(payload));
    } catch (err) {
      console.warn("Could not auto-save active chat state to localStorage", err);
    }

    onSaveSession(msgs, derivedTitle, currentSessionIdRef.current);
  }, [subject, grade, onSaveSession]);

  // 1. Debounced auto-save on message changes
  useEffect(() => {
    if (messages.length > 1) {
      const timer = setTimeout(() => {
        performAutoSave(messages);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, performAutoSave]);

  // 2. Periodic background auto-save (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (messagesRef.current.length > 1) {
        performAutoSave(messagesRef.current);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [performAutoSave]);

  // 3. Auto-save immediately before page refresh or navigation to prevent data loss
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messagesRef.current.length > 1) {
        const derivedTitle = generateSessionTitleFromChat(messagesRef.current, subject, grade);
        const payload = {
          sessionId: currentSessionIdRef.current,
          sessionTitle: derivedTitle,
          messages: messagesRef.current,
          lastUpdated: Date.now(),
          subject,
          grade,
        };
        try {
          localStorage.setItem('sjtutor_active_chat_state', JSON.stringify(payload));
        } catch (e) {
          console.debug("Failed to set active chat state before unload", e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [subject, grade]);

  // Start a fresh, clean chat session
  const handleStartNewSession = () => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setCurrentSessionId(newId);
    currentSessionIdRef.current = newId;
    const defaultTitle = `${subject} (${grade})`;
    setSessionTitle(defaultTitle);
    sessionTitleRef.current = defaultTitle;

    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'model',
        text: `Hi there! I'm **SJ Tutor AI**, your premium, intelligent learning companion. 🎓\n\nI have fully customized our lesson for your **${grade} Grade ${subject}** studies. What are we exploring today? Let's break it down step-by-step together!`,
        timestamp: Date.now()
      }
    ]);

    try {
      localStorage.removeItem('sjtutor_active_chat_state');
    } catch (e) {
      console.debug("Failed to clear active chat state on new session", e);
    }

    if (onSelectSession) onSelectSession(null);
    setIsSessionsOpen(false);
    setShowResumePrompt(false);
  };

  const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const toggleSpeech = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_~`[\]]/g, ''));
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    }
  };

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const initialInputRef = useRef('');
  const currentInputRef = useRef('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSendVoice, setAutoSendVoice] = useState(true);
  const autoSendVoiceRef = useRef(true);
  
  useEffect(() => {
    currentInputRef.current = input;
  }, [input]);
  useEffect(() => {
    autoSendVoiceRef.current = autoSendVoice;
  }, [autoSendVoice]);

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isScrollMenuOpen, setIsScrollMenuOpen] = useState(false);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 120;
      setShowScrollButton(isScrolledUp);
      setShowScrollTopButton(scrollTop > 200);
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Auto-scroll when new messages arrive or when AI is responding
  useEffect(() => {
    if (isAutoScrollEnabled && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages, thinkingStep, isAutoScrollEnabled]);

  // File Upload Handlers
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
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
    setStarredTimestamps([]);
  };

  // Scroll to bottom on new message or during stream
  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

  // Voice Dictation Session reference
  const voiceSessionRef = useRef<VoiceDictationSession | null>(null);

  // Clean up voice dictation on unmount
  useEffect(() => {
    return () => {
      if (voiceSessionRef.current) {
        voiceSessionRef.current.stop().catch(() => {});
        voiceSessionRef.current = null;
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const toggleVoiceInput = async () => {
    setVoiceError(null);

    if (isListening) {
      // User clicked to finish voice input
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsListening(false);
      
      if (voiceSessionRef.current) {
        try {
          const transcribed = await voiceSessionRef.current.stop();
          if (transcribed) {
            setInput(prev => {
              const base = prev.trim();
              if (base.toLowerCase().includes(transcribed.toLowerCase().trim())) return base;
              return base ? `${base} ${transcribed}` : transcribed;
            });
            setInterimTranscript('');
            
            if (autoSendVoiceRef.current) {
              const textToSend = currentInputRef.current || transcribed;
              if (textToSend.trim()) {
                sendMessageToAi(textToSend);
                setInput('');
              }
            }
          }
        } catch (err: any) {
          console.warn('Voice session finish error:', err);
        }
        voiceSessionRef.current = null;
      }
      setInterimTranscript('');
    } else {
      // Start Voice Dictation
      initialInputRef.current = input;
      setInterimTranscript('');
      
      try {
        const session = new VoiceDictationSession({
          language: 'English',
          onInterim: (text) => {
            setInterimTranscript(text);
          },
          onFinal: (text) => {
            const base = initialInputRef.current.trim();
            const combined = base ? `${base} ${text}` : text;
            setInput(combined);
            setInterimTranscript('');

            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (autoSendVoiceRef.current && text.trim().length > 0) {
              silenceTimerRef.current = setTimeout(async () => {
                if (voiceSessionRef.current) {
                  await voiceSessionRef.current.stop().catch(() => {});
                  voiceSessionRef.current = null;
                }
                setIsListening(false);
                const finalMsg = currentInputRef.current;
                if (finalMsg && finalMsg.trim()) {
                  sendMessageToAi(finalMsg);
                  setInput('');
                  setInterimTranscript('');
                }
              }, 2500);
            }
          },
          onError: (errMsg) => {
            setVoiceError(errMsg);
            setIsListening(false);
          },
          onRecordingStateChange: (rec) => {
            setIsListening(rec);
          },
        });

        voiceSessionRef.current = session;
        await session.start();
        setIsListening(true);
      } catch (err: any) {
        console.error('Microphone activation failed:', err);
        setVoiceError(
          err.message || "Microphone access is unavailable. Please grant microphone permissions to use voice dictation."
        );
        setIsListening(false);
      }
    }
  };

  const [isSharingPublic, setIsSharingPublic] = useState(false);

  const handleShareChat = async () => {
    if (messages.length === 0) {
      alert("No messages to share yet.");
      return;
    }
    if (isSharingPublic) return;
    setIsSharingPublic(true);
    console.log("TutorChat Share button click event detected.");
    try {
      if (props.onSharePublicLink) {
        const derivedTitle = sessionTitle || generateSessionTitleFromChat(messages, subject, grade);
        await props.onSharePublicLink(
          "tutor",
          derivedTitle,
          { messages }
        );
      } else {
        const transcript = messages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n\n');
        await navigator.clipboard.writeText(transcript);
        alert("Chat transcript copied to clipboard!");
      }
    } catch (err) {
      console.error("Error inside TutorChat handleShareChat:", err);
      alert("Failed to copy or share transcript.");
    } finally {
      setIsSharingPublic(false);
    }
  };

  const handleSave = () => {
    performAutoSave(messages);
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
      const imgUrls = activeFiles.filter(f => f.type.startsWith('image/') || f.dataUrl.startsWith('data:image/')).map(f => f.dataUrl).filter(Boolean);
      const displayText = textToSend.trim() || (activeFiles.length > 0 ? "Examine and explain this attached image/file" : "");
      const newUserMsg: ExtendedChatMessage = {
        id: userMessageId,
        role: 'user',
        text: displayText,
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

      
      let userContext = "";
      if (fullHistory && fullHistory.length > 0) {
        userContext = fullHistory.slice(0, 10).map((h: any) => {
          let summary = `- ${new Date(h.timestamp).toLocaleDateString()}: ${h.title} (${h.type})`;
          if (h.type === 'Tutor Chat' && h.content?.messages) {
             const msgs = h.content.messages.filter((m: any) => m.text && typeof m.text === 'string');
             if (msgs.length > 0) {
                const userMsg = msgs.find((m: any) => m.role === 'user');
                if (userMsg) summary += ` | Query: ${userMsg.text.substring(0, 100)}`;
             }
          }
          return summary;
        }).join("\n");
      }
      
      const stream = await GeminiService.chatWithTutorStream(textToSend, activeHistory, imgDataList, activeFiles, userContext);

      
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

      // Check if it's an image generation command
      const imgMatch = accumulatedText.match(/<GENERATE_IMAGE:\s*"([^"]+)">/);
      if (imgMatch) {
        const imagePrompt = imgMatch[1];
        setMessages(prev => prev.map(m => {
          if (m.id === modelMessageId) {
            return { ...m, text: accumulatedText.replace(imgMatch[0], "\n\n*Generating image... 🎨*\n\n") };
          }
          return m;
        }));
        
        try {
          const imageUrl = await GeminiService.generateImage(imagePrompt);
          accumulatedText = accumulatedText.replace(imgMatch[0], `\n\n![Generated Image](${imageUrl})\n\n`);
        } catch (e: any) {
          accumulatedText = accumulatedText.replace(imgMatch[0], `\n\n⚠️ Failed to generate image: ${e.message}\n\n`);
        }
      }

      // Generation Complete: append custom smart suggestions
      const smartSuggestions = generateSmartSuggestionsForTopic(textToSend, accumulatedText);
      setMessages(prev => prev.map(m => {
        if (m.id === modelMessageId) {
          return { 
            ...m, 
            text: accumulatedText,
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
    <div className={`flex bg-slate-50 dark:bg-slate-950 font-sans transition-all duration-300 ${
      isEnlarged 
        ? 'fixed inset-0 z-[100] h-screen w-screen rounded-none shadow-2xl border-none overflow-hidden' 
        : 'h-[calc(100vh-140px)] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative'
    }`}>
      
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
                {sessionTitle && sessionTitle !== `${subject} (${grade})` && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold max-w-[200px] md:max-w-[280px] truncate border border-slate-200 dark:border-slate-700 shadow-2xs" title={`Active Topic: ${sessionTitle}`}>
                    <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">{sessionTitle}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Interactive Tutor in {subject} ({grade})</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-saved
                </span>
              </div>
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
              disabled={isSharingPublic}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
              title="Share Session"
            >
              {isSharingPublic ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <button 
              onClick={() => setIsExportOpen(true)} 
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-all" 
              title="Export Lesson"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsBgModalOpen(true)}
              className="p-2 text-amber-600 dark:text-amber-400 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 rounded-xl transition-all shadow-sm"
              title="Customize Tutor Wallpaper & Atmosphere"
            >
              <Palette className="w-4 h-4" />
            </button>
            
            {/* Scroll Navigation Quick Tools */}
            <div className="relative">
              <button
                onClick={() => setIsScrollMenuOpen(!isScrollMenuOpen)}
                className={`p-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  isScrollMenuOpen 
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/40 ring-1 ring-primary-500/30' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Scroll & Navigation Options"
              >
                <ChevronsDown className="w-4 h-4" />
                <span className="text-xs font-black hidden lg:inline">Scroll</span>
              </button>

              {isScrollMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Scroll Controls
                  </div>
                  <div className="space-y-1 mt-1">
                    <button
                      onClick={() => {
                        scrollToTop();
                        setIsScrollMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:text-primary-600 rounded-xl transition cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4 text-primary-500" />
                      <span>Scroll to Top</span>
                    </button>
                    <button
                      onClick={() => {
                        scrollToBottom();
                        setIsScrollMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:text-primary-600 rounded-xl transition cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4 text-primary-500" />
                      <span>Scroll to Bottom</span>
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1 pt-1">
                      <button
                        onClick={() => {
                          setIsAutoScrollEnabled(!isAutoScrollEnabled);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      >
                        <span>Auto-Scroll</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          isAutoScrollEnabled
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isAutoScrollEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
            <button
              onClick={() => setIsEnlarged(!isEnlarged)}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 ${isEnlarged ? 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 ring-2 ring-amber-500 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title={isEnlarged ? "Exit Enlarge" : "Enlarge Messages"}
            >
              {isEnlarged ? <Minimize2 className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : <Maximize2 className="w-4 h-4" />}
              <span className="text-xs font-black">{isEnlarged ? "Minimize" : "Enlarge"}</span>
            </button>
          </div>
        </div>

        {/* Message Thread Container with Custom Wallpaper */}
        <div 
          className="flex-grow flex flex-col relative overflow-hidden"
          style={{
            background: tutorBgSettings.bgColor || undefined
          }}
        >
          {/* Wallpaper Image Layer with Blur */}
          {tutorBgSettings.imageUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 transition-all"
              style={{
                backgroundImage: `url(${tutorBgSettings.imageUrl})`,
                filter: (tutorBgSettings.blur || 0) > 0 ? `blur(${tutorBgSettings.blur}px)` : undefined,
                transform: (tutorBgSettings.blur || 0) > 0 ? 'scale(1.05)' : undefined,
              }}
            />
          )}

          {/* Overlay for text readability */}
          {(tutorBgSettings.imageUrl || tutorBgSettings.bgColor) && (
            <div 
              className="absolute inset-0 bg-black pointer-events-none z-0 transition-opacity"
              style={{ opacity: tutorBgSettings.overlayOpacity ?? 0.35 }}
            />
          )}

          {/* Message Thread */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10 ${
              tutorBgSettings.imageUrl || tutorBgSettings.bgColor ? '' : 'bg-slate-50/40 dark:bg-slate-950/20'
            }`}
          >
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
                          onClick={handleStartNewSession}
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
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 shadow-sm flex items-center justify-center">
                    <Logo className="w-full h-full" iconOnly noBorder />
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
                      className={`rounded-2xl px-5 py-3.5 shadow-sm transition-all duration-200 relative border ${
                        isEnlarged ? 'text-[17px] sm:text-[18px] leading-relaxed p-6' : 'text-[15px] leading-relaxed'
                      } ${
                        msg.role === 'user'
                          ? 'bg-primary-600 border-primary-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-100 rounded-tl-none'
                      }`}
                    >
                      {/* Attached images */}
                      {msg.images && msg.images.map((img, i) => (
                        <div 
                          key={i} 
                          onClick={() => setEnlargedMessage(msg)}
                          className="mb-3 max-w-sm overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-md cursor-pointer group/img relative"
                          title="Click to enlarge image"
                        >
                          <img src={img} alt="Attachment" className="w-full h-auto group-hover/img:scale-105 transition-transform" />
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
                              onClick={() => toggleSpeech(msg.id, msg.text)}
                              className={`p-1.5 rounded-lg transition-colors ${speakingMessageId === msg.id ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
                              title={speakingMessageId === msg.id ? "Stop Speaking" : "Read Aloud"}
                            >
                              {speakingMessageId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
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
                            <button
                              onClick={() => setEnlargedMessage(msg)}
                              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-amber-500 rounded-lg transition"
                              title="Enlarge message"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
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
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 shadow-sm flex items-center justify-center">
                <Logo className="w-full h-full" iconOnly noBorder />
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

        {/* FLOATING SCROLL NAVIGATION CONTROLS */}
        <div className="absolute bottom-28 right-6 flex flex-col gap-2 z-30 pointer-events-none">
          <AnimatePresence>
            {showScrollTopButton && (
              <motion.button
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                onClick={scrollToTop}
                className="p-3 bg-white/95 dark:bg-slate-800/95 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-full shadow-lg border border-slate-200/80 dark:border-slate-700/80 transition-all pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center backdrop-blur-xs group"
                title="Scroll to Top"
              >
                <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform text-primary-600 dark:text-primary-400" />
              </motion.button>
            )}
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                onClick={scrollToBottom}
                className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-xl transition-all pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center group"
                title="Scroll to Bottom"
              >
                <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
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
                  <label className="flex items-center gap-1.5 cursor-pointer mr-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={autoSendVoice}
                      onChange={(e) => setAutoSendVoice(e.target.checked)}
                      className="w-3 h-3 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Hands-Free</span>
                  </label>
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
              onClick={handleStartNewSession}
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
        title={sessionTitle || `AI Tutor Chat Session - ${subject}`}
        metadata={{
          subject: subject,
          grade: grade
        }}
      />

      {/* Enlarged Message Modal Overlay */}
      {enlargedMessage && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {enlargedMessage.role === 'user' ? 'Enlarged Student Prompt' : 'Enlarged AI Tutor Response'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyMessage(enlargedMessage.id, enlargedMessage.text)}
                  className="p-2 text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  title="Copy Text"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEnlargedMessage(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {enlargedMessage.images && enlargedMessage.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {enlargedMessage.images.map((img, idx) => (
                    <img key={idx} src={img} alt="Attached" className="max-h-60 rounded-xl border border-slate-200 dark:border-slate-800 object-contain" />
                  ))}
                </div>
              )}
              <div className="prose dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed text-slate-800 dark:text-slate-100 font-medium">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{enlargedMessage.text}</ReactMarkdown>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                onClick={() => setEnlargedMessage(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                Close Enlarged View
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CHAT BACKGROUND CUSTOMIZER MODAL */}
      <AnimatePresence>
        {isBgModalOpen && (
          <ChatBackgroundModal
            title="Customize SJ Tutor AI Atmosphere"
            subtitle="Generate with Gemini AI, select aesthetic study themes, or upload your own wallpaper"
            currentBgImage={tutorBgSettings.imageUrl}
            currentBgColor={tutorBgSettings.bgColor}
            currentOverlayOpacity={tutorBgSettings.overlayOpacity}
            currentBlur={tutorBgSettings.blur}
            onSave={(settings) => {
              handleSaveTutorBg(settings);
            }}
            onClear={() => {
              handleClearTutorBg();
            }}
            onClose={() => setIsBgModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TutorChat;
