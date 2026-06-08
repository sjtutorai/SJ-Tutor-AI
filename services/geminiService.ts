import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate, ChatMessage } from "../types";
import { SettingsService } from "./settingsService";

async function* streamFetchHelper(responsePromise: Promise<Response>) {
  const response = await responsePromise;
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.message || `HTTP ${response.status}`);
  }
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
            if (e.message?.includes("GEMINI_API_KEY_MISSING")) {
              throw e;
            }
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
    const res = await fetch("/api/gemini/process-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task, targetLang, settings })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.text;
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate) => {
    const settings = SettingsService.getSettings();
    const res = await fetch("/api/gemini/generate-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, chapter, templateType, settings })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.text;
  },

  /**
   * Generates a summarized streaming response from the server-side API.
   */
  generateSummaryStream: async (data: StudyRequestData) => {
    const settings = SettingsService.getSettings();
    const responsePromise = fetch("/api/gemini/summary-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, settings })
    });
    return streamFetchHelper(responsePromise);
  },

  /**
   * Solves a homework or problem set streaming response from the server-side API.
   */
  solveHomeworkStream: async (data: StudyRequestData, imagesBase64: string[] = []) => {
    const settings = SettingsService.getSettings();
    const responsePromise = fetch("/api/gemini/solve-homework-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, imagesBase64, settings })
    });
    return streamFetchHelper(responsePromise);
  },

  /**
   * Generates quiz questions.
   */
  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const settings = SettingsService.getSettings();
    const res = await fetch("/api/gemini/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, settings })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Generates a study timetable up to the exam date.
   */
  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const res = await fetch("/api/gemini/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examDate, subjects, hoursPerDay, settings })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Updates an existing timetable based on user instructions.
   */
  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const res = await fetch("/api/gemini/timetable-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTimetable, instruction, settings })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  },

  /**
   * Mocks the Chat session API pattern on top of stateless Server-Sent Events.
   */
  createTutorChat: () => {
    const chatHistory: ChatMessage[] = [];
    return {
      sendMessageStream: async ({ message }: { message: string }) => {
        const settings = SettingsService.getSettings();
        // Request the stream from the server using the accumulated conversation history
        const responsePromise = fetch("/api/gemini/chat-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...chatHistory],
            latestMessage: message,
            settings
          })
        });

        // Add user statement to history
        chatHistory.push({ role: 'user', text: message, timestamp: Date.now() });

        const streamGen = streamFetchHelper(responsePromise);
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
    const res = await fetch("/api/gemini/validate-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, planName, price })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  }
};
