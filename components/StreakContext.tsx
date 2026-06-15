import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { UserProfile } from '../types';
import confetti from 'canvas-confetti';

export interface StreakData {
  uid: string;
  displayName: string;
  photoURL?: string;
  currentStreak: number;
  highestStreak: number;
  lastActivityDate: string | null;
  streakHistory: string[];
  claimedMilestones?: number[];
  updatedAt: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  currentStreak: number;
  highestStreak: number;
}

interface StreakContextType {
  streak: StreakData;
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  recordActivity: (userProfile?: UserProfile, onProfileUpdate?: (profile: UserProfile) => void) => Promise<{ success: boolean; incremented: boolean; milestoneReached?: number }>;
  claimMilestone: (milestone: number) => Promise<boolean>;
  fetchLeaderboard: () => Promise<void>;
  triggerConfetti: () => void;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

// Helper to get local date "YYYY-MM-DD"
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper for yesterday
export const getYesterdayDateString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
};

// Helper to calculate or update streak based on previous activity date
interface StreakCheckResult {
  currentStreak: number;
  highestStreak: number;
  lastActivityDate: string;
  updatedAt: number;
  changed: boolean;
  incremented: boolean;
}

export const getUpdatedStreak = (
  currentStreak: number,
  highestStreak: number,
  lastActivityDate: string | null
): StreakCheckResult => {
  const today = getLocalDateString();
  
  let newCurrent = currentStreak;
  let newHighest = highestStreak;
  let newLastActivityDate = lastActivityDate || today;
  let changed = false;
  let incremented = false;

  if (!lastActivityDate) {
    newCurrent = 1;
    newLastActivityDate = today;
    changed = true;
    incremented = true;
  } else if (lastActivityDate === today) {
    changed = false;
    incremented = false;
  } else {
    // Calculate calendar days difference instead of resetting to 1.
    // "The Streak Day After 24 hours increase by one even if they dont log in also"
    const d1 = new Date(lastActivityDate + 'T12:00:00'); // set mid-day to avoid TZ shifts
    const d2 = new Date(today + 'T12:00:00');
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      newCurrent = currentStreak + diffDays;
      newLastActivityDate = today;
      changed = true;
      incremented = true;
    } else {
      changed = false;
      incremented = false;
    }
  }

  newHighest = Math.max(newHighest, newCurrent);

  return {
    currentStreak: newCurrent,
    highestStreak: newHighest,
    lastActivityDate: newLastActivityDate,
    updatedAt: Date.now(),
    changed,
    incremented
  };
};

export const STREAK_MILESTONES = [
  { days: 3, label: 'Beginner Learner', reward: 15, badge: '🌱' },
  { days: 7, label: 'Consistent Learner', reward: 40, badge: '🔥' },
  { days: 15, label: 'Dedicated Learner', reward: 100, badge: '⚡' },
  { days: 30, label: 'Streak Master', reward: 250, badge: '👑' },
  { days: 100, label: 'SJ Tutor AI Legend', reward: 1000, badge: '🏆' },
];

const INITIAL_STREAK: StreakData = {
  uid: 'guest',
  displayName: 'Guest Student',
  photoURL: '',
  currentStreak: 0,
  highestStreak: 0,
  lastActivityDate: null,
  streakHistory: [],
  claimedMilestones: [],
  updatedAt: Date.now(),
};

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [streak, setStreak] = useState<StreakData>(() => {
    const local = localStorage.getItem('sjtutor_streak_guest');
    return local ? JSON.parse(local) : INITIAL_STREAK;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Trigger high-end fireworks animation
  const triggerConfetti = useCallback(() => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f97316', '#eab308', '#ef4444']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f97316', '#eab308', '#ef4444']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }, []);

  // Fetch leaderboard elements from firestore
  const fetchLeaderboard = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'streaks'),
        orderBy('highestStreak', 'desc'),
        limit(15)
      );
      const snapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        entries.push({
          uid: doc.id,
          displayName: data.displayName || 'Anonymous Student',
          photoURL: data.photoURL || '',
          currentStreak: data.currentStreak || 0,
          highestStreak: data.highestStreak || 0,
        });
      });

      // Filter and sort dual ranking robustness
      if (entries.length > 0) {
        setLeaderboard(entries);
      } else {
        // Fallback leaderboard simulation for offline/guest
        setLeaderboard([
          { uid: 's1', displayName: 'Aarav Sharma', currentStreak: 32, highestStreak: 35 },
          { uid: 's2', displayName: 'Priya Patel', currentStreak: 18, highestStreak: 25 },
          { uid: 's3', displayName: 'David Kim', currentStreak: 14, highestStreak: 14 },
          { uid: 's4', displayName: 'Sofia Rossi', currentStreak: 8, highestStreak: 12 },
          { uid: 's5', displayName: 'Mohamed Ali', currentStreak: 5, highestStreak: 8 },
        ]);
      }
    } catch (e) {
      console.warn('Leaderboard fetch fallback active due to firestore permissions or offline:', e);
      // Fallback
      setLeaderboard([
        { uid: 's1', displayName: 'Aarav Sharma', currentStreak: 32, highestStreak: 35 },
        { uid: 's2', displayName: 'Priya Patel', currentStreak: 18, highestStreak: 25 },
        { uid: 's3', displayName: 'David Kim', currentStreak: 14, highestStreak: 14 },
        { uid: 's4', displayName: 'Sofia Rossi', currentStreak: 8, highestStreak: 12 },
        { uid: 's5', displayName: 'Mohamed Ali', currentStreak: 5, highestStreak: 8 },
      ]);
    }
  }, []);

  // Sync auth-state and fetch/align profiles
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUserId(user.uid);
        
        // 1. Instantly load from localStorage if available to be responsive and offline-resilient
        const localSaved = localStorage.getItem(`sjtutor_streak_${user.uid}`);
        if (localSaved) {
          try {
            setStreak(JSON.parse(localSaved));
          } catch (err) {
            console.warn('Failed to parse local stored user streak:', err);
          }
        }

        const userDocRef = doc(db, 'streaks', user.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as StreakData;
            const today = getLocalDateString();
            const result = getUpdatedStreak(
              data.currentStreak || 0,
              data.highestStreak || 0,
              data.lastActivityDate
            );

            const history = [...(data.streakHistory || [])];
            if (result.incremented) {
              if (data.lastActivityDate) {
                const startD = new Date(data.lastActivityDate + 'T12:00:00');
                const endD = new Date(today + 'T12:00:00');
                while (startD <= endD) {
                  const ds = getLocalDateString(startD);
                  if (!history.includes(ds)) {
                    history.push(ds);
                  }
                  startD.setDate(startD.getDate() + 1);
                }
              } else if (!history.includes(today)) {
                history.push(today);
              }
            }

            const updatedData: StreakData = {
              ...data,
              uid: user.uid,
              displayName: user.displayName || data.displayName || 'Active Student',
              photoURL: user.photoURL || data.photoURL || '',
              currentStreak: result.currentStreak,
              highestStreak: result.highestStreak,
              lastActivityDate: result.lastActivityDate,
              streakHistory: history,
              updatedAt: result.updatedAt,
            };

            setStreak(updatedData);
            localStorage.setItem(`sjtutor_streak_${user.uid}`, JSON.stringify(updatedData));
            
            if (result.changed) {
              await setDoc(userDocRef, updatedData, { merge: true });
            }
          } else {
            // New Firebase user streak setup from local guest data if available
            const localGuest = localStorage.getItem('sjtutor_streak_guest');
            const guestData = localGuest ? JSON.parse(localGuest) : null;
            const today = getLocalDateString();

            const initial: StreakData = {
              uid: user.uid,
              displayName: user.displayName || 'Active Student',
              photoURL: user.photoURL || '',
              currentStreak: guestData ? guestData.currentStreak : 1,
              highestStreak: guestData ? Math.max(guestData.highestStreak, 1) : 1,
              lastActivityDate: guestData ? guestData.lastActivityDate : today,
              streakHistory: guestData ? guestData.streakHistory : [today],
              claimedMilestones: guestData ? guestData.claimedMilestones || [] : [],
              updatedAt: Date.now(),
            };
            setStreak(initial);
            await setDoc(userDocRef, initial, { merge: true });
            localStorage.setItem(`sjtutor_streak_${user.uid}`, JSON.stringify(initial));
          }
        } catch (e) {
          console.warn('Network offline or error fetching user streak from DB:', e);
          if (!localSaved) {
            const fallbackLocal = localStorage.getItem(`sjtutor_streak_${user.uid}`);
            if (fallbackLocal) {
              setStreak(JSON.parse(fallbackLocal));
            }
          }
        }
      } else {
        // Guest user fallback (checks 24-hour increment)
        setCurrentUserId(null);
        const local = localStorage.getItem('sjtutor_streak_guest');
        const today = getLocalDateString();
        if (local) {
          try {
            const parsed = JSON.parse(local) as StreakData;
            const result = getUpdatedStreak(
              parsed.currentStreak || 0,
              parsed.highestStreak || 0,
              parsed.lastActivityDate
            );

            const history = [...(parsed.streakHistory || [])];
            if (result.incremented) {
              if (parsed.lastActivityDate) {
                const startD = new Date(parsed.lastActivityDate + 'T12:00:00');
                const endD = new Date(today + 'T12:00:00');
                while (startD <= endD) {
                  const ds = getLocalDateString(startD);
                  if (!history.includes(ds)) {
                    history.push(ds);
                  }
                  startD.setDate(startD.getDate() + 1);
                }
              } else if (!history.includes(today)) {
                history.push(today);
              }
            }

            parsed.currentStreak = result.currentStreak;
            parsed.highestStreak = result.highestStreak;
            parsed.lastActivityDate = result.lastActivityDate;
            parsed.streakHistory = history;
            parsed.updatedAt = result.updatedAt;

            if (result.changed) {
              localStorage.setItem('sjtutor_streak_guest', JSON.stringify(parsed));
            }
            setStreak(parsed);
          } catch {
            setStreak(INITIAL_STREAK);
          }
        } else {
          const initial: StreakData = {
            ...INITIAL_STREAK,
            currentStreak: 1,
            lastActivityDate: today,
            streakHistory: [today],
            updatedAt: Date.now(),
          };
          localStorage.setItem('sjtutor_streak_guest', JSON.stringify(initial));
          setStreak(initial);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Check for day change every 20 minutes to auto-increment streak if user leaves tab open
  useEffect(() => {
    const checkDayShift = () => {
      setStreak((prev) => {
        const today = getLocalDateString();
        if (prev.lastActivityDate && prev.lastActivityDate !== today) {
          const result = getUpdatedStreak(prev.currentStreak, prev.highestStreak, prev.lastActivityDate);
          if (result.changed) {
            const history = [...(prev.streakHistory || [])];
            const startD = new Date(prev.lastActivityDate + 'T12:00:00');
            const endD = new Date(today + 'T12:00:00');
            while (startD <= endD) {
              const ds = getLocalDateString(startD);
              if (!history.includes(ds)) {
                history.push(ds);
              }
              startD.setDate(startD.getDate() + 1);
            }

            const updated: StreakData = {
              ...prev,
              currentStreak: result.currentStreak,
              highestStreak: result.highestStreak,
              lastActivityDate: result.lastActivityDate,
              streakHistory: history,
              updatedAt: result.updatedAt,
            };

            const storageKey = prev.uid === 'guest' ? 'sjtutor_streak_guest' : `sjtutor_streak_${prev.uid}`;
            localStorage.setItem(storageKey, JSON.stringify(updated));

            if (prev.uid !== 'guest') {
              const userDocRef = doc(db, 'streaks', prev.uid);
              setDoc(userDocRef, updated, { merge: true }).catch(() => {});
            }
            return updated;
          }
        }
        return prev;
      });
    };

    const interval = setInterval(checkDayShift, 1000 * 60 * 20); // every 20 mins
    return () => clearInterval(interval);
  }, []);

  // Fetch leaderboard initially
  useEffect(() => {
    fetchLeaderboard();
  }, [currentUserId, fetchLeaderboard]);

  // Record an activity completion (Resilient log check)
  const recordActivity = useCallback(async () => {
    const today = getLocalDateString();
    let isIncremented = false;
    let reachedMilestone: number | undefined = undefined;

    setStreak((prev) => {
      const result = getUpdatedStreak(
        prev.currentStreak,
        prev.highestStreak,
        prev.lastActivityDate
      );

      isIncremented = result.incremented;
      const history = [...(prev.streakHistory || [])];
      
      if (isIncremented && !history.includes(today)) {
        history.push(today);
      }

      // Check for milestone reaching events
      const milestone = STREAK_MILESTONES.find(m => m.days === result.currentStreak);
      if (milestone && isIncremented && (!prev.claimedMilestones || !prev.claimedMilestones.includes(result.currentStreak))) {
        reachedMilestone = result.currentStreak;
      }

      const updated: StreakData = {
        ...prev,
        currentStreak: result.currentStreak,
        highestStreak: result.highestStreak,
        lastActivityDate: result.lastActivityDate,
        streakHistory: history,
        updatedAt: result.updatedAt,
      };

      // Save locally
      const storageKey = prev.uid === 'guest' ? 'sjtutor_streak_guest' : `sjtutor_streak_${prev.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // Push to Firestore asynchronously
      if (prev.uid !== 'guest') {
        const userDocRef = doc(db, 'streaks', prev.uid);
        setDoc(userDocRef, updated, { merge: true }).catch((err) => {
          console.warn('Asynchronous streak Firestore sync deferred/failed:', err);
        });
      }

      return updated;
    });

    if (reachedMilestone) {
      triggerConfetti();
    }

    return {
      success: true,
      incremented: isIncremented,
      milestoneReached: reachedMilestone,
    };
  }, [triggerConfetti]);

  // Claim specific milestone rewards (NO CREDITS ARE AWARDED!)
  const claimMilestone = useCallback(async (
    milestoneDays: number
  ) => {
    const milestone = STREAK_MILESTONES.find(m => m.days === milestoneDays);
    if (!milestone) return false;

    if (streak.claimedMilestones && streak.claimedMilestones.includes(milestoneDays)) {
      alert('You have already unlocked this emblem! 🏆');
      return false;
    }

    // Update streak claimed milestones array
    setStreak((prev) => {
      const updatedClaims = [...(prev.claimedMilestones || []), milestoneDays];
      const updated: StreakData = {
        ...prev,
        claimedMilestones: updatedClaims,
        updatedAt: Date.now(),
      };

      const storageKey = prev.uid === 'guest' ? 'sjtutor_streak_guest' : `sjtutor_streak_${prev.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));

      if (prev.uid !== 'guest') {
        const streakDocRef = doc(db, 'streaks', prev.uid);
        setDoc(streakDocRef, { claimedMilestones: updatedClaims }, { merge: true }).catch((err) => {
          console.warn('Failed to sync claimed milestones list:', err);
        });
      }

      return updated;
    });

    triggerConfetti();
    return true;
  }, [streak, triggerConfetti]);

  return (
    <StreakContext.Provider value={{
      streak,
      leaderboard,
      loading,
      recordActivity,
      claimMilestone,
      fetchLeaderboard,
      triggerConfetti,
    }}>
      {children}
    </StreakContext.Provider>
  );
};

export const useStreak = () => {
  const context = useContext(StreakContext);
  if (context === undefined) {
    throw new Error('useStreak must be used within a StreakProvider');
  }
  return context;
};
