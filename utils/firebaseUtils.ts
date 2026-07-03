import { doc, getDoc, setDoc, collection, getDocs, increment, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { UserProfile, HistoryItem, LeaderboardEntry } from "../types";

export const saveProfileToFirestore = async (uid: string, profile: Partial<UserProfile>) => {
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, profile, { merge: true });
    return true;
  } catch (error: any) {
    const isOffline = !navigator.onLine || (error && error.message && error.message.includes("offline"));
    if (isOffline) {
      console.warn("Saving profile to Firestore skipped or deferred because the client is offline:", error?.message || error);
    } else {
      console.error("Error saving profile to Firestore:", error);
    }
    return false;
  }
};

export const getProfileFromFirestore = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    const isOffline = !navigator.onLine || (error && error.message && error.message.includes("offline"));
    if (isOffline) {
      console.warn("Fetching profile from Firestore failed because the client is offline:", error?.message || error);
    } else {
      console.error("Error fetching profile from Firestore:", error);
    }
    return null;
  }
};

export const saveHistoryItemToFirestore = async (uid: string, item: HistoryItem) => {
  if (!uid || uid === "guest") return false;
  try {
    const docRef = doc(db, "users", uid, "history", item.id);
    await setDoc(docRef, item, { merge: true });
    return true;
  } catch (error: any) {
    console.warn("Error saving history item to Firestore:", error);
    return false;
  }
};

export const getHistoryFromFirestore = async (uid: string): Promise<HistoryItem[]> => {
  if (!uid || uid === "guest") return [];
  const colRef = collection(db, "users", uid, "history");
  const snapshot = await getDocs(colRef);
  const historyList: HistoryItem[] = [];
  snapshot.forEach((d) => {
    historyList.push(d.data() as HistoryItem);
  });
  return historyList.sort((a, b) => b.timestamp - a.timestamp);
};

export const syncHistoryWithFirestore = async (uid: string, localItems: HistoryItem[]): Promise<HistoryItem[]> => {
  if (!uid || uid === "guest") return localItems;
  try {
    const firestoreItems = await getHistoryFromFirestore(uid);
    const firestoreIds = new Set(firestoreItems.map((item) => item.id));

    const mergedItems = [...firestoreItems];
    const itemsToSave: Promise<any>[] = [];

    localItems.forEach((localItem) => {
      if (!firestoreIds.has(localItem.id)) {
        mergedItems.push(localItem);
        itemsToSave.push(saveHistoryItemToFirestore(uid, localItem));
      }
    });

    if (itemsToSave.length > 0) {
      await Promise.all(itemsToSave);
    }

    return mergedItems.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.warn("History synchronization failed, falling back to local history:", error);
    return localItems;
  }
};

export const createSharedContent = async (
  type: string,
  title: string,
  content: any,
  ownerUid: string,
  customId?: string
): Promise<string> => {
  try {
    // Generate a unique, user-friendly Share ID or use customId
    const shareId = customId || (Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8));
    const docRef = doc(db, "sharedContent", shareId);
    
    const sharedData = {
      shareId,
      type,
      title,
      content,
      ownerUid,
      createdAt: Date.now(),
      views: 0,
      likes: 0,
      sharesCount: 0,
      lastViewedAt: Date.now(),
      isPublic: true
    };
    
    await setDoc(docRef, sharedData);
    return shareId;
  } catch (error) {
    console.error("Error creating shared content:", error);
    throw error;
  }
};

export const getSharedContent = async (shareId: string): Promise<any | null> => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching shared content:", error);
    return null;
  }
};

export const incrementViewCount = async (shareId: string) => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await setDoc(docRef, {
      views: increment(1),
      lastViewedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.warn("Failed to increment views:", error);
  }
};

export const incrementLikeCount = async (shareId: string) => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await setDoc(docRef, {
      likes: increment(1)
    }, { merge: true });
  } catch (error) {
    console.warn("Failed to increment likes:", error);
  }
};

export const incrementShareCount = async (shareId: string) => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await setDoc(docRef, {
      sharesCount: increment(1)
    }, { merge: true });
  } catch (error) {
    console.warn("Failed to increment shares count:", error);
  }
};

export const deleteSharedContent = async (shareId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting shared content:", error);
    return false;
  }
};

export const getUserSharedContent = async (uid: string): Promise<any[]> => {
  if (!uid || uid === "guest") return [];
  try {
    const colRef = collection(db, "sharedContent");
    const q = query(colRef, where("ownerUid", "==", uid));
    const snapshot = await getDocs(q);
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data());
    });
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching user shared content:", error);
    return [];
  }
};

export const saveQuizScoreToLeaderboard = async (
  uid: string,
  displayName: string,
  photoURL: string | undefined,
  score: number
) => {
  if (!uid || uid === "guest") {
    try {
      const localLeaderboardStr = localStorage.getItem("sjtutor_local_leaderboard") || "[]";
      const localLeaderboard: LeaderboardEntry[] = JSON.parse(localLeaderboardStr);
      let guestEntry = localLeaderboard.find(item => item.uid === "guest");
      if (!guestEntry) {
        guestEntry = {
          uid: "guest",
          displayName: displayName || "Guest Learner",
          photoURL: photoURL || "",
          totalScore: 0,
          quizzesCompleted: 0,
          highestScore: 0,
          lastActive: Date.now()
        };
        localLeaderboard.push(guestEntry);
      }
      guestEntry.totalScore += score;
      guestEntry.quizzesCompleted += 1;
      guestEntry.highestScore = Math.max(guestEntry.highestScore, score);
      guestEntry.lastActive = Date.now();
      localStorage.setItem("sjtutor_local_leaderboard", JSON.stringify(localLeaderboard));
      return true;
    } catch (e) {
      console.warn("Guest leaderboard save failed:", e);
      return false;
    }
  }

  try {
    const docRef = doc(db, "quiz_leaderboard", uid);
    const docSnap = await getDoc(docRef);
    let totalScore = score;
    let quizzesCompleted = 1;
    let highestScore = score;

    if (docSnap.exists()) {
      const current = docSnap.data();
      totalScore = (current.totalScore || 0) + score;
      quizzesCompleted = (current.quizzesCompleted || 0) + 1;
      highestScore = Math.max(current.highestScore || 0, score);
    }

    const leaderboardData: LeaderboardEntry = {
      uid,
      displayName: displayName || "Anonymous Student",
      photoURL: photoURL || "",
      totalScore,
      quizzesCompleted,
      highestScore,
      lastActive: Date.now()
    };

    await setDoc(docRef, leaderboardData, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving leaderboard score:", error);
    return false;
  }
};

export const getQuizLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const colRef = collection(db, "quiz_leaderboard");
    const snapshot = await getDocs(colRef);
    const leaderboard: LeaderboardEntry[] = [];
    snapshot.forEach((d) => {
      leaderboard.push(d.data() as LeaderboardEntry);
    });

    // Also include guest entry from local storage if exists
    const localLeaderboardStr = localStorage.getItem("sjtutor_local_leaderboard") || "[]";
    const localLeaderboard: LeaderboardEntry[] = JSON.parse(localLeaderboardStr);
    const guestEntry = localLeaderboard.find(item => item.uid === "guest");
    if (guestEntry && !leaderboard.some(item => item.uid === "guest")) {
      leaderboard.push(guestEntry);
    }

    return leaderboard.sort((a, b) => b.totalScore - a.totalScore);
  } catch (error) {
    console.error("Error getting quiz leaderboard:", error);
    const localLeaderboardStr = localStorage.getItem("sjtutor_local_leaderboard") || "[]";
    return JSON.parse(localLeaderboardStr);
  }
};

