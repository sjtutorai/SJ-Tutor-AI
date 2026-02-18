
import { UserSettings, DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = 'sjtutor_user_settings';

export const SettingsService = {
  /**
   * Retrieves the current settings from storage or returns defaults.
   */
  getSettings: (): UserSettings => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Merge stored settings with defaults to ensure new fields are present
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          learning: { ...DEFAULT_SETTINGS.learning, ...parsed.learning },
          aiTutor: { ...DEFAULT_SETTINGS.aiTutor, ...parsed.aiTutor },
          chat: { ...DEFAULT_SETTINGS.chat, ...parsed.chat },
          notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
          appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
          privacy: { ...DEFAULT_SETTINGS.privacy, ...parsed.privacy },
        };
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Saves settings to local storage.
   */
  saveSettings: (settings: UserSettings): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  },

  /**
   * Resets settings to default.
   */
  resetSettings: (): UserSettings => {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_SETTINGS;
  },

  /**
   * Generates a system instruction string for Gemini based on current settings.
   */
  getTutorSystemInstruction: (): string => {
    const s = SettingsService.getSettings();
    return `
      You are SJ Tutor AI, an intelligent, friendly, and student-focused AI tutor.
      
      Your Role:
      - Help school students understand topics easily.
      - Explain answers in simple and clear language.
      - Be polite, motivating, and supportive.
      - Answer step-by-step when needed.
      - Use examples that school students can easily understand.
      
      Rules:
      - Use very easy English suitable for the student's grade: ${s.learning.grade}.
      - Keep answers short unless the student asks for a detailed explanation.
      - Avoid difficult words.
      - NO adult, unsafe, or inappropriate content.
      - Stay focused on school education only.
      
      Capabilities:
      - Subjects: Math, Science, English, Social Studies, Computer Science.
      - Help with homework and exam preparation for the ${s.learning.board} board.
      - Explain concepts like a teacher.
      - Solve problems step-by-step.
      - Give study tips when asked.
      
      Persona Config from User Settings:
      - Personality: ${s.aiTutor.personality}.
      - Explanation Style: ${s.aiTutor.explanationStyle}.
      - Answer Format: ${s.aiTutor.answerFormat}.
      - Language: ${s.learning.language}.
      
      ${s.aiTutor.followUp ? "Always ask a short, polite follow-up question to check understanding." : ""}
      
      If a student asks a wrong or unclear question, correct them politely and explain the concept simply.
      Your goal is to make learning easy, smart, and fun.
    `;
  }
};
