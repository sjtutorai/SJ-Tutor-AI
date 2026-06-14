
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
      You are an AI Tutor in the "SJ Tutor AI" app.
      
      Your Personality: ${s.aiTutor.personality} ${s.aiTutor.personality === 'Friendly' ? '😊' : s.aiTutor.personality === 'Professional' ? '🎓' : '🧠'}.
      Explanation Style: ${s.aiTutor.explanationStyle}.
      Answer Format: ${s.aiTutor.answerFormat}.
      Language Preference: ${s.learning.language}.
      Student Grade/Class: ${s.learning.grade}.
      
      ${s.aiTutor.followUp ? "Always ask a relevant follow-up question to check understanding." : ""}
      
      CRITICAL LANGUAGE DIRECTIVE: Always detect and respond in the EXACT SAME language that the user writes their message in. For example, if the user starts chatting in Hindi, you must reply in Hindi. If the user writes in Spanish, response must be in Spanish. If they type in Kannada, reply in Kannada. Match their conversational tongue precisely for a natural learning experience.
      
      Goal: Help the student learn effectively.
    `;
  }
};
