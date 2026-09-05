/**
 * Security PIN and Two-Step Verification Service
 * Provides hashing, session unlocking, and Biometric WebAuthn capabilities.
 */

export interface SecurityPinConfig {
  enabled: boolean;
  pinHash: string;
  pinLength: 4 | 6;
  salt: string;
  biometricsEnabled?: boolean;
  updatedAt: number;
}

const STORAGE_2STEP_PREFIX = 'sjtutor_2step_verified_';
const STORAGE_PENDING_2STEP_PREFIX = 'sjtutor_pending_2step_';
const LOCAL_PIN_PREFIX = 'sjtutor_security_pin_';
const STORAGE_PIN_SESSION_PREFIX = 'sjtutor_pin_unlocked_';

// In-memory set of unlocked user IDs for the active page session.
const inMemoryUnlockedUids = new Set<string>();

export const SecurityPinService = {
  /**
   * Hashes a password or secret using Web Crypto SHA-256 with user salt.
   */
  hashSecret: async (secret: string, salt: string = 'sjtutor_salt_v1'): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(`${salt}:${secret}:${salt}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('Crypto subtle not supported, falling back to simple hash', e);
      let hash = 0;
      const str = `${salt}_${secret}_${salt}`;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return `h_${Math.abs(hash)}`;
    }
  },

  /**
   * Hashes a 4 or 6 digit PIN using Web Crypto SHA-256 with user salt.
   */
  hashPin: async (pin: string, salt: string = 'sjtutor_salt_v1'): Promise<string> => {
    return SecurityPinService.hashSecret(pin, salt);
  },

  /**
   * Checks if an entered secret (password or PIN) matches stored hash or plain string.
   */
  verifySecret: async (
    enteredSecret: string,
    storedSecretOrHash: string,
    salt: string = 'sjtutor_salt_v1'
  ): Promise<boolean> => {
    if (!enteredSecret || !storedSecretOrHash) return false;
    
    if (enteredSecret.trim() === storedSecretOrHash.trim()) {
      return true;
    }

    const computed = await SecurityPinService.hashSecret(enteredSecret.trim(), salt);
    if (computed === storedSecretOrHash.trim()) {
      return true;
    }

    const computedDefault = await SecurityPinService.hashSecret(enteredSecret.trim(), 'sjtutor_salt_v1');
    return computedDefault === storedSecretOrHash.trim();
  },

  /**
   * Checks if an entered PIN matches the stored hash or stored plain string.
   */
  verifyPin: async (
    enteredPin: string,
    storedPinOrHash: string,
    salt: string = 'sjtutor_salt_v1'
  ): Promise<boolean> => {
    return SecurityPinService.verifySecret(enteredPin, storedPinOrHash, salt);
  },

  /**
   * Marks that a fresh user login action just took place (from sign-in form or social provider).
   * Two-step verification will ONLY be required for this specific fresh login attempt.
   */
  markLoginAttempt: (uid: string): void => {
    if (!uid) return;
    try {
      sessionStorage.setItem(`${STORAGE_PENDING_2STEP_PREFIX}${uid}`, 'true');
      localStorage.removeItem(`${STORAGE_2STEP_PREFIX}${uid}`);
    } catch (e) {
      console.warn('Failed to mark login attempt:', e);
    }
  },

  /**
   * Completes two-step verification after successful password validation on login.
   * Clears the pending login flag and remembers the verified state.
   */
  completeTwoStepVerification: (uid: string): void => {
    if (!uid) return;
    try {
      sessionStorage.removeItem(`${STORAGE_PENDING_2STEP_PREFIX}${uid}`);
      localStorage.setItem(`${STORAGE_2STEP_PREFIX}${uid}`, 'true');
    } catch (e) {
      console.warn('Failed to complete 2-step verification:', e);
    }
  },

  /**
   * Determines if Two-Step Verification is required for the user.
   * STRICT POLICY: Only required when the user freshly logs in.
   * Returning visitors, page reloads, and navigation do NOT prompt for 2-step verification.
   */
  isTwoStepRequiredForCurrentSession: (uid?: string | null): boolean => {
    if (!uid) return false;
    try {
      const isPending = sessionStorage.getItem(`${STORAGE_PENDING_2STEP_PREFIX}${uid}`) === 'true';
      const isVerified = localStorage.getItem(`${STORAGE_2STEP_PREFIX}${uid}`) === 'true';
      return isPending && !isVerified;
    } catch {
      return false;
    }
  },

  /**
   * Checks if 2-Step Login verification was already completed on this device/session.
   * Persisted in localStorage so reloading the website does not re-trigger 2-step verification.
   */
  isTwoStepVerified: (uid?: string | null): boolean => {
    if (!uid) return true;
    try {
      return localStorage.getItem(`${STORAGE_2STEP_PREFIX}${uid}`) === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Marks 2-Step Login verification as passed for this login session.
   */
  setTwoStepVerified: (uid?: string | null): void => {
    if (!uid) return;
    try {
      sessionStorage.removeItem(`${STORAGE_PENDING_2STEP_PREFIX}${uid}`);
      localStorage.setItem(`${STORAGE_2STEP_PREFIX}${uid}`, 'true');
    } catch (e) {
      console.warn('Failed to set 2-step verified state:', e);
    }
  },

  /**
   * Clears 2-Step Login verification state on logout.
   */
  clearTwoStepVerified: (uid?: string | null): void => {
    if (!uid) return;
    try {
      localStorage.removeItem(`${STORAGE_2STEP_PREFIX}${uid}`);
      sessionStorage.removeItem(`${STORAGE_PENDING_2STEP_PREFIX}${uid}`);
    } catch (e) {
      console.warn('Failed to clear 2-step verified state:', e);
    }
  },

  /**
   * Checks if the user's session is already unlocked.
   * Uses memory and session storage so page reloads during active session do not prompt repeatedly.
   */
  isSessionUnlocked: (uid?: string | null): boolean => {
    if (!uid) return true;
    if (inMemoryUnlockedUids.has(uid)) return true;
    try {
      return sessionStorage.getItem(`${STORAGE_PIN_SESSION_PREFIX}${uid}`) === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Marks the session as unlocked for the active page session.
   */
  setSessionUnlocked: (uid?: string | null): void => {
    if (!uid) return;
    inMemoryUnlockedUids.add(uid);
    try {
      sessionStorage.setItem(`${STORAGE_PIN_SESSION_PREFIX}${uid}`, 'true');
    } catch (e) {
      console.warn('Failed to set session unlocked:', e);
    }
  },

  /**
   * Locks the session for the given user.
   */
  lockSession: (uid?: string | null): void => {
    if (!uid) {
      inMemoryUnlockedUids.clear();
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k?.startsWith(STORAGE_PIN_SESSION_PREFIX)) {
            sessionStorage.removeItem(k);
          }
        }
      } catch (e) {
        console.warn('Could not clear session storage PIN keys:', e);
      }
      return;
    }
    inMemoryUnlockedUids.delete(uid);
    try {
      sessionStorage.removeItem(`${STORAGE_PIN_SESSION_PREFIX}${uid}`);
    } catch (e) {
      console.warn('Could not clear session storage PIN:', e);
    }
  },

  /**
   * Checks whether WebAuthn / Biometrics is available on the current device.
   */
  isBiometricsAvailable: async (): Promise<boolean> => {
    try {
      if (
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ) {
        return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Prompts the device's native biometric sensor / WebAuthn platform authenticator (TouchID, FaceID, Windows Hello, Fingerprint).
   * Throws an error if the user cancels or biometric validation fails.
   */
  authenticateWithBiometrics: async (uid: string, userDisplayName?: string): Promise<boolean> => {
    if (!window.PublicKeyCredential) {
      throw new Error('Biometric authentication is not supported by your browser.');
    }

    const isAvailable = await SecurityPinService.isBiometricsAvailable();
    if (!isAvailable) {
      throw new Error('No biometric sensor or platform authenticator detected on this device.');
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const storedCredKey = `sjtutor_webauthn_cred_${uid}`;
    const storedCred = localStorage.getItem(storedCredKey);

    if (storedCred) {
      try {
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'required',
            allowCredentials: [{
              id: Uint8Array.from(atob(storedCred), (c) => c.charCodeAt(0)),
              type: 'public-key',
            }],
          },
        });
        return !!credential;
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Biometric verification cancelled or timed out.');
        }
        throw new Error(err.message || 'Biometric authentication failed.');
      }
    } else {
      // First-time biometric registration on this device
      try {
        const userIdBytes = new TextEncoder().encode(uid.slice(0, 16));
        const newCred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'SJ Tutor AI' },
            user: {
              id: userIdBytes,
              name: userDisplayName || 'Student User',
              displayName: userDisplayName || 'Student User',
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' },
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 60000,
          },
        }) as PublicKeyCredential | null;

        if (newCred && newCred.rawId) {
          const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(newCred.rawId)));
          localStorage.setItem(storedCredKey, rawIdBase64);
          return true;
        }
        return false;
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Biometric setup cancelled or not allowed.');
        }
        throw new Error(err.message || 'Biometric verification failed.');
      }
    }
  },

  /**
   * Hashes a security question answer case-insensitively.
   */
  hashSecurityAnswer: async (answer: string, salt: string = 'sjtutor_security_q'): Promise<string> => {
    const normalized = answer.trim().toLowerCase();
    return SecurityPinService.hashSecret(normalized, salt);
  },

  /**
   * Verifies an entered security answer against the stored answer or hash.
   */
  verifySecurityAnswer: async (
    enteredAnswer: string,
    storedAnswerOrHash: string,
    salt: string = 'sjtutor_security_q'
  ): Promise<boolean> => {
    if (!enteredAnswer || !storedAnswerOrHash) return false;
    const normalizedEntered = enteredAnswer.trim().toLowerCase();
    const normalizedStored = storedAnswerOrHash.trim().toLowerCase();

    // Direct plain match
    if (normalizedEntered === normalizedStored) {
      return true;
    }

    // Hash match with user salt
    const computed = await SecurityPinService.hashSecurityAnswer(enteredAnswer, salt);
    if (computed === storedAnswerOrHash.trim()) {
      return true;
    }

    // Hash match with default salt
    const computedDefault = await SecurityPinService.hashSecurityAnswer(enteredAnswer, 'sjtutor_security_q');
    return computedDefault === storedAnswerOrHash.trim();
  },

  /**
   * Categorized Preset Security Questions Templates.
   */
  SECURITY_QUESTION_CATEGORIES: [
    {
      category: 'Childhood & Personal',
      icon: '🐾',
      questions: [
        'What was the name of your first childhood pet?',
        'What street did you grow up on?',
        'What was your favorite childhood nickname?',
        'What was your dream job when you were a child?',
      ],
    },
    {
      category: 'Education & Study',
      icon: '🎓',
      questions: [
        'What was the name of your first elementary school?',
        'What was your favorite subject in high school?',
        'Who was your most inspiring teacher or mentor?',
        'What mascot did your first school or college have?',
      ],
    },
    {
      category: 'Places & Memories',
      icon: '🌍',
      questions: [
        'In what city or town were you born?',
        'What was the destination of your first flight or vacation?',
        'What city do you consider your true hometown?',
        'What was the address or name of your first apartment?',
      ],
    },
    {
      category: 'Favorites & Culture',
      icon: '🎬',
      questions: [
        'What is the title of your favorite book or movie?',
        'What was the first live concert or show you attended?',
        'What was the make and model of your first car?',
        'What is your all-time favorite meal or dessert?',
      ],
    },
    {
      category: 'Family & Heritage',
      icon: '👨‍👩‍👧',
      questions: [
        'What is your mother\'s maiden name?',
        'In what city or town did your parents meet?',
        'What is the first name of your oldest sibling or cousin?',
        'What is your maternal grandmother\'s first name?',
      ],
    },
  ],

  /**
   * Standard Flat Preset Security Questions.
   */
  DEFAULT_SECURITY_QUESTIONS: [
    'What was the name of your first childhood pet?',
    'What was the name of your first elementary school?',
    'In what city or town were you born?',
    'What is your mother\'s maiden name?',
    'What was your favorite childhood nickname?',
    'What is the title of your favorite book or movie?',
    'What street did you grow up on?',
    'What was the make and model of your first car?',
    'What was your favorite subject in high school?',
    'In what city or town did your parents meet?',
  ],

  /**
   * Saves local security pin configuration.
   */
  saveLocalConfig: (uid: string, config: SecurityPinConfig): void => {
    try {
      localStorage.setItem(`${LOCAL_PIN_PREFIX}${uid}`, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save local PIN config', e);
    }
  },

  /**
   * Gets local security pin configuration.
   */
  getLocalConfig: (uid: string): SecurityPinConfig | null => {
    try {
      const stored = localStorage.getItem(`${LOCAL_PIN_PREFIX}${uid}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Clears local PIN config when 2FA is disabled.
   */
  clearLocalConfig: (uid: string): void => {
    try {
      localStorage.removeItem(`${LOCAL_PIN_PREFIX}${uid}`);
      sessionStorage.removeItem(`${STORAGE_SESSION_PREFIX}${uid}`);
    } catch (e) {
      console.warn('Failed to clear PIN config', e);
    }
  }
};
