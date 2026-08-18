
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore with forced long polling for robust connection
export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
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

