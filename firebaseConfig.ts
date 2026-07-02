import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
} from "firebase/auth";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// =============================
// Firebase Configuration
// =============================

const firebaseConfig = {
  apiKey: "AIzaSyAwnA96M3oFEF1o_Vrs9HhZxmHav8f-Gm8",
  authDomain: "sj-tutorai.firebaseapp.com",
  projectId: "sj-tutorai",
  storageBucket: "sj-tutorai.firebasestorage.app",
  messagingSenderId: "215292591396",
  appId: "1:215292591396:web:4af74df6521eaa2a4c47b1"
};

// =============================
// Initialize Firebase
// =============================

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

export const db = getFirestore(app);

// =============================
// Providers
// =============================

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export const githubProvider = new GithubAuthProvider();

export const appleProvider = new OAuthProvider("apple.com");

// =============================
// Magic Link
// =============================

export const actionCodeSettings = {
  url:
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/email-signin`
      : "https://sjtutorai.vercel.app/auth/email-signin",

  handleCodeInApp: true,
};

export async function sendMagicLink(email: string) {
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);

  localStorage.setItem("emailForSignIn", email);
}

export async function completeMagicLinkSignIn() {
  if (typeof window === "undefined") return null;

  if (!isSignInWithEmailLink(auth, window.location.href))
    return null;

  let email = localStorage.getItem("emailForSignIn");

  if (!email) {
    email = window.prompt("Enter your email") || "";
  }

  const result = await signInWithEmailLink(
    auth,
    email,
    window.location.href
  );

  localStorage.removeItem("emailForSignIn");

  return result.user;
}

// =============================
// Firestore User
// =============================

export async function createUserDocument(user: any) {
  const ref = doc(db, "users", user.uid);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      phone: user.phoneNumber || "",
      provider:
        user.providerData[0]?.providerId ?? "password",
      emailVerified: user.emailVerified,
      credits: 100,
      plan: "Free",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// =============================
// Helpers
// =============================

export async function verifyEmail() {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function updateUserName(name: string) {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, {
      displayName: name,
    });
  }
}

export async function logout() {
  await signOut(auth);
}

// =============================
// Connection Test
// =============================

async function testConnection() {
  try {
    await getDoc(doc(db, "test", "connection"));
    console.log("✅ Firebase Connected");
  } catch (e) {
    console.log("Firebase Ready");
  }
}

testConnection();

export default app;