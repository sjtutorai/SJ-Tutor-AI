
import { UserSettings, DEFAULT_SETTINGS } from '../types';
import { auth } from '../firebaseConfig';
import { calculateGradeFromAge } from '../utils/profileUtils';

const STORAGE_KEY = 'sjtutor_user_settings';

export const SettingsService = {
  /**
   * Retrieves the current settings from storage or returns defaults.
   */
  getSettings: (): UserSettings => {
    let settings = DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Merge stored settings with defaults to ensure new fields are present
        const parsed = JSON.parse(stored);
        settings = {
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

    // Sync from active profile's Date of Birth to calculate Grade / Class
    try {
      const uid = auth.currentUser?.uid;
      let profileStr = uid ? localStorage.getItem(`profile_${uid}`) : null;
      if (!profileStr) {
        const keys = Object.keys(localStorage);
        const profileKey = keys.find(k => k.startsWith('profile_'));
        if (profileKey) {
          profileStr = localStorage.getItem(profileKey);
        }
      }

      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.dob) {
          const calculatedGrade = calculateGradeFromAge(profile.dob);
          if (calculatedGrade) {
            settings.learning.grade = calculatedGrade;
          }
        } else if (profile.grade) {
          settings.learning.grade = profile.grade;
        }
      }
    } catch (err) {
      console.error("Failed to sync profile grade to settings", err);
    }

    return settings;
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

    // Fetch the active profile to retrieve detailed learning style and main learning goal
    let learningGoal = "";
    let learningStyle = "Visual";
    try {
      const uid = auth.currentUser?.uid;
      let profileStr = uid ? localStorage.getItem(`profile_${uid}`) : null;
      if (!profileStr) {
        const keys = Object.keys(localStorage);
        const profileKey = keys.find(k => k.startsWith('profile_'));
        if (profileKey) {
          profileStr = localStorage.getItem(profileKey);
        }
      }
      if (profileStr) {
        const profile = JSON.parse(profileStr);
        if (profile.learningGoal) {
          learningGoal = profile.learningGoal;
        }
        if (profile.learningStyle) {
          learningStyle = profile.learningStyle;
        }
      }
    } catch (e) {
      console.error("Failed to fetch profile info for tutor system instruction", e);
    }

    return `
      You are an AI Tutor in the "SJ Tutor AI" app.
      
      Your Personality: ${s.aiTutor.personality} ${s.aiTutor.personality === 'Friendly' ? '😊' : s.aiTutor.personality === 'Professional' ? '🎓' : '🧠'}.
      Explanation Style: ${s.aiTutor.explanationStyle}.
      Answer Format: ${s.aiTutor.answerFormat}.
      Language Preference: ${s.learning.language}.
      Student Grade/Class: ${s.learning.grade}.
      
      Student Learning Preferences:
      - Preferred Learning Style: ${learningStyle}. Tailor your teaching methodology, examples, diagrams, explanations, and questions to match this style (e.g., use highly graphic analogies/text formats for Visual, collaborative/discussion prompts for Auditory, rich academic texts/summaries for Reading/Writing, hands-on tasks/mini-activities/examples for Kinesthetic).
      - Main Learning Goal: ${learningGoal || "General concept mastery and continuous school success"}. Always guide explanations, follow-up questions, and examples to directly target and fulfill this goal.
      
      ${s.aiTutor.followUp ? "Always ask a relevant follow-up question, concept-check question, or active-recall quiz question to check the student's understanding, ensuring it matches their learning style and goals." : ""}
      
      Goal: Help the student learn effectively while adhering strictly to their stated learning style, goals, and class/grade level.
    `;
  }
};
