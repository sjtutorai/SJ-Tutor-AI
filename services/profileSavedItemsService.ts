import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { AppMode } from '../types';

export interface ProfileSavedItem {
  id: string;
  type: AppMode | string;
  title: string;
  subtitle: string;
  timestamp: number;
  content?: any;
  formData?: any;
  score?: number;
  subject?: string;
  gradeClass?: string;
  chapterName?: string;
  source: 'history' | 'savedItems';
  raw?: any;
}

/**
 * Resolves the primary SJ Tutor AI Account / User ID for Firestore access.
 * Matches the resolution used by Summaries, Quizzes, and the active session.
 */
export async function resolveUserAccountId(providedId?: string | null, email?: string | null): Promise<string | null> {
  // 1. Direct explicit ID if provided
  if (providedId && providedId !== 'guest') {
    return providedId;
  }

  // 2. Active Firebase Auth user
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  // 3. Saved authenticated session in localStorage
  try {
    const savedSession = localStorage.getItem('sjtutor_authenticated_user');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      if (parsed?.uid) return parsed.uid;
      if (parsed?.sjTutorId) {
        // Look up mapping from sj_tutor_ids or users collection
        const mappedUid = await lookupUidBySjTutorId(parsed.sjTutorId);
        return mappedUid || parsed.sjTutorId;
      }
    }
  } catch (e) {
    console.warn('[ProfileSavedItems] Error reading saved session:', e);
  }

  // 4. Try matching by email if available
  if (email && email !== 'Guest') {
    try {
      const usersQuery = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
      const snap = await getDocs(usersQuery);
      if (!snap.empty) {
        return snap.docs[0].id;
      }
    } catch (e) {
      console.warn('[ProfileSavedItems] Error resolving user by email:', e);
    }
  }

  return null;
}

/**
 * Helper to lookup Firebase UID from sj_tutor_ids or users collection
 */
async function lookupUidBySjTutorId(sjTutorId: string): Promise<string | null> {
  try {
    const cleanId = sjTutorId.trim();
    // Check users collection where sjTutorId or registrationNumber matches
    const q1 = query(collection(db, 'users'), where('registrationNumber', '==', cleanId));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) return snap1.docs[0].id;

    const q2 = query(collection(db, 'users'), where('sjTutorId', '==', cleanId));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) return snap2.docs[0].id;
  } catch (err) {
    console.warn('[ProfileSavedItems] Error in lookupUidBySjTutorId:', err);
  }
  return null;
}

/**
 * Converts any Firestore document into a standardized ProfileSavedItem
 */
export function mapDocToProfileSavedItem(
  docId: string, 
  data: any, 
  source: 'history' | 'savedItems' = 'history'
): ProfileSavedItem {
  const id = data.id || data.itemId || data.docId || docId;

  // Normalize type
  const rawType = (data.type || data.contentType || data.category || data.itemType || 'SUMMARY').toString().toUpperCase();
  let normalizedType: AppMode | string = rawType;
  if (rawType.includes('QUIZ')) normalizedType = AppMode.QUIZ;
  else if (rawType.includes('SUMMARY') || rawType.includes('NOTE')) normalizedType = AppMode.SUMMARY;
  else if (rawType.includes('HOMEWORK')) normalizedType = AppMode.HOMEWORK;
  else if (rawType.includes('ESSAY')) normalizedType = AppMode.ESSAY;
  else if (rawType.includes('TUTOR') || rawType.includes('CHAT')) normalizedType = AppMode.TUTOR;

  // Normalize title
  const title = data.title || data.name || data.chapterName || data.topic || data.subject || 'Untitled Saved Item';

  // Normalize timestamp
  let timestamp = Date.now();
  if (typeof data.timestamp === 'number') {
    timestamp = data.timestamp;
  } else if (data.timestamp?.toMillis) {
    timestamp = data.timestamp.toMillis();
  } else if (data.timestamp?.seconds) {
    timestamp = data.timestamp.seconds * 1000;
  } else if (data.createdAt?.seconds) {
    timestamp = data.createdAt.seconds * 1000;
  } else if (data.savedAt?.seconds) {
    timestamp = data.savedAt.seconds * 1000;
  } else if (typeof data.createdAt === 'number') {
    timestamp = data.createdAt;
  } else if (typeof data.savedAt === 'number') {
    timestamp = data.savedAt;
  } else if (typeof data.date === 'number') {
    timestamp = data.date;
  }

  // Extract form & subject info
  const subject = data.formData?.subject || data.subject || '';
  const gradeClass = data.formData?.gradeClass || data.gradeClass || data.grade || '';
  const chapterName = data.formData?.chapterName || data.chapterName || '';

  let subtitle = data.subtitle || '';
  if (!subtitle && (gradeClass || subject)) {
    subtitle = [gradeClass, subject].filter(Boolean).join(' • ');
  }

  return {
    id,
    type: normalizedType,
    title,
    subtitle,
    timestamp,
    content: data.content,
    formData: data.formData || {
      subject,
      gradeClass,
      chapterName,
      board: data.formData?.board || data.board || '',
      difficulty: data.formData?.difficulty || data.difficulty || 'Medium',
      language: data.formData?.language || data.language || 'English',
      questionCount: data.formData?.questionCount || 5,
    },
    score: data.score !== undefined ? Number(data.score) : undefined,
    subject,
    gradeClass,
    chapterName,
    source,
    raw: data,
  };
}

/**
 * Fetches all saved items for a given user account from Firestore.
 * Queries `users/{accountId}/history` as well as `users/{accountId}/savedItems`
 * and any additional account aliases if present.
 */
export async function getProfileSavedItems(accountId: string): Promise<ProfileSavedItem[]> {
  if (!accountId || accountId === 'guest') {
    return [];
  }

  const itemsMap = new Map<string, ProfileSavedItem>();

  // Helper to fetch from a subcollection
  const fetchSubcollection = async (uid: string, subcollectionName: 'history' | 'savedItems') => {
    try {
      const colRef = collection(db, 'users', uid, subcollectionName);
      const snapshot = await getDocs(colRef);
      snapshot.forEach((d) => {
        if (!d.exists()) return;
        const item = mapDocToProfileSavedItem(d.id, d.data(), subcollectionName);
        if (!itemsMap.has(item.id)) {
          itemsMap.set(item.id, item);
        }
      });
    } catch (err) {
      console.warn(`[ProfileSavedItems] Error fetching users/${uid}/${subcollectionName}:`, err);
    }
  };

  // Primary fetch: history subcollection (where summaries, quizzes, tutor notes live)
  await fetchSubcollection(accountId, 'history');

  // Secondary fetch: savedItems subcollection (if any were saved directly to savedItems)
  await fetchSubcollection(accountId, 'savedItems');

  // Convert map to array and sort by newest first
  const result = Array.from(itemsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  return result;
}

/**
 * Deletes a saved item from Firestore across both potential subcollections
 */
export async function deleteProfileSavedItem(accountId: string, itemId: string): Promise<boolean> {
  if (!accountId || !itemId) return false;
  try {
    // Delete from history
    try {
      await deleteDoc(doc(db, 'users', accountId, 'history', itemId));
    } catch {
      // Ignore if not found in history
    }
    // Delete from savedItems
    try {
      await deleteDoc(doc(db, 'users', accountId, 'savedItems', itemId));
    } catch {
      // Ignore if not found in savedItems
    }
    return true;
  } catch (err) {
    console.error('[ProfileSavedItems] Error deleting saved item:', err);
    return false;
  }
}

/**
 * Sets up a real-time listener for the user's history and saved items.
 */
export function subscribeToProfileSavedItems(
  accountId: string, 
  onUpdate: (items: ProfileSavedItem[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!accountId || accountId === 'guest') {
    onUpdate([]);
    return () => {};
  }

  const historyMap = new Map<string, ProfileSavedItem>();
  const savedItemsMap = new Map<string, ProfileSavedItem>();

  const emitMerged = () => {
    const merged = new Map<string, ProfileSavedItem>();
    historyMap.forEach((v, k) => merged.set(k, v));
    savedItemsMap.forEach((v, k) => {
      if (!merged.has(k)) merged.set(k, v);
    });
    const sorted = Array.from(merged.values()).sort((a, b) => b.timestamp - a.timestamp);
    onUpdate(sorted);
  };

  // 1. Listen to history
  const unsubHistory = onSnapshot(
    collection(db, 'users', accountId, 'history'),
    (snapshot) => {
      historyMap.clear();
      snapshot.forEach((d) => {
        const item = mapDocToProfileSavedItem(d.id, d.data(), 'history');
        historyMap.set(item.id, item);
      });
      emitMerged();
    },
    (err) => {
      console.warn('[ProfileSavedItems] Real-time history listener warning:', err);
      if (onError) onError(err);
    }
  );

  // 2. Listen to savedItems
  const unsubSavedItems = onSnapshot(
    collection(db, 'users', accountId, 'savedItems'),
    (snapshot) => {
      savedItemsMap.clear();
      snapshot.forEach((d) => {
        const item = mapDocToProfileSavedItem(d.id, d.data(), 'savedItems');
        savedItemsMap.set(item.id, item);
      });
      emitMerged();
    },
    (err) => {
      // It's normal if savedItems doesn't exist yet
      console.warn('[ProfileSavedItems] Real-time savedItems listener warning:', err);
    }
  );

  return () => {
    unsubHistory();
    unsubSavedItems();
  };
}
