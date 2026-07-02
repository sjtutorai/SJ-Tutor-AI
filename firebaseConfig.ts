import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";

import {
  getFirestore,
  doc,
  getDocFromServer,
} from "firebase/firestore";

import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId
);

// Providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

// Action Code Settings for Magic Link
export const actionCodeSettings = {
  url:
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/email-signin`
      : "https://sjtutorai.vercel.app/auth/email-signin",

  handleCodeInApp: true,
};

// ==============================
// SEND MAGIC LINK
// ==============================
export async function sendMagicLink(email: string) {
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);

    // Save email locally
    localStorage.setItem("emailForSignIn", email);

    return {
      success: true,
      message: "Magic link sent successfully.",
    };
  } catch (error: any) {
    console.error(error);

    return {
      success: false,
      message: error.message,
    };
  }
}

// ==============================
// COMPLETE MAGIC LINK SIGN IN
// ==============================
export async function completeMagicLinkSignIn() {
  if (typeof window === "undefined") return null;

  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem("emailForSignIn");

    if (!email) {
      email = window.prompt(
        "Please confirm your email address."
      ) || "";
    }

    if (!email) return null;

    try {
      const result = await signInWithEmailLink(
        auth,
        email,
        window.location.href
      );

      window.localStorage.removeItem("emailForSignIn");

      return result.user;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  return null;
}

// ==============================
// TEST FIRESTORE CONNECTION
// ==============================
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error: any) {
    if (
      error.message &&
      error.message.includes("the client is offline")
    ) {
      console.error(
        "Please check your Firebase configuration."
      );
    }
  }
}

testConnection();