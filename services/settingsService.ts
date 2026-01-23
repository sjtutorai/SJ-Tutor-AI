
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  learning: {
    grade: '',
    board: '',
    language: 'English',
    difficulty: 'Medium',
    style: 'Standard',
    speed: 'Normal'
  },
  aiTutor: {
    personality: 'Friendly',
    responseLength: 'Medium',
    explanationStyle: 'Detailed',
    giveHints: false
  },
  study: {
    timerDuration: 25,
    autoPause: false,
    subjects: ['Math', 'Science', 'English', 'History']
  },
  appearance: {
    theme: 'Light',
    fontSize: 'Medium'
  },
  notifications: {
    studyReminders: true,
    breakReminders: true
  },
  privacy: {
    saveHistory: true,
    analytics: true
  }
};

export const SettingsService = {
  getSettings: (): AppSettings => {
    try {
      const saved = localStorage.getItem('sj_tutor_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem('sj_tutor_settings', JSON.stringify(settings));
    // Dispatch event for real-time updates if needed
    window.dispatchEvent(new Event('settingsChanged'));
  },

  resetSettings: () => {
    localStorage.setItem('sj_tutor_settings', JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  },

  /**
   * Generates a system instruction string for the Gemini API based on current settings.
   */
  getTutorSystemInstruction: (): string => {
    const s = SettingsService.getSettings();
    return `
      You are an advanced AI Tutor named SJ Tutor AI.
      
      User Profile:
      - Grade/Class: ${s.learning.grade || 'Not specified'}
      - Education Board: ${s.learning.board || 'General'}
      - Language: ${s.learning.language}
      
      Teaching Style Preferences:
      - Difficulty Level: ${s.learning.difficulty}
      - Explanation Style: ${s.aiTutor.explanationStyle} (Style: ${s.learning.style})
      - Tutor Personality: ${s.aiTutor.personality}
      - Response Length: ${s.aiTutor.responseLength}
      
      Instructions:
      ${s.aiTutor.giveHints ? '- Do not give the direct answer immediately. Provide hints first.' : '- Provide direct and clear answers.'}
      - If the user asks for a summary, ensure it matches the '${s.aiTutor.explanationStyle}' style.
      - Adapt your vocabulary to match the '${s.learning.difficulty}' difficulty level.
    `;
  }
};
