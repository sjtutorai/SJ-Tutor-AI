import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, ChatMessage } from "../types";
import { SettingsService } from "./settingsService";
import { ApiLogger } from "./apiLogger";

async function* streamFetchHelper(responsePromise: Promise<Response>, endpoint: string, payload: any) {
  let response: Response;
  try {
    response = await responsePromise;
  } catch (err: any) {
    ApiLogger.log(endpoint, 0, payload, err.message || "Network request failed");
    throw err;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMsg = errorBody.error || errorBody.message || `HTTP ${response.status}`;
    ApiLogger.log(endpoint, response.status, payload, errorMsg);
    throw new Error(errorMsg);
  }

  // Log successful initiation
  ApiLogger.log(endpoint, response.status, payload);

  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const raw = trimmed.slice(6).trim();
          if (raw === '[DONE]') {
            return;
          }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            yield parsed;
          } catch (e: any) {
            console.error("Stream reader parse error:", e);
            throw e;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string) => {
    const settings = SettingsService.getSettings();
    const endpoint = "/api/gemini/process-note";
    const payload = { content, task, targetLang, settings };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || `HTTP ${res.status}`;
        ApiLogger.log(endpoint, res.status, payload, errorMsg);
        throw new Error(errorMsg);
      }
      const data = await res.json();
      ApiLogger.log(endpoint, res.status, payload);
      return data.text;
    } catch (err: any) {
      if (!err.message || !err.message.includes("HTTP")) {
        ApiLogger.log(endpoint, 0, payload, err.message);
      }
      throw err;
    }
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const settings = SettingsService.getSettings();
    const endpoint = "/api/gemini/generate-template";
    const payload = { subject, chapter, templateType, settings };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || `HTTP ${res.status}`;
        ApiLogger.log(endpoint, res.status, payload, errorMsg);
        throw new Error(errorMsg);
      }
      const data = await res.json();
      ApiLogger.log(endpoint, res.status, payload);
      return data.text;
    } catch (err: any) {
      if (!err.message || !err.message.includes("HTTP")) {
        ApiLogger.log(endpoint, 0, payload, err.message);
      }
      throw err;
    }
  },

  /**
   * Generates a summarized streaming response from the server-side API.
   */
  generateSummaryStream: async (data: StudyRequestData) => {
    const settings = SettingsService.getSettings();
    const endpoint = "/api/gemini/summary-stream";
    const payload = { data, settings };
    const responsePromise = fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return streamFetchHelper(responsePromise, endpoint, payload);
  },

  /**
   * Solves a homework or problem set streaming response from the server-side API.
   */
  solveHomeworkStream: async (data: StudyRequestData, imagesBase64: string[] = []) => {
    const settings = SettingsService.getSettings();
    const endpoint = "/api/gemini/solve-homework-stream";
    const payload = { data, imagesBase64, settings };
    const responsePromise = fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return streamFetchHelper(responsePromise, endpoint, payload);
  },

  /**
   * Generates quiz questions.
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const settings = SettingsService.getSettings();
    const endpoint = "/api/gemini/quiz";
    const payload = { data, settings };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || `HTTP ${res.status}`;
        ApiLogger.log(endpoint, res.status, payload, errorMsg);
        throw new Error(errorMsg);
      }
      const quizRes = await res.json();
      ApiLogger.log(endpoint, res.status, payload);
      return quizRes;
    } catch (err: any) {
      if (!err.message || !err.message.includes("HTTP")) {
        ApiLogger.log(endpoint, 0, payload, err.message);
      }
      throw err;
    }
  },

  /**
   * Generates a study timetable up to the exam date.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const endpoint = "/api/gemini/timetable";
    const payload = { examDate, subjects, hoursPerDay, settings };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || `HTTP ${res.status}`;
        ApiLogger.log(endpoint, res.status, payload, errorMsg);
        throw new Error(errorMsg);
      }
      const ttRes = await res.json();
      ApiLogger.log(endpoint, res.status, payload);
      return ttRes;
    } catch (err: any) {
      if (!err.message || !err.message.includes("HTTP")) {
        ApiLogger.log(endpoint, 0, payload, err.message);
      }
      throw err;
    }
  },

  /**
   * Updates an existing timetable based on user instructions.
   */
  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const endpoint = "/api/gemini/timetable-update";
    const payload = { currentTimetable, instruction, settings };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || `HTTP ${res.status}`;
        ApiLogger.log(endpoint, res.status, payload, errorMsg);
        throw new Error(errorMsg);
      }
      const ttRes = await res.json();
      ApiLogger.log(endpoint, res.status, payload);
      return ttRes;
    } catch (err: any) {
      if (!err.message || !err.message.includes("HTTP")) {
        ApiLogger.log(endpoint, 0, payload, err.message);
      }
      throw err;
    }
  },

  /**
   * Mocks the Chat session API pattern on top of stateless Server-Sent Events.
   */
  createTutorChat: () => {
    const chatHistory: ChatMessage[] = [];
    return {
      sendMessageStream: async ({ message }: { message: string }) => {
        const settings = SettingsService.getSettings();
        const endpoint = "/api/gemini/chat-stream";
        const payload = {
          messages: [...chatHistory],
          latestMessage: message,
          settings
        };
        const responsePromise = fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        // Add user statement to history
        chatHistory.push({ role: 'user', text: message, timestamp: Date.now() });

        const streamGen = streamFetchHelper(responsePromise, endpoint, payload);
        let fullAssistantText = '';

        async function* handleResponse() {
          for await (const chunk of streamGen) {
            if (chunk.text) {
              fullAssistantText += chunk.text;
            }
            yield chunk;
          }
          // Record the final response from assistant once streaming terminates
          chatHistory.push({ role: 'model', text: fullAssistantText, timestamp: Date.now() });
        }

        return handleResponse();
      }
    };
  },

  /**
   * Validates a paid subscription screenshot.
   */
  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const endpoint = "/api/gemini/validate-payment";
    const payload = { imageBase64, planName, price };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || `HTTP ${res.status}`;
        ApiLogger.log(endpoint, res.status, payload, errorMsg);
        throw new Error(errorMsg);
      }
      const validateRes = await res.json();
      ApiLogger.log(endpoint, res.status, payload);
      return validateRes;
    } catch (err: any) {
      if (!err.message || !err.message.includes("HTTP")) {
        ApiLogger.log(endpoint, 0, payload, err.message);
      }
      throw err;
    }
  }
};
