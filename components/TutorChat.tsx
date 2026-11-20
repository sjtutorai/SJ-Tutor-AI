import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChatMessage } from '../types';
import Logo from './Logo';
import { GeminiService } from '../services/geminiService';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  Mic,
  MicOff,
  AlertCircle,
  Check,
  X,
  Trash2,
  Copy,
  Volume2,
  VolumeX,
  RotateCw,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  FileText,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SettingsService } from '../services/settingsService';
import { VoiceDictationSession } from '../services/audioService';

let msgIdSeq = 0;
function createUniqueMsgId(prefix: string): string {
  msgIdSeq += 1;
  return `${prefix}-${Date.now()}-${msgIdSeq}-${Math.random().toString(36).slice(2, 7)}`;
}

function getDynamicSampleQuestions(subject: string, grade: string): string[] {
  const normSubject = subject.toLowerCase().trim();
  const normGrade = grade.toLowerCase().trim();

  if (
    normSubject.includes('math') ||
    normSubject.includes('algebra') ||
    normSubject.includes('geometry') ||
    normSubject.includes('trig') ||
    normSubject.includes('calculus') ||
    normSubject.includes('arithmetic')
  ) {
    if (
      normGrade.includes('10') ||
      normGrade.includes('11') ||
      normGrade.includes('12') ||
      normGrade.includes('high')
    ) {
      return [
        `Solve a quadratic equation step-by-step for ${grade} Math.`,
        `Explain trigonometric ratios (sin, cos, tan) and how to remember them.`,
        `What is coordinate geometry? Solve an example problem.`,
        `Explain the concept of Arithmetic Progression (AP) with formulas.`,
      ];
    }
    return [
      `Explain fractions and decimals with easy real-life examples.`,
      `How do we find the area and perimeter of a circle?`,
      `What are rational numbers? Provide 3 examples.`,
      `Factorise x² + 5x + 6 and explain algebraic factoring.`,
    ];
  }

  if (
    normSubject.includes('physics') ||
    normSubject.includes('mechanics') ||
    normSubject.includes('electricity') ||
    normSubject.includes('light')
  ) {
    return [
      `Explain Ohm's Law and the relationship between voltage, current, and resistance.`,
      `What are Newton's three laws of motion? Give daily life examples.`,
      `Explain reflection and refraction of light with key differences.`,
      `Explain kinetic energy and potential energy with their formulas.`,
    ];
  }

  if (
    normSubject.includes('chemistry') ||
    normSubject.includes('chemical') ||
    normSubject.includes('acid')
  ) {
    return [
      `What is the difference between ionic and covalent bonding?`,
      `Explain how to balance chemical equations with a simple guide.`,
      `What are acids, bases, and salts? How is pH measured?`,
      `Explain the modern periodic table structure and its trends.`,
    ];
  }

  if (
    normSubject.includes('biology') ||
    normSubject.includes('bio') ||
    normSubject.includes('botany') ||
    normSubject.includes('zoology') ||
    normSubject.includes('plant') ||
    normSubject.includes('animal')
  ) {
    return [
      `Explain the process of photosynthesis and its chemical equation.`,
      `What is the difference between animal cells and plant cells?`,
      `Explain the structure and function of DNA and RNA.`,
      `Describe cell division: Mitosis vs Meiosis.`,
    ];
  }

  if (
    normSubject.includes('social') ||
    normSubject.includes('history') ||
    normSubject.includes('geography') ||
    normSubject.includes('civics') ||
    normSubject.includes('political') ||
    normSubject.includes('economics') ||
    normSubject.includes('sst')
  ) {
    return [
      `What are the core features of the Indian Constitution?`,
      `Explain the causes and impact of the French Revolution.`,
      `What is the difference between renewable and non-renewable resources?`,
      `Explain the water cycle and its importance to Earth's climate.`,
    ];
  }

  if (
    normSubject.includes('english') ||
    normSubject.includes('lang') ||
    normSubject.includes('grammar') ||
    normSubject.includes('literature') ||
    normSubject.includes('writing')
  ) {
    return [
      `Explain active and passive voice with clear practice examples.`,
      `What is the difference between a metaphor and a simile?`,
      `How do I write a compelling essay introduction and conclusion?`,
      `Explain tense rules in English grammar (Present, Past, Future).`,
    ];
  }

  if (
    normSubject.includes('computer') ||
    normSubject.includes('coding') ||
    normSubject.includes('programming') ||
    normSubject.includes('python') ||
    normSubject.includes('java') ||
    normSubject.includes('html') ||
    normSubject.includes('css') ||
    normSubject.includes('javascript') ||
    normSubject.includes('js')
  ) {
    return [
      `What are the four pillars of Object-Oriented Programming (OOP)?`,
      `Explain the difference between a list (array) and a dictionary (hashmap).`,
      `What is database normalization? Why is it important?`,
      `How does binary search work and what is its time complexity?`,
    ];
  }

  const capSubject = subject
    ? subject.charAt(0).toUpperCase() + subject.slice(1)
    : 'General Studies';
  return [
    `What are the most important fundamental concepts in ${capSubject} for ${grade}?`,
    `Explain a tricky chapter from my ${grade} ${capSubject} syllabus.`,
    `Give me a quick practice question from ${capSubject} to test my understanding.`,
    `Explain a real-world application of ${capSubject} that we see every day.`,
  ];
}

/**
 * Derives a clean, descriptive AI Session title based on user questions in the chat
 */
export function generateSessionTitleFromChat(
  messages: ChatMessage[],
  fallbackSubject: string = 'Science',
  fallbackGrade: string = '10th'
): string {
  const userMessages = messages.filter(
    (m) => m.role === 'user' && m.text && m.text.trim().length > 0
  );
  if (userMessages.length === 0) {
    return `${fallbackSubject} (${fallbackGrade})`;
  }

  const firstUserText = userMessages[0].text.trim();

  if (
    firstUserText.startsWith('Examine and explain this attached image/file') ||
    firstUserText.startsWith('[Binary File')
  ) {
    return `File Analysis • ${fallbackSubject}`;
  }

  let cleaned = firstUserText
    .replace(/^([#*`\s]+)/, '')
    .replace(
      /^(can you |could you |please |help me |i want to learn |i need help with |explain |what is |what are |tell me about |how do (i|we)|how does |solve |teach me |guide me on |discuss |give me |define |summarize |write a |show me )\s*/i,
      ''
    )
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
        return generateSessionTitleFromChat(
          userMessages.slice(1),
          fallbackSubject,
          fallbackGrade
        );
      }
    }
    return `${fallbackSubject} Study Session`;
  }

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  if (cleaned.length > 44) {
    const truncated = cleaned.substring(0, 44);
    const lastSpace = truncated.lastIndexOf(' ');
    cleaned = lastSpace > 22 ? `${truncated.substring(0, lastSpace)}...` : `${truncated}...`;
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
  onSaveSession: (
    messages: ChatMessage[],
    sessionTitle?: string,
    sessionId?: string,
    isEndingSession?: boolean
  ) => void;
  initialMessages?: ChatMessage[];
  onSharePublicLink?: (type: string, title: string, content: any) => Promise<void> | void;
  recentSessions?: any[];
  fullHistory?: any[];
  activeSessionId?: string | null;
  onSelectSession?: (id: string | null) => void;
  onCreateQuiz?: () => void;
  onDeleteSession?: (sessionId: string) => Promise<void> | void;
  onNewSession?: () => void;
  onBackToDashboard?: () => void;
  userId?: string;
  currentTheme?: string;
  onNavigateToNotes?: (imageInfo?: { url: string; prompt: string }) => void;
}

interface ExtendedChatMessage extends ChatMessage {
  id: string;
  isStreaming?: boolean;
  liked?: boolean;
  disliked?: boolean;
  suggestions?: string[];
}

function normalizeAndDedupeMessages(rawMsgs: any[]): ExtendedChatMessage[] {
  const seen = new Set<string>();
  const result: ExtendedChatMessage[] = [];
  rawMsgs.forEach((m, idx) => {
    if (!m) return;
    let id = typeof m.id === 'string' && m.id.trim().length > 0 ? m.id : createUniqueMsgId(`msg-${idx}`);
    if (seen.has(id)) {
      id = createUniqueMsgId(`msg-dup-${idx}`);
    }
    seen.add(id);
    result.push({
      id,
      role: m.role === 'user' ? 'user' : 'model',
      text: typeof m.text === 'string' ? m.text : '',
      images: Array.isArray(m.images) ? m.images : undefined,
      timestamp: typeof m.timestamp === 'number' ? m.timestamp : Date.now(),
      suggestions: Array.isArray(m.suggestions) ? m.suggestions : undefined,
      liked: Boolean(m.liked),
      disliked: Boolean(m.disliked),
      isStreaming: false,
    });
  });
  return result;
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
    onDeleteSession,
    onNewSession,
    onBackToDashboard,
  } = props;

  const { subject, grade, sampleQuestions } = useMemo(() => {
    const settings = SettingsService.getSettings();
    const sub = settings.learning.preferredSubject || 'Science';
    const grd = settings.learning.grade || '10th';
    return {
      subject: sub,
      grade: grd,
      sampleQuestions: getDynamicSampleQuestions(sub, grd),
    };
  }, []);

  // Deduplicate recent sessions to guarantee unique React keys in sidebar history
  const uniqueRecentSessions = useMemo(() => {
    if (!Array.isArray(recentSessions)) return [];
    const seen = new Set<string>();
    return recentSessions.filter((s) => {
      if (!s?.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [recentSessions]);

  // Collapsible left sidebar (open on desktop by default, closed on mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });

  // Stable session identifier
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    if (activeSessionId) return activeSessionId;
    try {
      const saved = localStorage.getItem('sjtutor_active_chat_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.sessionId && Array.isArray(parsed?.messages) && parsed.messages.length > 1) {
          return parsed.sessionId;
        }
      }
    } catch {
      // ignore
    }
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  });

  const [sessionTitle, setSessionTitle] = useState<string>(() => {
    if (activeSessionId && recentSessions) {
      const found = recentSessions.find((s) => s.id === activeSessionId);
      if (found?.title) return found.title;
    }
    try {
      const saved = localStorage.getItem('sjtutor_active_chat_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.sessionTitle && Array.isArray(parsed?.messages) && parsed.messages.length > 1) {
          return parsed.sessionTitle;
        }
      }
    } catch {
      // ignore
    }
    return `${subject} (${grade})`;
  });

  const createWelcomeMessage = useCallback(
    (): ExtendedChatMessage => ({
      id: createUniqueMsgId('msg-welcome'),
      role: 'model',
      text: `Hi! I'm **SJ Tutor AI**. I'm ready to help with your **${grade} Grade ${subject}** studies. Ask me anything to get started.`,
      timestamp: Date.now(),
    }),
    [grade, subject]
  );

  const [messages, setMessages] = useState<ExtendedChatMessage[]>(() => {
    if (activeSessionId && initialMessages && initialMessages.length > 0) {
      return normalizeAndDedupeMessages(initialMessages);
    }
    if (activeSessionId && recentSessions && recentSessions.length > 0) {
      const matched = recentSessions.find((s) => s.id === activeSessionId);
      if (matched?.content?.messages?.length > 0) {
        return normalizeAndDedupeMessages(matched.content.messages);
      }
    }
    try {
      const saved = localStorage.getItem('sjtutor_active_chat_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.messages) && parsed.messages.length > 1) {
          return normalizeAndDedupeMessages(parsed.messages);
        }
      }
    } catch {
      // ignore
    }
    return [createWelcomeMessage()];
  });

  const messagesRef = useRef<ExtendedChatMessage[]>(messages);
  const currentSessionIdRef = useRef<string>(currentSessionId);
  const sessionTitleRef = useRef<string>(sessionTitle);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    sessionTitleRef.current = sessionTitle;
  }, [sessionTitle]);

  // Sync messages when external activeSessionId changes
  useEffect(() => {
    if (activeSessionId && activeSessionId !== currentSessionIdRef.current) {
      setCurrentSessionId(activeSessionId);
      currentSessionIdRef.current = activeSessionId;
      const matched = recentSessions?.find((s) => s.id === activeSessionId);
      if (matched?.title) {
        setSessionTitle(matched.title);
        sessionTitleRef.current = matched.title;
      }
      const rawMsgs = Array.isArray(matched?.content?.messages)
        ? matched.content.messages
        : Array.isArray(matched?.content)
        ? matched.content
        : initialMessages && initialMessages.length > 0
        ? initialMessages
        : null;

      if (rawMsgs && rawMsgs.length > 0) {
        const cleaned = normalizeAndDedupeMessages(rawMsgs);
        messagesRef.current = cleaned;
        setMessages(cleaned);
      }
    }
  }, [activeSessionId, initialMessages, recentSessions]);

  // Auto-save active chat silently in background
  const performAutoSave = useCallback(
    (msgs: ExtendedChatMessage[]) => {
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
      } catch {
        // ignore quota errors
      }

      onSaveSession(msgs, derivedTitle, currentSessionIdRef.current);
    },
    [subject, grade, onSaveSession]
  );

  useEffect(() => {
    if (messages.length > 1) {
      const timer = setTimeout(() => {
        performAutoSave(messages);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, performAutoSave]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (messagesRef.current.length > 1) {
        performAutoSave(messagesRef.current);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [performAutoSave]);

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
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [subject, grade]);

  // Input & generation states
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<'thinking' | 'generating' | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

  // Voice dictation states
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [autoSendVoice, setAutoSendVoice] = useState(true);
  const initialInputRef = useRef('');
  const currentInputRef = useRef('');
  const autoSendVoiceRef = useRef(true);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSessionRef = useRef<VoiceDictationSession | null>(null);

  // Editing user prompt states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Refs for streaming and scrolling
  const isGeneratingRef = useRef<boolean>(false);
  const currentStreamIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    currentInputRef.current = input;
  }, [input]);

  useEffect(() => {
    autoSendVoiceRef.current = autoSendVoice;
  }, [autoSendVoice]);

  // Auto-resize composer textarea cleanly like ChatGPT
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 120);
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, thinkingStep, showScrollButton]);

  // Recording stopwatch
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isListening) {
      setRecordingDuration(0);
      timer = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isListening]);

  // Cleanup voice & speech on unmount
  useEffect(() => {
    return () => {
      if (voiceSessionRef.current) {
        voiceSessionRef.current.stop().catch(() => {});
        voiceSessionRef.current = null;
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
    };
  }, []);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSpeech = (messageId: string, text: string) => {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        setVoiceError('Text-to-speech is not supported in this browser.');
        return;
      }
      if (speakingMessageId === messageId) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      } else {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/[#*_~`[\]()]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);
        setSpeakingMessageId(messageId);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      setSpeakingMessageId(null);
    }
  };

  const handleLoadExistingSession = (session: any) => {
    if (!session) return;
    if (isGeneratingRef.current) {
      isGeneratingRef.current = false;
      setIsTyping(false);
      setThinkingStep(null);
    }
    setCurrentSessionId(session.id);
    currentSessionIdRef.current = session.id;
    const nextTitle = session.title || `${subject} (${grade})`;
    setSessionTitle(nextTitle);
    sessionTitleRef.current = nextTitle;

    const rawMsgs = Array.isArray(session.content?.messages)
      ? session.content.messages
      : Array.isArray(session.content)
      ? session.content
      : [];

    const cleaned = rawMsgs.length > 0 ? normalizeAndDedupeMessages(rawMsgs) : [createWelcomeMessage()];
    messagesRef.current = cleaned;
    setMessages(cleaned);

    if (onSelectSession) onSelectSession(session.id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleStartNewSession = () => {
    const hadConversation = messagesRef.current.length > 1;

    if (isGeneratingRef.current) {
      isGeneratingRef.current = false;
      setIsTyping(false);
      setThinkingStep(null);
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    setSpeakingMessageId(null);
    setError(null);
    setVoiceError(null);
    setInput('');
    setAttachedFiles([]);

    if (hadConversation) {
      const derivedTitle = generateSessionTitleFromChat(messagesRef.current, subject, grade);
      onSaveSession(messagesRef.current, derivedTitle, currentSessionIdRef.current, true);
    }

    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    currentSessionIdRef.current = newId;
    setCurrentSessionId(newId);

    const defaultTitle = `${subject} (${grade})`;
    sessionTitleRef.current = defaultTitle;
    setSessionTitle(defaultTitle);

    const freshWelcome: ExtendedChatMessage[] = [createWelcomeMessage()];
    messagesRef.current = freshWelcome;
    setMessages(freshWelcome);

    try {
      localStorage.removeItem('sjtutor_active_chat_state');
    } catch {
      // ignore
    }

    if (onSelectSession) onSelectSession(null);
    if (onNewSession) onNewSession();
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    textareaRef.current?.focus();
  };

  // File attachment handlers
  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isImg =
        file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isText =
        file.type.startsWith('text/') ||
        /\.(csv|json|js|ts|tsx|jsx|py|java|cpp|c|css|html|md)$/i.test(file.name);

      if (isImg || isPdf) {
        reader.onloadend = () => {
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type,
              dataUrl: reader.result as string,
              size: file.size,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else if (isText) {
        reader.onloadend = () => {
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type,
              dataUrl: '',
              textContent: reader.result as string,
              size: file.size,
            },
          ]);
        };
        reader.readAsText(file);
      } else {
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            dataUrl: '',
            textContent: `[Binary File ${file.name} - Size ${file.size} bytes]`,
            size: file.size,
          },
        ]);
      }
    });
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

  const generateSmartSuggestionsForTopic = (query: string, reply: string): string[] => {
    const q = query.toLowerCase();
    const suggestions = ['Explain more simply', 'Give a real-life example', 'Quiz me on this'];
    if (q.includes('math') || q.includes('formula') || reply.includes('=')) {
      suggestions.push('Solve another example');
    } else if (q.includes('code') || q.includes('program') || reply.includes('```')) {
      suggestions.push('Explain line-by-line');
    } else if (reply.length > 500) {
      suggestions.push('Summarize in 3 key points');
    }
    return suggestions.slice(0, 3);
  };

  const handleStopGenerating = () => {
    isGeneratingRef.current = false;
    setIsTyping(false);
    setThinkingStep(null);
    setMessages((prev) =>
      prev.map((m) => (m.id === currentStreamIdRef.current ? { ...m, isStreaming: false } : m))
    );
  };

  // Core AI streaming logic
  const sendMessageToAi = async (textToSend: string, isRegeneratingMessageId?: string) => {
    if (isGeneratingRef.current && !isRegeneratingMessageId) return;
    setError(null);

    const success = onDeductCredit(1);
    if (!success) {
      setError('Insufficient credits. Please claim a reward or complete a study cycle.');
      return;
    }

    const activeFiles = [...attachedFiles];
    setAttachedFiles([]);

    const userMessageId = createUniqueMsgId('msg-user');
    const modelMessageId = isRegeneratingMessageId || createUniqueMsgId('msg-model');
    currentStreamIdRef.current = modelMessageId;

    if (!isRegeneratingMessageId) {
      const imgUrls = activeFiles
        .filter((f) => f.type.startsWith('image/') || f.dataUrl.startsWith('data:image/'))
        .map((f) => f.dataUrl)
        .filter(Boolean);
      const displayText =
        textToSend.trim() ||
        (activeFiles.length > 0 ? 'Examine and explain this attached image/file' : '');
      const newUserMsg: ExtendedChatMessage = {
        id: userMessageId,
        role: 'user',
        text: displayText,
        images: imgUrls.length > 0 ? imgUrls : undefined,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== userMessageId), newUserMsg]);
    }

    setIsTyping(true);
    isGeneratingRef.current = true;
    setThinkingStep('thinking');

    if (isRegeneratingMessageId) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === isRegeneratingMessageId ? { ...m, text: '', isStreaming: true } : m
        )
      );
    } else {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== modelMessageId),
        {
          id: modelMessageId,
          role: 'model',
          text: '',
          isStreaming: true,
          timestamp: Date.now(),
        },
      ]);
    }

    try {
      const imgDataList = activeFiles
        .filter((f) => f.type.startsWith('image/'))
        .map((f) => f.dataUrl);

      const activeHistory = messagesRef.current.filter(
        (m) =>
          m.id !== modelMessageId &&
          m.id !== userMessageId &&
          (isRegeneratingMessageId ? m.id !== isRegeneratingMessageId : true) &&
          !m.isStreaming
      );

      let userContext = '';
      if (fullHistory && fullHistory.length > 0) {
        userContext = fullHistory
          .slice(0, 10)
          .map((h: any) => {
            let summary = `- ${new Date(h.timestamp).toLocaleDateString()}: ${h.title} (${h.type})`;
            if (h.type === 'Tutor Chat' && h.content?.messages) {
              const msgs = h.content.messages.filter(
                (m: any) => m.text && typeof m.text === 'string'
              );
              const userMsg = msgs.find((m: any) => m.role === 'user');
              if (userMsg) summary += ` | Query: ${userMsg.text.substring(0, 100)}`;
            }
            return summary;
          })
          .join('\n');
      }

      setThinkingStep('generating');
      const stream = await GeminiService.chatWithTutorStream(
        textToSend,
        activeHistory,
        imgDataList,
        activeFiles,
        userContext
      );
      setThinkingStep(null);

      let accumulatedText = '';
      for await (const chunk of stream) {
        if (!isGeneratingRef.current) break;
        setThinkingStep(null);
        accumulatedText += chunk.text || '';

        setMessages((prev) =>
          prev.map((m) => (m.id === modelMessageId ? { ...m, text: accumulatedText } : m))
        );
      }

      if (!accumulatedText.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId
              ? {
                  ...m,
                  text: 'Something went wrong while generating the reply. Please try again.',
                  isStreaming: false,
                }
              : m
          )
        );
      } else {
        const smartSuggestions = generateSmartSuggestionsForTopic(textToSend, accumulatedText);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === modelMessageId
              ? {
                  ...m,
                  text: accumulatedText,
                  isStreaming: false,
                  suggestions: smartSuggestions,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      console.error('Streaming error:', err);
      const rawMsg = String(err?.message || err || '');
      const errorText =
        rawMsg.includes('API key not valid') || rawMsg.includes('API_KEY_MISSING')
          ? 'Server AI configuration issue. Please try again shortly.'
          : 'Something went wrong while contacting SJ Tutor AI. Please try again.';

      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMessageId ? { ...m, text: errorText, isStreaming: false } : m
        )
      );
    } finally {
      setIsTyping(false);
      setThinkingStep(null);
      isGeneratingRef.current = false;
    }
  };

  const toggleVoiceInput = async () => {
    setVoiceError(null);

    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsListening(false);

      if (voiceSessionRef.current) {
        try {
          const transcribed = await voiceSessionRef.current.stop();
          if (transcribed) {
            setInput((prev) => {
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
        } catch {
          // ignore stop error
        }
        voiceSessionRef.current = null;
      }
      setInterimTranscript('');
    } else {
      initialInputRef.current = input;
      setInterimTranscript('');

      try {
        const session = new VoiceDictationSession({
          language: 'English',
          onInterim: (text) => setInterimTranscript(text),
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
          onRecordingStateChange: (rec) => setIsListening(rec),
        });

        voiceSessionRef.current = session;
        await session.start();
        setIsListening(true);
      } catch (err: any) {
        setVoiceError(
          err.message ||
            'Microphone access is unavailable. Please grant microphone permissions to use voice dictation.'
        );
        setIsListening(false);
      }
    }
  };

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isTyping) return;
    sendMessageToAi(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const handleRegenerate = (id: string) => {
    const idx = messages.findIndex((m) => m.id === id);
    if (idx === -1) return;
    let lastUserPrompt = '';
    for (let i = idx; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserPrompt = messages[i].text;
        break;
      }
    }
    if (!lastUserPrompt) return;
    sendMessageToAi(lastUserPrompt, id);
  };

  const handleReaction = (id: string, type: 'like' | 'dislike') => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        return type === 'like'
          ? { ...m, liked: !m.liked, disliked: false }
          : { ...m, disliked: !m.disliked, liked: false };
      })
    );
  };

  const startEditingPrompt = (msg: ExtendedChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  const handleSaveEditedPrompt = (id: string) => {
    if (!editingText.trim()) return;
    setEditingMessageId(null);
    const msgIndex = messages.findIndex((m) => m.id === id);
    if (msgIndex === -1) return;
    const sliceHistory = messages.slice(0, msgIndex);
    setMessages(sliceHistory);
    sendMessageToAi(editingText);
  };

  const hasConversation = messages.some((m) => m.role === 'user');
  const visibleMessages = hasConversation
    ? messages.filter((m, idx) => !(idx === 0 && m.role === 'model' && m.id.startsWith('msg-welcome')))
    : [];

  return (
    <div
      onDragOver={handleDragOver}
      className="fixed inset-0 z-[90] h-[100dvh] w-screen bg-white dark:bg-[#212121] text-slate-900 dark:text-slate-100 flex overflow-hidden font-sans"
    >
      {/* Drag & Drop File Overlay */}
      {isDragOver && (
        <div
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="fixed inset-0 bg-slate-900/15 dark:bg-black/40 backdrop-blur-xs z-50 flex flex-col items-center justify-center border-2 border-dashed border-slate-500 dark:border-slate-400 m-4 rounded-2xl"
        >
          <Paperclip className="w-12 h-12 text-slate-800 dark:text-white mb-3" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Drop files to attach</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Images, PDFs, code, or text documents
          </p>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Collapsible ChatGPT-Style Left Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-[#f9f9f9] dark:bg-[#171717] border-r border-slate-200/80 dark:border-white/10 transition-all duration-200 ease-out overflow-hidden shrink-0 ${
          isSidebarOpen
            ? 'w-[260px] translate-x-0'
            : 'w-[260px] -translate-x-full lg:w-0 lg:translate-x-0 lg:border-r-0'
        }`}
      >
        <div className="w-[260px] h-full flex flex-col">
          {/* Sidebar Top Row: Collapse + New Chat */}
          <div className="h-13 px-3 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleStartNewSession}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="New chat"
              aria-label="New chat"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          </div>

          {/* Primary New Chat Action */}
          <div className="px-2.5 pb-2">
            <button
              type="button"
              onClick={handleStartNewSession}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                <Logo className="w-full h-full" iconOnly noBorder />
              </div>
              <span>New chat</span>
            </button>
          </div>

          {/* Chat History List */}
          <div className="px-3.5 pt-3 pb-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Chats
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
            {uniqueRecentSessions.length > 0 ? (
              uniqueRecentSessions.map((session) => {
                const isActive =
                  session.id === activeSessionId ||
                  (hasConversation && session.id === currentSessionId);
                return (
                  <div key={session.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleLoadExistingSession(session)}
                      className={`w-full text-left px-3 py-2 pr-8 rounded-lg text-[13px] transition-colors flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-slate-200/80 dark:bg-white/12 text-slate-900 dark:text-white font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/8'
                      }`}
                      title={session.title || 'Untitled chat'}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{session.title || 'Untitled chat'}</span>
                    </button>

                    {onDeleteSession && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            session.id === currentSessionIdRef.current ||
                            session.id === activeSessionId
                          ) {
                            messagesRef.current = [];
                            try {
                              localStorage.removeItem('sjtutor_active_chat_state');
                            } catch {
                              // ignore
                            }
                            handleStartNewSession();
                          }
                          onDeleteSession(session.id);
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/80 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500">
                Your recent study chats will appear here.
              </p>
            )}
          </div>

          {/* Sidebar Footer: Context + Back to Dashboard */}
          <div className="p-2.5 border-t border-slate-200/80 dark:border-white/10 space-y-1 shrink-0">
            <div className="px-3 py-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {subject} · {grade}
            </div>
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Full-Screen Chat Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-white dark:bg-[#212121]">
        {/* Minimal ChatGPT-style Top Edge */}
        <header className="h-13 px-3 sm:px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {!isSidebarOpen && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Open sidebar"
                  aria-label="Open sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleStartNewSession}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="New chat"
                  aria-label="New chat"
                >
                  <SquarePen className="w-4 h-4" />
                </button>
              </>
            )}
            <span className="px-2 text-[15px] font-semibold tracking-tight text-slate-800 dark:text-slate-100 truncate">
              SJ Tutor AI
            </span>
          </div>

          {!isSidebarOpen && onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}
        </header>

        {/* Scrollable Conversation Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          {!hasConversation && !isTyping && !thinkingStep ? (
            /* Centered ChatGPT-Style Empty State */
            <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
              <div className="w-full max-w-2xl flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 shadow-xs mb-5 flex items-center justify-center">
                  <Logo className="w-full h-full" iconOnly noBorder />
                </div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  What can I help you learn today?
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {grade} Grade · {subject}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  {sampleQuestions.map((q, idx) => (
                    <button
                      key={`sample-${idx}`}
                      type="button"
                      onClick={() => sendMessageToAi(q)}
                      className="text-left p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/12 bg-white dark:bg-[#2a2a2a]/60 hover:bg-slate-50 dark:hover:bg-[#2f2f2f] text-[13px] leading-snug text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-start justify-between gap-2 group"
                    >
                      <span>{q}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Clean Centered Thread */
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pt-4 pb-10 space-y-6">
              {visibleMessages.map((msg, msgIdx) => {
                const isUser = msg.role === 'user';
                const isLastModelMessage =
                  !isUser && msgIdx === visibleMessages.length - 1;

                return (
                  <div
                    key={msg.id}
                    className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {isUser ? (
                      /* User Message Bubble (ChatGPT style) */
                      <div className="flex flex-col items-end max-w-[85%] sm:max-w-[78%] group">
                        {editingMessageId === msg.id ? (
                          <div className="w-full min-w-[280px] sm:min-w-[420px] bg-slate-100 dark:bg-[#2f2f2f] border border-slate-200 dark:border-white/15 p-3.5 rounded-2xl flex flex-col gap-2.5">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full text-[15px] outline-none bg-transparent resize-none text-slate-900 dark:text-white leading-relaxed"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => setEditingMessageId(null)}
                                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 font-medium cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditedPrompt(msg.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium hover:opacity-90 cursor-pointer"
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-slate-100 dark:bg-[#2f2f2f] text-slate-900 dark:text-slate-100 rounded-3xl px-5 py-3 text-[15px] leading-relaxed">
                              {msg.images && msg.images.length > 0 && (
                                <div className="mb-2.5 flex flex-wrap gap-2">
                                  {msg.images.map((img, i) => (
                                    <img
                                      key={`${msg.id}-img-${i}`}
                                      src={img}
                                      alt="Attachment"
                                      onClick={() => setEnlargedImageUrl(img)}
                                      className="max-h-56 rounded-xl object-contain border border-slate-200/80 dark:border-white/10 cursor-pointer"
                                    />
                                  ))}
                                </div>
                              )}
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => startEditingPrompt(msg)}
                              className="mt-1 mr-2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Edit message"
                              aria-label="Edit message"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      /* AI Tutor Message Row (Borderless ChatGPT prose style) */
                      <div className="flex items-start gap-3.5 w-full min-w-0">
                        <div className="w-7 h-7 mt-0.5 rounded-full overflow-hidden border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
                          <Logo className="w-full h-full" iconOnly noBorder />
                        </div>

                        <div className="flex-1 min-w-0">
                          {msg.isStreaming && !msg.text ? (
                            <div className="flex items-center gap-2 py-2 text-sm text-slate-500 dark:text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-pulse" />
                              <span>
                                {thinkingStep === 'thinking' ? 'Thinking...' : 'Generating...'}
                              </span>
                            </div>
                          ) : (
                            <div className="markdown-body text-[15px] leading-7 text-slate-800 dark:text-slate-100 [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-slate-200 dark:[&_pre]:border-white/10 [&_pre]:overflow-x-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                              {msg.isStreaming && (
                                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-slate-700 dark:bg-slate-200 animate-pulse rounded-xs" />
                              )}
                            </div>
                          )}

                          {/* Quiet ChatGPT-style micro action bar */}
                          {!msg.isStreaming && msg.text && (
                            <div className="mt-2 flex items-center gap-0.5 text-slate-400 dark:text-slate-500">
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.text)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title={copiedId === msg.id ? 'Copied' : 'Copy'}
                                aria-label="Copy response"
                              >
                                {copiedId === msg.id ? (
                                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSpeech(msg.id, msg.text)}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                  speakingMessageId === msg.id
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title={speakingMessageId === msg.id ? 'Stop reading' : 'Read aloud'}
                                aria-label="Read aloud"
                              >
                                {speakingMessageId === msg.id ? (
                                  <VolumeX className="w-4 h-4" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReaction(msg.id, 'like')}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                  msg.liked
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title="Good response"
                                aria-label="Good response"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReaction(msg.id, 'dislike')}
                                className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                                  msg.disliked
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                                title="Needs improvement"
                                aria-label="Needs improvement"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRegenerate(msg.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title="Regenerate response"
                                aria-label="Regenerate response"
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Lightweight Follow-up Prompts on Latest Reply */}
                          {isLastModelMessage &&
                            !msg.isStreaming &&
                            msg.suggestions &&
                            msg.suggestions.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {msg.suggestions.map((suggestion, sIdx) => (
                                  <button
                                    key={`${msg.id}-sug-${sIdx}`}
                                    type="button"
                                    onClick={() => sendMessageToAi(suggestion)}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/12 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Scroll-to-bottom button centered above composer */}
        <AnimatePresence>
          {showScrollButton && hasConversation && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={scrollToBottom}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 p-2 rounded-full bg-white dark:bg-[#2f2f2f] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 shadow-md hover:bg-slate-50 dark:hover:bg-[#3a3a3a] transition-colors cursor-pointer"
              title="Scroll to bottom"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Centered ChatGPT-Style Bottom Composer */}
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-4 pt-2 shrink-0">
          {/* Error Banner */}
          {error && (
            <div className="mb-2.5 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Voice Error Banner */}
          {voiceError && (
            <div className="mb-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{voiceError}</span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Voice Dictation Bar */}
          {isListening && (
            <div className="mb-2.5 px-4 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="font-semibold text-rose-700 dark:text-rose-300">
                  Listening · <span className="font-mono tabular-nums">{formatDuration(recordingDuration)}</span>
                </span>
                {interimTranscript && (
                  <span className="text-slate-600 dark:text-slate-300 italic truncate max-w-[260px]">
                    &ldquo;{interimTranscript}&rdquo;
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSendVoice}
                    onChange={(e) => setAutoSendVoice(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Auto-send</span>
                </label>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 cursor-pointer"
                >
                  Stop
                </button>
              </div>
            </div>
          )}

          {/* Unified Composer Shell */}
          <div className="bg-slate-100 dark:bg-[#2f2f2f] border border-slate-200/80 dark:border-white/10 rounded-3xl px-3.5 py-2.5 shadow-xs focus-within:border-slate-300 dark:focus-within:border-white/25 transition-colors">
            {/* Attached Files Strip */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2.5 mb-2 border-b border-slate-200/70 dark:border-white/10">
                {attachedFiles.map((file, fIdx) => (
                  <div
                    key={`file-${file.name}-${fIdx}`}
                    className="flex items-center gap-2 bg-white dark:bg-[#212121] px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200"
                  >
                    {file.type.startsWith('image/') ? (
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="w-5 h-5 rounded object-cover"
                      />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(fIdx)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      aria-label="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFilesSelected(e.target.files)}
              multiple
              className="hidden"
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening...' : 'Message SJ Tutor AI'}
              rows={1}
              disabled={isTyping || thinkingStep !== null}
              className="w-full bg-transparent outline-none resize-none text-[15px] leading-6 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 max-h-[180px] px-1 py-1"
            />

            <div className="flex items-center justify-between pt-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTyping || thinkingStep !== null}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
                  title="Attach file or image"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={isTyping || thinkingStep !== null}
                  className={`p-2 rounded-full transition-colors disabled:opacity-40 cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'text-slate-500 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10'
                  }`}
                  title={isListening ? 'Stop voice input' : 'Voice dictation'}
                  aria-label="Voice dictation"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {isTyping || thinkingStep !== null ? (
                <button
                  type="button"
                  onClick={handleStopGenerating}
                  className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer"
                  title="Stop generating"
                  aria-label="Stop generating"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() && attachedFiles.length === 0}
                  className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer"
                  title="Send message"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            SJ Tutor AI can make mistakes. Check important study details.
          </p>
        </div>
      </div>

      {/* Lightweight Image Lightbox */}
      {enlargedImageUrl && (
        <div
          onClick={() => setEnlargedImageUrl(null)}
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setEnlargedImageUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={enlargedImageUrl}
            alt="Full preview"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default TutorChat;
