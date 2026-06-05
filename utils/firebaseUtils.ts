import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { UserProfile } from "../types";

export const getStreakLeaderboardFromFirestore = async (): Promise<Array<{ displayName: string; streak: number; lastActivityDate?: string }>> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn("Client is offline. Skipping Firestore leaderboard fetch.");
    return [];
  }
  try {
    const usersColRef = collection(db, "users");
    const querySnapshot = await getDocs(usersColRef);
    const leaderboard: Array<{ displayName: string; streak: number; lastActivityDate?: string }> = [];
    
    if (querySnapshot.empty) {
      // Seed initial high-performing scholars in Firestore to make sure the board has active data
      const initialScholars = [
        { displayName: "Aarav Sharma", streak: 42, lastActivityDate: "2026-06-03", mainSubject: "Physics", credits: 500 },
        { displayName: "Chloe Jenkins", streak: 31, lastActivityDate: "2026-06-03", mainSubject: "Chemistry", credits: 380 },
        { displayName: "Kenji Sato", streak: 25, lastActivityDate: "2026-06-04", mainSubject: "Mathematics", credits: 400 },
        { displayName: "Maria Rodriguez", streak: 18, lastActivityDate: "2026-06-03", mainSubject: "History", credits: 210 },
        { displayName: "Li Wei", streak: 12, lastActivityDate: "2026-06-04", mainSubject: "Computer Science", credits: 150 }
      ];

      for (let i = 0; i < initialScholars.length; i++) {
        const peer = initialScholars[i];
        const peerDocRef = doc(db, "users", `peer_scholar_${i}`);
        await setDoc(peerDocRef, peer, { merge: true });
        leaderboard.push({
          displayName: peer.displayName,
          streak: peer.streak,
          lastActivityDate: peer.lastActivityDate
        });
      }
    } else {
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data.streak === 'number' && data.streak > 0) {
          leaderboard.push({
            displayName: data.displayName || "Anonymous Scholar",
            streak: data.streak,
            lastActivityDate: data.lastActivityDate
          });
        }
      });
    }
    
    return leaderboard.sort((a, b) => b.streak - a.streak).slice(0, 10);
  } catch (error) {
    console.error("Error fetching streak leaderboard:", error);
    return [];
  }
};

export const saveProfileToFirestore = async (uid: string, profile: Partial<UserProfile>) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn("Client is offline. Skipping Firestore profile save (will persist locally).");
    return false;
  }
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, profile, { merge: true });
    return true;
  } catch (error: any) {
    const isOffline = error?.message?.toLowerCase().includes('offline') || 
                      error?.code === 'unavailable' ||
                      (typeof navigator !== 'undefined' && !navigator.onLine);
    if (isOffline) {
      console.warn("Firestore profile save skipped because client is offline:", error?.message || error);
    } else {
      console.error("Error saving profile to Firestore:", error);
    }
    return false;
  }
};

export const getProfileFromFirestore = async (uid: string): Promise<UserProfile | null> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn("Client is offline. Skipping Firestore profile fetch.");
    return null;
  }
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    const isOffline = error?.message?.toLowerCase().includes('offline') || 
                      error?.code === 'unavailable' ||
                      (typeof navigator !== 'undefined' && !navigator.onLine);
    if (isOffline) {
      console.warn("Firestore profile fetch bypassed because client is offline:", error?.message || error);
    } else {
      console.error("Error fetching profile from Firestore:", error);
    }
    return null;
  }
};
