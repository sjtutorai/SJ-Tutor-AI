import React, { useState, useEffect } from 'react';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  HelpCircle,
  FileText,
  MessageCircle,
  Zap,
  BookOpen,
  BrainCircuit,
  Calendar,
  LayoutDashboard,
  Users,
  Clock,
  Settings,
  CreditCard,
  SunMoon,
  Keyboard,
  Compass,
} from 'lucide-react';
import {
  SUPPORTED_VOICE_COMMANDS,
  VoiceCommandAction,
  VoiceCommandService,
  VoiceCommandMatch,
} from '../services/voiceCommandService';

interface VoiceCommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand?: (action: VoiceCommandAction) => void;
}

const ACTION_ICONS: Record<VoiceCommandAction, React.ElementType> = {
  OPEN_SUMMARY: FileText,
  ASK_TUTOR: MessageCircle,
  GENERATE: Zap,
  OPEN_QUIZ: BrainCircuit,
  OPEN_HOMEWORK: BookOpen,
  OPEN_NOTES: Calendar,
  OPEN_DASHBOARD: LayoutDashboard,
  OPEN_GROUPS: Users,
  OPEN_TIMER: Clock,
  OPEN_ID_CARD: CreditCard,
  OPEN_SETTINGS: Settings,
  OPEN_PROFILE: Sparkles,
  TOGGLE_THEME: SunMoon,
  SHOW_COMMANDS: HelpCircle,
  STOP_LISTENING: MicOff,
};

export const VoiceCommandsModal: React.FC<VoiceCommandsModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
}) => {
  const voiceService = VoiceCommandService.getInstance();
  const [isListening, setIsListening] = useState(voiceService.getIsListening());
  const [interimText, setInterimText] = useState('');
  const [lastMatch, setLastMatch] = useState<VoiceCommandMatch | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(voiceService.getSoundFeedbackEnabled());
  const [speechEnabled, setSpeechEnabled] = useState(voiceService.getSpeechFeedbackEnabled());
  const [activeCategory, setActiveCategory] = useState<'All' | 'Navigation' | 'Actions' | 'Utility'>('All');
  const [isSupported] = useState(voiceService.isSupported());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    voiceService.updateOptions({
      onListeningChange: (listening) => setIsListening(listening),
      onInterimTranscript: (text) => setInterimText(text),
      onCommandMatched: (match) => {
        setLastMatch(match);
        if (onExecuteCommand) {
          onExecuteCommand(match.action);
        }
      },
    });

    setIsListening(voiceService.getIsListening());
  }, [isOpen, onExecuteCommand, voiceService]);

  if (!isOpen) return null;

  const toggleMic = () => {
    voiceService.toggle();
    setIsListening(voiceService.getIsListening());
  };

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    voiceService.setSoundFeedbackEnabled(next);
    if (next) {
      voiceService.playChime('start');
    }
  };

  const handleSpeechToggle = () => {
    const next = !speechEnabled;
    setSpeechEnabled(next);
    voiceService.setSpeechFeedbackEnabled(next);
    if (next) {
      voiceService.speak('Voice feedback enabled');
    }
  };

  const filteredCommands =
    activeCategory === 'All'
      ? SUPPORTED_VOICE_COMMANDS
      : SUPPORTED_VOICE_COMMANDS.filter((c) => c.category === activeCategory);

  return (
    <div
      className="fixed inset-0 z-[170] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-amber-500/5 dark:from-amber-950/40 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-primary-600 text-white flex items-center justify-center shadow-md">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="voice-modal-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Hands-Free Voice Navigation
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Student Accessibility
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Navigate hands-free while reading, taking notes, or studying
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Microphone Testing Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={toggleMic}
                disabled={!isSupported}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-md cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse ring-4 ring-rose-500/20'
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20 active:scale-95'
                }`}
                title={isListening ? 'Click to pause mic' : 'Click to start mic'}
              >
                {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-5 h-5" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${
                      isListening ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isListening ? 'Listening for commands...' : 'Microphone is standby'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {interimText ? (
                    <span className="font-semibold text-primary-600 dark:text-primary-400 italic">
                      &quot;{interimText}&quot;
                    </span>
                  ) : (
                    <span>
                      Try saying: <strong className="text-amber-600 dark:text-amber-400">&apos;Open Summary&apos;</strong>, <strong className="text-amber-600 dark:text-amber-400">&apos;Ask Tutor&apos;</strong>, or <strong className="text-amber-600 dark:text-amber-400">&apos;Generate&apos;</strong>
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Feedback Audio Controls */}
            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleSoundToggle}
                className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1.5 ${
                  soundEnabled
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
                title={soundEnabled ? 'Chime sound effects: ON' : 'Chime sound effects: OFF'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[11px] hidden sm:inline">Chimes</span>
              </button>

              <button
                type="button"
                onClick={handleSpeechToggle}
                className={`p-2 rounded-xl border text-xs font-medium transition flex items-center gap-1.5 ${
                  speechEnabled
                    ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-200 dark:border-primary-900/50 text-primary-700 dark:text-primary-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                }`}
                title={speechEnabled ? 'Spoken confirmation: ON' : 'Spoken confirmation: OFF'}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Voice TTS</span>
              </button>
            </div>
          </div>

          {/* Last matched celebration banner */}
          {lastMatch && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Command Recognized:{' '}
                  <strong className="font-bold underline">{lastMatch.definition.label}</strong>
                  {lastMatch.transcript && ` (heard "${lastMatch.transcript}")`}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                Active
              </span>
            </div>
          )}
        </div>

        {/* Categories Tab Bar */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 overflow-x-auto custom-scrollbar">
          {(['All', 'Navigation', 'Actions', 'Utility'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Commands List */}
        <div className="p-6 space-y-3 overflow-y-auto max-h-[50vh] custom-scrollbar">
          <div className="grid gap-2.5">
            {filteredCommands.map((cmd) => {
              const Icon = ACTION_ICONS[cmd.action] || Compass;
              const isHighlight =
                cmd.action === 'OPEN_SUMMARY' ||
                cmd.action === 'ASK_TUTOR' ||
                cmd.action === 'GENERATE';

              return (
                <div
                  key={cmd.action}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isHighlight
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80 shadow-xs'
                      : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isHighlight
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {cmd.label}
                        </p>
                        {isHighlight && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                            Common Action
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{cmd.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (onExecuteCommand) {
                          voiceService.speak(cmd.voiceFeedback);
                          onExecuteCommand(cmd.action);
                          setLastMatch({
                            action: cmd.action,
                            definition: cmd,
                            transcript: cmd.spokenPhrases[0],
                          });
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition"
                      title="Test this command directly"
                    >
                      Test
                    </button>
                    <kbd className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shadow-xs shrink-0">
                      &quot;{cmd.spokenPhrases[0]}&quot;
                    </kbd>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-amber-500" />
            <span>
              Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded text-[10px] font-bold">Alt + V</kbd> anywhere to toggle voice listening.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold transition text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandsModal;
