const fs = require('fs');
let code = fs.readFileSync('components/TutorChat.tsx', 'utf8');

const importReplacement = `import { 
  Send, 
  User as UserIcon, 
  Loader2, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,`;
code = code.replace(/import\s*{\s*Send,\s*User\s*as\s*UserIcon,\s*Loader2,\s*Mic,\s*MicOff,/, importReplacement);

const stateInjection = `  const [isTyping, setIsTyping] = useState(false);
  
  // Speech API States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
           setText(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const toggleSpeech = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_~\`\\[\\]]/g, ''));
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
    }
  };
`;
code = code.replace("const [isTyping, setIsTyping] = useState(false);", stateInjection);

const micButtonReplacement = `{/* File Upload Button */}`;
const micButtonNew = `
        {/* Mic Button */}
        <button
          onClick={toggleListening}
          disabled={!recognitionRef.current}
          title={!recognitionRef.current ? "Voice input not supported" : (isListening ? "Stop listening" : "Start voice input")}
          className={\`p-3 sm:p-4 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 \${isListening ? 'bg-red-500 text-white shadow-red-500/20 animate-pulse' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-700'}\`}
        >
          {isListening ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        {/* File Upload Button */}`;
code = code.replace(micButtonReplacement, micButtonNew);

const ttsButtonReplacement = `<button\n                            onClick={() => handleCopy(msg.text, msg.id)}`;
const ttsButtonNew = `
                          <button
                            onClick={() => toggleSpeech(msg.id, msg.text)}
                            className={\`p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition \${speakingMessageId === msg.id ? 'text-primary-500' : 'text-slate-400'}\`}
                            title={speakingMessageId === msg.id ? "Stop Speaking" : "Read Aloud"}
                          >
                            {speakingMessageId === msg.id ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleCopy(msg.text, msg.id)}`;
code = code.replace(ttsButtonReplacement, ttsButtonNew);

fs.writeFileSync('components/TutorChat.tsx', code);
