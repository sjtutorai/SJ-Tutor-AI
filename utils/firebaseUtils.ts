import { doc, getDoc, setDoc, collection, getDocs, increment, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { UserProfile, HistoryItem } from "../types";

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
  try {
    const colRef = collection(db, "users", uid, "history");
    const snapshot = await getDocs(colRef);
    const historyList: HistoryItem[] = [];
    snapshot.forEach((d) => {
      historyList.push(d.data() as HistoryItem);
    });
    return historyList.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error: any) {
    console.warn("Error fetching history from Firestore:", error);
    return [];
  }
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
  ownerUid: string
): Promise<string> => {
  try {
    // Generate a unique, user-friendly Share ID
    const shareId = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
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
  } catch (error) {
    console.warn("Firestore share fetch failed, falling back to dynamic API:", error);
  }

  // Fallback to Express router
  try {
    const response = await fetch(`/api/auth/share/${shareId}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return {
          shareId: result.data.id,
          type: result.data.type,
          title: result.data.title,
          content: result.data.content,
          createdAt: result.data.createdAt ? new Date(result.data.createdAt).getTime() : Date.now(),
          views: result.data.views || 0,
          likes: result.data.likes || 0,
        };
      }
    }
  } catch (apiError) {
    console.warn("API share fetch failed:", apiError);
  }
  return null;
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

