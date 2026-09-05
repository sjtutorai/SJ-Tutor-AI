import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';

export interface StreakMilestone {
  days: number;
  title: string;
  rewardCredits: number;
  badge: string;
  color: string;
  description: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, title: 'Spark Starter', rewardCredits: 10, badge: '🥉', color: 'from-amber-600 to-amber-800', description: '3 Days of Continuous Learning' },
  { days: 7, title: '7-Day Scholar', rewardCredits: 25, badge: '🥈', color: 'from-slate-400 to-slate-600', description: '7 Days of Dedicated Study' },
  { days: 14, title: '14-Day Fortnight Hero', rewardCredits: 50, badge: '🥇', color: 'from-yellow-500 to-amber-600', description: '14 Days of Relentless Focus' },
  { days: 21, title: '21-Day Habit Master', rewardCredits: 75, badge: '🏆', color: 'from-cyan-500 to-blue-600', description: '21 Days Habit Formed' },
  { days: 30, title: '30-Day Monthly Legend', rewardCredits: 100, badge: '💎', color: 'from-indigo-500 to-purple-600', description: '30 Days Unstoppable Momentum' },
  { days: 50, title: '50-Day Half-Century', rewardCredits: 200, badge: '👑', color: 'from-rose-500 to-red-600', description: '50 Days of Academic Excellence' },
  { days: 100, title: '100-Day Century Master', rewardCredits: 500, badge: '⚡', color: 'from-amber-400 to-orange-600', description: '100 Days Epic Century Milestone' },
  { days: 365, title: '365-Day Grand Sage', rewardCredits: 1000, badge: '🌟', color: 'from-yellow-400 via-amber-500 to-orange-500', description: '1 Full Year of Learning Mastery' }
];

export interface StreakData {
  uid?: string;
  displayName?: string;
  photoURL?: string;
  currentStreak: number;
  highestStreak: number;
  lastStudyDate: string | null;
  lastActivityDate: string | null;
  lastStudyTimestamp?: number;
  streakHistory: string[];
  streakFreezes?: number;
  streakFreezeDates?: string[];
  claimedMilestones: number[];
  updatedAt?: number;
}

export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const canClaimStreakIncrease = (streak: { lastStudyTimestamp?: number; lastStudyDate?: string | null }): boolean => {
  if (!streak.lastStudyTimestamp && !streak.lastStudyDate) {
    // Fresh user - can claim their first streak day on their first study activity
    return true;
  }
  const now = Date.now();
  if (typeof streak.lastStudyTimestamp === 'number' && streak.lastStudyTimestamp > 0) {
    return now - streak.lastStudyTimestamp >= TWENTY_FOUR_HOURS_MS;
  }
  // Fallback to calendar date if timestamp wasn't stored yet
  const today = getLocalDateString();
  return streak.lastStudyDate !== today;
};

export const getTimeUntilNextStreakClaim = (streak: { lastStudyTimestamp?: number; lastStudyDate?: string | null }): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  canClaim: boolean;
} => {
  if (canClaimStreakIncrease(streak)) {
    return { hours: 0, minutes: 0, seconds: 0, totalMs: 0, canClaim: true };
  }
  const now = Date.now();
  const timestamp = streak.lastStudyTimestamp || 0;
  const elapsed = now - timestamp;
  const remainingMs = Math.max(0, TWENTY_FOUR_HOURS_MS - elapsed);
  
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return {
    hours,
    minutes,
    seconds,
    totalMs: remainingMs,
    canClaim: false,
  };
};

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  currentStreak: number;
  highestStreak: number;
  lastStudyDate?: string;
}

export interface StreakContextType {
  streak: StreakData;
  isStudiedToday: boolean;
  canClaimStreak: boolean;
  timeUntilNextClaim: { hours: number; minutes: number; seconds: number; totalMs: number; canClaim: boolean };
  recordActivity: (actionType?: string) => Promise<{ success: boolean; incremented: boolean; milestoneReached: number | null; newStreak?: number }>;
  claimMilestone: (days: number) => Promise<{ success: boolean; creditsAdded: number; message: string }>;
  buyStreakFreeze: (costCredits?: number) => Promise<{ success: boolean; message: string; remainingCredits: number; totalFreezes: number }>;
  useStreakFreeze: (dateStr?: string) => Promise<{ success: boolean; message: string; remainingFreezes: number }>;
  applyStreakFreeze: (dateStr?: string) => Promise<{ success: boolean; message: string; remainingFreezes: number }>;
  fetchLeaderboard: () => Promise<LeaderboardEntry[]>;
  refreshStreak: () => Promise<void>;
  loading: boolean;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Streak Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultStreakData: StreakData = {
  currentStreak: 0,
  highestStreak: 0,
  lastStudyDate: null,
  lastActivityDate: null,
  streakHistory: [],
  streakFreezes: 1, // Start every student with 1 free complimentary streak freeze!
  streakFreezeDates: [],
  claimedMilestones: [],
};

const StreakContext = createContext<StreakContextType>({
  streak: defaultStreakData,
  isStudiedToday: false,
  canClaimStreak: true,
  timeUntilNextClaim: { hours: 0, minutes: 0, seconds: 0, totalMs: 0, canClaim: true },
  recordActivity: async () => ({ success: true, incremented: false, milestoneReached: null }),
  claimMilestone: async () => ({ success: false, creditsAdded: 0, message: '' }),
  buyStreakFreeze: async () => ({ success: false, message: '', remainingCredits: 0, totalFreezes: 0 }),
  useStreakFreeze: async () => ({ success: false, message: '', remainingFreezes: 0 }),
  applyStreakFreeze: async () => ({ success: false, message: '', remainingFreezes: 0 }),
  fetchLeaderboard: async () => [],
  refreshStreak: async () => {},
  loading: true,
});

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [streak, setStreak] = useState<StreakData>(() => {
    try {
      const saved = localStorage.getItem('sjtutor_streak_guest');
      return saved ? JSON.parse(saved) : defaultStreakData;
    } catch {
      return defaultStreakData;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Check if today is completed
  const todayStr = getLocalDateString();
  const isStudiedToday = streak.lastStudyDate === todayStr;

  // Listen to Auth State and local authenticated user
  useEffect(() => {
    const syncUser = () => {
      if (auth.currentUser) {
        setCurrentUser(auth.currentUser);
        return;
      }
      try {
        const localAuth = localStorage.getItem('sjtutor_authenticated_user') || localStorage.getItem('sjtutor_active_user');
        if (localAuth) {
          const parsed = JSON.parse(localAuth);
          if (parsed?.uid) {
            setCurrentUser({
              uid: parsed.uid,
              displayName: parsed.displayName || parsed.name || 'Student',
              email: parsed.email || '',
              photoURL: parsed.photoURL || null,
            } as any);
            return;
          }
        }
      } catch {
        // ignore
      }
      setCurrentUser(null);
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        syncUser();
      }
    });

    window.addEventListener('sjtutor_auth_changed', syncUser);
    syncUser();

    return () => {
      unsubscribeAuth();
      window.removeEventListener('sjtutor_auth_changed', syncUser);
    };
  }, []);

  // Listen / Fetch streak in real-time for logged in user
  useEffect(() => {
    if (!currentUser) {
      try {
        const local = localStorage.getItem('sjtutor_streak_guest');
        if (local) {
          setStreak(JSON.parse(local));
        }
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const streakDocRef = doc(db, 'streaks', currentUser.uid);

    const unsubscribe = onSnapshot(
      streakDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as StreakData;
          setStreak((prev) => ({
            ...prev,
            ...data,
            uid: currentUser.uid,
          }));
          try {
            localStorage.setItem(`sjtutor_streak_${currentUser.uid}`, JSON.stringify(data));
          } catch {
            // ignore
          }
        } else {
          // Check user document for existing streak or initialize
          try {
            const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
            const userData = userSnap.exists() ? userSnap.data() : null;
            
            const initialStreakVal = (userData?.streak ?? userData?.currentStreak ?? 0) as number;
            const highestVal = (userData?.highestStreak ?? initialStreakVal) as number;
            const history = Array.isArray(userData?.streakHistory) ? userData.streakHistory : [];
            const lastStudy = (userData?.lastStudyDate || null) as string | null;

            const newStreakDoc: StreakData = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || userData?.name || userData?.displayName || 'Learner',
              photoURL: currentUser.photoURL || userData?.photoURL || '',
              currentStreak: initialStreakVal,
              highestStreak: highestVal,
              lastStudyDate: lastStudy,
              lastActivityDate: lastStudy,
              streakHistory: history,
              claimedMilestones: [],
              updatedAt: Date.now(),
            };

            await setDoc(streakDocRef, newStreakDoc, { merge: true });
            setStreak(newStreakDoc);
          } catch (err) {
            console.warn('Error bootstrapping streak doc:', err);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Streak listener warning (using fallback):', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const canClaimStreak = canClaimStreakIncrease(streak);
  const timeUntilNextClaim = getTimeUntilNextStreakClaim(streak);

  // Record Activity and calculate continuous daily streak
  // STRICT RULE: Only increment streak when 24 hours is completed and user completes a study activity!
  const recordActivity = useCallback(
    async (actionType?: string): Promise<{ success: boolean; incremented: boolean; milestoneReached: number | null; newStreak?: number }> => {
      const today = getLocalDateString();
      const now = Date.now();

      // Check if 24 hours has elapsed since the last claimed study activity
      const isEligibleToClaim = canClaimStreakIncrease(streak);

      if (!isEligibleToClaim) {
        // User studied within the current 24-hour cycle:
        // Update activity history and lastActivityDate without incrementing streak or firing celebration
        const updatedHistory = Array.isArray(streak.streakHistory) ? [...streak.streakHistory] : [];
        if (!updatedHistory.includes(today)) {
          updatedHistory.push(today);
        }
        const updatedStreak: StreakData = {
          ...streak,
          lastActivityDate: today,
          streakHistory: updatedHistory,
          updatedAt: now,
        };
        setStreak(updatedStreak);
        return {
          success: true,
          incremented: false,
          milestoneReached: null,
          newStreak: streak.currentStreak || 0,
        };
      }

      // 24 HOURS COMPLETED! User is completing a study activity now to claim their streak increase.
      const prevStreak = typeof streak.currentStreak === 'number' ? streak.currentStreak : 0;
      const newStreak = prevStreak + 1;
      const newHighest = Math.max(streak.highestStreak || 0, newStreak);
      const updatedHistory = Array.isArray(streak.streakHistory) ? [...streak.streakHistory] : [];
      if (!updatedHistory.includes(today)) {
        updatedHistory.push(today);
      }

      // Check if a milestone was reached
      let milestoneReached: number | null = null;
      const claimed = streak.claimedMilestones || [];
      for (const m of STREAK_MILESTONES) {
        if (newStreak >= m.days && !claimed.includes(m.days)) {
          milestoneReached = m.days;
        }
      }

      const updatedStreak: StreakData = {
        ...streak,
        uid: currentUser?.uid,
        displayName: currentUser?.displayName || streak.displayName || 'Learner',
        photoURL: currentUser?.photoURL || streak.photoURL || '',
        currentStreak: newStreak,
        highestStreak: newHighest,
        lastStudyDate: today,
        lastActivityDate: today,
        lastStudyTimestamp: now,
        streakHistory: updatedHistory,
        updatedAt: now,
      };

      setStreak(updatedStreak);

      // Persist to local storage
      try {
        const key = currentUser ? `sjtutor_streak_${currentUser.uid}` : 'sjtutor_streak_guest';
        localStorage.setItem(key, JSON.stringify(updatedStreak));
      } catch {
        // ignore
      }

      // Sync with Firestore if authenticated
      if (currentUser) {
        try {
          const streakDocRef = doc(db, 'streaks', currentUser.uid);
          await setDoc(streakDocRef, updatedStreak, { merge: true });

          // Also update users collection for unified profile views
          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            streak: newStreak,
            currentStreak: newStreak,
            highestStreak: newHighest,
            lastStudyDate: today,
            lastActivityDate: today,
            lastStudyTimestamp: now,
            streakHistory: updatedHistory,
            updatedAt: Timestamp.now(),
          }).catch(() => {});
        } catch (e) {
          console.warn('Could not sync streak with Firestore:', e);
        }
      }

      // DISPATCH CELEBRATION EVENT:
      // Dispatched ONLY upon completing this study activity after 24 hours elapsed!
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('sjtutor_streak_incremented', {
            detail: {
              streakCount: newStreak,
              milestone: milestoneReached,
              actionType: actionType || 'Study Activity',
            },
          })
        );
      }

      return { success: true, incremented: true, milestoneReached, newStreak };
    },
    [streak, currentUser]
  );

  // Claim Milestone Reward
  const claimMilestone = useCallback(
    async (days: number): Promise<{ success: boolean; creditsAdded: number; message: string }> => {
      const milestone = STREAK_MILESTONES.find((m) => m.days === days);
      if (!milestone) {
        return { success: false, creditsAdded: 0, message: 'Invalid milestone.' };
      }

      const alreadyClaimed = (streak.claimedMilestones || []).includes(days);
      if (alreadyClaimed) {
        return { success: false, creditsAdded: 0, message: 'Milestone already claimed.' };
      }

      if ((streak.currentStreak || 0) < days) {
        return { success: false, creditsAdded: 0, message: `Reach a ${days}-day streak first!` };
      }

      const newClaimed = [...(streak.claimedMilestones || []), days];
      const updatedStreak: StreakData = {
        ...streak,
        claimedMilestones: newClaimed,
        updatedAt: Date.now(),
      };

      setStreak(updatedStreak);

      // Save locally
      try {
        const key = currentUser ? `sjtutor_streak_${currentUser.uid}` : 'sjtutor_streak_guest';
        localStorage.setItem(key, JSON.stringify(updatedStreak));
      } catch {
        // ignore
      }

      // Save in Firestore and grant credits to user profile
      if (currentUser) {
        try {
          const streakDocRef = doc(db, 'streaks', currentUser.uid);
          await updateDoc(streakDocRef, {
            claimedMilestones: newClaimed,
            updatedAt: Date.now(),
          });

          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const currentCredits = (userSnap.data()?.credits ?? 100) as number;
            const updatedCredits = currentCredits + milestone.rewardCredits;
            await updateDoc(userDocRef, {
              credits: updatedCredits,
              claimedMilestones: newClaimed,
              updatedAt: Timestamp.now(),
            });

            // Update local user profile cache
            const profileKey = `profile_${currentUser.uid}`;
            const cachedProf = localStorage.getItem(profileKey);
            if (cachedProf) {
              const prof = JSON.parse(cachedProf);
              prof.credits = updatedCredits;
              localStorage.setItem(profileKey, JSON.stringify(prof));
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `streaks/${currentUser.uid}`);
        }
      }

      return {
        success: true,
        creditsAdded: milestone.rewardCredits,
        message: `Claimed ${milestone.rewardCredits} bonus learning credits for reaching ${days} days!`,
      };
    },
    [streak, currentUser]
  );

  // Buy a Streak Freeze using credits (Default: 50 credits)
  const buyStreakFreeze = useCallback(
    async (costCredits: number = 50): Promise<{ success: boolean; message: string; remainingCredits: number; totalFreezes: number }> => {
      const currentFreezes = typeof streak.streakFreezes === 'number' ? streak.streakFreezes : 0;
      let userCredits = 100;

      // Check current user credit balance
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            userCredits = (userSnap.data()?.credits ?? 100) as number;
          }
        } catch {
          // fallback to localStorage
          const cached = localStorage.getItem(`profile_${currentUser.uid}`);
          if (cached) {
            try {
              userCredits = JSON.parse(cached).credits ?? 100;
            } catch {
              // ignore
            }
          }
        }
      } else {
        const guestProf = localStorage.getItem('profile_guest');
        if (guestProf) {
          try {
            userCredits = JSON.parse(guestProf).credits ?? 100;
          } catch {
            // ignore
          }
        }
      }

      if (userCredits < costCredits) {
        return {
          success: false,
          message: `Insufficient credits. You need ${costCredits} credits to purchase a Streak Freeze (Current balance: ${userCredits}).`,
          remainingCredits: userCredits,
          totalFreezes: currentFreezes,
        };
      }

      const updatedCredits = userCredits - costCredits;
      const updatedFreezes = currentFreezes + 1;

      const updatedStreak: StreakData = {
        ...streak,
        streakFreezes: updatedFreezes,
        updatedAt: Date.now(),
      };

      setStreak(updatedStreak);

      // Persist locally
      try {
        const key = currentUser ? `sjtutor_streak_${currentUser.uid}` : 'sjtutor_streak_guest';
        localStorage.setItem(key, JSON.stringify(updatedStreak));

        const profileKey = currentUser ? `profile_${currentUser.uid}` : 'profile_guest';
        const cachedProf = localStorage.getItem(profileKey);
        if (cachedProf) {
          const prof = JSON.parse(cachedProf);
          prof.credits = updatedCredits;
          prof.streakFreezes = updatedFreezes;
          localStorage.setItem(profileKey, JSON.stringify(prof));
        }
      } catch {
        // ignore
      }

      // Persist in Firestore
      if (currentUser) {
        try {
          const streakDocRef = doc(db, 'streaks', currentUser.uid);
          await updateDoc(streakDocRef, {
            streakFreezes: updatedFreezes,
            updatedAt: Date.now(),
          }).catch(async () => {
            await setDoc(streakDocRef, updatedStreak, { merge: true });
          });

          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            credits: updatedCredits,
            streakFreezes: updatedFreezes,
            updatedAt: Timestamp.now(),
          });
        } catch (err) {
          console.warn('Could not sync freeze purchase to Firestore:', err);
        }
      }

      return {
        success: true,
        message: `Successfully purchased 1 Streak Freeze for ${costCredits} credits! (Total: ${updatedFreezes} ❄️)`,
        remainingCredits: updatedCredits,
        totalFreezes: updatedFreezes,
      };
    },
    [streak, currentUser]
  );

  // Use a Streak Freeze to protect a missed study day
  const useStreakFreeze = useCallback(
    async (targetDate?: string): Promise<{ success: boolean; message: string; remainingFreezes: number }> => {
      const currentFreezes = typeof streak.streakFreezes === 'number' ? streak.streakFreezes : 0;
      if (currentFreezes <= 0) {
        return {
          success: false,
          message: 'You have no Streak Freezes available. Purchase one with credits from your Profile or Streak Hub!',
          remainingFreezes: 0,
        };
      }

      const dateToFreeze = targetDate || getLocalDateString();
      const existingFreezeDates = Array.isArray(streak.streakFreezeDates) ? [...streak.streakFreezeDates] : [];
      if (existingFreezeDates.includes(dateToFreeze)) {
        return {
          success: false,
          message: `${dateToFreeze} is already protected by a Streak Freeze!`,
          remainingFreezes: currentFreezes,
        };
      }

      const updatedFreezes = currentFreezes - 1;
      existingFreezeDates.push(dateToFreeze);

      const history = Array.isArray(streak.streakHistory) ? [...streak.streakHistory] : [];
      if (!history.includes(dateToFreeze)) {
        history.push(dateToFreeze);
      }

      const updatedStreak: StreakData = {
        ...streak,
        streakFreezes: updatedFreezes,
        streakFreezeDates: existingFreezeDates,
        streakHistory: history,
        lastStudyDate: streak.lastStudyDate || dateToFreeze,
        updatedAt: Date.now(),
      };

      setStreak(updatedStreak);

      try {
        const key = currentUser ? `sjtutor_streak_${currentUser.uid}` : 'sjtutor_streak_guest';
        localStorage.setItem(key, JSON.stringify(updatedStreak));
      } catch {
        // ignore
      }

      if (currentUser) {
        try {
          const streakDocRef = doc(db, 'streaks', currentUser.uid);
          await setDoc(streakDocRef, updatedStreak, { merge: true });

          const userDocRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userDocRef, {
            streakFreezes: updatedFreezes,
            streakFreezeDates: existingFreezeDates,
            streakHistory: history,
            updatedAt: Timestamp.now(),
          }).catch(() => {});
        } catch (e) {
          console.warn('Error saving used freeze to Firestore:', e);
        }
      }

      return {
        success: true,
        message: `Streak Freeze successfully applied for ${dateToFreeze}! Your active streak is safe. (Remaining: ${updatedFreezes} ❄️)`,
        remainingFreezes: updatedFreezes,
      };
    },
    [streak, currentUser]
  );

  // Fetch Community Leaderboard
  const fetchLeaderboard = useCallback(async (): Promise<LeaderboardEntry[]> => {
    try {
      const q = query(
        collection(db, 'streaks'),
        orderBy('currentStreak', 'desc'),
        limit(25)
      );
      const snap = await getDocs(q);
      const results: LeaderboardEntry[] = [];
      snap.forEach((docItem) => {
        const d = docItem.data();
        results.push({
          uid: docItem.id,
          displayName: d.displayName || 'Dedicated Scholar',
          photoURL: d.photoURL || '',
          currentStreak: typeof d.currentStreak === 'number' ? d.currentStreak : 0,
          highestStreak: typeof d.highestStreak === 'number' ? d.highestStreak : 0,
          lastStudyDate: d.lastStudyDate || '',
        });
      });
      return results;
    } catch (e) {
      console.warn('Leaderboard fetch fallback:', e);
      return [];
    }
  }, []);

  // Manual Refresh
  const refreshStreak = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'streaks', currentUser.uid));
      if (snap.exists()) {
        setStreak(snap.data() as StreakData);
      }
    } catch (e) {
      console.warn('Refresh streak error:', e);
    }
  }, [currentUser]);

  return (
    <StreakContext.Provider
      value={{
        streak,
        isStudiedToday,
        canClaimStreak,
        timeUntilNextClaim,
        recordActivity,
        claimMilestone,
        buyStreakFreeze,
        useStreakFreeze,
        applyStreakFreeze: useStreakFreeze,
        fetchLeaderboard,
        refreshStreak,
        loading,
      }}
    >
      {children}
    </StreakContext.Provider>
  );
};

export const useStreak = () => {
  const context = useContext(StreakContext);
  if (!context) {
    throw new Error('useStreak must be used within a StreakProvider');
  }
  return context;
};

export default StreakContext;
