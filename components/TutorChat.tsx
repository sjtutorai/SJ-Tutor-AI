
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, SJTUTOR_AVATAR } from '../types';
import { GeminiService } from '../services/geminiService';
import { Send, User as UserIcon, Loader2, Mic, MicOff, Sparkles, AlertCircle, ExternalLink, Share2, Save, Check, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Chat, GenerateContentResponse } from "@google/genai";

const SAMPLE_QUESTIONS = [
  "What is the difference between weather and climate?",
  "Explain the process of photosynthesis in plants.",
  "What are natural resources? Name any four.",
  "Define force. What are its different effects?",
  "What is the Indian Constitution and why is it important?",
  "Explain the water cycle with the help of a diagram (description).",
  "What are rational numbers? Give two examples.",
  "Who was Mahatma Gandhi? Write any four of his contributions to India.",
  "What is soil erosion? Mention two methods to prevent it.",
  "Explain the difference between renewable and non-renewable resources."
];

interface TutorChatProps {
  onDeductCredit: (amount: number) => boolean;
  currentCredits: number;
  onSaveSession: (messages: ChatMessage[]) => void;
  initialMessages?: ChatMessage[];
}

const TutorChat: React.FC<TutorChatProps> = ({ onDeductCredit, currentCredits, onSaveSession, initialMessages }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || [
    {
      role: 'model',
      text: "Hi there! I'm SJ Tutor AI. I can help you understand complex topics, solve problems, or just clarify your doubts. What are we studying today?",
      timestamp: Date.now()
    }
  ]);
  
  const messagesRef = useRef<ChatMessage[]>(messages);
  const [isSaved, setIsSaved] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-save on unmount
  useEffect(() => {
    return () => {
      if (messagesRef.current.length > 1) { // Don't save if only welcome message
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
  const [error, setError] = useState<string | null>(null);
  const [, setIsApiDisabled] = useState(false);
  
  // Web Speech API Voice States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakingIndex, setActiveSpeakingIndex] = useState<number | null>(null);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = GeminiService.createTutorChat();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up any ongoing speech synthesis or recognition on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.warn("Speech recognition cancel error:", e);
        }
      }
    };
  }, []);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      setActiveSpeakingIndex(null);
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          setInput(transcript);
          // If in hands-free mode, send immediately
          if (handsFreeMode) {
            sendMessageToAi(transcript);
            setInput('');
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Speech recognition fault: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      console.error("Speech recognition start failed:", e);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    setIsListening(false);
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const speakResponse = (text: string, index: number | null = null) => {
    if (!('speechSynthesis' in window)) {
      setError("Speech synthesis is not supported on this device/browser.");
      return;
    }

    // Stop speaking or listening first
    window.speechSynthesis.cancel();
    if (isListening) {
      stopListening();
    }

    // Process markdown to make speech synthesis cleaner
    const cleanText = text
      .trim()
      .replace(/```[\s\S]*?```/g, "[Code segment omitted]") // skip code blocks
      .replace(/[*#_`~-]/g, "") // remove formatting symbols
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // read link labels only

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';

    // Choose preferred voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en-US') && v.name.toLowerCase().includes('google')) || 
                    voices.find(v => v.lang.startsWith('en-US')) || 
                    voices.find(v => v.lang.startsWith('en')) || 
                    voices[0];
    if (enVoice) {
      utterance.voice = enVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (index !== null) {
        setActiveSpeakingIndex(index);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setActiveSpeakingIndex(null);
      // Wait a half-second then listen back automatically if handsFreeMode is enabled
      if (handsFreeMode) {
        setTimeout(() => {
          if (!isListening) {
            startListening();
          }
        }, 800);
      }
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      setIsSpeaking(false);
      setActiveSpeakingIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setActiveSpeakingIndex(null);
  };

  const toggleSpeakMessage = (text: string, index: number) => {
    if (isSpeaking && activeSpeakingIndex === index) {
      stopSpeaking();
    } else {
      speakResponse(text, index);
    }
  };

  const handleSave = () => {
    if (messages.length > 1) {
      onSaveSession(messages);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleShareChat = async () => {
    const transcript = messages.map(m => `${m.role === 'user' ? 'You' : 'SJ Tutor AI'}: ${m.text}`).join('\n\n');
    const shareData = {
        title: 'SJ Tutor AI Chat',
        text: `Check out my conversation with SJ Tutor AI:\n\n${transcript}`,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch {
            console.log("Share canceled");
        }
    } else {
        try {
            await navigator.clipboard.writeText(shareData.text);
            alert("Chat transcript copied to clipboard!");
        } catch {
            alert("Failed to copy chat.");
        }
    }
  };

  const sendMessageToAi = async (textToSend: string) => {
    if (!textToSend.trim() || !chatSessionRef.current) return;
    setError(null);

    // Credit Deduction Logic: 1 credit per question
    const cost = 1;
    if (!onDeductCredit(cost)) {
      setError("Insufficient credits! You need 1 credit per message in the Tutor Chat.");
      return;
    }

    const userMsg: ChatMessage = {
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const resultStream = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      
      let fullResponseText = '';
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);

      for await (const chunk of resultStream) {
        const responseChunk = chunk as GenerateContentResponse;
        const text = responseChunk.text;
        if (text) {
          fullResponseText += text;
          setMessages(prev => {
             const newArr = [...prev];
             newArr[newArr.length - 1].text = fullResponseText;
             return newArr;
          });
        }
      }

      // If hands-free mode is active, read the complete response out loud
      if (handsFreeMode) {
        // Safe reference model message index
        const currentModelMessageIndex = messagesRef.current.length - 1;
        speakResponse(fullResponseText, currentModelMessageIndex);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorText = "I'm sorry, I encountered an error. Please try asking again or check your connection.";
      let rawMsg = error.message || "";
      
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed.error?.message) rawMsg = parsed.error.message;
      } catch (e) {
        console.warn("Parsing failed", e);
      }

      if (rawMsg.includes("Generative Language API has not been used") || rawMsg.includes("PERMISSION_DENIED")) {
        setIsApiDisabled(true);
        errorText = "API_DISABLED_BLOCK";
      } else if (rawMsg.includes("API key not valid")) {
        errorText = "⚠️ Config Error: The API Key provided is invalid.";
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errorText, timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    sendMessageToAi(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Info */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SJ Tutor AI Session</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleSave} 
                className={`p-1 rounded transition-colors flex items-center gap-1 ${isSaved ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-primary-600 hover:bg-slate-100'}`} 
                title="Save Chat Session"
              >
                {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                {isSaved && <span className="text-[9px] font-bold">Saved</span>}
              </button>
              <button 
                onClick={handleShareChat} 
                className="p-1 text-slate-400 hover:text-primary-600 rounded hover:bg-slate-100 transition-colors" 
                title="Share Chat Transcript"
              >
                  <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Hands Free Voice Mode Selector */}
          <button 
            onClick={() => {
              const nextState = !handsFreeMode;
              setHandsFreeMode(nextState);
              if (nextState) {
                speakResponse("Hands free voice mode is active. I am listening for your questions!");
              } else {
                stopSpeaking();
                stopListening();
              }
            }}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-1 text-[10px] font-bold border ${
              handsFreeMode 
                ? 'border-red-200 bg-red-50 text-red-600 animate-pulse' 
                : 'border-slate-200 bg-white text-slate-500 hover:text-primary-600'
            }`}
            title="Hands-free Converse Mode: Speak questions and listen to answers hands-free"
          >
            <Mic className="w-2.5 h-2.5" />
            <span>{handsFreeMode ? "Speech Mode" : "Voice Mode"}</span>
          </button>

          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100 text-[10px] font-bold">
            <Sparkles className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
            1 Credit / Msg
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-100 flex-shrink-0">
                <img src={SJTUTOR_AVATAR} alt="AI" className="w-full h-full object-cover" />
              </div>
            )}
            
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 shadow-sm text-sm relative group/msg ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none'
              }`}
            >
              {msg.text === "API_DISABLED_BLOCK" ? (
                <div className="bg-red-50 border border-red-100 p-4 rounded-lg space-y-3">
                  <div className="flex items-start gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">API Not Enabled</p>
                      <p className="text-xs text-red-600">The &quot;Generative Language API&quot; needs to be enabled in your Google Cloud project.</p>
                    </div>
                  </div>
                  <a 
                    href="https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-red-600 text-white text-xs font-bold rounded-md hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Enable API Now
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : msg.role === 'model' ? (
                <div className="relative">
                  <div className="markdown-body pr-4">
                     <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  {msg.text && (
                    <div className="absolute top-0 right-[-8px] opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={() => toggleSpeakMessage(msg.text, idx)}
                        className={`p-1 rounded bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition ${
                          isSpeaking && activeSpeakingIndex === idx ? 'text-primary-600 animate-pulse bg-primary-50 border-primary-100' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title={isSpeaking && activeSpeakingIndex === idx ? "Stop narration" : "Speak text"}
                      >
                        {isSpeaking && activeSpeakingIndex === idx ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              )}
            </div>
 
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-slate-500" />
              </div>
            )}
          </div>
        ))}
        {isTyping && messages[messages.length - 1].role === 'user' && (
           <div className="flex gap-3 justify-start">
               <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-100 flex-shrink-0">
                <img src={SJTUTOR_AVATAR} alt="AI" className="w-full h-full object-cover" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl rounded-bl-none px-4 py-2.5 flex items-center">
                <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              </div>
           </div>
        )}
        
        {messages.length === 1 && !isTyping && (
          <div className="space-y-3 mt-4 ml-11">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Try a question:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessageToAi(q)}
                  className="text-left text-xs bg-white text-slate-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-primary-400 hover:bg-primary-50 transition-all shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-100">
        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-xs text-red-600 animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}
        <div className="relative flex items-center gap-2">
           <button
            onClick={toggleVoiceInput}
            className={`p-2.5 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            title="Voice Input"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening... speak now." : "Ask SJ Tutor AI anything..."}
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none text-sm max-h-32 text-slate-900 animate-none"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 p-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-1 flex justify-between px-1">
          <span className="text-[9px] text-slate-400 font-medium">1 message = 1 credit</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
            {isSpeaking && (
              <span className="flex gap-0.5 items-center justify-center mr-2 animate-pulse text-primary-500">
                <span className="w-1 h-2 bg-primary-500 rounded-full inline-block"></span>
                <span className="w-1 h-3 bg-primary-500 rounded-full inline-block animate-bounce delay-75"></span>
                <span className="w-1 h-2 bg-primary-500 rounded-full inline-block animate-bounce"></span>
                <span className="text-[9px] text-primary-600 font-medium ml-1">AI speaking</span>
              </span>
            )}
            Balance: {currentCredits}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;
