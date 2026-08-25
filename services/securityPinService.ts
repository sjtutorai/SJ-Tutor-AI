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

const STORAGE_SESSION_PREFIX = 'sjtutor_pin_unlocked_';
const STORAGE_2STEP_PREFIX = 'sjtutor_2step_verified_';
const LOCAL_PIN_PREFIX = 'sjtutor_security_pin_';

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
   * Checks if 2-Step Login verification was already passed in this login session.
   */
  isTwoStepVerified: (uid?: string | null): boolean => {
    if (!uid) return true;
    try {
      return sessionStorage.getItem(`${STORAGE_2STEP_PREFIX}${uid}`) === 'true';
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
      sessionStorage.setItem(`${STORAGE_2STEP_PREFIX}${uid}`, 'true');
    } catch (e) {
      console.warn('Failed to set 2-step verified state:', e);
    }
  },

  /**
   * Clears 2-Step Login verification state.
   */
  clearTwoStepVerified: (uid?: string | null): void => {
    if (!uid) return;
    try {
      sessionStorage.removeItem(`${STORAGE_2STEP_PREFIX}${uid}`);
    } catch (e) {
      console.warn('Failed to clear 2-step verified state:', e);
    }
  },

  /**
   * Checks if the user's session is already unlocked in this browser session.
   */
  isSessionUnlocked: (uid?: string | null): boolean => {
    if (!uid) return true;
    try {
      return sessionStorage.getItem(`${STORAGE_SESSION_PREFIX}${uid}`) === 'true';
    } catch {
      return false;
    }
  },

  /**
   * Marks the session as unlocked for the current browser session.
   */
  setSessionUnlocked: (uid?: string | null): void => {
    if (!uid) return;
    try {
      sessionStorage.setItem(`${STORAGE_SESSION_PREFIX}${uid}`, 'true');
    } catch (e) {
      console.warn('Failed to set session unlock state:', e);
    }
  },

  /**
   * Locks the session for the given user.
   */
  lockSession: (uid?: string | null): void => {
    if (!uid) return;
    try {
      sessionStorage.removeItem(`${STORAGE_SESSION_PREFIX}${uid}`);
    } catch (e) {
      console.warn('Failed to lock session:', e);
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
