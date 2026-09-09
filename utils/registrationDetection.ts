import { collection, query, where, getDocs, doc, getDoc, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { checkIdentityExists } from "../services/authService";

export interface DeviceRegisteredUserInfo {
  hasRegistered: boolean;
  email?: string;
  name?: string;
  sjTutorId?: string;
  username?: string;
  lastActive?: number;
}

export interface AccountDetectionResult {
  isRegistered: boolean;
  identifier: string;
  identifierType: 'email' | 'sj_tutor_id' | 'username' | 'unknown';
  matchedName?: string;
  matchedEmail?: string;
  matchedSjTutorId?: string;
  recommendation: 'login' | 'register';
  message: string;
}

const STORAGE_KEY = 'sjtutor_registered_user_info';

/**
 * Checks local storage for any previously registered or logged in user on this device.
 */
export function getDeviceRegisteredUser(): DeviceRegisteredUserInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          hasRegistered: !!parsed.hasRegistered,
          email: parsed.email || undefined,
          name: parsed.name || parsed.displayName || undefined,
          sjTutorId: parsed.sjTutorId || undefined,
          username: parsed.username || undefined,
          lastActive: parsed.lastActive || undefined,
        };
      }
    }

    // Fallback: Check for cached profile or active user keys
    const authUser = localStorage.getItem('sjtutor_authenticated_user') || localStorage.getItem('sjtutor_active_user');
    if (authUser) {
      const parsedAuth = JSON.parse(authUser);
      if (parsedAuth && (parsedAuth.email || parsedAuth.sjTutorId || parsedAuth.uid)) {
        return {
          hasRegistered: true,
          email: parsedAuth.email || undefined,
          name: parsedAuth.displayName || [parsedAuth.firstName, parsedAuth.lastName].filter(Boolean).join(' ') || undefined,
          sjTutorId: parsedAuth.sjTutorId || undefined,
          username: parsedAuth.username || undefined,
          lastActive: Date.now(),
        };
      }
    }

    // Fallback: Check if any profile_ key exists in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('profile_')) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (val.email || val.sjTutorId || val.displayName) {
            return {
              hasRegistered: true,
              email: val.email,
              name: val.displayName || val.firstName,
              sjTutorId: val.sjTutorId,
              username: val.username,
              lastActive: Date.now(),
            };
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (e) {
    console.warn("Could not read device registered user:", e);
  }

  return { hasRegistered: false };
}

/**
 * Persist device-level registration info so the app recognizes the user on return visits.
 */
export function saveDeviceRegisteredUser(info: {
  email?: string;
  name?: string;
  displayName?: string;
  sjTutorId?: string;
  username?: string;
}): void {
  try {
    const payload: DeviceRegisteredUserInfo = {
      hasRegistered: true,
      email: info.email?.trim().toLowerCase(),
      name: info.displayName || info.name,
      sjTutorId: info.sjTutorId?.trim().toUpperCase(),
      username: info.username?.trim().toLowerCase(),
      lastActive: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('sjtutor_registration_detected', { detail: payload }));
  } catch (e) {
    console.warn("Could not save device registered user:", e);
  }
}

/**
 * Clears the device registered user record.
 */
export function clearDeviceRegisteredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('sjtutor_registration_detected', { detail: { hasRegistered: false } }));
  } catch (e) {
    console.warn("Could not clear device registered user:", e);
  }
}

/**
 * Actively detects whether a given email, SJ Tutor ID, or username has already registered
 * by checking the backend identity registry and Firestore database.
 */
export async function detectUserRegistration(rawIdentifier: string): Promise<AccountDetectionResult> {
  const identifier = rawIdentifier.trim();
  if (!identifier) {
    return {
      isRegistered: false,
      identifier: '',
      identifierType: 'unknown',
      recommendation: 'register',
      message: 'Please enter your email or SJ Tutor ID to check registration.',
    };
  }

  const isEmail = identifier.includes('@');
  const isSjTutorId = /^SJTA-[A-Z0-9]{4,8}$/i.test(identifier) || (/^[A-Z0-9]{6}$/i.test(identifier) && !identifier.includes(' '));
  const identifierType: AccountDetectionResult['identifierType'] = isEmail
    ? 'email'
    : isSjTutorId
    ? 'sj_tutor_id'
    : 'username';

  // 1. Check via checkIdentityExists (checks server & fast Firestore lookup)
  try {
    if (isEmail) {
      const exists = await checkIdentityExists({ email: identifier.toLowerCase() });
      if (exists) {
        return {
          isRegistered: true,
          identifier,
          identifierType: 'email',
          matchedEmail: identifier.toLowerCase(),
          recommendation: 'login',
          message: `Account found! We detected that "${identifier}" is already registered. Please Log In to continue.`,
        };
      }
    } else if (isSjTutorId) {
      const formattedId = identifier.startsWith('SJTA-') ? identifier.toUpperCase() : `SJTA-${identifier.toUpperCase()}`;
      const exists = await checkIdentityExists({ sjTutorId: formattedId });
      if (exists) {
        return {
          isRegistered: true,
          identifier: formattedId,
          identifierType: 'sj_tutor_id',
          matchedSjTutorId: formattedId,
          recommendation: 'login',
          message: `Account found! We detected that SJ Tutor ID "${formattedId}" is already registered. Please Log In to continue.`,
        };
      }
    }
  } catch (e) {
    console.warn("Identity check error:", e);
  }

  // 2. Direct Firestore Deep Lookups
  try {
    // Check Firestore sj_tutor_ids collection
    if (isSjTutorId) {
      const formattedId = identifier.startsWith('SJTA-') ? identifier.toUpperCase() : `SJTA-${identifier.toUpperCase()}`;
      const sjDoc = await getDoc(doc(db, "sj_tutor_ids", formattedId));
      if (sjDoc.exists()) {
        const data = sjDoc.data();
        return {
          isRegistered: true,
          identifier: formattedId,
          identifierType: 'sj_tutor_id',
          matchedName: data.displayName || data.firstName,
          matchedEmail: data.email,
          matchedSjTutorId: formattedId,
          recommendation: 'login',
          message: `Account found! We detected that SJ Tutor ID "${formattedId}" is registered to ${data.displayName || 'a student'}. Please Log In to continue.`,
        };
      }
    }

    // Check Firestore users collection by email
    if (isEmail) {
      const normalizedEmail = identifier.toLowerCase();
      const usersQuery = query(collection(db, "users"), where("email", "==", normalizedEmail), limit(1));
      const querySnap = await getDocs(usersQuery);
      if (!querySnap.empty) {
        const userDoc = querySnap.docs[0].data();
        return {
          isRegistered: true,
          identifier,
          identifierType: 'email',
          matchedName: userDoc.displayName || userDoc.firstName,
          matchedEmail: normalizedEmail,
          matchedSjTutorId: userDoc.sjTutorId,
          recommendation: 'login',
          message: `Account found! We detected that "${identifier}" is already registered. Please Log In to access your dashboard.`,
        };
      }
    }

    // Check Firestore users collection by username or SJ Tutor ID
    if (!isEmail) {
      const normalizedQuery = identifier.toLowerCase().replace(/^@/, '');
      const userByNameQuery = query(collection(db, "users"), where("username", "==", normalizedQuery), limit(1));
      const nameSnap = await getDocs(userByNameQuery);
      if (!nameSnap.empty) {
        const userDoc = nameSnap.docs[0].data();
        return {
          isRegistered: true,
          identifier,
          identifierType: 'username',
          matchedName: userDoc.displayName || userDoc.firstName,
          matchedEmail: userDoc.email,
          matchedSjTutorId: userDoc.sjTutorId,
          recommendation: 'login',
          message: `Account found! We detected username "@${normalizedQuery}" is already registered. Please Log In to continue.`,
        };
      }
    }
  } catch (err) {
    console.error("Firestore user registration detection error:", err);
  }

  // If not found in any database
  return {
    isRegistered: false,
    identifier,
    identifierType,
    recommendation: 'register',
    message: `No account found for "${identifier}". It looks like you haven't registered yet! Please Register (Sign Up) to create your free account.`,
  };
}
