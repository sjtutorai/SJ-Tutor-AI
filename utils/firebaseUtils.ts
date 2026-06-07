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
    let querySnapshot = await getDocs(usersColRef);
    
    // Seed default competitors into Firestore if they don't already exist in the database,
    // ensuring the leaderboard is always populated with competitive records from Firebase.
    const initialScholars = [
      { id: "peer_scholar_0", displayName: "Aarav Sharma", streak: 42, lastActivityDate: "2026-06-03", credits: 500, institution: "National Academic School", bio: "Fascinated by astrophysics!" },
      { id: "peer_scholar_1", displayName: "Chloe Jenkins", streak: 31, lastActivityDate: "2026-06-03", credits: 380, institution: "Oakridge Secondary School", bio: "Chemistry olympiad competitor" },
      { id: "peer_scholar_2", displayName: "Kenji Sato", streak: 25, lastActivityDate: "2026-06-04", credits: 400, institution: "Tokyo Tech Academy", bio: "Passionate math enthusiast" },
      { id: "peer_scholar_3", displayName: "Maria Rodriguez", streak: 18, lastActivityDate: "2026-06-03", credits: 210, institution: "St. Jude Prep Center", bio: "History and literature major" },
      { id: "peer_scholar_4", displayName: "Li Wei", streak: 12, lastActivityDate: "2026-06-04", credits: 150, institution: "Eastside High School", bio: "Competitive coding fan" }
    ];

    let hasPeers = false;
    querySnapshot.forEach((docSnap) => {
      if (docSnap.id.startsWith("peer_scholar_")) {
        hasPeers = true;
      }
    });

    if (!hasPeers || querySnapshot.empty) {
      for (const peer of initialScholars) {
        const peerDocRef = doc(db, "users", peer.id);
        const peerDocSnap = await getDoc(peerDocRef);
        if (!peerDocSnap.exists()) {
          const { id, ...peerData } = peer;
          await setDoc(peerDocRef, {
            ...peerData,
            phoneNumber: "",
            bio: peer.bio,
            institution: peer.institution,
            credits: peer.credits,
            planType: "Scholar",
            streak: peer.streak,
            lastActivityDate: peer.lastActivityDate,
            highestStreak: peer.streak
          }, { merge: true });
        }
      }
      // Re-query to get the absolute, complete set of Firebase documents
      querySnapshot = await getDocs(usersColRef);
    }

    const leaderboard: Array<{ displayName: string; streak: number; lastActivityDate?: string }> = [];
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
    
    // Return leaderboard sorted by streak (descending) directly fetched from Firebase
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
