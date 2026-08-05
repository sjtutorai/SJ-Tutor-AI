const fs = require('fs');
let code = fs.readFileSync('components/TutorChat.tsx', 'utf8');

// Remove duplicate imports
code = code.replace(
  `import { 
  Send, 
  User as UserIcon, 
  Loader2, 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,`,
  `import { 
  Send, 
  User as UserIcon, 
  Loader2, 
  Mic, 
  MicOff,
  Sparkles,`
);

// Remove the injected block
const injectionBlockRegex = /  \/\/ Speech API States\n  const \[isListening, setIsListening\] = useState\(false\);\n  const recognitionRef = useRef<any>\(null\);\n  const \[speakingMessageId, setSpeakingMessageId\] = useState<string \| null>\(null\);\n\n  \/\/ Initialize Speech Recognition\n  useEffect\(\(\) => \{\n[\s\S]*?const toggleListening = \(\) => \{\n[\s\S]*?  \};\n/g;

code = code.replace(injectionBlockRegex, '');

// Ensure we didn't remove speakingMessageId which we still need for TTS
// We will add it back safely
code = code.replace(
  "const [isTyping, setIsTyping] = useState(false);",
  "const [isTyping, setIsTyping] = useState(false);\n  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);"
);

// We keep toggleSpeech
const toggleSpeechRegex = /  const toggleSpeech = \(messageId: string, text: string\) => {[\s\S]*?  };\n/g;
const hasToggleSpeech = code.match(toggleSpeechRegex);
if (!hasToggleSpeech) {
    code = code.replace(
      "const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);",
      `const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

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
`
    );
}

// Remove the injected mic button if it causes problems, but I replaced the original mic button. 
// Let's see the mic button. I'll just leave my mic button if it works. Wait, I replaced my toggleListening!
// So my mic button is calling a missing toggleListening.
// The original one was `toggleRecording` probably?
