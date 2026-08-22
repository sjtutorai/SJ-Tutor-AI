/**
 * Audio and Speech Service
 * Provides robust microphone access, real-time Web Speech Recognition,
 * MediaRecorder audio capture, and fallback AI Audio Transcription.
 */

export interface SpeechRecognitionResultPayload {
  transcript: string;
  isFinal: boolean;
}

export interface AudioSessionOptions {
  language?: string;
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (errMessage: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

/**
 * Checks if mediaDevices and getUserMedia are supported in the current environment.
 */
export const isAudioCaptureSupported = (): boolean => {
  return typeof window !== 'undefined' && !!navigator?.mediaDevices?.getUserMedia;
};

/**
 * Requests microphone permission and returns the audio MediaStream.
 */
export const requestMicrophoneStream = async (): Promise<MediaStream> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone access is not supported on this browser or platform.');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return stream;
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error(
        "Microphone permission was denied. Please enable microphone permissions in your browser or click 'Open in New Tab' to grant access."
      );
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error('No microphone hardware detected on your device.');
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      throw new Error('Microphone is currently in use by another application.');
    }
    throw new Error(err.message || 'Unable to access your microphone.');
  }
};

/**
 * Converts a Blob to a base64 Data URL string.
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Transcribes audio via server-side Gemini audio transcription.
 */
export const transcribeAudioViaAI = async (
  audioDataUrlOrBase64: string,
  mimeType: string = 'audio/webm',
  language: string = 'English'
): Promise<string> => {
  try {
    const res = await fetch('/api/transcribe-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioDataUrlOrBase64,
        mimeType,
        language,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Transcription request failed (${res.status})`);
    }

    const data = await res.json();
    return data.transcript || '';
  } catch (err: any) {
    console.error('AI Audio Transcription error:', err);
    throw err;
  }
};

/**
 * Robust Voice Dictation Session that combines real-time Web Speech with MediaRecorder fallback.
 */
export class VoiceDictationSession {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recognition: any = null;
  private isListening = false;
  private accumulatedText = '';
  private options: AudioSessionOptions;

  constructor(options: AudioSessionOptions = {}) {
    this.options = options;
  }

  public async start(): Promise<void> {
    this.accumulatedText = '';
    this.audioChunks = [];
    this.isListening = true;
    this.options.onRecordingStateChange?.(true);

    // 1. Acquire microphone stream
    try {
      this.stream = await requestMicrophoneStream();
    } catch (streamErr: any) {
      this.isListening = false;
      this.options.onRecordingStateChange?.(false);
      this.options.onError?.(streamErr.message);
      throw streamErr;
    }

    // 2. Initialize MediaRecorder for fail-safe audio capture
    try {
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && !MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(250);
    } catch (recErr) {
      console.warn('MediaRecorder setup notice:', recErr);
    }

    // 3. Initialize Web Speech Recognition for instant zero-latency feedback
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = this.options.language === 'Hindi' ? 'hi-IN' : 'en-US';

        rec.onresult = (e: any) => {
          let currentSessionFinal = '';
          let currentSessionInterim = '';

          for (let i = 0; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              currentSessionFinal += e.results[i][0].transcript + ' ';
            } else {
              currentSessionInterim += e.results[i][0].transcript;
            }
          }

          const combined = (this.accumulatedText + currentSessionFinal).trim();
          if (currentSessionFinal) {
            this.accumulatedText = combined;
            this.options.onFinal?.(this.accumulatedText);
          }

          if (currentSessionInterim) {
            this.options.onInterim?.(
              (this.accumulatedText ? this.accumulatedText + ' ' : '') + currentSessionInterim
            );
          }
        };

        rec.onerror = (e: any) => {
          console.warn('SpeechRecognition event code:', e.error);
          if (e.error === 'not-allowed') {
            this.options.onError?.(
              "Microphone permission was restricted. Click 'Open in New Tab' to grant permissions."
            );
          }
        };

        rec.onend = () => {
          // If still listening, speech recognition might have timed out on silence
          if (this.isListening) {
            try {
              rec.start();
            } catch {
              // Ignore restart error
            }
          }
        };

        rec.start();
        this.recognition = rec;
      } catch (speechErr) {
        console.warn('Web Speech Recognition initial start notice:', speechErr);
      }
    }
  }

  public async stop(): Promise<string> {
    this.isListening = false;
    this.options.onRecordingStateChange?.(false);

    // Stop Web Speech Recognition
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.stop();
      } catch {
        // Ignore stop errors
      }
      this.recognition = null;
    }

    // Stop MediaRecorder and grab audio Blob
    let audioBlob: Blob | null = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          if (!this.mediaRecorder) return resolve();
          this.mediaRecorder.onstop = () => resolve();
          this.mediaRecorder.stop();
        });
      } catch (err) {
        console.warn('MediaRecorder stop notice:', err);
      }
    }

    if (this.audioChunks.length > 0) {
      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      audioBlob = new Blob(this.audioChunks, { type: mimeType });
    }

    // Stop media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    // If Web Speech already produced text, return it
    const finalWebSpeech = this.accumulatedText.trim();
    if (finalWebSpeech) {
      return finalWebSpeech;
    }

    // If Web Speech returned nothing or wasn't supported, run AI audio transcription fallback
    if (audioBlob && audioBlob.size > 1000) {
      try {
        const dataUrl = await blobToDataUrl(audioBlob);
        const aiTranscript = await transcribeAudioViaAI(
          dataUrl,
          audioBlob.type,
          this.options.language || 'English'
        );
        return aiTranscript.trim();
      } catch (aiErr) {
        console.warn('Fallback AI audio transcription failed:', aiErr);
      }
    }

    return '';
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}
