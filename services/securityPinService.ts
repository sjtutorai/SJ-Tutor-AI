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
const LOCAL_PIN_PREFIX = 'sjtutor_security_pin_';

export const SecurityPinService = {
  /**
   * Hashes a 4 or 6 digit PIN using Web Crypto SHA-256 with user salt.
   */
  hashPin: async (pin: string, salt: string = 'sjtutor_salt_v1'): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(`${salt}:${pin}:${salt}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('Crypto subtle not supported, falling back to simple hash', e);
      // Fallback
      let hash = 0;
      const str = `${salt}_${pin}_${salt}`;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      return `h_${Math.abs(hash)}`;
    }
  },

  /**
   * Checks if an entered PIN matches the stored hash or stored plain string.
   */
  verifyPin: async (
    enteredPin: string,
    storedPinOrHash: string,
    salt: string = 'sjtutor_salt_v1'
  ): Promise<boolean> => {
    if (!enteredPin || !storedPinOrHash) return false;
    
    // Direct match (if stored as plain 4/6 digit string)
    if (enteredPin.trim() === storedPinOrHash.trim()) {
      return true;
    }

    // Hash match
    const computed = await SecurityPinService.hashPin(enteredPin.trim(), salt);
    if (computed === storedPinOrHash.trim()) {
      return true;
    }

    // Alternative default salt check
    const computedDefault = await SecurityPinService.hashPin(enteredPin.trim(), 'sjtutor_salt_v1');
    return computedDefault === storedPinOrHash.trim();
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
