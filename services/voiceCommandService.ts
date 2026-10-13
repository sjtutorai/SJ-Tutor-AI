/**
 * Voice Command Service for SJ Tutor AI
 * Provides hands-free voice navigation and accessibility for students.
 * Supports commands like 'Open Summary', 'Ask Tutor', 'Generate', and more.
 */

export type VoiceCommandAction =
  | 'OPEN_SUMMARY'
  | 'ASK_TUTOR'
  | 'GENERATE'
  | 'OPEN_QUIZ'
  | 'OPEN_HOMEWORK'
  | 'OPEN_NOTES'
  | 'OPEN_DASHBOARD'
  | 'OPEN_GROUPS'
  | 'OPEN_TIMER'
  | 'OPEN_ID_CARD'
  | 'OPEN_SETTINGS'
  | 'OPEN_PROFILE'
  | 'TOGGLE_THEME'
  | 'SHOW_COMMANDS'
  | 'STOP_LISTENING';

export interface CommandDefinition {
  action: VoiceCommandAction;
  label: string;
  category: 'Navigation' | 'Actions' | 'Utility';
  spokenPhrases: string[];
  description: string;
  voiceFeedback: string;
}

export const SUPPORTED_VOICE_COMMANDS: CommandDefinition[] = [
  {
    action: 'OPEN_SUMMARY',
    label: 'Open Summary',
    category: 'Navigation',
    spokenPhrases: [
      'open summary',
      'go to summary',
      'summary',
      'summarize',
      'summaries',
      'open summaries',
      'instant summary',
      'view summary',
      'show summary',
      'study summary',
    ],
    description: 'Navigate to Instant Summary generator',
    voiceFeedback: 'Opening Summary',
  },
  {
    action: 'ASK_TUTOR',
    label: 'Ask Tutor',
    category: 'Navigation',
    spokenPhrases: [
      'ask tutor',
      'open tutor',
      'tutor',
      'ai tutor',
      'ask the tutor',
      'chat with tutor',
      'talk to tutor',
      'tutor chat',
      'go to tutor',
      'tutor sessions',
      'open ai tutor',
    ],
    description: 'Open interactive AI Tutor chat session',
    voiceFeedback: 'Opening AI Tutor',
  },
  {
    action: 'GENERATE',
    label: 'Generate',
    category: 'Actions',
    spokenPhrases: [
      'generate',
      'start generate',
      'generate now',
      'start generation',
      'generate summary',
      'generate quiz',
      'solve homework',
      'submit',
      'run generate',
      'create content',
    ],
    description: 'Trigger the current generation or solve action',
    voiceFeedback: 'Generating content now',
  },
  {
    action: 'OPEN_QUIZ',
    label: 'Open Quiz',
    category: 'Navigation',
    spokenPhrases: [
      'open quiz',
      'quiz creator',
      'quiz',
      'take quiz',
      'start quiz',
      'practice quiz',
      'go to quiz',
      'test me',
      'quizzes',
    ],
    description: 'Navigate to Quiz Creator and practice tests',
    voiceFeedback: 'Opening Quiz Creator',
  },
  {
    action: 'OPEN_HOMEWORK',
    label: 'Open Homework',
    category: 'Navigation',
    spokenPhrases: [
      'open homework',
      'homework solver',
      'homework',
      'solve homework',
      'homework help',
      'solve problems',
      'go to homework',
    ],
    description: 'Navigate to Homework Solver',
    voiceFeedback: 'Opening Homework Solver',
  },
  {
    action: 'OPEN_NOTES',
    label: 'Open Notes',
    category: 'Navigation',
    spokenPhrases: [
      'open notes',
      'notes and schedule',
      'notes',
      'my notes',
      'notebook',
      'schedule',
      'study notes',
      'go to notes',
    ],
    description: 'Open study notes and revision schedule',
    voiceFeedback: 'Opening Notes and Schedule',
  },
  {
    action: 'OPEN_DASHBOARD',
    label: 'Open Dashboard',
    category: 'Navigation',
    spokenPhrases: [
      'open dashboard',
      'dashboard',
      'go home',
      'home page',
      'home',
      'main screen',
      'overview',
      'back to dashboard',
    ],
    description: 'Return to main student Dashboard overview',
    voiceFeedback: 'Navigating to Dashboard',
  },
  {
    action: 'OPEN_GROUPS',
    label: 'Study Groups',
    category: 'Navigation',
    spokenPhrases: [
      'open study groups',
      'study groups',
      'open groups',
      'groups',
      'group chat',
      'study group',
      'go to groups',
    ],
    description: 'Open peer study groups and collaboration',
    voiceFeedback: 'Opening Study Groups',
  },
  {
    action: 'OPEN_TIMER',
    label: 'Study Timer',
    category: 'Navigation',
    spokenPhrases: [
      'open timer',
      'study timer',
      'timer',
      'pomodoro',
      'focus timer',
      'stopwatch',
      'go to timer',
    ],
    description: 'Open Pomodoro focus study timer',
    voiceFeedback: 'Opening Study Timer',
  },
  {
    action: 'OPEN_ID_CARD',
    label: 'Student ID Card',
    category: 'Navigation',
    spokenPhrases: [
      'open id card',
      'student id',
      'my id card',
      'my id',
      'id card',
      'digital id',
      'show id',
    ],
    description: 'View digital student ID card',
    voiceFeedback: 'Opening Student ID Card',
  },
  {
    action: 'OPEN_SETTINGS',
    label: 'Open Settings',
    category: 'Navigation',
    spokenPhrases: [
      'open settings',
      'settings',
      'preferences',
      'system settings',
      'go to settings',
    ],
    description: 'Manage account, AI, and display preferences',
    voiceFeedback: 'Opening Settings',
  },
  {
    action: 'OPEN_PROFILE',
    label: 'Open Profile',
    category: 'Navigation',
    spokenPhrases: [
      'open profile',
      'my profile',
      'profile',
      'view profile',
      'student profile',
    ],
    description: 'View and edit student profile details',
    voiceFeedback: 'Opening Profile',
  },
  {
    action: 'TOGGLE_THEME',
    label: 'Toggle Theme',
    category: 'Actions',
    spokenPhrases: [
      'toggle theme',
      'dark mode',
      'light mode',
      'switch theme',
      'change theme',
      'turn on dark mode',
      'turn on light mode',
    ],
    description: 'Switch between light and dark display mode',
    voiceFeedback: 'Switching theme mode',
  },
  {
    action: 'SHOW_COMMANDS',
    label: 'Voice Help',
    category: 'Utility',
    spokenPhrases: [
      'voice help',
      'show commands',
      'voice commands',
      'help',
      'what can i say',
      'list commands',
      'commands list',
    ],
    description: 'Display all supported hands-free voice commands',
    voiceFeedback: 'Showing voice command list',
  },
  {
    action: 'STOP_LISTENING',
    label: 'Stop Listening',
    category: 'Utility',
    spokenPhrases: [
      'stop listening',
      'turn off mic',
      'cancel voice',
      'exit voice',
      'mute voice',
      'stop mic',
      'stop',
    ],
    description: 'Stop active voice recognition',
    voiceFeedback: 'Voice listening stopped',
  },
];

export interface VoiceCommandMatch {
  action: VoiceCommandAction;
  definition: CommandDefinition;
  transcript: string;
}

export interface VoiceCommandServiceOptions {
  onListeningChange?: (isListening: boolean) => void;
  onInterimTranscript?: (transcript: string) => void;
  onCommandMatched?: (match: VoiceCommandMatch) => void;
  onUnrecognizedSpeech?: (transcript: string) => void;
  onError?: (errorMessage: string) => void;
  language?: string;
  continuous?: boolean;
  soundFeedbackEnabled?: boolean;
  speechFeedbackEnabled?: boolean;
}

export class VoiceCommandService {
  private static instance: VoiceCommandService | null = null;
  private recognition: any = null;
  private isListening = false;
  private options: VoiceCommandServiceOptions = {};
  private soundFeedbackEnabled = true;
  private speechFeedbackEnabled = true;
  private continuous = true;
  private audioContext: AudioContext | null = null;
  private restartTimeout: any = null;
  private lastExecutedTimestamp = 0;

  private constructor() {
    this.loadPreferences();
  }

  public static getInstance(): VoiceCommandService {
    if (!VoiceCommandService.instance) {
      VoiceCommandService.instance = new VoiceCommandService();
    }
    return VoiceCommandService.instance;
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getSoundFeedbackEnabled(): boolean {
    return this.soundFeedbackEnabled;
  }

  public setSoundFeedbackEnabled(enabled: boolean): void {
    this.soundFeedbackEnabled = enabled;
    try {
      localStorage.setItem('sjtutor_voice_sound_feedback', String(enabled));
    } catch {
      // ignore
    }
  }

  public getSpeechFeedbackEnabled(): boolean {
    return this.speechFeedbackEnabled;
  }

  public setSpeechFeedbackEnabled(enabled: boolean): void {
    this.speechFeedbackEnabled = enabled;
    try {
      localStorage.setItem('sjtutor_voice_speech_feedback', String(enabled));
    } catch {
      // ignore
    }
  }

  public getContinuous(): boolean {
    return this.continuous;
  }

  public setContinuous(continuous: boolean): void {
    this.continuous = continuous;
    try {
      localStorage.setItem('sjtutor_voice_continuous', String(continuous));
    } catch {
      // ignore
    }
  }

  private loadPreferences(): void {
    try {
      const soundPref = localStorage.getItem('sjtutor_voice_sound_feedback');
      if (soundPref !== null) {
        this.soundFeedbackEnabled = soundPref === 'true';
      }
      const speechPref = localStorage.getItem('sjtutor_voice_speech_feedback');
      if (speechPref !== null) {
        this.speechFeedbackEnabled = speechPref === 'true';
      }
      const contPref = localStorage.getItem('sjtutor_voice_continuous');
      if (contPref !== null) {
        this.continuous = contPref === 'true';
      }
    } catch {
      // ignore
    }
  }

  public updateOptions(options: Partial<VoiceCommandServiceOptions>): void {
    this.options = { ...this.options, ...options };
    if (options.soundFeedbackEnabled !== undefined) {
      this.soundFeedbackEnabled = options.soundFeedbackEnabled;
    }
    if (options.speechFeedbackEnabled !== undefined) {
      this.speechFeedbackEnabled = options.speechFeedbackEnabled;
    }
    if (options.continuous !== undefined) {
      this.continuous = options.continuous;
    }
  }

  public async start(options?: Partial<VoiceCommandServiceOptions>): Promise<void> {
    if (options) {
      this.updateOptions(options);
    }

    if (!this.isSupported()) {
      const msg = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
      this.options.onError?.(msg);
      throw new Error(msg);
    }

    if (this.isListening) {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = this.continuous;
      this.recognition.interimResults = true;
      this.recognition.lang = this.options.language || 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.options.onListeningChange?.(true);
        if (this.soundFeedbackEnabled) {
          this.playChime('start');
        }
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        if (interim) {
          this.options.onInterimTranscript?.(interim);
          // Also perform early matching on interim speech for snappy responsiveness
          this.checkAndExecuteMatch(interim, false);
        }

        if (finalTranscript) {
          this.options.onInterimTranscript?.(finalTranscript);
          this.checkAndExecuteMatch(finalTranscript, true);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('[VoiceCommandService] Speech error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.options.onError?.('Microphone access was denied. Please allow microphone permissions in your browser.');
          this.stop();
        } else if (event.error === 'no-speech') {
          // Normal timeout on quiet moments
        } else if (event.error !== 'aborted') {
          this.options.onError?.(`Speech recognition notice: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        if (this.isListening && this.continuous) {
          // Auto-restart continuous listening after a brief pause
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isListening && this.recognition) {
              try {
                this.recognition.start();
              } catch {
                // Ignore start collision errors
              }
            }
          }, 300);
        } else {
          this.isListening = false;
          this.options.onListeningChange?.(false);
        }
      };

      this.recognition.start();
    } catch (err: any) {
      this.isListening = false;
      this.options.onListeningChange?.(false);
      const msg = err.message || 'Unable to start speech recognition.';
      this.options.onError?.(msg);
      throw err;
    }
  }

  public stop(): void {
    this.isListening = false;
    clearTimeout(this.restartTimeout);
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.options.onListeningChange?.(false);
    this.options.onInterimTranscript?.('');
    if (this.soundFeedbackEnabled) {
      this.playChime('stop');
    }
  }

  public toggle(): void {
    if (this.isListening) {
      this.stop();
    } else {
      this.start().catch((err) => console.warn('Could not start voice service:', err));
    }
  }

  /**
   * Matches spoken words against our command set.
   * Handles filler words (e.g. "please", "can you", "hey", "sj") and punctuation.
   */
  public matchCommand(transcript: string): VoiceCommandMatch | null {
    if (!transcript) return null;

    const cleaned = transcript
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Remove filler leading phrases
    const stripped = cleaned
      .replace(/^(please|hey|hi|hello|ok|okay|can you|could you|i want to|let's|lets)\s+/g, '')
      .replace(/^(sj tutor|tutor ai|sj)\s+/g, '')
      .trim();

    for (const cmd of SUPPORTED_VOICE_COMMANDS) {
      for (const phrase of cmd.spokenPhrases) {
        const normalizedPhrase = phrase.toLowerCase().trim();

        // Exact match, phrase equality, or contains target command phrase
        if (
          cleaned === normalizedPhrase ||
          stripped === normalizedPhrase ||
          cleaned.startsWith(normalizedPhrase + ' ') ||
          cleaned.endsWith(' ' + normalizedPhrase) ||
          stripped.startsWith(normalizedPhrase + ' ') ||
          stripped.endsWith(' ' + normalizedPhrase) ||
          cleaned.includes(` ${normalizedPhrase} `)
        ) {
          return {
            action: cmd.action,
            definition: cmd,
            transcript,
          };
        }
      }
    }

    return null;
  }

  private checkAndExecuteMatch(transcript: string, isFinal: boolean): void {
    const now = Date.now();
    // Debounce commands so they don't fire repeatedly within 1.2s
    if (now - this.lastExecutedTimestamp < 1200) {
      return;
    }

    const match = this.matchCommand(transcript);

    if (match) {
      this.lastExecutedTimestamp = now;

      // Play success chime
      if (this.soundFeedbackEnabled) {
        this.playChime('success');
      }

      // Voice feedback via SpeechSynthesis
      if (this.speechFeedbackEnabled && match.definition.voiceFeedback) {
        this.speak(match.definition.voiceFeedback);
      }

      // Execute matched action
      this.options.onCommandMatched?.(match);

      // If command was STOP_LISTENING, stop now
      if (match.action === 'STOP_LISTENING') {
        this.stop();
      }
    } else if (isFinal && transcript.trim().length > 3) {
      this.options.onUnrecognizedSpeech?.(transcript.trim());
    }
  }

  /**
   * Synthesize audio chimes using Web Audio API for zero-latency audio feedback.
   */
  public playChime(type: 'start' | 'success' | 'stop' | 'error'): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      if (type === 'start') {
        // Cheerful ascending two-tone
        this.createTone(ctx, 440, now, 0.08);
        this.createTone(ctx, 660, now + 0.08, 0.12);
      } else if (type === 'success') {
        // High-pitched pleasant confirmation triad chord (C5 - E5 - G5)
        this.createTone(ctx, 523.25, now, 0.06);
        this.createTone(ctx, 659.25, now + 0.06, 0.06);
        this.createTone(ctx, 783.99, now + 0.12, 0.16);
      } else if (type === 'stop') {
        // Descending soft tones
        this.createTone(ctx, 550, now, 0.08);
        this.createTone(ctx, 330, now + 0.08, 0.12);
      } else if (type === 'error') {
        this.createTone(ctx, 220, now, 0.15);
      }
    } catch (e) {
      console.debug('Audio chime notice:', e);
    }
  }

  private createTone(ctx: AudioContext, frequency: number, startTime: number, duration: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Speak concise voice feedback using the Web Speech Synthesis API.
   */
  public speak(text: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[#*_~`\\[\]]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.debug('SpeechSynthesis notice:', e);
    }
  }
}
