
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";

import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export reCAPTCHA site key
export const RECAPTCHA_SITE_KEY = (firebaseConfig as any).recaptchaSiteKey || "6LdU4IotAAAAAEk-63mxMmSUd4vCpX_XI5O2c_Ks";

// Initialize Firebase App Check with reCAPTCHA Enterprise / v3
let appCheckInstance: AppCheck | null = null;
if (typeof window !== "undefined" && RECAPTCHA_SITE_KEY) {
  try {
    if (process.env.NODE_ENV !== "production") {
      // Enable debug token in development environments if needed
      (window as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const provider = typeof ReCaptchaEnterpriseProvider !== "undefined" 
      ? new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY)
      : new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY);

    appCheckInstance = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("Firebase App Check / reCAPTCHA notice:", err);
  }
}
export const appCheck = appCheckInstance;

// Helper to execute reCAPTCHA Enterprise / standard verification for protected actions
export const executeRecaptcha = async (action: string = "LOGIN"): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  const grecaptcha = (window as any).grecaptcha;
  if (!grecaptcha || !RECAPTCHA_SITE_KEY) return null;

  return new Promise((resolve) => {
    try {
      // Prioritize Enterprise reCAPTCHA API
      if (grecaptcha.enterprise && typeof grecaptcha.enterprise.ready === "function") {
        grecaptcha.enterprise.ready(async () => {
          try {
            const token = await grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
            resolve(token || null);
          } catch (err) {
            console.warn("reCAPTCHA enterprise execute error:", err);
            resolve(null);
          }
        });
      } else if (typeof grecaptcha.ready === "function") {
        // Fallback to standard reCAPTCHA API
        grecaptcha.ready(async () => {
          try {
            const token = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
            resolve(token || null);
          } catch (err) {
            console.warn("reCAPTCHA execute error:", err);
            resolve(null);
          }
        });
      } else {
        resolve(null);
      }
    } catch (e) {
      console.warn("reCAPTCHA invocation error:", e);
      resolve(null);
    }
  });
};

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
export const yahooProvider = new OAuthProvider('yahoo.com');

// Initialize messaging lazily
export const getFCM = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getMessaging(app);
  }
  return null;
};
