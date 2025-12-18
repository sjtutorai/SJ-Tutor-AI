import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { GeminiService } from '../services/geminiService';
import { Send, User as UserIcon, Loader2, Mic, MicOff, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Chat, GenerateContentResponse } from "@google/genai";
import { SJTUTOR_AVATAR } from '../App';

const SAMPLE_QUESTIONS = [
  "Explain Quantum Physics simply.",
  "How do I solve quadratic equations?",
  "Summarize the French Revolution.",
  "Write a haiku about studying."
];

const TutorChat: React.FC = () => {
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
    if (isListening) return; // Stop handled by browser usually, or we can force stop

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
      // Add a placeholder for the model response that we will update
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
      
      // Attempt parse JSON error
      try {
        const parsed = JSON.parse(rawMsg);
        if (parsed.error?.message) rawMsg = parsed.error.message;
      } catch (e) {}

      // Handle the specific API Not Enabled error to match the dashboard
      if (rawMsg.includes("Generative Language API has not been used") || rawMsg.includes("PERMISSION_DENIED")) {
        errorText = "⚠️ API Error: The Google Generative AI API is disabled for this project. Please enable it in Google Cloud Console.";
      } else if (rawMsg.includes("API key not valid") || rawMsg.includes("API_KEY_INVALID")) {
        errorText = "⚠️ Config Error: The API Key provided is invalid. Please check your .env file.";
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errorText, timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
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
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
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
          <div className="flex flex-wrap gap-2 mt-2 ml-11">
            {SAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendMessageToAi(q)}
                className="text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full border border-primary-100 hover:bg-primary-100 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-100">
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
        <div className="text-center mt-1.5">
           <span className="text-[9px] text-slate-400">AI responses can be inaccurate. Always verify important information.</span>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;