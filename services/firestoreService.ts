import { db, auth } from '../firebaseConfig';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { UserProfile, HistoryItem, LeaderboardEntry } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const FirestoreService = {
  // User Profile
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  saveUserProfile: async (userId: string, profile: UserProfile): Promise<void> => {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, profile, { merge: true });
      
      // Also update leaderboard
      const leaderboardRef = doc(db, 'leaderboard', userId);
      await setDoc(leaderboardRef, {
        userId,
        displayName: profile.displayName,
        photoURL: profile.photoURL || '',
        points: profile.points,
        streak: profile.streak
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Leaderboard
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const path = 'leaderboard';
    try {
      const q = query(
        collection(db, 'leaderboard'),
        orderBy('points', 'desc'),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data()) as LeaderboardEntry[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // History
  getUserHistory: async (userId: string): Promise<HistoryItem[]> => {
    const path = 'history';
    try {
      const q = query(
        collection(db, 'history'), 
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HistoryItem[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addHistoryItem: async (item: Omit<HistoryItem, 'id'>): Promise<string> => {
    const path = 'history';
    try {
      const docRef = await addDoc(collection(db, 'history'), item);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  // Real-time sync for profile
  subscribeToProfile: (userId: string, callback: (profile: UserProfile) => void) => {
    const path = `users/${userId}`;
    return onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        callback(doc.data() as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  }
};
