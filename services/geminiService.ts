import { StudyRequestData, QuizQuestion, TimetableEntry, NoteTemplate } from "../types";
import { SettingsService } from "./settingsService";

export const GeminiService = {
  /**
   * Enhances existing note content based on specific tasks.
   */
  processNoteAI: async (content: string, task: 'summarize' | 'simplify' | 'mcq' | 'translate', targetLang?: string): Promise<string> => {
    const settings = SettingsService.getSettings();
    const response = await fetch("/api/gemini/processNoteAI", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, task, targetLang, settings }),
    });
    if (!response.ok) {
      throw new Error("Failed to process note using AI on the server.");
    }
    const data = await response.json();
    return data.text;
  },

  /**
   * Generates a structural template for a specific topic.
   */
  generateNoteTemplate: async (subject: string, chapter: string, templateType: NoteTemplate): Promise<string> => {
    const settings = SettingsService.getSettings();
    const response = await fetch("/api/gemini/generateNoteTemplate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, chapter, templateType, settings }),
    });
    if (!response.ok) {
      throw new Error("Failed to generate note template on the server.");
    }
    const data = await response.json();
    return data.text;
  },

  generateSummaryStream: async function* (data: StudyRequestData) {
    const settings = SettingsService.getSettings();
    const response = await fetch("/api/gemini/generateSummaryStream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, settings }),
    });
    if (!response.ok) {
      throw new Error("Failed to generate summary stream on the server.");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      yield { text };
    }
  },

  solveHomeworkStream: async function* (data: StudyRequestData, imagesBase64: string[] = []) {
    const settings = SettingsService.getSettings();
    const response = await fetch("/api/gemini/solveHomeworkStream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, imagesBase64, settings }),
    });
    if (!response.ok) {
      throw new Error("Failed to solve homework stream on the server.");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No reader available");

    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      yield { text };
    }
  },

  generateQuiz: async (data: StudyRequestData): Promise<QuizQuestion[]> => {
    const settings = SettingsService.getSettings();
    const response = await fetch("/api/gemini/generateQuiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, settings }),
    });
    if (!response.ok) {
      throw new Error("Failed to generate quiz on the server.");
    }
    return response.json();
  },

  generateStudyTimetable: async (examDate: string, subjects: string, hoursPerDay: number): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const response = await fetch("/api/gemini/generateStudyTimetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examDate, subjects, hoursPerDay, settings }),
    });
    if (!response.ok) {
      throw new Error("Failed to generate study timetable on the server.");
    }
    return response.json();
  },

  updateStudyTimetable: async (currentTimetable: TimetableEntry[], instruction: string): Promise<TimetableEntry[]> => {
    const settings = SettingsService.getSettings();
    const response = await fetch("/api/gemini/updateStudyTimetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentTimetable, instruction, settings }),
    });
    if (!response.ok) {
      throw new Error("Failed to update study timetable on the server.");
    }
    return response.json();
  },

  createTutorChat: () => {
    return new ClientChatSession();
  },

  validatePaymentScreenshot: async (imageBase64: string, planName: string, price: number) => {
    const response = await fetch("/api/gemini/validatePaymentScreenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, planName, price }),
    });
    if (!response.ok) {
      throw new Error("Failed to validate payment screenshot on the server.");
    }
    return response.json();
  }
};

class ClientChatSession {
  private history: { role: string; text: string }[] = [];

  constructor() {}

  async *sendMessageStream({ message }: { message: string }) {
    this.history.push({ role: 'user', text: message });
    const systemInstruction = SettingsService.getTutorSystemInstruction();

    const response = await fetch('/api/gemini/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: this.history, systemInstruction })
    });
    if (!response.ok) {
      throw new Error('Failed to generate chat stream response from server.');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');
    
    const decoder = new TextDecoder();
    let done = false;
    let accumulation = "";
    
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value, { stream: !done });
        accumulation += chunk;
        yield { text: chunk };
      }
    }
    this.history.push({ role: 'model', text: accumulation });
  }
}
