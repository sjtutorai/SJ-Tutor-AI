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
  streakHistory: string[];
  claimedMilestones: number[];
  updatedAt?: number;
}

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
  recordActivity: (actionType?: string) => Promise<{ success: boolean; incremented: boolean; milestoneReached: number | null }>;
  claimMilestone: (days: number) => Promise<{ success: boolean; creditsAdded: number; message: string }>;
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
  claimedMilestones: [],
};

const StreakContext = createContext<StreakContextType>({
  streak: defaultStreakData,
  isStudiedToday: false,
  recordActivity: async () => ({ success: true, incremented: false, milestoneReached: null }),
  claimMilestone: async () => ({ success: false, creditsAdded: 0, message: '' }),
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

  // Listen to Auth State
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
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

  // Record Activity and calculate continuous daily streak
  const recordActivity = useCallback(
    async (): Promise<{ success: boolean; incremented: boolean; milestoneReached: number | null }> => {
      const today = getLocalDateString();
      const currentLastStudy = streak.lastStudyDate;

      // If user already studied today, mark active & return
      if (currentLastStudy === today) {
        return { success: true, incremented: false, milestoneReached: null };
      }

      const prevStreak = typeof streak.currentStreak === 'number' ? streak.currentStreak : 0;
      
      // STRICT NO-RESET POLICY:
      // The streak represents accumulated learning consistency and NEVER resets to 0 or decreases.
      // Every new day the user engages with any learning activity, streak increments by +1.
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
        streakHistory: updatedHistory,
        updatedAt: Date.now(),
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
            streakHistory: updatedHistory,
            updatedAt: Timestamp.now(),
          }).catch(() => {});
        } catch (e) {
          console.warn('Could not sync streak with Firestore:', e);
        }
      }

      return { success: true, incremented: true, milestoneReached };
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
        recordActivity,
        claimMilestone,
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
