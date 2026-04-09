
import { UserProfile, Badge, LeaderboardEntry } from '../types';

export const BADGES: Badge[] = [
  { id: 'first_summary', name: 'Summary Starter', description: 'Generated your first summary', icon: '📝' },
  { id: 'quiz_master', name: 'Quiz Master', description: 'Scored 100% on a hard quiz', icon: '🏆' },
  { id: 'essay_expert', name: 'Essay Expert', description: 'Wrote 5 essays', icon: '✍️' },
  { id: 'streak_3', name: '3-Day Streak', description: 'Studied for 3 consecutive days', icon: '🔥' },
  { id: 'streak_7', name: 'Week Warrior', description: 'Studied for 7 consecutive days', icon: '⚡' },
  { id: 'top_10', name: 'Elite Scholar', description: 'Reached top 10 on the leaderboard', icon: '🌟' },
];

export const GamificationService = {
  calculatePoints: (action: 'summary' | 'quiz' | 'essay' | 'chat' | 'quiz_perfect', difficulty?: string) => {
    switch (action) {
      case 'summary': return 10;
      case 'quiz': return 15;
      case 'essay': return 20;
      case 'chat': return 5;
      case 'quiz_perfect': return 50;
      default: return 0;
    }
  },

  updateStreak: (lastActiveDate?: number, currentStreak: number = 0): { newStreak: number, shouldUpdate: boolean } => {
    if (!lastActiveDate) return { newStreak: 1, shouldUpdate: true };

    const today = new Date().setHours(0, 0, 0, 0);
    const last = new Date(lastActiveDate).setHours(0, 0, 0, 0);
    const diff = (today - last) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      return { newStreak: currentStreak + 1, shouldUpdate: true };
    } else if (diff > 1) {
      return { newStreak: 1, shouldUpdate: true };
    }
    
    return { newStreak: currentStreak, shouldUpdate: false };
  },

  checkNewBadges: (profile: UserProfile, history: any[]): string[] => {
    const newBadges: string[] = [];
    const earned = new Set(profile.badges || []);

    if (!earned.has('first_summary') && history.some(h => h.type === 'SUMMARY')) {
      newBadges.push('first_summary');
    }

    const hardQuizzes = history.filter(h => h.type === 'QUIZ' && h.formData?.difficulty === 'Hard');
    if (!earned.has('quiz_master') && hardQuizzes.some(q => q.score === q.formData?.questionCount)) {
      newBadges.push('quiz_master');
    }

    if (!earned.has('essay_expert') && history.filter(h => h.type === 'ESSAY').length >= 5) {
      newBadges.push('essay_expert');
    }

    if (!earned.has('streak_3') && profile.streak >= 3) {
      newBadges.push('streak_3');
    }

    if (!earned.has('streak_7') && profile.streak >= 7) {
      newBadges.push('streak_7');
    }

    return newBadges;
  }
};
