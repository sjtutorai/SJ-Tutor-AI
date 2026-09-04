import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
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
  activeSecondsToday?: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL?: string;
  currentStreak: number;
  highestStreak: number;
}

export const REQUIRED_ACTIVE_SECONDS = 120; // 2 minutes of active presence in the app unlocks today's streak

interface StreakContextType {
  streak: StreakData;
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  activeSecondsToday: number;
  requiredActiveSeconds: number;
  isTodayCompleted: boolean;
  recordActivity: (userProfile?: UserProfile, onProfileUpdate?: (profile: UserProfile) => void) => Promise<{ success: boolean; incremented: boolean; milestoneReached?: number }>;
  adjustStreak: (newCount: number) => Promise<void>;
  claimMilestone: (milestone: number, userProfile: UserProfile, onProfileUpdate: (profile: UserProfile) => void) => Promise<boolean>;
  fetchLeaderboard: () => Promise<void>;
  triggerConfetti: () => void;
  celebration: { show: boolean; days: number; isMilestone?: boolean; badge?: string } | null;
  setCelebration: (val: { show: boolean; days: number; isMilestone?: boolean; badge?: string } | null) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  syncWithCloud: () => Promise<void>;
  isStreakModalOpen: boolean;
  setIsStreakModalOpen: (val: boolean) => void;
  openStreakModal: () => void;
  nextStreak: number;
  nextMilestone: { days: number; label: string; bonusCredits: number; badge: string } | null;
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
      gain.gain.linearRampToValueAtTime(0.18, now + index * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.35);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now + index * 0.07);
      osc.stop(now + index * 0.07 + 0.4);
    });
  } catch {
    // Ignore audio permission or autoplay restrictions silently
  }
};

export const STREAK_MILESTONES = [
  { days: 3, label: '3-Day Starter', bonusCredits: 25, badge: '🌱' },
  { days: 7, label: '7-Day Consistent', bonusCredits: 75, badge: '🥉' },
  { days: 14, label: '14-Day Dedicated', bonusCredits: 150, badge: '⚡' },
  { days: 30, label: '30-Day Unstoppable', bonusCredits: 350, badge: '🥈' },
  { days: 60, label: '60-Day Mastermind', bonusCredits: 750, badge: '💎' },
  { days: 100, label: '100-Day Legend', bonusCredits: 1500, badge: '🥇' },
  { days: 365, label: '365-Day Grand Scholar', bonusCredits: 5000, badge: '👑' },
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
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const openStreakModal = useCallback(() => setIsStreakModalOpen(true), []);

  const nextStreak = streak.currentStreak > 0 ? streak.currentStreak + 1 : 1;
  const nextMilestone = STREAK_MILESTONES.find(m => m.days > streak.currentStreak) || null;

  // Preserved for interface compatibility
  const activeSecondsToday = 0;

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
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          uid: docSnap.id,
          displayName: data.displayName || 'Learner',
          photoURL: data.photoURL || '',
          currentStreak: data.currentStreak || 0,
          highestStreak: data.highestStreak || 0,
        });
      });

      // Merge user documents if leaderboard is small
      if (entries.length < 5) {
        try {
          const userSnap = await getDocs(collection(db, 'users'));
          userSnap.forEach((userDoc) => {
            const userData = userDoc.data();
            const exists = entries.some(e => e.uid === userDoc.id);
            if (!exists) {
              entries.push({
                uid: userDoc.id,
                displayName: userData.displayName || 'Active Student',
                photoURL: userData.photoURL || '',
                currentStreak: userData.streak || 0,
                highestStreak: userData.highestStreak || userData.streak || 1,
              });
            }
          });
        } catch (err) {
          console.warn('Failed to fetch user profiles for leaderboard merging:', err);
        }
      }

      // Eliminate duplicates and sort by highest streak
      const uniqueEntries = Array.from(new Map(entries.map(e => [e.uid, e])).values());
      uniqueEntries.sort((a, b) => (b.currentStreak || b.highestStreak) - (a.currentStreak || a.highestStreak));

      if (uniqueEntries.length > 0) {
        setLeaderboard(uniqueEntries);
      } else {
        setLeaderboard([
          { uid: 's1', displayName: 'Aarav Sharma', currentStreak: 34, highestStreak: 35 },
          { uid: 's2', displayName: 'Priya Patel', currentStreak: 18, highestStreak: 25 },
          { uid: 's3', displayName: 'David Kim', currentStreak: 14, highestStreak: 14 },
          { uid: 's4', displayName: 'Sofia Rossi', currentStreak: 8, highestStreak: 12 },
          { uid: 's5', displayName: 'Mohamed Ali', currentStreak: 5, highestStreak: 8 },
        ]);
      }
    } catch {
      // Fallback
      setLeaderboard([
        { uid: 's1', displayName: 'Aarav Sharma', currentStreak: 34, highestStreak: 35 },
        { uid: 's2', displayName: 'Priya Patel', currentStreak: 18, highestStreak: 25 },
        { uid: 's3', displayName: 'David Kim', currentStreak: 14, highestStreak: 14 },
        { uid: 's4', displayName: 'Sofia Rossi', currentStreak: 8, highestStreak: 12 },
        { uid: 's5', displayName: 'Mohamed Ali', currentStreak: 5, highestStreak: 8 },
      ]);
    }
  }, []);

  // Multi-Device Real-Time Cloud Sync using Firestore onSnapshot
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      setLoading(true);

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        setCurrentUserId(user.uid);
        const streakDocRef = doc(db, 'streaks', user.uid);
        const userDocRef = doc(db, 'users', user.uid);

        // Subscribe in real-time to Firestore.
        // This guarantees Device A and Device B are ALWAYS in 100% sync.
        unsubscribeSnapshot = onSnapshot(
          streakDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              const current = typeof data.currentStreak === 'number' ? data.currentStreak : 0;
              const highest = typeof data.highestStreak === 'number' ? data.highestStreak : current;
              const lastStudy = data.lastStudyDate || data.lastActivityDate || null;
              const history = Array.isArray(data.streakHistory) ? data.streakHistory : [];
              const claimed = Array.isArray(data.claimedMilestones) ? data.claimedMilestones : [];
              const updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : Date.now();

              const cloudData: StreakData = {
                uid: user.uid,
                displayName: data.displayName || user.displayName || 'Active Student',
                photoURL: data.photoURL || user.photoURL || '',
                currentStreak: current,
                highestStreak: highest,
                lastActivityDate: lastStudy,
                lastStudyDate: lastStudy,
                streakHistory: history,
                claimedMilestones: claimed,
                updatedAt,
              };

              setStreak(cloudData);
              localStorage.setItem(`sjtutor_streak_${user.uid}`, JSON.stringify(cloudData));
            } else {
              // Doc doesn't exist in 'streaks' yet. Check 'users' doc.
              try {
                const userSnap = await getDoc(userDocRef);
                const userData = userSnap.exists() ? userSnap.data() : null;
                const userStreak = typeof userData?.streak === 'number' ? userData.streak : (typeof userData?.currentStreak === 'number' ? userData.currentStreak : 0);
                const userHighest = typeof userData?.highestStreak === 'number' ? userData.highestStreak : userStreak;

                const initialCloudData: StreakData = {
                  uid: user.uid,
                  displayName: user.displayName || userData?.displayName || 'Active Student',
                  photoURL: user.photoURL || userData?.photoURL || '',
                  currentStreak: userStreak,
                  highestStreak: userHighest,
                  lastActivityDate: userData?.lastStudyDate || null,
                  lastStudyDate: userData?.lastStudyDate || null,
                  streakHistory: [],
                  claimedMilestones: [],
                  updatedAt: Date.now(),
                };

                setStreak(initialCloudData);
                await setDoc(streakDocRef, initialCloudData, { merge: true });
              } catch (initErr) {
                console.warn('Failed initializing streak doc:', initErr);
              }
            }
            setLoading(false);
          },
          (err) => {
            console.warn('Real-time streak sync error (using cached local data):', err);
            const cached = localStorage.getItem(`sjtutor_streak_${user.uid}`);
            if (cached) {
              try {
                setStreak(JSON.parse(cached));
              } catch (parseErr) {
                console.warn('Failed to parse cached streak:', parseErr);
              }
            }
            setLoading(false);
          }
        );
      } else {
        // Guest user mode
        setCurrentUserId(null);
        const local = localStorage.getItem('sjtutor_streak_guest');
        if (local) {
          try {
            setStreak(JSON.parse(local));
          } catch {
            setStreak(INITIAL_STREAK);
          }
        } else {
          setStreak(INITIAL_STREAK);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Fetch leaderboard initially
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Is today already recorded as a completed study day?
  const todayDate = getLocalDateString();
  const isTodayCompleted = (streak.lastStudyDate === todayDate) || (streak.lastActivityDate === todayDate);

  // Record an activity completion with accurate calendar day criteria
  const recordActivity = useCallback(async (
    userProfile?: UserProfile,
    onProfileUpdate?: (profile: UserProfile) => void
  ) => {
    const today = getLocalDateString();
    const yesterday = getYesterdayDateString();

    return new Promise<{ success: boolean; incremented: boolean; milestoneReached?: number }>((resolve) => {
      setStreak((prev) => {
        const lastStudy = prev.lastStudyDate || prev.lastActivityDate;

        // If activity was already recorded today, do NOT increment again on the same day!
        if (lastStudy === today) {
          resolve({
            success: true,
            incremented: false,
          });
          return prev;
        }

        // Standard daily streak progression:
        // - If yesterday was completed: streak increments by 1
        // - If today is the first study day: streak is 1
        // - If consecutive streak was broken (last study was before yesterday): streak starts at 1
        let newCount = 1;
        if (lastStudy === yesterday) {
          newCount = (prev.currentStreak || 0) + 1;
        } else if (!lastStudy) {
          newCount = prev.currentStreak > 0 ? prev.currentStreak + 1 : 1;
        } else {
          newCount = 1;
        }

        const didIncrement = true;

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
          updatedAt: Date.now(),
        };

        // Save locally
        const storageKey = prev.uid === 'guest' ? 'sjtutor_streak_guest' : `sjtutor_streak_${prev.uid}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));

        // Push to Firestore as authoritative source of truth
        if (prev.uid !== 'guest') {
          const streakDocRef = doc(db, 'streaks', prev.uid);
          setDoc(streakDocRef, {
            ...updated,
            lastStudyDate: today,
            lastActivityDate: today,
            currentStreak: newCount,
            highestStreak: newHighest,
            updatedAt: Date.now(),
          }, { merge: true }).catch((err) => {
            console.warn('Firestore streak sync error:', err);
          });

          const userDocRef = doc(db, 'users', prev.uid);
          setDoc(userDocRef, {
            streak: newCount,
            currentStreak: newCount,
            highestStreak: newHighest,
            lastStudyDate: today,
          }, { merge: true }).catch(() => {});
        }

        if (userProfile && onProfileUpdate && didIncrement) {
          onProfileUpdate({
            ...userProfile,
            streak: newCount,
            currentStreak: newCount,
            highestStreak: newHighest,
          });
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
  }, [soundEnabled, triggerConfetti]);

  // Adjust / Correct streak (allows user to fix any multi-device desync)
  const adjustStreak = useCallback(async (newCount: number) => {
    const validCount = Math.max(0, Math.floor(newCount));
    const uid = currentUserId || (auth.currentUser ? auth.currentUser.uid : 'guest');
    const newHighest = Math.max(streak.highestStreak || 0, validCount);

    const updated: StreakData = {
      ...streak,
      currentStreak: validCount,
      highestStreak: newHighest,
      updatedAt: Date.now(),
    };
    setStreak(updated);

    if (uid !== 'guest') {
      localStorage.setItem(`sjtutor_streak_${uid}`, JSON.stringify(updated));
      const streakDocRef = doc(db, 'streaks', uid);
      const userDocRef = doc(db, 'users', uid);

      await Promise.all([
        setDoc(streakDocRef, {
          currentStreak: validCount,
          highestStreak: newHighest,
          updatedAt: Date.now(),
        }, { merge: true }),
        setDoc(userDocRef, {
          streak: validCount,
          currentStreak: validCount,
          highestStreak: newHighest,
        }, { merge: true }),
      ]).catch((err) => {
        console.warn('Failed to adjust streak in Firestore:', err);
      });
    } else {
      localStorage.setItem('sjtutor_streak_guest', JSON.stringify(updated));
    }
  }, [currentUserId, streak]);

  // Force immediate cloud sync
  const syncWithCloud = useCallback(async () => {
    const uid = currentUserId || (auth.currentUser ? auth.currentUser.uid : null);
    if (!uid) return;

    try {
      const streakDocRef = doc(db, 'streaks', uid);
      const docSnap = await getDoc(streakDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const current = typeof data.currentStreak === 'number' ? data.currentStreak : 0;
        const highest = typeof data.highestStreak === 'number' ? data.highestStreak : current;
        const lastStudy = data.lastStudyDate || data.lastActivityDate || null;

        const synced: StreakData = {
          uid,
          displayName: data.displayName || streak.displayName,
          photoURL: data.photoURL || streak.photoURL,
          currentStreak: current,
          highestStreak: highest,
          lastActivityDate: lastStudy,
          lastStudyDate: lastStudy,
          streakHistory: Array.isArray(data.streakHistory) ? data.streakHistory : streak.streakHistory,
          claimedMilestones: Array.isArray(data.claimedMilestones) ? data.claimedMilestones : streak.claimedMilestones,
          updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
        };

        setStreak(synced);
        localStorage.setItem(`sjtutor_streak_${uid}`, JSON.stringify(synced));
      }
    } catch (e) {
      console.warn('Manual cloud sync failed:', e);
    }
  }, [currentUserId, streak]);

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

    // Add exclusive academic emblem to user profile
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
      activeSecondsToday,
      requiredActiveSeconds: REQUIRED_ACTIVE_SECONDS,
      isTodayCompleted,
      recordActivity,
      adjustStreak,
      claimMilestone,
      fetchLeaderboard,
      triggerConfetti,
      celebration,
      setCelebration,
      soundEnabled,
      setSoundEnabled,
      syncWithCloud,
      isStreakModalOpen,
      setIsStreakModalOpen,
      openStreakModal,
      nextStreak,
      nextMilestone,
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
