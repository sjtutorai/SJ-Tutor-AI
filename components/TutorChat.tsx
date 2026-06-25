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
  ExternalLink, 
  Share2, 
  Save, 
  Check, 
  Star, 
  Bookmark, 
  X, 
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';


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
  onSharePublicLink?: (type: string, title: string, content: any) => void;
}

const TutorChat: React.FC<TutorChatProps> = (props) => {
  const { onDeductCredit, onSaveSession, initialMessages } = props;
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || [
    {
      role: 'model',
      text: "Hi there! I'm SJ Tutor AI. I can help you understand complex topics, solve problems, or just clarify your doubts. What are we studying today?",
      timestamp: Date.now()
    }
  ]);
  
  const messagesRef = useRef<ChatMessage[]>(messages);
  const [isSaved, setIsSaved] = useState(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(files[0]);
    }
  };

  const removeImage = () => {
    setAttachedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) return;

    const rec = new Recognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      rec.start();
    } else {
      rec.stop();
    }

    return () => {
      try {
        rec.stop();
      } catch {
        // Already stopped or not initialized
      }
    };
  }, [isListening]);

  const toggleVoiceInput = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome.");
      return;
    }
    setIsListening(!isListening);
  };

  const handleShareChat = () => {
    if (messages.length === 0) {
      alert("No messages to share yet. Start chatting!");
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

  const sendMessageToAi = async (textToSend: string) => {
    if (isTyping && !textToSend) return;
    setError(null);

    // Credit Check
    const success = onDeductCredit(1);
    if (!success) {
      setError("❌ Insufficient credits! Please unlock a reward or complete a study cycle to get more credits.");
      return;
    }

    const currentImage = attachedImage;
    if (currentImage) removeImage(); // clear early

    const newMsg: ChatMessage = {
      role: 'user',
      text: textToSend,
      images: currentImage ? [currentImage] : undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newMsg]);
    setIsTyping(true);

    try {
      const responseText = await GeminiService.chatWithTutor(textToSend, messages, currentImage ? [currentImage] : []);
      setMessages(prev => [...prev, {
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      }]);
    } catch (err: any) {
      console.error(err);
      let errorText = "⚠️ Sorry, I encountered an issue fetching answers from Gemini. Please try again.";
      const rawMsg = String(err?.message || err || '');
      
      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("AI Tutor Error", {
            body: "Gemini connection lost. Please verify keys and connection.",
            icon: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg'
          });
        }
      } catch (e) {
        console.warn("Autoscroll failed", e);
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
    if ((!input.trim() && !attachedImage) || isTyping) return;
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
    <div className="h-[calc(100vh-140px)] flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Primary Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header Info */}
        <div className="px-4 py-2 bg-white border-b border-slate-100 flex justify-between items-center">
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
              <button
                onClick={() => setShowBookmarks(!showBookmarks)}
                className={`p-1 rounded-md transition-colors flex items-center gap-1 ${showBookmarks ? 'text-amber-650 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-50'}`}
                title="Saved & Starred Messages"
              >
                <Star className={`w-3.5 h-3.5 ${showBookmarks ? 'fill-amber-400 text-amber-500' : ''}`} />
                <span className="text-[10px] font-bold">Saved Msgs</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 text-[10px] font-bold">
            <Sparkles className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
            1 Credit / msg
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-grow overflow-y-auto p-4 space-y-5 custom-scrollbar bg-slate-50/10">
          {messages.map((msg, idx) => {
            const isStarred = starredTimestamps.includes(msg.timestamp);
            return (
              <div
                key={idx}
                className={`flex gap-3 relative group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-100 flex-shrink-0">
                    <img src={SJTUTOR_AVATAR} alt="AI" className="w-full h-full object-cover" />
                  </div>
                )}
                
                {/* Message Bubble + Bookmarking Actions */}
                <div className="flex flex-col max-w-[85%] relative">
                  <div
                    className={`rounded-xl px-4 py-2.5 shadow-sm text-sm relative ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.images && msg.images.map((img, i) => (
                      <div key={i} className="mb-2">
                        <img src={img} alt="Attached" className="max-w-xs rounded-lg shadow-sm border border-black/10" />
                      </div>
                    ))}
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
                      <div className="markdown-body">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>

                  {/* Bookmark Star button hover trigger */}
                  <div className="absolute top-1 -right-3 sm:-right-6 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10 flex items-center">
                    <button
                      onClick={() => toggleStar(msg.timestamp)}
                      className={`p-1 bg-white border rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all ${
                        isStarred ? 'text-amber-500 border-amber-200 bg-amber-50' : 'text-slate-400 hover:text-amber-500 border-slate-200'
                      }`}
                      title={isStarred ? "Remove Bookmark" : "Bookmark/Star message"}
                    >
                      <Star className={`w-3 h-3 ${isStarred ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4 text-slate-500" />
                  </div>
                )}
              </div>
            );
          })}
          
          {isTyping && (
             <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-100 flex-shrink-0">
                  <img src={SJTUTOR_AVATAR} alt="AI" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl rounded-bl-none px-4 py-2.5 flex items-center">
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

        {/* Input Controls */}
        <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-2">
          {error && (
            <div className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-xs text-red-600 animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
          
          {attachedImage && (
            <div className="flex relative w-16 h-16 rounded overflow-hidden border border-slate-200">
              <img src={attachedImage} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={removeImage}
                className="absolute top-0.5 right-0.5 bg-red-500 rounded-full text-white p-0.5 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
              capture="environment"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors"
              title="Add Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <button
              onClick={toggleVoiceInput}
              className={`p-2.5 rounded-lg border border-slate-200 transition-colors ${isListening ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Ask SJ Tutor AI anything..."}
              className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none text-sm max-h-32 text-slate-900"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !attachedImage) || isTyping}
              className="absolute right-1.5 p-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Bookmarks Overlay Sidebar */}
      {showBookmarks && (
        <div className="w-80 border-l border-slate-150 bg-slate-50/70 p-4 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right duration-250 z-20">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Bookmarked ({starredTimestamps.length})</span>
            </div>
            <div className="flex items-center gap-1">
              {starredTimestamps.length > 0 && (
                <button
                  onClick={clearAllBookmarks}
                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition"
                  title="Clear All Bookmarks"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={() => setShowBookmarks(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition"
                title="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {starredTimestamps.length === 0 ? (
            <div className="text-center py-16 text-slate-450 space-y-3 px-3 flex-1 flex flex-col justify-center items-center">
              <Bookmark className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">No bookmarked messages</p>
              <p className="text-[11px] text-slate-400">Hover or click messages and tap the star icon to save important content for later reference!</p>
            </div>
          ) : (
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {messages.filter(msg => starredTimestamps.includes(msg.timestamp)).map((msg, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs relative group flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${msg.role === 'user' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                      {msg.role === 'user' ? 'You' : 'AI Tutor'}
                    </span>
                    <button 
                      onClick={() => toggleStar(msg.timestamp)} 
                      className="text-amber-500 hover:text-slate-400 transition"
                      title="Remove Bookmark"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-700 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text custom-scrollbar">
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 self-end font-medium">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TutorChat;
