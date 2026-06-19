import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, increment } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { UserProfile } from "../types";

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

// --- PUBLIC SHARING SYSTEM HELPERS ---

export interface SharedContentData {
  shareId: string;
  type: string; // "quiz" | "summary" | "homework" | "tutor" | "notes" | "study_material" | "essay"
  title: string;
  content: any; // Markdown string, quiz questions array, tutor messages, notes object, etc.
  ownerUid: string;
  ownerEmail?: string;
  createdAt: number;
  views: number;
  likes: number;
  isPublic: boolean;
  score?: number; // Optional score for Quiz results
}

/**
 * Generates a random unique alphanumeric ID for sharing links
 */
export const generateShareId = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Creates / registers a new shared content record in Firestore
 */
export const createSharedContent = async (
  type: string,
  title: string,
  content: any,
  ownerUid: string,
  ownerEmail: string = "",
  score?: number
): Promise<string | null> => {
  try {
    const shareId = generateShareId();
    const sharedData: SharedContentData = {
      shareId,
      type: type.toLowerCase(),
      title: title || `Untitled ${type}`,
      content,
      ownerUid,
      ownerEmail,
      createdAt: Date.now(),
      views: 0,
      likes: 0,
      isPublic: true,
      ...(score !== undefined && { score })
    };

    const docRef = doc(db, "sharedContent", shareId);
    await setDoc(docRef, sharedData);
    return shareId;
  } catch (error) {
    console.error("Error creating shared content in Firestore:", error);
    return null;
  }
};

/**
 * Retrieves shared content details from Firestore
 */
export const getSharedContent = async (shareId: string): Promise<SharedContentData | null> => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as SharedContentData;
    }
    return null;
  } catch (error) {
    console.error("Error getting shared content from Firestore:", error);
    return null;
  }
};

/**
 * Increments the view count for a shared item in Firestore
 */
export const incrementSharedViews = async (shareId: string): Promise<void> => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    console.warn("Could not increment shared view count (might be offline/rules):", error);
  }
};

/**
 * Increments the likes count for a shared item in Firestore
 */
export const incrementSharedLikes = async (shareId: string): Promise<void> => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await updateDoc(docRef, {
      likes: increment(1)
    });
  } catch (error) {
    console.warn("Could not increment shared likes count:", error);
  }
};

/**
 * Retrieves all public shared content items owned by a specific user
 */
export const getUsersSharedContent = async (ownerUid: string): Promise<SharedContentData[]> => {
  try {
    const colRef = collection(db, "sharedContent");
    const q = query(colRef, where("ownerUid", "==", ownerUid));
    const querySnapshot = await getDocs(q);
    const results: SharedContentData[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push(docSnap.data() as SharedContentData);
    });
    // Sort locally by creation date descending
    return results.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error fetching user shared contents from Firestore:", error);
    return [];
  }
};

/**
 * Deletes a shared content document in Firestore (only authorized/owner per rules)
 */
export const deleteSharedContent = async (shareId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, "sharedContent", shareId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting shared content from Firestore:", error);
    return false;
  }
};

