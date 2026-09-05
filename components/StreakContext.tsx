import React, { createContext, useContext } from 'react';

interface StreakContextType {
  streak: {
    currentStreak: number;
    highestStreak: number;
    lastStudyDate: string | null;
    streakHistory: string[];
    claimedMilestones: number[];
  };
  recordActivity: () => Promise<{ success: boolean; incremented: boolean; milestoneReached: number | null }>;
}

const defaultContext: StreakContextType = {
  streak: {
    currentStreak: 0,
    highestStreak: 0,
    lastStudyDate: null,
    streakHistory: [],
    claimedMilestones: [],
  },
  recordActivity: async () => ({ success: true, incremented: false, milestoneReached: null }),
};

const StreakContext = createContext<StreakContextType>(defaultContext);

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <StreakContext.Provider value={defaultContext}>
      {children}
    </StreakContext.Provider>
  );
};

export const useStreak = () => {
  return useContext(StreakContext);
};

export default StreakContext;
