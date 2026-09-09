
import { UserSettings, DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = 'sjtutor_user_settings';

/**
 * Ensures user-specific authentication secrets (PIN, 2FA passwords, security recovery questions)
 * are NEVER stored in or leaked through global browser-wide settings.
 */
const sanitizePrivacy = (privacy: any) => {
  if (!privacy) return { ...DEFAULT_SETTINGS.privacy };
  return {
    ...privacy,
    pin: '',
    twoFactorPassword: '',
    securityQuestion: '',
    securityAnswer: '',
    pinLock: false,
    twoFactor: false,
  };
};

export const SettingsService = {
  /**
   * Cleans any legacy credentials that may have been saved in global settings
   */
  scrubLegacyGlobalSecrets: (): void => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.privacy && (parsed.privacy.pin || parsed.privacy.twoFactorPassword || parsed.privacy.securityQuestion || parsed.privacy.securityAnswer)) {
          parsed.privacy = sanitizePrivacy(parsed.privacy);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } catch {
      // ignore
    }
  },

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
          privacy: sanitizePrivacy(parsed.privacy),
          calls: { ...DEFAULT_SETTINGS.calls, ...parsed.calls },
        };
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Saves settings to local storage, always sanitizing sensitive privacy fields.
   */
  saveSettings: (settings: UserSettings): void => {
    try {
      const sanitized = {
        ...settings,
        privacy: sanitizePrivacy(settings.privacy),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  },

  /**
   * Partially updates current settings and fires settings-changed event.
   */
  updateSettings: (partialSettings: any): void => {
    try {
      const current = SettingsService.getSettings();
      const updated = {
        ...current,
        ...partialSettings,
        learning: { ...current.learning, ...(partialSettings.learning || {}) },
        aiTutor: { ...current.aiTutor, ...(partialSettings.aiTutor || {}) },
        chat: { ...current.chat, ...(partialSettings.chat || {}) },
        notifications: { ...current.notifications, ...(partialSettings.notifications || {}) },
        appearance: { ...current.appearance, ...(partialSettings.appearance || {}) },
        privacy: sanitizePrivacy({ ...current.privacy, ...(partialSettings.privacy || {}) }),
        calls: { ...current.calls, ...(partialSettings.calls || {}) },
      };
      SettingsService.saveSettings(updated);
      window.dispatchEvent(new Event('settings-changed'));
    } catch (e) {
      console.error("Failed to update settings", e);
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
      
      Goal: Help the student learn effectively.
    `;
  }
};
