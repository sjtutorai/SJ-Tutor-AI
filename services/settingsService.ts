
import { UserSettings, DEFAULT_SETTINGS } from '../types';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { removeUndefinedFields } from '../utils/firebaseUtils';

let isSyncingFromRemote = false;

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
          calls: { ...DEFAULT_SETTINGS.calls, ...parsed.calls },
        };
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
    return DEFAULT_SETTINGS;
  },

  /**
   * Saves settings to local storage and syncs to Firestore.
   */
  saveSettings: (settings: UserSettings): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      
      const currentUid = auth.currentUser?.uid || localStorage.getItem('sjtutor_active_id_session');
      if (currentUid && !isSyncingFromRemote) {
        const cleanSettings = removeUndefinedFields(settings);
        const userSettingsRef = doc(db, "userSettings", currentUid);
        setDoc(userSettingsRef, cleanSettings, { merge: true }).catch(err => {
          console.error("Failed to sync settings to Firestore userSettings collection", err);
        });

        // Also update users collection for backup
        const userDocRef = doc(db, "users", currentUid);
        setDoc(userDocRef, { settings: cleanSettings }, { merge: true }).catch(err => {
          console.warn("Failed to sync settings to users doc", err);
        });
      }
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
        privacy: { ...current.privacy, ...(partialSettings.privacy || {}) },
        calls: { ...current.calls, ...(partialSettings.calls || {}) },
      };
      SettingsService.saveSettings(updated);
      window.dispatchEvent(new Event('settings-changed'));
    } catch (e) {
      console.error("Failed to update settings", e);
    }
  },

  /**
   * Applies settings from Firestore without triggering an infinite upload loop.
   */
  applyRemoteSettings: (remoteSettings: any): void => {
    try {
      isSyncingFromRemote = true;
      const current = SettingsService.getSettings();
      const updated = {
        ...current,
        ...remoteSettings,
        learning: { ...current.learning, ...(remoteSettings.learning || {}) },
        aiTutor: { ...current.aiTutor, ...(remoteSettings.aiTutor || {}) },
        chat: { ...current.chat, ...(remoteSettings.chat || {}) },
        notifications: { ...current.notifications, ...(remoteSettings.notifications || {}) },
        appearance: { ...current.appearance, ...(remoteSettings.appearance || {}) },
        privacy: { ...current.privacy, ...(remoteSettings.privacy || {}) },
        calls: { ...current.calls, ...(remoteSettings.calls || {}) },
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('settings-changed'));
    } catch (e) {
      console.error("Failed to apply remote settings", e);
    } finally {
      isSyncingFromRemote = false;
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
