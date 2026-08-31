import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { UserProfile } from '../types';
import { SecurityPinService } from './securityPinService';
import { getMembershipByEmail } from '../utils/userService';

export interface IdCardLoginResult {
  success: boolean;
  profile?: UserProfile;
  uid?: string;
  bypass2Step?: boolean;
  error?: string;
}

export interface ParsedIdCardData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  institution?: string;
  grade?: string;
  state?: string;
  district?: string;
  plan?: 'Free' | 'Starter' | 'Scholar' | 'Achiever';
}

/**
 * Service for ID Card and Registration Number based authentication backed by Firestore.
 */
export const IdAuthService = {
  /**
   * Parses decoded text or JSON string from an SJ Tutor ID Card.
   */
  parseIdCardPayload: (rawText: string): ParsedIdCardData | null => {
    try {
      const trimmed = rawText.trim();
      if (!trimmed) return null;

      // Handle JSON string
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        return {
          id: (parsed.id || parsed.registrationNumber || parsed.sjTutorId || '').trim(),
          name: parsed.name || parsed.displayName || 'Student',
          email: parsed.email || undefined,
          phone: parsed.phone || parsed.phoneNumber || undefined,
          institution: parsed.institution || parsed.school || undefined,
          grade: parsed.grade || undefined,
          state: parsed.state || undefined,
          district: parsed.district || undefined,
          plan: parsed.plan || parsed.planType || 'Scholar',
        };
      }

      // Handle URL format e.g. https://sjtutor.ai/id/SJTA-2608-123456
      if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        const lastPart = parts[parts.length - 1].trim();
        if (lastPart.length >= 4) {
          return {
            id: lastPart,
            name: 'Student Member',
            plan: 'Scholar',
          };
        }
      }
      
      // If it's a plain string like "SJ-SJ-123456" or "SJTA-2608-123456"
      if (trimmed.length >= 3) {
        return {
          id: trimmed,
          name: 'Student Member',
          plan: 'Scholar',
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Searches Firestore users collection for a matching account.
   */
  findUserDocInFirestore: async (identifier: string): Promise<{ uid: string; data: any } | null> => {
    const cleanId = identifier.trim();
    if (!cleanId) return null;

    try {
      // 1. Direct lookup by Document ID (UID)
      const directRef = doc(db, 'users', cleanId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        return { uid: directSnap.id, data: directSnap.data() };
      }

      // 2. Query by registrationNumber
      const usersRef = collection(db, 'users');
      const qReg = query(usersRef, where('registrationNumber', '==', cleanId));
      const snapReg = await getDocs(qReg);
      if (!snapReg.empty) {
        const firstDoc = snapReg.docs[0];
        return { uid: firstDoc.id, data: firstDoc.data() };
      }

      // 3. Query by sjTutorId
      const qSjId = query(usersRef, where('sjTutorId', '==', cleanId));
      const snapSjId = await getDocs(qSjId);
      if (!snapSjId.empty) {
        const firstDoc = snapSjId.docs[0];
        return { uid: firstDoc.id, data: firstDoc.data() };
      }

      // 4. Query by email (case-insensitive fallback check)
      const qEmail = query(usersRef, where('email', '==', cleanId.toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        const firstDoc = snapEmail.docs[0];
        return { uid: firstDoc.id, data: firstDoc.data() };
      }

      // 5. Query by uppercase / clean variations (e.g. SJ-AB-123456)
      const upperId = cleanId.toUpperCase();
      if (upperId !== cleanId) {
        const qUpper = query(usersRef, where('registrationNumber', '==', upperId));
        const snapUpper = await getDocs(qUpper);
        if (!snapUpper.empty) {
          const firstDoc = snapUpper.docs[0];
          return { uid: firstDoc.id, data: firstDoc.data() };
        }
      }

      // 6. Check LocalStorage fallback for offline / cached profiles
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('profile_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const prof = JSON.parse(raw);
              if (
                prof.registrationNumber === cleanId ||
                prof.sjTutorId === cleanId ||
                prof.email === cleanId.toLowerCase()
              ) {
                const uid = key.replace('profile_', '');
                return { uid, data: prof };
              }
            }
          } catch {
            // Ignore
          }
        }
      }

      return null;
    } catch (err) {
      console.warn('Error querying Firestore for user identifier:', err);
      // Fallback to local storage if network / permissions issue
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('profile_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const prof = JSON.parse(raw);
              if (
                prof.registrationNumber === cleanId ||
                prof.sjTutorId === cleanId ||
                prof.email === cleanId.toLowerCase()
              ) {
                const uid = key.replace('profile_', '');
                return { uid, data: prof };
              }
            }
          } catch {
            // Ignore
          }
        }
      }
      return null;
    }
  },

  /**
   * Log in with an SJ Tutor AI Identity Card (QR code scan, card image, or card JSON payload).
   * RULE: "There is no need of Asking the 2 step verification code when logged in with the SJ Tutor AI's Identity Card".
   */
  loginWithIdCard: async (rawCardTextOrJson: string | object): Promise<IdCardLoginResult> => {
    const rawString = typeof rawCardTextOrJson === 'string' 
      ? rawCardTextOrJson 
      : JSON.stringify(rawCardTextOrJson);

    const parsed = IdAuthService.parseIdCardPayload(rawString);
    if (!parsed || !parsed.id) {
      return {
        success: false,
        error: 'Invalid ID Card format. Please scan or upload an official SJ Tutor AI Student ID Card.',
      };
    }

    try {
      const existing = await IdAuthService.findUserDocInFirestore(parsed.id);
      
      let userUid: string;
      let finalProfile: UserProfile;

      if (existing) {
        userUid = existing.uid;
        const data = existing.data;
        const membership = getMembershipByEmail(data.email || parsed.email);
        
        finalProfile = {
          displayName: data.displayName || data.name || parsed.name || 'Scholar Student',
          email: data.email || parsed.email || '',
          photoURL: data.photoURL || '',
          phoneNumber: data.phoneNumber || parsed.phone || '',
          institution: data.institution || parsed.institution || 'SJ Tutor AI',
          grade: data.grade || parsed.grade || '10th Grade',
          board: data.board || 'CBSE',
          state: data.state || parsed.state || 'Delhi',
          district: data.district || parsed.district || 'New Delhi',
          bio: data.bio || `Student at ${data.institution || parsed.institution || 'SJ Tutor AI'}`,
          learningGoal: data.learningGoal || 'Understand difficult topics',
          learningGoals: data.learningGoals || ['Understand difficult topics', 'Prepare for exams'],
          learningStyle: data.learningStyle || 'Step-by-step learning',
          learningStyles: data.learningStyles || ['Step-by-step learning', 'Examples & illustrations'],
          sjTutorId: data.sjTutorId || parsed.id,
          registrationNumber: data.registrationNumber || parsed.id,
          credits: membership ? membership.credits : (data.credits ?? 100),
          planType: membership ? membership.planType : (data.planType || parsed.plan || 'Scholar'),
          hasCompletedOnboarding: true,
          isRegisteredInFirestore: true,
          twoFactorEnabled: data.twoFactorEnabled ?? false,
          twoFactorPassword: data.twoFactorPassword,
          securityPin: data.securityPin,
          securityQuestion: data.securityQuestion,
          securityAnswer: data.securityAnswer,
          createdAt: data.createdAt ? (typeof data.createdAt === 'number' ? data.createdAt : Date.now()) : Date.now(),
          lastProfileUpdate: Date.now(),
        };

        // Update Firestore with last login info
        try {
          await updateDoc(doc(db, 'users', userUid), {
            lastLoginAt: serverTimestamp(),
            lastLoginMethod: 'id_card',
            isRegisteredInFirestore: true,
            hasCompletedOnboarding: true,
          });
        } catch {
          // Ignore
        }
      } else {
        // Create user document derived from the ID Card
        userUid = `id_${parsed.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const membership = getMembershipByEmail(parsed.email);

        finalProfile = {
          displayName: parsed.name || 'Scholar Student',
          email: parsed.email || `${parsed.id.toLowerCase()}@sjtutor.ai`,
          photoURL: '',
          phoneNumber: parsed.phone || '',
          institution: parsed.institution || 'SJ Tutor AI',
          grade: parsed.grade || '10th Grade',
          board: 'CBSE',
          state: parsed.state || 'Delhi',
          district: parsed.district || 'New Delhi',
          bio: `Verified Member with ID ${parsed.id}`,
          learningGoal: 'Understand difficult topics',
          learningGoals: ['Understand difficult topics', 'Prepare for exams'],
          learningStyle: 'Step-by-step learning',
          learningStyles: ['Step-by-step learning', 'Examples & illustrations'],
          sjTutorId: parsed.id,
          registrationNumber: parsed.id,
          credits: membership ? membership.credits : 150,
          planType: membership ? membership.planType : (parsed.plan || 'Scholar'),
          hasCompletedOnboarding: true,
          isRegisteredInFirestore: true,
          createdAt: Date.now(),
          lastProfileUpdate: Date.now(),
        };

        try {
          await setDoc(doc(db, 'users', userUid), {
            ...finalProfile,
            uid: userUid,
            lastLoginMethod: 'id_card',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Could not save new ID card user to Firestore immediately:', e);
        }
      }

      // Cache locally
      localStorage.setItem(`profile_${userUid}`, JSON.stringify(finalProfile));
      localStorage.setItem('sjtutor_active_id_session', userUid);

      // Require 2-step verification password upon signing in
      SecurityPinService.clearTwoStepVerified(userUid);

      return {
        success: true,
        profile: finalProfile,
        uid: userUid,
        bypass2Step: false,
      };
    } catch (err: any) {
      console.error('ID Card Login Failed:', err);
      return {
        success: false,
        error: err?.message || 'Failed to authenticate with ID Card. Please try again.',
      };
    }
  },

  /**
   * Log in with Registration Number / SJ Tutor ID and 2-Step Verification Password.
   */
  loginWithRegistrationNumber: async (
    registrationNumber: string,
    twoStepPassword: string
  ): Promise<IdCardLoginResult> => {
    const cleanReg = registrationNumber.trim();
    if (!cleanReg) {
      return {
        success: false,
        error: 'Please enter your Registration Number or SJ Tutor ID.',
      };
    }

    if (!twoStepPassword.trim()) {
      return {
        success: false,
        error: 'Please enter your 2-Step Verification Password.',
      };
    }

    try {
      const userRecord = await IdAuthService.findUserDocInFirestore(cleanReg);
      if (!userRecord) {
        return {
          success: false,
          error: `No registered account found for ID "${cleanReg}". Please verify your registration number or sign up.`,
        };
      }

      const { uid, data } = userRecord;
      const storedSecret = data.twoFactorPassword || data.securityPin || data.password || '';

      // If user has a stored 2-step verification password or PIN
      if (storedSecret) {
        const isPasswordValid = await SecurityPinService.verifySecret(
          twoStepPassword.trim(),
          storedSecret,
          uid
        );

        if (!isPasswordValid) {
          return {
            success: false,
            error: 'Incorrect 2-Step Verification Password. Please try again.',
          };
        }
      } else {
        // Account didn't have 2-step password configured yet: configure the entered password
        try {
          const hashed = await SecurityPinService.hashSecret(twoStepPassword.trim(), uid);
          await updateDoc(doc(db, 'users', uid), {
            twoFactorEnabled: true,
            twoFactorPassword: hashed,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Ignore
        }
      }

      const membership = getMembershipByEmail(data.email);
      const finalProfile: UserProfile = {
        displayName: data.displayName || data.name || 'Scholar Student',
        email: data.email || '',
        photoURL: data.photoURL || '',
        phoneNumber: data.phoneNumber || '',
        institution: data.institution || 'SJ Tutor AI',
        grade: data.grade || '10th Grade',
        board: data.board || 'CBSE',
        state: data.state || 'Delhi',
        district: data.district || 'New Delhi',
        bio: data.bio || `Student at ${data.institution || 'SJ Tutor AI'}`,
        learningGoal: data.learningGoal || 'Understand difficult topics',
        learningGoals: data.learningGoals || ['Understand difficult topics', 'Prepare for exams'],
        learningStyle: data.learningStyle || 'Step-by-step learning',
        learningStyles: data.learningStyles || ['Step-by-step learning', 'Examples & illustrations'],
        sjTutorId: data.sjTutorId || cleanReg,
        registrationNumber: data.registrationNumber || cleanReg,
        credits: membership ? membership.credits : (data.credits ?? 100),
        planType: membership ? membership.planType : (data.planType || 'Scholar'),
        hasCompletedOnboarding: true,
        isRegisteredInFirestore: true,
        twoFactorEnabled: true,
        twoFactorPassword: data.twoFactorPassword || storedSecret,
        createdAt: data.createdAt ? (typeof data.createdAt === 'number' ? data.createdAt : Date.now()) : Date.now(),
        lastProfileUpdate: Date.now(),
      };

      // Mark 2-step verified since password was already verified in this login step
      SecurityPinService.setTwoStepVerified(uid);
      SecurityPinService.setSessionUnlocked(uid);

      localStorage.setItem(`profile_${uid}`, JSON.stringify(finalProfile));
      localStorage.setItem('sjtutor_active_id_session', uid);

      try {
        await updateDoc(doc(db, 'users', uid), {
          lastLoginAt: serverTimestamp(),
          lastLoginMethod: 'registration_number',
        });
      } catch {
        // Ignore
      }

      return {
        success: true,
        profile: finalProfile,
        uid: uid,
        bypass2Step: false,
      };
    } catch (err: any) {
      console.error('Registration Login Error:', err);
      return {
        success: false,
        error: err?.message || 'Authentication error. Please check your credentials and try again.',
      };
    }
  },
};
