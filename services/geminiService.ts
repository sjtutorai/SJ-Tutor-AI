import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, HomeworkFile, DifficultyLevel } from "../types";
import { SettingsService } from "./settingsService";

export interface KeySlot {
  id: string;
  masked: string;
  status: 'ACTIVE' | 'HIGH_DEMAND' | 'COOLING_DOWN' | 'INVALID';
  totalRequests: number;
  successCount: number;
  failureCount: number;
  highDemandCount: number;
  cooldownUntil?: number;
  lastUsedAt?: number;
  lastError?: string;
  inCooldown?: boolean;
  cooldownRemainingSec?: number;
}

export interface KeyManagerStatus {
  totalKeys: number;
  activeKeyId: string;
  activeKeyMasked: string;
  highDemandAutoSwitchEnabled: boolean;
  keys: {
    id: string;
    masked: string;
    status: 'ACTIVE' | 'HIGH_DEMAND' | 'COOLING_DOWN' | 'INVALID';
    totalRequests: number;
    successCount: number;
    failureCount: number;
    highDemandCount: number;
    inCooldown: boolean;
    cooldownRemainingSec: number;
  }[];
}

let cachedStatus: KeyManagerStatus = {
  totalKeys: 1,
  activeKeyId: "GEMINI_API_KEY",
  activeKeyMasked: "Secured on Server",
  highDemandAutoSwitchEnabled: true,
  keys: [
    {
      id: "GEMINI_API_KEY",
      masked: "Secured on Server",
      status: "ACTIVE",
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      highDemandCount: 0,
      inCooldown: false,
      cooldownRemainingSec: 0,
    },
  ],
};

// Asynchronously fetch live key pool status from backend
async function fetchKeyStatus(): Promise<KeyManagerStatus> {
  try {
    const res = await fetch("/api/gemini/status");
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        cachedStatus = data;
      }
    }
  } catch (err) {
    console.debug("[Client Key Status] Notice:", err);
  }
  return cachedStatus;
}

// Initial eager fetch
if (typeof window !== "undefined") {
  fetchKeyStatus();
}

/**
 * Helper to parse Server-Sent Events (SSE) stream returned by the server.
 */
async function* parseSSEStream(response: Response): AsyncGenerator<{ text?: string; error?: string }> {
  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const payload = trimmed.replace(/^data:\s*/, "");
        if (payload === "[DONE]") {
          return;
        }

        let parsed: any = null;
        try {
          parsed = JSON.parse(payload);
        } catch (e: any) {
          if (e?.message && e.message !== "Unexpected end of JSON input") {
            console.debug("[SSE Chunk Parse Notice]:", e);
          }
          continue;
        }

        if (parsed?.error) {
          throw new Error(parsed.error);
        }
        if (parsed?.text !== undefined) {
          yield { text: parsed.text };
        }
      }
    }

    if (buffer.trim().startsWith("data:")) {
      const payload = buffer.trim().replace(/^data:\s*/, "");
      if (payload !== "[DONE]") {
        let parsed: any = null;
        try {
          parsed = JSON.parse(payload);
        } catch (e: any) {
          console.debug("[SSE trailing chunk parse notice]:", e?.message || e);
        }
        if (parsed?.error) {
          throw new Error(parsed.error);
        }
        if (parsed?.text) {
          yield { text: parsed.text };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Client-Side Gemini Service Proxy.
 * All Gemini model calls are executed safely on the backend server.
 */
export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = targetLang || settings.learning.language;

    const res = await fetch("/api/gemini/note-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task, language }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to process note");
    }
    return data.text || "";
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

    const res = await fetch("/api/gemini/note-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, chapter, templateType, language }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to generate note template");
    }
    return data.text || "";
  },

  /**
   * Generates highly structured, curriculum-aligned notes.
   */
  generateAiNotes: async (params: {
    classGrade: string;
    board: string;
    subject: string;
    language: string;
    chapterName: string;
    author?: string;
    maxCharacters: number;
    difficulty?: DifficultyLevel;
  }): Promise<string> => {
    const res = await fetch("/api/gemini/ai-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to generate AI notes");
    }
    return data.text || "";
  },

  // Alias for backward compatibility with component callers
  generateStudyNotes: async (params: {
    classGrade: string;
    board: string;
    subject: string;
    language: string;
    chapterName: string;
    author?: string;
    maxCharacters: number;
    difficulty?: DifficultyLevel;
  }): Promise<string> => {
    return GeminiService.generateAiNotes(params);
  },

  /**
   * Generates comprehensive chapter summary and notes in streaming mode.
   */
  generateSummaryStream: async (data: StudyRequestData): Promise<AsyncIterable<{ text?: string }>> => {
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const res = await fetch("/api/gemini/summary-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        systemInstruction: `You are an expert academic tutor and notes creator. Personality: ${settings.aiTutor.personality}. You generate high quality, structured syllabus-aligned notes only in ${language}.`,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Summary generation failed (status ${res.status})`);
    }

    return parseSSEStream(res);
  },

  /**
   * Solves homework queries and attachments in streaming mode.
   */
  solveHomeworkStream: async (data: StudyRequestData, files: HomeworkFile[] = []): Promise<AsyncIterable<{ text?: string }>> => {
    const settings = SettingsService.getSettings();
    const language = data.language || settings.learning.language;

    const res = await fetch("/api/gemini/homework-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
        files,
        systemInstruction: `You are an expert Homework Solver and Academic Tutor. Tone: ${settings.aiTutor.personality}. You generate content only in ${language}.`,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Homework solver failed (status ${res.status})`);
    }

    return parseSSEStream(res);
  },

  /**
   * Generates a syllabus-aligned multiple choice quiz.
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const res = await fetch("/api/gemini/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || "Failed to generate quiz");
    }
    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      throw new Error("The AI did not return any quiz questions. Please try again.");
    }
    return body.questions;
  },

  /**
   * Generates an exam preparation timetable.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

    const res = await fetch("/api/gemini/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examDate, subjects, hoursPerDay, language }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || "Failed to generate timetable");
    }
    return body.timetable || [];
  },

  /**
   * Updates an existing timetable with custom instructions.
   */
  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language;

    const res = await fetch("/api/gemini/timetable/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTimetable, instruction, language }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || "Failed to update timetable");
    }
    return body.timetable || [];
  },

  /**
   * Single-turn chat with AI tutor (non-streaming).
   */
  chatWithTutor: async (text: string, history: any[], imagesBase64: string[] = []): Promise<string> => {
    const systemInstruction = SettingsService.getTutorSystemInstruction();

    const res = await fetch("/api/gemini/tutor-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, history, imagesBase64, systemInstruction }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || "Failed to chat with tutor");
    }
    return body.text || "";
  },

  /**
   * Multi-turn chat with AI tutor in streaming mode.
   */
  chatWithTutorStream: async (
    text: string,
    history: any[],
    imagesBase64: string[] = [],
    extraFiles: { name: string; type: string; dataUrl: string; textContent?: string }[] = [],
    userContext?: string
  ): Promise<AsyncIterable<{ text?: string }>> => {
    const systemInstruction = SettingsService.getTutorSystemInstruction();

    const res = await fetch("/api/gemini/tutor-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        history,
        imagesBase64,
        extraFiles,
        userContext,
        systemInstruction,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Tutor chat stream failed (status ${res.status})`);
    }

    return parseSSEStream(res);
  },

  /**
   * Validates a UPI payment screenshot.
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number): Promise<{ isValid: boolean; reason: string }> => {
    const res = await fetch("/api/gemini/validate-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, planName, price }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || "Failed to validate payment");
    }
    return { isValid: body.isValid, reason: body.reason };
  },

  /**
   * AI Tutor responses inside student study group chat.
   */
  askGroupAiTutor: async (groupName: string, subject: string, prompt: string): Promise<string> => {
    const settings = SettingsService.getSettings();
    const language = settings.learning.language || "English";

    const res = await fetch("/api/gemini/group-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupName, subject, prompt, language }),
    });

    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.error || "Failed to get group tutor response");
    }
    return body.text || "";
  },

  /**
   * Creates a live bidirectional voice session using the server-side Gemini Live API bridge.
   * Low latency: 16kHz PCM input / 24kHz PCM output.
   */
  connectLiveVoiceSession: (callbacks: {
    onAudioChunk?: (base64_24k_pcm: string) => void;
    onTranscript?: (text: string) => void;
    onInterrupted?: () => void;
    onError?: (err: string) => void;
    onClose?: () => void;
  }) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/gemini/live`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.audio && callbacks.onAudioChunk) {
          callbacks.onAudioChunk(msg.audio);
        }
        if (msg.transcript && callbacks.onTranscript) {
          callbacks.onTranscript(msg.transcript);
        }
        if (msg.interrupted && callbacks.onInterrupted) {
          callbacks.onInterrupted();
        }
        if (msg.error && callbacks.onError) {
          callbacks.onError(msg.error);
        }
        if (msg.closed && callbacks.onClose) {
          callbacks.onClose();
        }
      } catch (err: any) {
        console.warn("[Live Voice WS Parse Warning]:", err);
      }
    };

    ws.onerror = (e) => {
      callbacks.onError?.(`WebSocket connection error to Gemini Live: ${(e as any)?.message || "connection failed"}`);
    };

    ws.onclose = () => {
      callbacks.onClose?.();
    };

    return {
      sendAudio: (base64_16k_pcm: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ audio: base64_16k_pcm }));
        }
      },
      sendVideoFrame: (base64_jpeg: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ video: base64_jpeg }));
        }
      },
      sendText: (text: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ text }));
        }
      },
      close: () => {
        try {
          ws.close();
        } catch (e: any) {
          console.debug("[Client Live WS close notice]:", e?.message || e);
        }
      },
    };
  },

  // Key status and refresh helpers used in Settings > System
  getKeyCount: () => cachedStatus.totalKeys,
  getKeyStatus: () => cachedStatus,
  refreshKeyPool: () => {
    fetch("/api/gemini/refresh", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) cachedStatus = d;
      })
      .catch((e) => console.debug("Refresh key pool notice:", e));
    return cachedStatus.keys as any[];
  },
};
