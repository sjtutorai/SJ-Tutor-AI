
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { GeminiService } from '../services/geminiService';
// Added Zap to the imports from lucide-react
import { Send, User as UserIcon, Loader2, Mic, MicOff, Sparkles, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Chat, GenerateContentResponse } from "@google/genai";
import { SJTUTOR_AVATAR } from '../App';

const SAMPLE_QUESTIONS = [
  "What is the difference between weather and climate?",
  "Explain photosynthesis.",
  "What are natural resources?",
  "Define force and its effects."
];

interface TutorChatProps {
  onDeductCredit: (amount: number) => boolean;
  currentCredits: number;
}

const TutorChat: React.FC<TutorChatProps> = ({ onDeductCredit, currentCredits }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: "Hi! I'm SJ Tutor AI. How can I help you today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = GeminiService.getChatSession();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleVoiceInput = () => {
    if (isListening) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => setInput(prev => prev + ' ' + e.results[0][0].transcript);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    }
  };

  const sendMessageToAi = async (textToSend: string) => {
    if (!textToSend.trim() || !chatSessionRef.current) return;
    setError(null);

    const cost = 1;
    if (!onDeductCredit(cost)) {
      setError("Insufficient credits! You need 1 credit per message.");
      return;
    }

    const userMsg: ChatMessage = { role: 'user', text: textToSend, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const resultStream = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
      let fullResponseText = '';
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: Date.now() }]);

      for await (const chunk of resultStream) {
        const responseChunk = chunk as GenerateContentResponse;
        if (responseChunk.text) {
          fullResponseText += responseChunk.text;
          setMessages(prev => {
             const newArr = [...prev];
             newArr[newArr.length - 1].text = fullResponseText;
             return newArr;
          });
        }
      }
    } catch (error: any) {
      setError("Encountered an error. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    sendMessageToAi(input);
    setInput('');
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Tutor Session</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-800/30 text-[10px] font-bold">
          <Zap className="w-2.5 h-2.5 fill-amber-500" />
          1 Credit / Msg
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-100 flex-shrink-0">
                <img src={SJTUTOR_AVATAR} alt="AI" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 shadow-sm text-sm ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'}`}>
              <div className="markdown-body">
                 <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && messages[messages.length - 1].role === 'user' && (
           <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-primary-100 flex-shrink-0 animate-pulse">
                <img src={SJTUTOR_AVATAR} alt="AI" className="w-full h-full object-cover" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 flex items-center">
                <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="relative flex items-center gap-2">
          <button onClick={toggleVoiceInput} className={`p-2.5 rounded-lg transition-colors ${isListening ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
            <Mic className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask anything..."
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-primary-500 outline-none text-sm max-h-32 text-slate-900 dark:text-slate-100"
            rows={1}
          />
          <button onClick={handleSend} disabled={!input.trim() || isTyping} className="absolute right-1.5 p-1.5 bg-primary-600 text-white rounded-md disabled:opacity-50">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorChat;
