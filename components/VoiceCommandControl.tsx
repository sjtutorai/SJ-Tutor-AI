import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  VoiceCommandService,
  VoiceCommandAction,
  VoiceCommandMatch,
} from '../services/voiceCommandService';

interface VoiceCommandControlProps {
  onExecuteCommand: (action: VoiceCommandAction, match?: VoiceCommandMatch) => void;
  onOpenVoiceModal: () => void;
  triggerToast?: (title: string, message: string, category?: string) => void;
}

export const VoiceCommandControl: React.FC<VoiceCommandControlProps> = ({
  onExecuteCommand,
  onOpenVoiceModal,
  triggerToast,
}) => {
  const voiceService = VoiceCommandService.getInstance();
  const [isListening, setIsListening] = useState(voiceService.getIsListening());
  const [interimText, setInterimText] = useState('');
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(voiceService.getSoundFeedbackEnabled());
  const [isSupported] = useState(voiceService.isSupported());

  useEffect(() => {
    voiceService.updateOptions({
      onListeningChange: (listening) => {
        setIsListening(listening);
        if (!listening) {
          setInterimText('');
        }
      },
      onInterimTranscript: (text) => {
        setInterimText(text);
      },
      onCommandMatched: (match) => {
        setLastActionLabel(match.definition.label);
        onExecuteCommand(match.action, match);
        if (triggerToast) {
          triggerToast(
            `🎙️ Voice: ${match.definition.label}`,
            `Command recognized: "${match.transcript || match.definition.spokenPhrases[0]}"`,
            'Important Alerts'
          );
        }
        setTimeout(() => {
          setLastActionLabel(null);
        }, 2500);
      },
      onUnrecognizedSpeech: (text) => {
        setInterimText(`"${text}" (Try 'Open Summary' or 'Ask Tutor')`);
        setTimeout(() => {
          setInterimText('');
        }, 2200);
      },
      onError: (err) => {
        if (triggerToast) {
          triggerToast('Voice Navigation Notice', err, 'Important Alerts');
        }
      },
    });

    // Global keyboard shortcut: Alt + V or Option + V to toggle voice listening anywhere
    const handleGlobalVoiceKey = (e: KeyboardEvent) => {
      // Check Alt+V
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handleToggleListening();
      }
    };

    window.addEventListener('keydown', handleGlobalVoiceKey);
    return () => window.removeEventListener('keydown', handleGlobalVoiceKey);
  }, [onExecuteCommand, triggerToast, voiceService]);

  const handleToggleListening = () => {
    if (!isSupported) {
      if (triggerToast) {
        triggerToast(
          'Voice Unsupported',
          'Voice recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.',
          'Important Alerts'
        );
      }
      return;
    }

    if (isListening) {
      voiceService.stop();
      if (triggerToast) {
        triggerToast('Voice Muted', 'Hands-free voice listening paused.', 'Important Alerts');
      }
    } else {
      voiceService
        .start()
        .then(() => {
          if (triggerToast) {
            triggerToast(
              'Voice Navigation Active 🎙️',
              "Listening hands-free. Try saying 'Open Summary', 'Ask Tutor', or 'Generate'.",
              'Important Alerts'
            );
          }
        })
        .catch((err) => {
          console.warn('Voice start notice:', err);
        });
    }
  };

  const handleSoundToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    voiceService.setSoundFeedbackEnabled(next);
  };

  return (
    <>
      {/* Header Button */}
      <button
        type="button"
        onClick={handleToggleListening}
        className={`p-2 rounded-full transition-all relative border flex items-center justify-center cursor-pointer ${
          isListening
            ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20 ring-2 ring-rose-500/30 animate-pulse'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
        }`}
        title={
          isListening
            ? 'Voice Commands: Listening (Alt+V to stop)'
            : 'Voice Navigation: Hands-free student accessibility (Alt+V)'
        }
        aria-label="Toggle hands-free voice command navigation"
      >
        {isListening ? (
          <Mic className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
        {isListening && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-white"></span>
          </span>
        )}
      </button>

      {/* Floating HUD Widget when Listening is Active */}
      {isListening && (
        <aside
          aria-label="Active voice command status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[140] w-[95%] sm:w-auto max-w-xl animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
        >
          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-2xl p-3 sm:px-4 sm:py-3 transition-all">
            <div className="flex items-center justify-between gap-3">
              {/* Mic & Waveform Indicator */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center relative">
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                </div>

                {/* Animated Sound Wave bars */}
                <div className="flex items-center gap-0.5 h-4 px-1" aria-hidden="true">
                  <span className="w-0.5 h-3 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-0.5 h-5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-0.5 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="w-0.5 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                </div>
              </div>

              {/* Status / Transcript */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                    Voice Active
                  </span>
                  {lastActionLabel && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-bold truncate animate-in fade-in">
                      ✓ {lastActionLabel}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-200 truncate mt-0.5 font-medium">
                  {interimText ? (
                    <span className="text-amber-300 italic font-semibold">
                      &quot;{interimText}&quot;
                    </span>
                  ) : (
                    <span className="text-slate-300">
                      Say <strong className="text-amber-300">&apos;Open Summary&apos;</strong>, <strong className="text-amber-300">&apos;Ask Tutor&apos;</strong>, or <strong className="text-amber-300">&apos;Generate&apos;</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSoundToggle}
                  className={`p-1.5 rounded-lg border text-xs transition ${
                    soundEnabled
                      ? 'bg-slate-800 border-slate-700 text-amber-300'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                  }`}
                  title={soundEnabled ? 'Mute sound chimes' : 'Unmute sound chimes'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={onOpenVoiceModal}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                  title="View all supported voice commands"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg transition hidden sm:flex"
                  title={isMinimized ? 'Expand quick commands' : 'Collapse quick commands'}
                >
                  {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => voiceService.stop()}
                  className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded-lg transition"
                  title="Stop listening"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Command Chips (Expanded view) */}
            {!isMinimized && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[11px]">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">
                  Try speaking:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    voiceService.speak('Opening Summary');
                    onExecuteCommand('OPEN_SUMMARY');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-medium transition shrink-0 active:scale-95"
                >
                  🎙️ &quot;Open Summary&quot;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    voiceService.speak('Opening AI Tutor');
                    onExecuteCommand('ASK_TUTOR');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-medium transition shrink-0 active:scale-95"
                >
                  🎙️ &quot;Ask Tutor&quot;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    voiceService.speak('Generating content now');
                    onExecuteCommand('GENERATE');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-medium transition shrink-0 active:scale-95"
                >
                  ⚡ &quot;Generate&quot;
                </button>
                <button
                  type="button"
                  onClick={() => {
                    voiceService.speak('Opening Quiz Creator');
                    onExecuteCommand('OPEN_QUIZ');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium transition shrink-0 active:scale-95"
                >
                  &quot;Open Quiz&quot;
                </button>
                <button
                  type="button"
                  onClick={onOpenVoiceModal}
                  className="px-2 py-1 rounded-lg bg-primary-600/30 hover:bg-primary-600/50 border border-primary-500/40 text-primary-300 font-semibold transition shrink-0 ml-auto"
                >
                  All Commands →
                </button>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
};

export default VoiceCommandControl;
