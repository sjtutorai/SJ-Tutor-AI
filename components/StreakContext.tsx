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
  lastStudyDate?: string | null;
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
  claimMilestone: (milestone: number, userProfile: UserProfile, onProfileUpdate: (profile: UserProfile) => void) => Promise<boolean>;
  fetchLeaderboard: () => Promise<void>;
  triggerConfetti: () => void;
  celebration: { show: boolean; days: number; isMilestone?: boolean; badge?: string } | null;
  setCelebration: (val: { show: boolean; days: number; isMilestone?: boolean; badge?: string } | null) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
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

export const playCelebrationSound = (soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;
    
    const freqs = [329.63, 392.00, 523.25, 659.25, 783.99]; // E4, G4, C5, E5, G5 (Bright, rising major arpeggio)
    freqs.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.07);
      
      gain.gain.setValueAtTime(0, now + index * 0.07);
      gain.gain.linearRampToValueAtTime(0.12, now + index * 0.07 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.4);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now + index * 0.07);
      osc.stop(now + index * 0.07 + 0.4);
    });
  } catch (e) {
    console.warn("Web Audio API chime prevented or unsupported:", e);
  }
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
  lastStudyDate: null,
  streakHistory: [],
  claimedMilestones: [],
  updatedAt: 0,
};

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [streak, setStreak] = useState<StreakData>(() => {
    const local = localStorage.getItem('sjtutor_streak_guest');
    return local ? JSON.parse(local) : INITIAL_STREAK;
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ show: boolean; days: number; isMilestone?: boolean; badge?: string } | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('sjtutor_streak_sound_enabled') !== 'false';
  });

  const setSoundEnabled = (val: boolean) => {
    setSoundEnabledState(val);
    localStorage.setItem('sjtutor_streak_sound_enabled', String(val));
  };

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
          displayName: data.displayName || 'Learner',
          photoURL: data.photoURL || '',
          currentStreak: data.currentStreak || 0,
          highestStreak: data.highestStreak || 0,
        });
      });

      // Fetch documents from users collection to merge any additional active accounts
      const finalEntries = [...entries];
      if (entries.length < 5) {
        try {
          const userSnap = await getDocs(collection(db, 'users'));
          userSnap.forEach((userDoc) => {
            const userData = userDoc.data();
            const exists = entries.some(e => e.uid === userDoc.id);
            if (!exists) {
              finalEntries.push({
                uid: userDoc.id,
                displayName: userData.displayName || 'Active Student',
                photoURL: userData.photoURL || '',
                currentStreak: 0,
                highestStreak: 1,
              });
            }
          });
        } catch (err) {
          console.warn('Failed to fetch user profiles for leaderboard merging:', err);
        }
      }

      // Eliminate duplicates and sort by highest streak
      const uniqueEntries = Array.from(new Map(finalEntries.map(e => [e.uid, e])).values());
      uniqueEntries.sort((a, b) => b.highestStreak - a.highestStreak);

      if (uniqueEntries.length > 0) {
        setLeaderboard(uniqueEntries);
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
        
        // 1. Instantly load from localStorage if available to be responsive
        let localData: StreakData | null = null;
        const localSaved = localStorage.getItem(`sjtutor_streak_${user.uid}`);
        if (localSaved) {
          try {
            localData = JSON.parse(localSaved);
            if (localData) {
              setStreak(localData);
            }
          } catch (err) {
            console.warn('Failed to parse local stored user streak:', err);
          }
        }

        const streakDocRef = doc(db, 'streaks', user.uid);
        const userDocRef = doc(db, 'users', user.uid);

        try {
          const [streakSnap, userSnap] = await Promise.all([
            getDoc(streakDocRef).catch(() => null),
            getDoc(userDocRef).catch(() => null)
          ]);

          const streakDocData = streakSnap && streakSnap.exists() ? streakSnap.data() : null;
          const userDocData = userSnap && userSnap.exists() ? userSnap.data() : null;

          const streakFromStreaks = streakDocData ? (streakDocData.currentStreak ?? streakDocData.streak ?? 0) : 0;
          const streakFromUsers = userDocData ? (userDocData.streak ?? userDocData.currentStreak ?? 0) : 0;
          const streakFromLocal = localData ? (localData.currentStreak ?? 0) : 0;

          const maxCurrentStreak = Math.max(streakFromStreaks, streakFromUsers, streakFromLocal);

          const highestFromStreaks = streakDocData?.highestStreak ?? 0;
          const highestFromUsers = userDocData?.highestStreak ?? 0;
          const highestFromLocal = localData?.highestStreak ?? 0;

          const maxHighestStreak = Math.max(highestFromStreaks, highestFromUsers, highestFromLocal, maxCurrentStreak);

          let lastStudy = streakDocData?.lastStudyDate || streakDocData?.lastActivityDate ||
                          userDocData?.lastStudyDate || userDocData?.lastActivityDate ||
                          localData?.lastStudyDate || localData?.lastActivityDate || null;

          // If user has a streak > 0 but missing lastStudyDate, default to yesterday so streak is preserved
          if (maxCurrentStreak > 0 && !lastStudy) {
            lastStudy = getYesterdayDateString();
          }

          const parsedUpdatedAt = streakDocData?.updatedAt 
            ? (typeof streakDocData.updatedAt === 'object' && streakDocData.updatedAt !== null && 'toMillis' in streakDocData.updatedAt 
               ? (streakDocData.updatedAt as any)?.toMillis() || Date.now()
               : Number(streakDocData.updatedAt)) 
            : Date.now();

          const updatedData: StreakData = {
            uid: user.uid,
            displayName: user.displayName || streakDocData?.displayName || userDocData?.displayName || 'Active Student',
            photoURL: user.photoURL || streakDocData?.photoURL || userDocData?.photoURL || '',
            currentStreak: maxCurrentStreak,
            highestStreak: maxHighestStreak,
            lastActivityDate: lastStudy,
            lastStudyDate: lastStudy,
            streakHistory: streakDocData?.streakHistory || localData?.streakHistory || [],
            claimedMilestones: streakDocData?.claimedMilestones || localData?.claimedMilestones || [],
            updatedAt: parsedUpdatedAt,
          };

          setStreak(updatedData);
          localStorage.setItem(`sjtutor_streak_${user.uid}`, JSON.stringify(updatedData));

          // Sync back to Firestore asynchronously so both docs stay in lockstep
          setDoc(streakDocRef, updatedData, { merge: true }).catch(() => {});
          setDoc(userDocRef, { streak: maxCurrentStreak, currentStreak: maxCurrentStreak, highestStreak: maxHighestStreak }, { merge: true }).catch(() => {});

        } catch (e) {
          console.warn('Network offline or error fetching user streak from DB (using local storage fallback):', e);
          if (!localData) {
            const fallbackLocal = localStorage.getItem(`sjtutor_streak_${user.uid}`);
            if (fallbackLocal) {
              setStreak(JSON.parse(fallbackLocal));
            }
          }
        }
      } else {
        // Guest user fallback
        setCurrentUserId(null);
        const local = localStorage.getItem('sjtutor_streak_guest');
        if (local) {
          const parsed = JSON.parse(local);
          const lastStudy = parsed.lastStudyDate || parsed.lastActivityDate || null;
          parsed.lastActivityDate = lastStudy;
          parsed.lastStudyDate = lastStudy;
          setStreak(parsed);
        } else {
          setStreak(INITIAL_STREAK);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch leaderboard initially
  useEffect(() => {
    fetchLeaderboard();
  }, [currentUserId, fetchLeaderboard]);

  // Record an activity completion with accurate calendar day criteria
  const recordActivity = useCallback(async () => {
    const today = getLocalDateString();
    const yesterday = getYesterdayDateString();
    
    return new Promise<{ success: boolean; incremented: boolean; milestoneReached?: number }>((resolve) => {
      setStreak((prev) => {
        const lastStudy = prev.lastStudyDate || prev.lastActivityDate;
        
        let newCount = prev.currentStreak;
        let didIncrement = false;

        if (lastStudy === today) {
          // Already recorded today!
          didIncrement = false;
        } else if (lastStudy === yesterday || (prev.currentStreak > 0 && !lastStudy)) {
          // Consecutive study day!
          newCount = prev.currentStreak + 1;
          didIncrement = true;
        } else if (prev.currentStreak === 0 || !lastStudy) {
          // First time starting streak
          newCount = 1;
          didIncrement = true;
        } else {
          // Missed 1 or more days, start fresh at 1
          newCount = 1;
          didIncrement = true;
        }

        const history = [...(prev.streakHistory || [])];
        if (!history.includes(today)) {
          history.push(today);
        }

        const newHighest = Math.max(prev.highestStreak || 0, newCount);
        let mReached: number | undefined = undefined;
        let isMilestone = false;
        let badgeSymbol = '';

        const milestone = STREAK_MILESTONES.find(m => m.days === newCount);
        if (milestone && didIncrement && (!prev.claimedMilestones || !prev.claimedMilestones.includes(newCount))) {
          mReached = newCount;
          isMilestone = true;
          badgeSymbol = milestone.badge;
        }

        const updated: StreakData = {
          ...prev,
          currentStreak: newCount,
          highestStreak: newHighest,
          lastActivityDate: today,
          lastStudyDate: today,
          streakHistory: history,
          updatedAt: didIncrement ? Date.now() : prev.updatedAt,
        };

        // Save locally
        const storageKey = prev.uid === 'guest' ? 'sjtutor_streak_guest' : `sjtutor_streak_${prev.uid}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));

        // Push to Firestore asynchronously
        if (prev.uid !== 'guest') {
          const streakDocRef = doc(db, 'streaks', prev.uid);
          setDoc(streakDocRef, {
            ...updated,
            lastStudyDate: today,
            currentStreak: newCount,
            highestStreak: newHighest,
          }, { merge: true }).catch((err) => {
            console.warn('Asynchronous streak Firestore sync deferred/failed:', err);
          });

          const userDocRef = doc(db, 'users', prev.uid);
          setDoc(userDocRef, {
            streak: newCount,
            currentStreak: newCount,
            highestStreak: newHighest,
          }, { merge: true }).catch(() => {});
        }

        if (didIncrement) {
          setTimeout(() => {
            triggerConfetti();
            playCelebrationSound(soundEnabled);
            setCelebration({
              show: true,
              days: newCount,
              isMilestone: isMilestone,
              badge: badgeSymbol
            });
          }, 30);
        }

        resolve({
          success: true,
          incremented: didIncrement,
          milestoneReached: mReached,
        });

        return updated;
      });
    });
  }, [triggerConfetti, soundEnabled]);

  // Claim specific milestone rewards
  const claimMilestone = useCallback(async (
    milestoneDays: number, 
    userProfile: UserProfile, 
    onProfileUpdate: (profile: UserProfile) => void
  ) => {
    const milestone = STREAK_MILESTONES.find(m => m.days === milestoneDays);
    if (!milestone) return false;

    if (streak.claimedMilestones && streak.claimedMilestones.includes(milestoneDays)) {
      alert('You have already claimed this streak milestone! Keep going for the next one. 🚀');
      return false;
    }

    // Add exclusive academic emblem to user profile instead of credits
    const currentEmblems = userProfile.emblems || [];
    const emblemToAdd = `${milestone.badge} ${milestone.label}`;
    const updatedEmblems = currentEmblems.includes(emblemToAdd) ? currentEmblems : [...currentEmblems, emblemToAdd];
    const updatedProfile: UserProfile = {
      ...userProfile,
      emblems: updatedEmblems,
    };

    onProfileUpdate(updatedProfile);

    // Save profile to localStorage and Firestore
    localStorage.setItem(`profile_${streak.uid}`, JSON.stringify(updatedProfile));
    if (streak.uid !== 'guest') {
      const userProfileRef = doc(db, 'users', streak.uid);
      setDoc(userProfileRef, { emblems: updatedEmblems }, { merge: true }).catch((err) => {
        console.warn('Failed to sync claimed milestone emblem to users doc:', err);
      });
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
      celebration,
      setCelebration,
      soundEnabled,
      setSoundEnabled,
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
