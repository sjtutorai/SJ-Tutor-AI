
import { FlaggedContent } from '../types';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';

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
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ModerationService = {
  flagContent: async (flag: Omit<FlaggedContent, 'id' | 'timestamp' | 'status'>): Promise<void> => {
    const path = 'flags';
    try {
      await addDoc(collection(db, path), {
        ...flag,
        timestamp: Date.now(),
        status: 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  getFlaggedContent: async (): Promise<FlaggedContent[]> => {
    const path = 'flags';
    try {
      const q = query(collection(db, path), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FlaggedContent[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  resolveFlag: async (flagId: string, status: 'resolved' | 'dismissed', feedback: string): Promise<void> => {
    const path = `flags/${flagId}`;
    try {
      const flagRef = doc(db, 'flags', flagId);
      await updateDoc(flagRef, {
        status,
        adminFeedback: feedback
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
