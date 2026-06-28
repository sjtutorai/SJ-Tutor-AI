import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, X, Zap, Sparkles, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppMode } from "../types";

interface VoiceCommandSystemProps {
  onNavigate: (mode: AppMode) => void;
}

export default function VoiceCommandSystem({ onNavigate }: VoiceCommandSystemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("Click microphone to start hands-free navigation");
  const [commandSuccess, setCommandSuccess] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const COMMANDS = [
    { phrases: ["open quiz", "quiz creator", "quiz", "interactive quiz", "start quiz"], mode: AppMode.QUIZ, label: "Quiz Creator" },
    { phrases: ["open dashboard", "dashboard", "home", "go to dashboard"], mode: AppMode.DASHBOARD, label: "Dashboard" },
    { phrases: ["start timer", "study timer", "timer", "open timer", "show timer"], mode: AppMode.TIMER, label: "Study Timer" },
    { phrases: ["open summary", "instant summary", "summary", "summarize", "summarizer"], mode: AppMode.SUMMARY, label: "Instant Summary" },
    { phrases: ["open solver", "homework solver", "solver", "homework", "solve homework"], mode: AppMode.HOMEWORK, label: "Homework Solver" },
    { phrases: ["open tutor", "ai tutor", "tutor", "tutor session", "start tutoring"], mode: AppMode.TUTOR, label: "AI Tutor Sessions" },
    { phrases: ["open notes", "notes", "schedule", "my schedule", "notebook"], mode: AppMode.NOTES, label: "Notes & Schedule" },
    { phrases: ["open settings", "settings", "preferences", "config"], mode: AppMode.SETTINGS, label: "Settings" },
    { phrases: ["open profile", "profile", "student card", "id card", "student id card"], mode: AppMode.PROFILE, label: "Student Profile" }
  ];

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setStatusMessage("Listening... Speak a navigation command clearly.");
      setErrorType(null);
    };

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase().trim();
      setTranscript(text);
      processCommand(text);
    };

    rec.onerror = (event: any) => {
      console.warn("Speech recognition error:", event);
      setIsListening(false);
      
      if (event.error === "not-allowed") {
        setErrorType("not-allowed");
        setStatusMessage("Permission Denied. Microphone access is blocked.");
      } else if (event.error === "no-speech") {
        setStatusMessage("No speech detected. Please speak closer to your microphone.");
      } else {
        setStatusMessage(`Error: ${event.error || "Could not record sound."}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Already aborted or not started
        }
      }
    };
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (_e) {
        console.error("Failed to start SpeechRecognition:", _e);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
      setIsListening(false);
    }
  };

  const processCommand = (phrase: string) => {
    // Look for matches
    let matchedCommand = null;

    for (const cmd of COMMANDS) {
      for (const phraseCandidate of cmd.phrases) {
        if (phrase.includes(phraseCandidate)) {
          matchedCommand = cmd;
          break;
        }
      }
      if (matchedCommand) break;
    }

    if (matchedCommand) {
      setCommandSuccess(`Opening ${matchedCommand.label}! 🚀`);
      setStatusMessage(`Success! Navigating to: ${matchedCommand.label}`);
      
      // Navigate to the section
      onNavigate(matchedCommand.mode);

      // Trigger optional speak confirmation
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(`Opening ${matchedCommand.label}`);
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.warn("Speech Synthesis confirmation failed:", err);
        }
      }

      // Close the HUD after a brief delay
      setTimeout(() => {
        setCommandSuccess(null);
        setIsOpen(false);
      }, 1800);
    } else {
      setStatusMessage(`Command unrecognized: "${phrase}". Try again!`);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <div className="fixed bottom-6 left-6 z-40">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2 p-3.5 rounded-full shadow-lg border text-white transition-all ${
            isOpen 
              ? "bg-slate-800 border-slate-700" 
              : "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 border-primary-400"
          }`}
          title="Hands-free Voice Commands"
        >
          {isListening ? (
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <Mic className="relative inline-flex rounded-full text-red-500 w-5 h-5 fill-red-500/20" />
            </span>
          ) : (
            <Mic className="w-5 h-5" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider pr-1 hidden sm:inline">Dictate Navigate</span>
        </motion.button>
      </div>

      {/* Voice Control Panel / HUD Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Head */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg">
                    <Sparkles className="w-4 h-4 text-primary-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Voice Command Navigator</h4>
                    <p className="text-[10px] text-slate-400">Navigate hands-free around SJ Tutor AI</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    stopListening();
                    setIsOpen(false);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="p-6 text-center flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-800/80">
                {/* Large Mic Button */}
                <motion.button
                  onClick={isListening ? stopListening : startListening}
                  whileHover={{ scale: 1.05 }}
                  className={`w-16 h-16 rounded-full flex items-center justify-center border transition shadow-sm ${
                    isListening
                      ? "bg-red-500 border-red-400 text-white animate-pulse"
                      : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {isListening ? <Mic className="w-8 h-8 fill-white/20" /> : <MicOff className="w-8 h-8 text-slate-400" />}
                </motion.button>

                {/* Feedback Messages */}
                <div className="mt-4 min-h-[44px] flex flex-col justify-center items-center px-4">
                  {commandSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-emerald-500 dark:text-emerald-400 font-extrabold text-sm flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-200/50"
                    >
                      <Navigation className="w-4 h-4 animate-bounce fill-emerald-500/20" />
                      <span>{commandSuccess}</span>
                    </motion.div>
                  ) : (
                    <>
                      <p className={`text-xs font-semibold ${isListening ? "text-primary-500 animate-pulse" : "text-slate-600 dark:text-slate-300"}`}>
                        {statusMessage}
                      </p>
                      {transcript && (
                        <p className="text-[11px] text-slate-400 mt-2 italic bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800 max-w-full truncate">
                          You said: &quot;{transcript}&quot;
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Compatibility Warning for Iframes */}
                {errorType === "not-allowed" && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl text-left text-[10px] text-amber-800 dark:text-amber-400 leading-relaxed">
                    <p className="font-bold flex items-center gap-1 mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Preview iFrame Restriction
                    </p>
                    <p>
                      Browser security blocks mic capture inside third-party iframes. 
                      Please click the <strong>&quot;Open in New Tab&quot;</strong> button in the top-right of your screen 
                      to grant microphone permissions and navigate instantly!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
