import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
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
