import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { GeminiService } from '../services/geminiService';
import { Send, User as UserIcon, Loader2, Mic, MicOff, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Chat, GenerateContentResponse } from "@google/genai";
import { SJTUTOR_AVATAR } from '../App';

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
}

const TutorChat: React.FC<TutorChatProps> = ({ onDeductCredit, currentCredits }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: "Hi there! I'm SJ Tutor AI. I can help you understand complex topics, solve problems, or just clarify your doubts. What are we studying today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const toggleVoiceInput = () => {
    if (isListening) return;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      alert("Voice input is not supported in this browser.");
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
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorText = "I'm sorry, I encountered an error. Please try asking again or check your connection.";
      let rawMsg = error.message || "";
      
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed.error?.message) rawMsg = parsed.error.message;
      } catch (e) {}

      if (rawMsg.includes("Generative Language API has not been used") || rawMsg.includes("PERMISSION_DENIED")) {
        errorText = "⚠️ API Error: The Google Generative AI API is disabled for this project.";
      } else if (rawMsg.includes("API key not valid") || rawMsg.includes("API_KEY_INVALID")) {
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
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SJ Tutor AI Session</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100 text-[10px] font-bold">
          <Sparkles className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
          1 Credit / Msg
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
              className={`max-w-[85%] rounded-xl px-4 py-2.5 shadow-sm text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none'
              }`}
            >
              {msg.role === 'model' ? (
                <div className="markdown-body">
                   <ReactMarkdown>{msg.text}</ReactMarkdown>
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
            className={`p-2.5 rounded-lg transition-colors ${isListening ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            title="Voice Input"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening..." : "Ask SJ Tutor AI anything..."}
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none text-sm max-h-32 text-slate-900"
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
          <span className="text-[9px] text-slate-400 font-bold uppercase">Balance: {currentCredits}</span>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;