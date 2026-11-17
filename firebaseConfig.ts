import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  enableNetwork,
  Firestore,
} from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

import firebaseConfig from "./firebase-applet-config.json";

// Suppress noisy internal @firebase/firestore transport timeout console.error logs
// while Firestore automatically manages offline cache and reconnection
try {
  setLogLevel("silent");
} catch {
  // Ignore if setLogLevel is unavailable
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

function createFirestoreInstance(): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId;
  if (isBrowser) {
    try {
      return initializeFirestore(
        app,
        {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
          experimentalForceLongPolling: true,
          ignoreUndefinedProperties: true,
        },
        databaseId
      );
    } catch {
      try {
        return initializeFirestore(
          app,
          {
            localCache: memoryLocalCache(),
            experimentalForceLongPolling: true,
            ignoreUndefinedProperties: true,
          },
          databaseId
        );
      } catch {
        return getFirestore(app, databaseId);
      }
    }
  }
  return getFirestore(app, databaseId);
}

// Initialize Firebase Authentication and Firestore using exact databaseId from config
export const db = createFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");
export const yahooProvider = new OAuthProvider("yahoo.com");

// Automatically re-enable Firestore network when browser regains connectivity
if (isBrowser) {
  window.addEventListener("online", () => {
    enableNetwork(db).catch(() => {});
  });
}

export const isFirestoreOfflineError = (error: unknown): boolean => {
  if (isBrowser && typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  if (!error) return false;
  const code = (error as { code?: string })?.code || "";
  const msg = (
    error instanceof Error ? error.message : String((error as { message?: string })?.message || error)
  ).toLowerCase();
  return (
    code === "unavailable" ||
    code === "failed-precondition" ||
    msg.includes("client is offline") ||
    msg.includes("offline") ||
    msg.includes("could not reach cloud firestore backend") ||
    msg.includes("network error")
  );
};

// Initialize messaging lazily
export const getFCM = async () => {
  try {
    if (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      (await isSupported())
    ) {
      return getMessaging(app);
    }
  } catch (e) {
    console.warn("FCM messaging initialization skipped:", e);
  }
  return null;
};
