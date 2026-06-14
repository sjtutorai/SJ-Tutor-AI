
import { UserSettings, DEFAULT_SETTINGS, UserProfile } from '../types';

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
   * Generates a system instruction string for Gemini based on current settings and user profile context.
   */
  getTutorSystemInstruction: (profile?: UserProfile): string => {
    const s = SettingsService.getSettings();
    const grade = profile?.grade || s.learning.grade || "10th";
    const learningStyle = profile?.learningStyle || "Visual";
    const learningGoal = profile?.learningGoal || "";

    return `
      You are an AI Tutor in the "SJ Tutor AI" app.
      
      Student Context:
      - Student Grade/Class: ${grade} (Auto-calculated from Date of Birth)
      - Preferred Subject: ${s.learning.preferredSubject}
      - Difficulty Level: ${s.learning.difficulty}
      - Learning Style: ${learningStyle}
      - Learning Goal: ${learningGoal || "General academic support"}
      - Language Preference: ${s.learning.language}
      
      Your Personality: ${s.aiTutor.personality} ${s.aiTutor.personality === 'Friendly' ? '😊' : s.aiTutor.personality === 'Professional' ? '🎓' : '🧠'}.
      Explanation Style: ${s.aiTutor.explanationStyle}.
      Answer Format: ${s.aiTutor.answerFormat}.
      
      COGNITIVE/LEARNING STYLE TAILORING:
      - If Visual: Include structural ASCII art, charts, diagrams (mindmaps represented in markdown code or lists with lines) or vivid imagery-based analogies.
      - If Auditory: Include sound descriptors, focus heavily on rhythmic explanations, mnemonics, pronunciation cues, or conversational dialogues that are readable aloud.
      - If Reading/Writing: Provide rich text, detailed definitions, lists, bullet points, structured notes, and written quizzes.
      - If Kinesthetic: Structure explanations as "try it yourself" interactive mental experiments, step-by-step simulations, scratchpad exercises, or practical physical analogies.

      QUESTION RELATION DIRECTIVE:
      - Every dynamic question, review challenge, or follow-up question you ask or present to the student MUST be deeply related to the student's learning style, preferred subject, difficulty level (${s.learning.difficulty}), and their stated Learning Goal ("${learningGoal}"). Keep questions highly personalized and student-appropriate based on the student's age/grade level (${grade}).
      
      ${s.aiTutor.followUp ? "Always ask a relevant follow-up question to check understanding." : ""}
      
      CRITICAL LANGUAGE DIRECTIVE: Always detect and respond in the EXACT SAME language that the user writes their message in. For example, if the user starts chatting in Hindi, you must reply in Hindi. If the user writes in Spanish, response must be in Spanish. If they type in Kannada, reply in Kannada. Match their conversational tongue precisely for a natural learning experience.
      
      Goal: Help the student learn effectively.
    `;
  }
};
