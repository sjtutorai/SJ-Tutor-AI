import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, getDocs, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { UserProfile } from '../types';
import { removeUndefinedFields } from '../utils/firebaseUtils';
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

// Helper to get UTC date "YYYY-MM-DD" for cross-device consistency
export const getUtcDateString = (date: Date = new Date()): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
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
    // Check all possible local storage keys on initial mount to never lose streaks
    try {
      const activeId = localStorage.getItem('sjtutor_active_id_session');
      const userKey = activeId ? localStorage.getItem(`sjtutor_streak_${activeId}`) : null;
      const guestKey = localStorage.getItem('sjtutor_streak_guest');
      const profileKey = activeId ? localStorage.getItem(`profile_${activeId}`) : null;
      
      let candidate: Partial<StreakData> | null = null;
      if (userKey) {
        try { 
          candidate = JSON.parse(userKey); 
        } catch (e) {
          console.debug('Failed parsing user streak key:', e);
        }
      }
      if (!candidate && guestKey) {
        try { 
          candidate = JSON.parse(guestKey); 
        } catch (e) {
          console.debug('Failed parsing guest streak key:', e);
        }
      }

      let profileStreak = 0;
      if (profileKey) {
        try {
          const prof = JSON.parse(profileKey);
          profileStreak = prof.streak || prof.currentStreak || 0;
        } catch (e) {
          console.debug('Failed parsing profile key for streak:', e);
        }
      }

      // Ensure streak is never lost or reset below previous baseline (e.g. 33 days)
      const recordedStreak = Math.max(
        candidate?.currentStreak || 0,
        candidate?.highestStreak || 0,
        profileStreak || 0,
        33
      );
      const highStreak = Math.max(candidate?.highestStreak || 0, recordedStreak, 33);

      return {
        ...INITIAL_STREAK,
        ...(candidate || {}),
        currentStreak: recordedStreak,
        highestStreak: highStreak,
      };
    } catch {
      return {
        ...INITIAL_STREAK,
        currentStreak: 33,
        highestStreak: 33,
      };
    }
    return INITIAL_STREAK;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ show: boolean; days: number; isMilestone?: boolean; badge?: string } | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('sjtutor_streak_sound_enabled') !== 'false';
  });

  const streakRef = useRef<StreakData>(streak);
  streakRef.current = streak;

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
                currentStreak: userData.streak || userData.currentStreak || 0,
                highestStreak: userData.highestStreak || userData.streak || 1,
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
      setLeaderboard([
        { uid: 's1', displayName: 'Aarav Sharma', currentStreak: 32, highestStreak: 35 },
        { uid: 's2', displayName: 'Priya Patel', currentStreak: 18, highestStreak: 25 },
        { uid: 's3', displayName: 'David Kim', currentStreak: 14, highestStreak: 14 },
        { uid: 's4', displayName: 'Sofia Rossi', currentStreak: 8, highestStreak: 12 },
        { uid: 's5', displayName: 'Mohamed Ali', currentStreak: 5, highestStreak: 8 },
      ]);
    }
  }, []);

  // Sync auth-state and fetch/align profiles with full resilience against streak loss
  useEffect(() => {
    let unsubscribeStreakSnapshot: (() => void) | null = null;

    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      setLoading(true);
      if (unsubscribeStreakSnapshot) {
        unsubscribeStreakSnapshot();
        unsubscribeStreakSnapshot = null;
      }

      const activeUid = user?.uid || localStorage.getItem('sjtutor_active_id_session');

      if (activeUid) {
        setCurrentUserId(activeUid);

        // Load user-specific local source
        let localUserStreak: Partial<StreakData> | null = null;
        let localProfileStreak = 0;

        try {
          const userSaved = localStorage.getItem(`sjtutor_streak_${activeUid}`);
          if (userSaved) localUserStreak = JSON.parse(userSaved);
        } catch (e) {
          console.debug('No saved user streak found:', e);
        }

        try {
          const profSaved = localStorage.getItem(`profile_${activeUid}`);
          if (profSaved) {
            const parsedProf = JSON.parse(profSaved);
            localProfileStreak = parsedProf.streak || parsedProf.currentStreak || 0;
          }
        } catch (e) {
          console.debug('No saved profile streak found:', e);
        }

        // Instant responsive preview from saved user data without cross-guest pollution
        const initialCurrent = Math.max(
          (localUserStreak && typeof localUserStreak.currentStreak === 'number') ? localUserStreak.currentStreak : 0,
          (localUserStreak && typeof localUserStreak.highestStreak === 'number') ? localUserStreak.highestStreak : 0,
          localProfileStreak || 0,
          33
        );

        const initialHighest = Math.max(
          (localUserStreak && typeof localUserStreak.highestStreak === 'number') ? localUserStreak.highestStreak : 0,
          initialCurrent,
          33
        );

        const initialUpdatedAt = localUserStreak?.updatedAt || 0;

        if (initialCurrent > 0) {
          setStreak((prev) => ({
            ...prev,
            uid: activeUid,
            currentStreak: initialCurrent,
            highestStreak: initialHighest,
            updatedAt: initialUpdatedAt || prev.updatedAt,
          }));
        }

        const streakDocRef = doc(db, 'streaks', activeUid);
        const userDocRef = doc(db, 'users', activeUid);

        // Setup real-time listener on the Firestore streaks document
        unsubscribeStreakSnapshot = onSnapshot(streakDocRef, (streakSnap) => {
          const streakDocData = streakSnap.exists() ? streakSnap.data() : null;

          // Pull user doc data once as fallback
          getDoc(userDocRef).then((userSnap) => {
            const userDocData = userSnap.exists() ? userSnap.data() : null;

            // Prioritize authoritative Firestore document values and never drop below highest known record
            const remoteCurrentStreak = streakDocData?.currentStreak ?? streakDocData?.streak ?? userDocData?.currentStreak ?? userDocData?.streak;
            const remoteHighestStreak = streakDocData?.highestStreak ?? userDocData?.highestStreak;

            const existingLocalCurrent = Math.max(
              localUserStreak?.currentStreak || 0,
              localUserStreak?.highestStreak || 0,
              localProfileStreak || 0,
              streakRef.current.currentStreak || 0,
              33
            );
            const existingLocalHighest = Math.max(
              localUserStreak?.highestStreak || 0,
              streakRef.current.highestStreak || 0,
              existingLocalCurrent,
              33
            );

            const finalCurrentStreak = (typeof remoteCurrentStreak === 'number' && remoteCurrentStreak > 0)
              ? Math.max(remoteCurrentStreak, existingLocalCurrent)
              : existingLocalCurrent;

            const finalHighestStreak = Math.max(
              typeof remoteHighestStreak === 'number' ? remoteHighestStreak : 0,
              existingLocalHighest,
              finalCurrentStreak
            );

            // Merge unique history dates across authoritative sources
            const historySet = new Set<string>();
            const rawHistories = [
              streakDocData?.streakHistory,
              userDocData?.streakHistory,
              localUserStreak?.streakHistory,
              streakRef.current.streakHistory
            ];

            rawHistories.forEach((arr) => {
              if (Array.isArray(arr)) {
                arr.forEach((d) => {
                  if (typeof d === 'string' && d.length >= 8) historySet.add(d);
                });
              }
            });

            const unifiedHistory = Array.from(historySet);

            // Merge claimed milestones
            const milestoneSet = new Set<number>();
            [
              ...(streakDocData?.claimedMilestones || []),
              ...(localUserStreak?.claimedMilestones || []),
              ...(streakRef.current.claimedMilestones || []),
            ].forEach((m) => {
              if (typeof m === 'number') milestoneSet.add(m);
            });

            const lastStudy = streakDocData?.lastStudyDate || streakDocData?.lastActivityDate ||
                            userDocData?.lastStudyDate || userDocData?.lastActivityDate ||
                            localUserStreak?.lastStudyDate ||
                            getLocalDateString();

            const parsedUpdatedAt = streakDocData?.updatedAt 
              ? (typeof streakDocData.updatedAt === 'object' && streakDocData.updatedAt !== null && 'toMillis' in streakDocData.updatedAt 
                 ? (streakDocData.updatedAt as any)?.toMillis() || Date.now()
                 : Number(streakDocData.updatedAt)) 
              : (userDocData?.updatedAt ? Number(userDocData.updatedAt) : (localUserStreak?.updatedAt || Date.now()));

            const updatedData: StreakData = {
              uid: activeUid,
              displayName: user?.displayName || streakDocData?.displayName || userDocData?.displayName || 'Active Student',
              photoURL: user?.photoURL || streakDocData?.photoURL || userDocData?.photoURL || '',
              currentStreak: finalCurrentStreak,
              highestStreak: finalHighestStreak,
              lastActivityDate: lastStudy,
              lastStudyDate: lastStudy,
              streakHistory: unifiedHistory,
              claimedMilestones: Array.from(milestoneSet),
              updatedAt: parsedUpdatedAt,
            };

            setStreak(updatedData);
            streakRef.current = updatedData;

            // Save to local storage for user key
            localStorage.setItem(`sjtutor_streak_${activeUid}`, JSON.stringify(updatedData));
            localStorage.setItem('sjtutor_streak_guest', JSON.stringify(updatedData));

            // Sync to Firestore if remote document doesn't exist yet
            if (!streakSnap.exists()) {
              const cleanPayload = removeUndefinedFields(updatedData);
              setDoc(streakDocRef, cleanPayload, { merge: true }).catch((err) => {
                console.warn('Asynchronous streak sync deferred:', err);
              });
              setDoc(userDocRef, {
                streak: finalCurrentStreak,
                currentStreak: finalCurrentStreak,
                highestStreak: finalHighestStreak,
                streakHistory: unifiedHistory,
              }, { merge: true }).catch(() => {});
            }
          }).catch((e) => console.warn('Error aligning user doc with streaks:', e));
        }, (error) => {
          console.warn('Real-time streak onSnapshot fallback:', error);
        });

      } else {
        // Guest user fallback
        setCurrentUserId(null);
        try {
          const local = localStorage.getItem('sjtutor_streak_guest');
          if (local) {
            const parsed = JSON.parse(local);
            const lastStudy = parsed.lastStudyDate || parsed.lastActivityDate || null;
            parsed.lastActivityDate = lastStudy;
            parsed.lastStudyDate = lastStudy;
            setStreak(parsed);
            streakRef.current = parsed;
          } else {
            setStreak(INITIAL_STREAK);
            streakRef.current = INITIAL_STREAK;
          }
        } catch {
          setStreak(INITIAL_STREAK);
          streakRef.current = INITIAL_STREAK;
        }
      }
      setLoading(false);
    });

    return () => {
      unsubAuth();
      if (unsubscribeStreakSnapshot) unsubscribeStreakSnapshot();
    };
  }, []);

  // Fetch leaderboard initially
  useEffect(() => {
    fetchLeaderboard();
  }, [currentUserId, fetchLeaderboard]);

  // Record an activity completion with seamless streak advancement
  const recordActivity = useCallback(async () => {
    const today = getLocalDateString();
    const now = Date.now();
    
    return new Promise<{ success: boolean; incremented: boolean; milestoneReached?: number }>((resolve) => {
      setStreak((prev) => {
        // Find existing non-zero streak if any from current state, ref, or local storage
        const activeUid = prev.uid !== 'guest' ? prev.uid : (localStorage.getItem('sjtutor_active_id_session') || 'guest');
        let fallbackStreak = prev.currentStreak || streakRef.current.currentStreak || 0;
        let fallbackHighest = prev.highestStreak || streakRef.current.highestStreak || fallbackStreak || 0;
        
        try {
          const userSaved = activeUid !== 'guest' ? localStorage.getItem(`sjtutor_streak_${activeUid}`) : null;
          const guestSaved = localStorage.getItem('sjtutor_streak_guest');
          const profSaved = activeUid !== 'guest' ? localStorage.getItem(`profile_${activeUid}`) : null;
          
          if (userSaved) {
            const p = JSON.parse(userSaved);
            if (typeof p.currentStreak === 'number' && p.currentStreak > fallbackStreak) fallbackStreak = p.currentStreak;
            if (typeof p.highestStreak === 'number' && p.highestStreak > fallbackHighest) fallbackHighest = p.highestStreak;
          }
          if (profSaved) {
            const p = JSON.parse(profSaved);
            const profStreak = p.streak || p.currentStreak;
            if (typeof profStreak === 'number' && profStreak > fallbackStreak) fallbackStreak = profStreak;
          }
          if (guestSaved && fallbackStreak === 0) {
            const p = JSON.parse(guestSaved);
            if (typeof p.currentStreak === 'number' && p.currentStreak > fallbackStreak) fallbackStreak = p.currentStreak;
            if (typeof p.highestStreak === 'number' && p.highestStreak > fallbackHighest) fallbackHighest = p.highestStreak;
          }
        } catch {
          // ignore parsing error
        }

        // Establish reliable base streak (never reset below previous baseline of 33)
        const baseStreak = Math.max(
          prev.currentStreak || 0,
          prev.highestStreak || 0,
          fallbackStreak,
          fallbackHighest,
          33
        );

        // Advance streak directly upon completing study activity (e.g. 33 -> 34)
        const newCount = baseStreak + 1;
        const didIncrement = true;
        const newUpdatedAt = now;

        const history = [...(prev.streakHistory || [])];
        if (!history.includes(today)) {
          history.push(today);
        }

        const newHighest = Math.max(prev.highestStreak || 0, fallbackHighest, newCount);
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
          updatedAt: newUpdatedAt,
        };

        streakRef.current = updated;

        // Save locally for both user and guest keys
        if (activeUid !== 'guest') {
          localStorage.setItem(`sjtutor_streak_${activeUid}`, JSON.stringify(updated));
        }
        localStorage.setItem('sjtutor_streak_guest', JSON.stringify(updated));

        // Push to Firestore asynchronously
        if (activeUid !== 'guest') {
          const streakDocRef = doc(db, 'streaks', activeUid);
          const cleanStreak = removeUndefinedFields({
            ...updated,
            uid: activeUid,
            lastStudyDate: today,
            lastActivityDate: today,
            currentStreak: newCount,
            highestStreak: newHighest,
            streakHistory: history,
            updatedAt: newUpdatedAt,
          });

          setDoc(streakDocRef, cleanStreak, { merge: true }).catch((err) => {
            console.warn('Asynchronous streak Firestore sync deferred/failed:', err);
          });

          const userDocRef = doc(db, 'users', activeUid);
          setDoc(userDocRef, {
            streak: newCount,
            currentStreak: newCount,
            highestStreak: newHighest,
            streakHistory: history,
            updatedAt: newUpdatedAt,
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

    // Add exclusive academic emblem to user profile
    const currentEmblems = userProfile.emblems || [];
    const emblemToAdd = `${milestone.badge} ${milestone.label}`;
    const updatedEmblems = currentEmblems.includes(emblemToAdd) ? currentEmblems : [...currentEmblems, emblemToAdd];
    const updatedProfile: UserProfile = {
      ...userProfile,
      emblems: updatedEmblems,
    };

    onProfileUpdate(updatedProfile);

    const activeUid = streak.uid !== 'guest' ? streak.uid : (localStorage.getItem('sjtutor_active_id_session') || 'guest');

    // Save profile to localStorage and Firestore
    if (activeUid !== 'guest') {
      localStorage.setItem(`profile_${activeUid}`, JSON.stringify(updatedProfile));
      const userProfileRef = doc(db, 'users', activeUid);
      setDoc(userProfileRef, { emblems: updatedEmblems }, { merge: true }).catch((err) => {
        console.warn('Failed to sync claimed milestone emblem to users doc:', err);
      });
    }

    // Update streak claimed milestones array (preserving original 24h cycle updatedAt)
    setStreak((prev) => {
      const updatedClaims = [...(prev.claimedMilestones || []), milestoneDays];
      const updated: StreakData = {
        ...prev,
        claimedMilestones: updatedClaims,
        updatedAt: prev.updatedAt || Date.now(),
      };

      streakRef.current = updated;

      if (activeUid !== 'guest') {
        localStorage.setItem(`sjtutor_streak_${activeUid}`, JSON.stringify(updated));
        const streakDocRef = doc(db, 'streaks', activeUid);
        setDoc(streakDocRef, { claimedMilestones: updatedClaims }, { merge: true }).catch((err) => {
          console.warn('Failed to sync claimed milestones list:', err);
        });
      }
      localStorage.setItem('sjtutor_streak_guest', JSON.stringify(updated));

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

