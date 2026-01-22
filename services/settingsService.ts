
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
   * Saves settings to local storage and notifies listeners.
   */
  saveSettings: (settings: UserSettings): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      // Dispatch a custom event so the App can react immediately (e.g. for Dark Mode)
      window.dispatchEvent(new Event('settings-changed'));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  },

  /**
   * Resets settings to default.
   */
  resetSettings: (): UserSettings => {
    localStorage.removeItem(STORAGE_KEY);
    const defaults = DEFAULT_SETTINGS;
    window.dispatchEvent(new Event('settings-changed'));
    return defaults;
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
      
      Goal: Help the student learn effectively.
    `;
  }
};
