import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  getAdditionalUserInfo,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  githubProvider,
  appleProvider,
  yahooProvider,
} from "../firebaseConfig";
import {
  getMembershipByEmail,
  resolveGoogleOneYearPremiumPlan,
  ONE_YEAR_MS,
} from "../utils/userService";
import { SecurityPinService } from "./securityPinService";
import type { AuthProviderType } from "../types";

async function safeParseAuthJson(response: Response): Promise<any> {
  const rawText = await response.text();
  if (!rawText || !rawText.trim()) return {};
  try {
    return JSON.parse(rawText);
  } catch {
    return {};
  }
}

let _socialAuthInProgress = false;
let _emailLinkAuthInProgress = false;
let _capturedInitialEmailLinkHref: string | null =
  typeof window !== "undefined" && isSignInWithEmailLink(auth, window.location.href)
    ? window.location.href
    : null;

export function isSocialAuthInProgress(): boolean {
  return _socialAuthInProgress;
}

export function isEmailLinkAuthInProgress(): boolean {
  return _emailLinkAuthInProgress;
}

export function getCapturedEmailLinkHref(): string | null {
  if (_capturedInitialEmailLinkHref) return _capturedInitialEmailLinkHref;
  if (typeof window !== "undefined" && isSignInWithEmailLink(auth, window.location.href)) {
    _capturedInitialEmailLinkHref = window.location.href;
    return _capturedInitialEmailLinkHref;
  }
  return null;
}

export function clearCapturedEmailLinkHref(): void {
  _capturedInitialEmailLinkHref = null;
}

async function safeGetDocWithTimeout(docRef: any, timeoutMs = 4000): Promise<any | null> {
  try {
    const result = await Promise.race([
      getDoc(docRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (result) return result;
  } catch {
    // Fallback to cache below
  }
  try {
    return await getDocFromCache(docRef);
  } catch {
    return null;
  }
}

export type AuthResultStatus =
  | "SUCCESS"
  | "ACCOUNT_ALREADY_EXISTS"
  | "ACCOUNT_NOT_FOUND"
  | "INCORRECT_PASSWORD"
  | "INCORRECT_PIN"
  | "INVALID_CODE"
  | "TOO_MANY_ATTEMPTS"
  | "PIN_REQUIRED"
  | "PENDING_PROFILE"
  | "EMAIL_LINK_SENT"
  | "EMAIL_LINK_DISABLED"
  | "NEEDS_EMAIL_CONFIRMATION"
  | "UNAUTHORIZED_DOMAIN"
  | "ERROR";

export interface AuthResult {
  status: AuthResultStatus;
  user?: any;
  message?: string;
  challengeId?: string;
  pinLength?: 4 | 6;
  maskedDestination?: string;
  expiresInSeconds?: number;
  verificationHint?: string;
  provider?: string;
  authIdentity?: any;
  sjTutorId?: string;
  error?: any;
  domain?: string;
  consoleUrl?: string;
}

/**
 * Generate unique random alphanumeric SJ Tutor AI ID in format SJTA-XXXXXX
 */
export function generateSjTutorId(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SJTA-${result}`;
}

/**
 * Checks whether an account exists for a given provider, email, or SJ Tutor AI ID
 */
export async function checkIdentityExists(params: {
  provider?: AuthProviderType;
  identifier?: string;
  email?: string;
  sjTutorId?: string;
}): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/check-identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (response.ok) {
      const data = await safeParseAuthJson(response);
      if (data.exists) return true;
    }
  } catch (e) {
    console.warn("Server check-identity error, checking Firestore:", e);
  }

  try {
    if (params.sjTutorId) {
      const sjDoc = await getDoc(doc(db, "sj_tutor_ids", params.sjTutorId.trim().toUpperCase()));
      if (sjDoc.exists()) return true;
    }

    if (params.email) {
      const normalizedEmail = params.email.trim().toLowerCase();
      const usersQuery = query(collection(db, "users"), where("email", "==", normalizedEmail));
      const querySnap = await getDocs(usersQuery);
      if (!querySnap.empty) return true;
    }

    if (params.provider && params.identifier) {
      const identityDoc = await getDoc(
        doc(db, "linked_identities", `${params.provider}_${params.identifier}`)
      );
      if (identityDoc.exists()) return true;
    }
  } catch (err) {
    console.error("Firestore identity check error:", err);
  }

  return false;
}

/**
 * Check username availability
 */
export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; message: string }> {
  try {
    const res = await fetch("/api/auth/check-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await safeParseAuthJson(res);
    return {
      available: Boolean(data.available),
      message: data.message || "Username checked",
    };
  } catch (err) {
    console.error(err);
    return { available: true, message: "Username checked" };
  }
}

/**
 * Handle Social Provider Authentication (Google, Apple, Yahoo, GitHub)
 *
 * Rules:
 * - SIGN UP + EXISTING ACCOUNT -> Refuse & display "Account Already Exists"
 * - SIGN UP + NEW ACCOUNT -> Transition to Profile Setup (does NOT create SJ Tutor AI ID yet!)
 * - LOGIN + NO ACCOUNT -> Refuse & display "Account Not Found"
 * - LOGIN + EXISTING ACCOUNT -> Authenticate & proceed to Dashboard
 */
export async function handleSocialAuth(
  providerType: "google" | "apple" | "yahoo" | "github",
  mode: "signin" | "signup",
  rememberMe = true
): Promise<AuthResult> {
  const provider =
    providerType === "google"
      ? googleProvider
      : providerType === "apple"
      ? appleProvider
      : providerType === "yahoo"
      ? yahooProvider
      : githubProvider;

  _socialAuthInProgress = true;
  try {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
    } catch (persistErr) {
      console.warn("Firebase persistence setup notice:", persistErr);
    }

    const userCred = await signInWithPopup(auth, provider);
    const currentUser = userCred.user;
    const additionalInfo = getAdditionalUserInfo(userCred);

    // Resiliently check if user document already exists in Firestore or server (never fail login on offline/timeout)
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await safeGetDocWithTimeout(userDocRef, 4000);
    const existingFirestoreAccount = Boolean(userDocSnap && userDocSnap.exists());
    const existingData: Record<string, any> = existingFirestoreAccount ? (userDocSnap.data() || {}) : {};
    const isNew = additionalInfo?.isNewUser ?? !existingFirestoreAccount;

    const identityKey = `${providerType}_${currentUser.uid}`;
    const identityDoc = await safeGetDocWithTimeout(doc(db, "linked_identities", identityKey), 2500);

    let serverExists = false;
    if (currentUser.email) {
      try {
        serverExists = await Promise.race([
          checkIdentityExists({ email: currentUser.email, provider: providerType, identifier: currentUser.uid }),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
        ]);
      } catch {
        serverExists = false;
      }
    }

    const isRegistered =
      existingFirestoreAccount ||
      Boolean(identityDoc && identityDoc.exists()) ||
      serverExists ||
      (!isNew && Boolean(existingData?.sjTutorId));

    // ----------------------------------------------------
    // CASE A: User is in SIGN UP mode, but account ALREADY exists!
    // ----------------------------------------------------
    if (mode === "signup" && isRegistered) {
      console.warn(`[AUTH] Account already exists for ${providerType} (${currentUser.email || currentUser.uid})`);
      await signOut(auth).catch(() => {});
      return {
        status: "ACCOUNT_ALREADY_EXISTS",
        message: "This account is already registered with SJ Tutor AI. Please try logging in instead.",
      };
    }

    // ----------------------------------------------------
    // CASE B: User is in LOGIN mode, but account does NOT exist!
    // For Google Login, automatically provision account with 1-Year Free Achiever Plan!
    // ----------------------------------------------------
    if (mode === "signin" && !isRegistered) {
      if (providerType === "google") {
        const now = Date.now();
        const generatedId = generateSjTutorId();
        const autoGoogleProfile = {
          uid: currentUser.uid,
          sjTutorId: generatedId,
          registrationNumber: generatedId,
          displayName: currentUser.displayName || "Google Scholar",
          name: currentUser.displayName || "Google Scholar",
          email: (currentUser.email || "").toLowerCase(),
          photoURL: currentUser.photoURL || "",
          provider: "google.com",
          linkedProviders: ["google"],
          institution: "SJ Tutor AI Academy",
          grade: "10th Grade",
          classGrade: "10th Grade",
          board: "CBSE",
          credits: 99999,
          planType: "Achiever" as const,
          planActivatedAt: now,
          planExpiryDate: now + ONE_YEAR_MS,
          planDurationLabel: "1 Year Free (Google Login Offer)",
          isGoogleFreeYear: true,
          hasCompletedOnboarding: true,
          isRegisteredInFirestore: true,
          trialStartDate: now,
          lastLoginAt: now,
        };

        try {
          localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(autoGoogleProfile));
          localStorage.setItem("sjtutor_authenticated_user", JSON.stringify(autoGoogleProfile));
          localStorage.setItem("sjtutor_active_user", JSON.stringify(autoGoogleProfile));
        } catch {
          // ignore storage quota
        }

        // Persist to Firestore in background without blocking login
        Promise.allSettled([
          setDoc(
            userDocRef,
            {
              ...autoGoogleProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            },
            { merge: true }
          ),
          setDoc(
            doc(db, "sj_tutor_ids", generatedId),
            {
              sjTutorId: generatedId,
              userId: currentUser.uid,
              displayName: autoGoogleProfile.displayName,
              email: autoGoogleProfile.email,
              twoStepEnabled: false,
              createdAt: now,
              updatedAt: now,
            },
            { merge: true }
          ),
          setDoc(
            doc(db, "linked_identities", identityKey),
            {
              provider: providerType,
              uid: currentUser.uid,
              email: autoGoogleProfile.email,
              sjTutorId: generatedId,
              updatedAt: now,
            },
            { merge: true }
          ),
        ]).catch((autoErr) => {
          console.warn("Google auto-provision notice:", autoErr);
        });

        try {
          window.dispatchEvent(new Event("sjtutor_user_logged_in"));
          window.dispatchEvent(new Event("sjtutor_auth_changed"));
        } catch {
          // ignore
        }

        return {
          status: "SUCCESS",
          sjTutorId: generatedId,
          user: { ...autoGoogleProfile },
          message: "Welcome! Your Google account unlocked the Achiever Premium Plan free for 1 year!",
        };
      }

      console.warn(`[AUTH] Account not found for ${providerType} (${currentUser.email || currentUser.uid})`);
      await signOut(auth).catch(() => {});
      return {
        status: "ACCOUNT_NOT_FOUND",
        message: "We couldn't find an SJ Tutor AI account associated with this login. Please try signing up first.",
      };
    }

    // ----------------------------------------------------
    // CASE C: User is in SIGN UP mode and identity is NEW -> Proceed to Profile Setup!
    // ----------------------------------------------------
    if (mode === "signup") {
      return {
        status: "PENDING_PROFILE",
        authIdentity: {
          uid: currentUser.uid,
          email: currentUser.email || "",
          displayName: currentUser.displayName || "",
          photoURL: currentUser.photoURL || "",
          provider: providerType,
        },
        user: currentUser,
        message: "Provider authenticated. Please complete your profile.",
      };
    }

    // ----------------------------------------------------
    // CASE D: User is in LOGIN mode and account EXISTS -> Authenticate
    // ----------------------------------------------------
    let cachedLocal: Record<string, any> = {};
    try {
      const rawCached = localStorage.getItem(`profile_${currentUser.uid}`);
      if (rawCached) cachedLocal = JSON.parse(rawCached) || {};
    } catch {
      cachedLocal = {};
    }

    const profileData = { ...cachedLocal, ...existingData };
    const ensuredSjTutorId =
      profileData.sjTutorId ||
      profileData.registrationNumber ||
      generateSjTutorId();

    const googleOffer =
      providerType === "google"
        ? resolveGoogleOneYearPremiumPlan(currentUser, {
            ...profileData,
            provider: "google.com",
          })
        : resolveGoogleOneYearPremiumPlan(currentUser, profileData);

    const upgradedFields = googleOffer
      ? {
          planType: googleOffer.planType,
          credits: Math.max(googleOffer.credits, Number(profileData.credits) || 0),
          planActivatedAt: googleOffer.planActivatedAt,
          planExpiryDate: googleOffer.planExpiryDate,
          planDurationLabel: googleOffer.planDurationLabel,
          isGoogleFreeYear: true,
          provider: profileData.provider || "google.com",
          hasCompletedOnboarding: true,
        }
      : {};

    const mergedUser = {
      ...profileData,
      ...upgradedFields,
      uid: currentUser.uid,
      sjTutorId: ensuredSjTutorId,
      registrationNumber: profileData.registrationNumber || ensuredSjTutorId,
      displayName: profileData.displayName || profileData.name || currentUser.displayName || "Student",
      name: profileData.name || profileData.displayName || currentUser.displayName || "Student",
      email: (profileData.email || currentUser.email || "").toLowerCase(),
      photoURL: profileData.photoURL || currentUser.photoURL || "",
      hasCompletedOnboarding: true,
      isRegisteredInFirestore: true,
    };

    try {
      localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(mergedUser));
      localStorage.setItem("sjtutor_authenticated_user", JSON.stringify(mergedUser));
      localStorage.setItem("sjtutor_active_user", JSON.stringify(mergedUser));
    } catch {
      // ignore storage quota
    }

    // Ensure sjTutorId and Google offer fields are synced to Firestore in background
    Promise.allSettled([
      setDoc(
        userDocRef,
        {
          ...upgradedFields,
          sjTutorId: ensuredSjTutorId,
          registrationNumber: mergedUser.registrationNumber,
          displayName: mergedUser.displayName,
          email: mergedUser.email,
          photoURL: mergedUser.photoURL,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      setDoc(
        doc(db, "sj_tutor_ids", ensuredSjTutorId.toUpperCase()),
        {
          sjTutorId: ensuredSjTutorId.toUpperCase(),
          userId: currentUser.uid,
          displayName: mergedUser.displayName,
          email: mergedUser.email,
          updatedAt: Date.now(),
        },
        { merge: true }
      ),
    ]).catch(() => {});

    try {
      window.dispatchEvent(new Event("sjtutor_user_logged_in"));
      window.dispatchEvent(new Event("sjtutor_auth_changed"));
    } catch {
      // ignore
    }

    return {
      status: "SUCCESS",
      sjTutorId: ensuredSjTutorId,
      user: mergedUser,
      message: googleOffer
        ? "Welcome back! Your 1-Year Free Achiever Premium Plan is active."
        : "Welcome back to SJ Tutor AI!",
    };
  } catch (error: any) {
    const errorCode = error?.code || "";
    const errorMessage = error?.message || "";
    const isUnauthorizedDomain =
      errorCode === "auth/unauthorized-domain" ||
      errorMessage.includes("auth/unauthorized-domain");

    if (isUnauthorizedDomain) {
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "current domain";
      const consoleUrl = "https://console.firebase.google.com/project/sj-tutorai/authentication/settings";
      console.warn(
        `[AUTH] Domain authorization required: "${currentHost}". Add to Firebase Console -> Authentication -> Settings -> Authorized domains (${consoleUrl}).`
      );
      return {
        status: "UNAUTHORIZED_DOMAIN",
        domain: currentHost,
        consoleUrl,
        message: `Domain authorization required: "${currentHost}" must be added to your Firebase Authentication Authorized Domains.`,
        error,
      };
    }

    console.error(`Error during ${providerType} auth (${mode}):`, error);

    if (errorCode === "auth/popup-closed-by-user" || errorCode === "auth/cancelled-popup-request") {
      return {
        status: "ERROR",
        message: "Sign-in popup was closed before completing. Please click Continue with Google again.",
        error,
      };
    }

    if (errorCode === "auth/popup-blocked") {
      return {
        status: "ERROR",
        message: "Your browser blocked the Google Sign-In popup. Please allow popups for this site and click Continue with Google again.",
        error,
      };
    }

    if (errorCode === "auth/account-exists-with-different-credential") {
      return {
        status: "ACCOUNT_ALREADY_EXISTS",
        message: "This email is already associated with another login provider. Please log in with your original method.",
        error,
      };
    }

    if (errorCode === "auth/network-request-failed") {
      return {
        status: "ERROR",
        message: "Network error reaching Google Sign-In. Please check your connection and try again.",
        error,
      };
    }

    return {
      status: "ERROR",
      message: error?.message || "Authentication failed. Please try again.",
      error,
    };
  } finally {
    _socialAuthInProgress = false;
  }
}

/**
 * Send a Firebase Passwordless Email Verification & Sign-In Link.
 * - For new users ('signup'): verifies email ownership before onboarding (no password required).
 * - For returning/any users ('signin'): signs in passwordlessly via one-click verified email link.
 */
export async function sendPasswordlessEmailLink(
  email: string,
  intent: "signin" | "signup" = "signin",
  rememberMe = true
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return {
      status: "ERROR",
      message: "Please enter a valid email address.",
    };
  }

  try {
    if (intent === "signup") {
      const exists = await checkIdentityExists({ email: normalizedEmail });
      if (exists) {
        return {
          status: "ACCOUNT_ALREADY_EXISTS",
          message: "This email is already registered with SJ Tutor AI. Use passwordless Log In instead.",
        };
      }
    }

    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://sj-tutorai.web.app";

    const actionCodeSettings = {
      url: `${origin}/?authMode=emailLink&intent=${intent}`,
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings);

    try {
      window.localStorage.setItem("emailForSignIn", normalizedEmail);
      window.localStorage.setItem("emailLinkIntent", intent);
      window.localStorage.setItem("emailLinkRememberMe", rememberMe ? "true" : "false");
    } catch {
      // Ignore storage quota errors
    }

    return {
      status: "EMAIL_LINK_SENT",
      maskedDestination: normalizedEmail,
      message:
        intent === "signup"
          ? `Verification link sent to ${normalizedEmail}. Open your inbox and click the link to verify your email and create your account.`
          : `Passwordless sign-in link sent to ${normalizedEmail}. Open your inbox and click the link to sign in instantly.`,
    };
  } catch (error: any) {
    const errorCode = error?.code || "";
    const errorMessage = error?.message || "";
    const currentHost = typeof window !== "undefined" ? window.location.hostname : "current domain";

    if (
      errorCode === "auth/unauthorized-domain" ||
      errorCode === "auth/unauthorized-continue-uri" ||
      errorMessage.includes("unauthorized-domain")
    ) {
      const consoleUrl = "https://console.firebase.google.com/project/sj-tutorai/authentication/settings";
      return {
        status: "UNAUTHORIZED_DOMAIN",
        domain: currentHost,
        consoleUrl,
        message: `Domain authorization required: "${currentHost}" must be added to Firebase Authentication Authorized Domains.`,
        error,
      };
    }

    if (
      errorCode === "auth/operation-not-allowed" ||
      errorMessage.includes("OPERATION_NOT_ALLOWED")
    ) {
      const consoleUrl = "https://console.firebase.google.com/project/sj-tutorai/authentication/providers";
      return {
        status: "EMAIL_LINK_DISABLED",
        consoleUrl,
        message:
          'Passwordless Email Link sign-in is not yet enabled in Firebase Console. Open Authentication -> Sign-in method -> Email/Password and enable "Email link (passwordless sign-in)".',
        error,
      };
    }

    if (errorCode === "auth/invalid-email") {
      return {
        status: "ERROR",
        message: "That email address format looks invalid. Please double-check and try again.",
        error,
      };
    }

    if (errorCode === "auth/quota-exceeded" || errorCode === "auth/too-many-requests") {
      return {
        status: "TOO_MANY_ATTEMPTS",
        message: "Too many sign-in link requests. Please wait a few minutes before requesting another link.",
        error,
      };
    }

    console.error("[AUTH] sendPasswordlessEmailLink error:", error);
    return {
      status: "ERROR",
      message: error?.message || "Could not send verification link. Please try again.",
      error,
    };
  }
}

/**
 * Complete Firebase Passwordless Email Link Sign-In / Verification when the user returns via link.
 * - Existing account -> hydrates profile & signs straight into Dashboard.
 * - New user -> verifies email (emailVerified: true) and returns PENDING_PROFILE for passwordless onboarding.
 */
export async function completePasswordlessEmailLinkSignIn(
  emailOverride?: string,
  href?: string
): Promise<AuthResult> {
  const linkUrl =
    href || (typeof window !== "undefined" ? window.location.href : "");

  if (!linkUrl || !isSignInWithEmailLink(auth, linkUrl)) {
    return {
      status: "ERROR",
      message: "Invalid or missing email sign-in link.",
    };
  }

  let storedEmail = "";
  let storedRemember = true;
  try {
    storedEmail = window.localStorage.getItem("emailForSignIn") || "";
    storedRemember = window.localStorage.getItem("emailLinkRememberMe") !== "false";
  } catch {
    // ignore
  }

  const normalizedEmail = (emailOverride || storedEmail).trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      status: "NEEDS_EMAIL_CONFIRMATION",
      message: "Please confirm the email address where you received this sign-in link.",
    };
  }

  _emailLinkAuthInProgress = true;
  try {
    try {
      await setPersistence(
        auth,
        storedRemember ? browserLocalPersistence : browserSessionPersistence
      );
    } catch (persistErr) {
      console.warn("Firebase persistence setup notice:", persistErr);
    }

    const userCred = await signInWithEmailLink(auth, normalizedEmail, linkUrl);
    const currentUser = userCred.user;
    const additionalInfo = getAdditionalUserInfo(userCred);

    try {
      window.localStorage.removeItem("emailForSignIn");
      window.localStorage.removeItem("emailLinkIntent");
      window.localStorage.removeItem("emailLinkRememberMe");
      window.localStorage.removeItem("displayNameForSignIn");
    } catch {
      // ignore
    }

    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await safeGetDocWithTimeout(userDocRef, 4000);
    const existingFirestoreAccount = Boolean(userDocSnap && userDocSnap.exists());
    const existingData: Record<string, any> = existingFirestoreAccount ? (userDocSnap.data() || {}) : {};

    let serverMatch: Record<string, any> | null = null;
    if (!existingFirestoreAccount && normalizedEmail) {
      try {
        const res = await Promise.race([
          fetch("/api/auth/login-with-id-card", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: normalizedEmail }),
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (res && res.ok) {
          const parsed = await safeParseAuthJson(res);
          if (parsed.success && parsed.user) {
            serverMatch = parsed.user;
          }
        }
      } catch {
        serverMatch = null;
      }
    }

    const isExistingRegistered =
      (existingFirestoreAccount && Boolean(existingData.hasCompletedOnboarding || existingData.sjTutorId)) ||
      Boolean(serverMatch?.sjTutorId) ||
      (additionalInfo?.isNewUser === false && existingFirestoreAccount);

    // Brand-new verified user -> launch passwordless student profile onboarding
    if (!isExistingRegistered) {
      return {
        status: "PENDING_PROFILE",
        authIdentity: {
          uid: currentUser.uid,
          email: normalizedEmail,
          displayName: currentUser.displayName || "",
          photoURL: currentUser.photoURL || "",
          provider: "email_link",
          emailVerified: true,
        },
        user: currentUser,
        message: "Email verified! Complete your profile to generate your SJ Tutor AI ID.",
      };
    }

    // Existing registered user -> hydrate and log straight in
    let cachedLocal: Record<string, any> = {};
    try {
      const rawCached = localStorage.getItem(`profile_${currentUser.uid}`);
      if (rawCached) cachedLocal = JSON.parse(rawCached) || {};
    } catch {
      cachedLocal = {};
    }

    const profileData = { ...cachedLocal, ...(serverMatch || {}), ...existingData };
    const ensuredSjTutorId =
      profileData.sjTutorId ||
      profileData.registrationNumber ||
      generateSjTutorId();

    const mergedUser = {
      ...profileData,
      uid: currentUser.uid,
      sjTutorId: ensuredSjTutorId,
      registrationNumber: profileData.registrationNumber || ensuredSjTutorId,
      displayName:
        profileData.displayName ||
        profileData.name ||
        currentUser.displayName ||
        normalizedEmail.split("@")[0],
      name:
        profileData.name ||
        profileData.displayName ||
        currentUser.displayName ||
        normalizedEmail.split("@")[0],
      email: normalizedEmail,
      emailVerified: true,
      provider: profileData.provider || "email_link",
      photoURL: profileData.photoURL || currentUser.photoURL || "",
      hasCompletedOnboarding: true,
      isRegisteredInFirestore: true,
    };

    try {
      localStorage.setItem(`profile_${currentUser.uid}`, JSON.stringify(mergedUser));
      localStorage.setItem("sjtutor_authenticated_user", JSON.stringify(mergedUser));
      localStorage.setItem("sjtutor_active_user", JSON.stringify(mergedUser));
    } catch {
      // ignore
    }

    Promise.allSettled([
      setDoc(
        userDocRef,
        {
          ...mergedUser,
          emailVerified: true,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      setDoc(
        doc(db, "sj_tutor_ids", ensuredSjTutorId.toUpperCase()),
        {
          sjTutorId: ensuredSjTutorId.toUpperCase(),
          userId: currentUser.uid,
          displayName: mergedUser.displayName,
          email: normalizedEmail,
          updatedAt: Date.now(),
        },
        { merge: true }
      ),
      setDoc(
        doc(db, "linked_identities", `email_link_${currentUser.uid}`),
        {
          provider: "email_link",
          uid: currentUser.uid,
          email: normalizedEmail,
          sjTutorId: ensuredSjTutorId,
          verified: true,
          updatedAt: Date.now(),
        },
        { merge: true }
      ),
    ]).catch(() => {});

    try {
      window.dispatchEvent(new Event("sjtutor_user_logged_in"));
      window.dispatchEvent(new Event("sjtutor_auth_changed"));
    } catch {
      // ignore
    }

    return {
      status: "SUCCESS",
      sjTutorId: ensuredSjTutorId,
      user: mergedUser,
      message: "Email verified & signed in passwordlessly!",
    };
  } catch (error: any) {
    const code = error?.code || "";
    console.error("[AUTH] completePasswordlessEmailLinkSignIn error:", error);

    if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
      return {
        status: "ERROR",
        message: "This sign-in link has expired or was already used. Please request a fresh link.",
        error,
      };
    }

    if (code === "auth/invalid-email") {
      return {
        status: "NEEDS_EMAIL_CONFIRMATION",
        message: "The email entered did not match this sign-in link. Please enter the exact email you used.",
        error,
      };
    }

    return {
      status: "ERROR",
      message: error?.message || "Could not verify your email sign-in link. Please request a new one.",
      error,
    };
  } finally {
    _emailLinkAuthInProgress = false;
  }
}

/**
 * Send standard Firebase email verification to a currently signed-in unverified user.
 */
export async function sendCurrentUserEmailVerification(): Promise<{ success: boolean; message: string }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, message: "No active session found. Please sign in first." };
  }
  if (user.emailVerified) {
    return { success: true, message: "Your email is already verified." };
  }
  try {
    await sendEmailVerification(user, {
      url: typeof window !== "undefined" ? window.location.origin : "https://sj-tutorai.web.app",
      handleCodeInApp: false,
    });
    return {
      success: true,
      message: `Verification email sent to ${user.email}. Please check your inbox.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Could not send verification email. Please try again shortly.",
    };
  }
}

/**
 * Handle Email + Password Sign Up Initiation
 * Checks for duplicate account and moves to Profile Setup
 */
export async function initEmailSignUp(
  email: string,
  password: string,
  confirmPassword: string
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return {
      status: "ERROR",
      message: "Please provide both an email address and password.",
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "ERROR",
      message: "Passwords do not match. Please verify and try again.",
    };
  }

  if (password.length < 8) {
    return {
      status: "ERROR",
      message: "Password must be at least 8 characters in length.",
    };
  }

  try {
    const exists = await checkIdentityExists({ email: normalizedEmail });
    if (exists) {
      return {
        status: "ACCOUNT_ALREADY_EXISTS",
        message: "This account is already registered with SJ Tutor AI. Please try logging in instead.",
      };
    }

    return {
      status: "PENDING_PROFILE",
      authIdentity: {
        email: normalizedEmail,
        password,
        provider: "email_password",
      },
      message: "Credentials accepted. Please proceed to complete your profile.",
    };
  } catch (error: any) {
    return {
      status: "ERROR",
      message: error.message || "Could not verify identity. Please try again.",
      error,
    };
  }
}

/**
 * Handle Email + Password Login
 */
export async function loginWithEmail(
  email: string,
  password: string,
  rememberMe = true
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );
    } catch (persistErr) {
      console.warn("Firebase persistence setup notice:", persistErr);
    }
    const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const user = cred.user;

    const userDoc = await safeGetDocWithTimeout(doc(db, "users", user.uid), 4000);
    let profileData: Record<string, any> = userDoc && userDoc.exists() ? (userDoc.data() || {}) : {};
    if (!userDoc || !userDoc.exists()) {
      // Check local cache or synthesize profile if Firebase Auth succeeded
      try {
        const cached = localStorage.getItem(`profile_${user.uid}`);
        if (cached) profileData = JSON.parse(cached) || {};
      } catch {
        // ignore
      }
      if (!profileData.sjTutorId) {
        profileData = {
          ...profileData,
          uid: user.uid,
          email: normalizedEmail,
          displayName: user.displayName || normalizedEmail.split("@")[0],
          sjTutorId: generateSjTutorId(),
          hasCompletedOnboarding: true,
          isRegisteredInFirestore: true,
        };
        setDoc(doc(db, "users", user.uid), { ...profileData, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
      }
    }

    return {
      status: "SUCCESS",
      user: { ...profileData, uid: user.uid, email: profileData.email || normalizedEmail, displayName: profileData.displayName || user.displayName || "Student" },
      message: "Welcome back!",
    };
  } catch (error: any) {
    console.error("Email login error:", error);

    if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
      const exists = await checkIdentityExists({ email: normalizedEmail });
      if (!exists) {
        return {
          status: "ACCOUNT_NOT_FOUND",
          message: "We couldn't find an SJ Tutor AI account associated with this login. Please try signing up first.",
        };
      }
      return {
        status: "INCORRECT_PASSWORD",
        message: "The password you entered is incorrect. Please try again.",
      };
    }

    if (error.code === "auth/wrong-password") {
      return {
        status: "INCORRECT_PASSWORD",
        message: "The password you entered is incorrect. Please try again.",
      };
    }

    if (error.code === "auth/too-many-requests") {
      return {
        status: "TOO_MANY_ATTEMPTS",
        message: "Too many unsuccessful attempts. Please wait and try again.",
      };
    }

    return {
      status: "ERROR",
      message: error.message || "Login failed. Please check your credentials.",
      error,
    };
  }
}

/**
 * Complete Account Creation and Generate Unique SJ Tutor AI ID
 * Called after Profile Setup and Learning Preferences are finished.
 */
export async function createAccountAndGenerateSjTutorId(params: {
  authIdentity?: any;
  email?: string;
  password?: string;
  authProvider?: string;
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber?: string;
  institution?: string;
  grade?: string;
  classGrade?: string;
  board?: string;
  country?: string;
  state?: string;
  district?: string;
  cityArea?: string;
  streetAddress?: string;
  zipCode?: string;
  hearAboutUs?: string;
  dob?: string;
  registrationNumber?: string;
  photoURL?: string;
  subjects?: string[];
  learningPreferences?: string[];
  preferredLanguage?: string;
  additionalInfo?: any;
}): Promise<AuthResult> {
  try {
    let authUid = params.authIdentity?.uid;
    const email = (params.email || params.authIdentity?.email || "").trim().toLowerCase();
    const provider = params.authProvider || params.authIdentity?.provider || "email";
    const initialPassword = params.password || params.authIdentity?.password;
    const classGrade = params.classGrade || params.grade || "Class 10";
    const additional = params.additionalInfo || {};
    const country = params.country || additional.country || "";
    const state = params.state || additional.state || "";
    const district = params.district || additional.district || "";
    const cityArea = params.cityArea || additional.cityArea || "";
    const streetAddress = params.streetAddress || additional.streetAddress || "";
    const zipCode = params.zipCode || additional.zipCode || "";
    const hearAboutUs = params.hearAboutUs || additional.hearAboutUs || "";
    const dob = params.dob || additional.dob || "";
    const preferredLanguage = params.preferredLanguage || additional.tutoringLanguage || "English";

    const isPasswordlessSentinel =
      !initialPassword ||
      initialPassword === "social-auth-verified" ||
      initialPassword === "passwordless-email-verified";

    // If email+password signup and user not yet created in Firebase Auth
    if (
      (provider === "email" || provider === "email_password") &&
      !authUid &&
      email &&
      !isPasswordlessSentinel
    ) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, initialPassword);
        authUid = cred.user.uid;
        if (params.firstName || params.lastName) {
          const fullName = [params.firstName, params.lastName].filter(Boolean).join(" ");
          await updateProfile(cred.user, {
            displayName: fullName,
            photoURL: params.photoURL || undefined,
          });
        }
        // Automatically send verification email for new password-based users
        sendEmailVerification(cred.user).catch((vErr) => {
          console.warn("Could not send verification email after signup:", vErr);
        });
      } catch (fbErr: any) {
        if (fbErr.code === "auth/email-already-in-use") {
          return {
            status: "ACCOUNT_ALREADY_EXISTS",
            message: "This account is already registered with SJ Tutor AI. Please try logging in instead.",
          };
        }
        console.warn("Firebase Auth creation notice (continuing with server registration):", fbErr);
      }
    } else if (auth.currentUser && (provider === "email_link" || !authUid)) {
      authUid = authUid || auth.currentUser.uid;
      if (params.firstName || params.lastName) {
        const fullName = [params.firstName, params.lastName].filter(Boolean).join(" ");
        updateProfile(auth.currentUser, {
          displayName: fullName,
          photoURL: params.photoURL || undefined,
        }).catch(() => {});
      }
    }

    const isEmailVerified = Boolean(
      params.authIdentity?.emailVerified ||
        auth.currentUser?.emailVerified ||
        provider === "email_link" ||
        provider === "google"
    );

    // Call server to generate SJ Tutor AI ID and persist account
    const fullName = [params.firstName, params.lastName].filter(Boolean).join(" ") || `Student`;
    const response = await fetch("/api/auth/create-account-and-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authUid,
        provider,
        email,
        displayName: fullName,
        firstName: params.firstName,
        lastName: params.lastName,
        username: params.username,
        phoneNumber: params.phoneNumber,
        institution: params.institution,
        grade: classGrade,
        classGrade,
        board: params.board,
        country,
        state,
        district,
        cityArea,
        streetAddress,
        zipCode,
        hearAboutUs,
        dob,
        registrationNumber: params.registrationNumber,
        photoURL: params.photoURL,
        subjects: params.subjects,
        learningPreferences: params.learningPreferences,
        preferredLanguage,
        initialPassword,
        allowUpdate: true,
      }),
    });

    const data = await safeParseAuthJson(response);

    let generatedId = data.sjTutorId;
    if (!generatedId) {
      // Local fallback generation in case of network variance
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      generatedId = `SJTA-${randomSuffix}`;
    }

    const finalUid = data.user?.uid || authUid || `sjta_${generatedId.toLowerCase()}`;
    const membership = getMembershipByEmail(email);
    const googleOffer = resolveGoogleOneYearPremiumPlan(auth.currentUser, {
      provider,
      email,
    });
    const finalPlanType = membership
      ? membership.planType
      : googleOffer
      ? googleOffer.planType
      : "Free";
    const finalCredits = membership
      ? membership.credits
      : googleOffer
      ? googleOffer.credits
      : 100;

    // Sync to Firestore for real-time app queries
    try {
      await setDoc(
        doc(db, "users", finalUid),
        {
          uid: finalUid,
          sjTutorId: generatedId,
          displayName: fullName,
          firstName: params.firstName,
          lastName: params.lastName,
          username: params.username,
          email,
          emailVerified: isEmailVerified,
          provider,
          linkedProviders: [provider],
          phoneNumber: params.phoneNumber || "",
          institution: params.institution || "",
          grade: classGrade,
          classGrade,
          board: params.board || "",
          country,
          state,
          district,
          cityArea,
          streetAddress,
          zipCode,
          hearAboutUs,
          dob,
          photoURL: params.photoURL || "",
          subjects: params.subjects || [],
          learningStyle: (params.learningPreferences || []).join(", "),
          learningPreferences: params.learningPreferences || [],
          preferredLanguage,
          credits: finalCredits,
          planType: finalPlanType,
          ...(googleOffer
            ? {
                planActivatedAt: googleOffer.planActivatedAt,
                planExpiryDate: googleOffer.planExpiryDate,
                planDurationLabel: googleOffer.planDurationLabel,
                isGoogleFreeYear: true,
              }
            : {}),
          hasCompletedOnboarding: true,
          twoFactorEnabled: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(doc(db, "sj_tutor_ids", generatedId), {
        sjTutorId: generatedId,
        userId: finalUid,
        displayName: fullName,
        email,
        emailVerified: isEmailVerified,
        phoneNumber: params.phoneNumber || "",
        twoStepEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (provider === "email_link" && finalUid) {
        await setDoc(
          doc(db, "linked_identities", `email_link_${finalUid}`),
          {
            provider: "email_link",
            uid: finalUid,
            email,
            sjTutorId: generatedId,
            verified: true,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }
    } catch (fsErr) {
      console.warn("Firestore sync during account creation:", fsErr);
    }

    return {
      status: "SUCCESS",
      sjTutorId: generatedId,
      user: {
        ...data.user,
        uid: finalUid,
        sjTutorId: generatedId,
        emailVerified: isEmailVerified,
        provider,
        planType: finalPlanType,
        credits: finalCredits,
        ...(googleOffer
          ? {
              planActivatedAt: googleOffer.planActivatedAt,
              planExpiryDate: googleOffer.planExpiryDate,
              planDurationLabel: googleOffer.planDurationLabel,
              isGoogleFreeYear: true,
            }
          : {}),
      },
      message: googleOffer
        ? "Account created! Your 1-Year Free Achiever Premium Plan is now active!"
        : "Your SJ Tutor AI account has been successfully created!",
    };
  } catch (error: any) {
    console.error("Error creating account and generating ID:", error);
    return {
      status: "ERROR",
      message: error.message || "Account creation encountered an error.",
      error,
    };
  }
}

/**
 * Save Account Security Setup:
 * 1. 2-Step Verification Password
 * 2. 4 or 6-Digit PIN
 * 3. Security Question & Answer
 */
export async function saveAccountSecurity(params: {
  sjTutorId: string;
  twoStepPassword: string;
  securityPin: string;
  pinLength: 4 | 6;
  securityQuestion: string;
  securityAnswer: string;
}): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/save-security-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await safeParseAuthJson(response);
    if (!response.ok) {
      return {
        status: "ERROR",
        message: data.message || "Failed to configure security credentials",
      };
    }

    // Update Firestore record if exists
    try {
      await setDoc(
        doc(db, "sj_tutor_ids", params.sjTutorId.trim().toUpperCase()),
        {
          pinLength: params.pinLength,
          securityQuestion: params.securityQuestion,
          twoStepEnabled: true,
          securitySetupCompleted: true,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Firestore security update notice:", e);
    }

    return {
      status: "SUCCESS",
      sjTutorId: params.sjTutorId,
      message: "Account secured successfully!",
    };
  } catch (error: any) {
    console.error("Save security credentials error:", error);
    return {
      status: "ERROR",
      message: "Could not save security credentials. Please try again.",
      error,
    };
  }
}

/**
 * Update Security PIN via Server API & Local state
 */
export async function updateSecurityPin(params: {
  identifier: string;
  currentPin?: string;
  newPin: string;
  pinLength: 4 | 6;
  securityQuestion?: string;
  securityAnswer?: string;
}): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/update-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await safeParseAuthJson(response);
    if (!response.ok) {
      return {
        status: "ERROR",
        message: data.message || "Failed to update Security PIN.",
      };
    }

    return {
      status: "SUCCESS",
      message: data.message || "Security PIN updated successfully!",
      pinLength: data.pinLength,
    };
  } catch (err: any) {
    console.error("updateSecurityPin error:", err);
    return {
      status: "ERROR",
      message: err.message || "Network error while updating PIN.",
      error: err,
    };
  }
}

/**
 * Update 2-Step Verification Password via Server API
 */
export async function updateTwoStepPassword(params: {
  identifier: string;
  currentPassword?: string;
  newPassword: string;
  securityQuestion?: string;
  securityAnswer?: string;
}): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/update-twostep-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await safeParseAuthJson(response);
    if (!response.ok) {
      return {
        status: "ERROR",
        message: data.message || "Failed to update 2-Step Verification Password.",
      };
    }

    return {
      status: "SUCCESS",
      message: data.message || "2-Step verification password updated successfully!",
    };
  } catch (err: any) {
    console.error("updateTwoStepPassword error:", err);
    return {
      status: "ERROR",
      message: err.message || "Network error while updating 2-Step password.",
      error: err,
    };
  }
}

/**
 * Disable PIN or 2-Step Verification
 */
export async function disableSecuritySetting(params: {
  identifier: string;
  type: "pin" | "twostep";
  currentSecret?: string;
}): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/disable-security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await safeParseAuthJson(response);
    if (!response.ok) {
      return {
        status: "ERROR",
        message: data.message || "Failed to disable security setting.",
      };
    }

    return {
      status: "SUCCESS",
      message: data.message || "Security setting disabled successfully.",
    };
  } catch (err: any) {
    console.error("disableSecuritySetting error:", err);
    return {
      status: "ERROR",
      message: err.message || "Network error.",
      error: err,
    };
  }
}

/**
 * Verify secret (PIN or 2-Step password) against server
 */
export async function verifySecuritySecret(params: {
  identifier: string;
  type: "pin" | "twostep";
  secret: string;
}): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/verify-security-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (response.ok) {
      const data = await safeParseAuthJson(response);
      return !!data.valid;
    }
  } catch (e) {
    console.warn("verifySecuritySecret check error:", e);
  }
  return false;
}

/**
 * SJ Tutor AI ID Login - Step 1
 * Validates SJ Tutor AI ID and 2-Step Verification Password.
 * Returns challengeId and required PIN length (4 or 6).
 * (NO OTP!)
 */
export async function loginSjTutorIdStep1(
  sjTutorId: string,
  password: string
): Promise<AuthResult> {
  const normalizedId = sjTutorId.trim().toUpperCase();

  try {
    const response = await fetch("/api/auth/sjtutor-login-step1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sjTutorId: normalizedId, password }),
    });

    const data = await safeParseAuthJson(response);

    if (!response.ok) {
      if (data.error === "ACCOUNT_NOT_FOUND" || response.status === 404) {
        return {
          status: "ACCOUNT_NOT_FOUND",
          message: "We couldn't find an SJ Tutor AI account associated with this login. Please try signing up first.",
        };
      }
      if (data.error === "INCORRECT_PASSWORD" || response.status === 401) {
        return {
          status: "INCORRECT_PASSWORD",
          message: "The password you entered is incorrect. Please try again.",
        };
      }
      if (data.error === "TOO_MANY_ATTEMPTS" || response.status === 429) {
        return {
          status: "TOO_MANY_ATTEMPTS",
          message: "Too many unsuccessful attempts. Please wait and try again.",
        };
      }
      return {
        status: "ERROR",
        message: data.message || "Failed to authenticate credentials",
      };
    }

    return {
      status: "PIN_REQUIRED",
      challengeId: data.challengeId,
      pinLength: data.pinLength || 6,
      sjTutorId: data.sjTutorId,
      user: { displayName: data.displayName },
      maskedDestination: data.maskedEmail,
      message: `Password verified. Please enter your ${data.pinLength || 6}-digit Security PIN.`,
    };
  } catch (error: any) {
    console.error("SJ Tutor ID login step 1 error:", error);
    return {
      status: "ERROR",
      message: "Network error connecting to authentication server.",
      error,
    };
  }
}

/**
 * SJ Tutor AI ID Login - Step 2 (PIN Verification)
 * Validates 4 or 6-digit Security PIN.
 * (NO OTP!)
 */
export async function verifySjTutorIdStep2Pin(
  challengeId: string,
  pin: string
): Promise<AuthResult> {
  try {
    const response = await fetch("/api/auth/sjtutor-login-step2-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, pin: pin.trim() }),
    });

    const data = await safeParseAuthJson(response);

    if (!response.ok) {
      if (data.error === "INCORRECT_PIN") {
        return {
          status: "INCORRECT_PIN",
          message: data.message || "The security PIN you entered is incorrect. Please try again.",
        };
      }
      if (data.error === "TOO_MANY_ATTEMPTS" || response.status === 429) {
        return {
          status: "TOO_MANY_ATTEMPTS",
          message: "Too many unsuccessful attempts. Please wait 15 minutes and try again.",
        };
      }
      return {
        status: "ERROR",
        message: data.message || "Security PIN verification failed.",
      };
    }

    let fullProfile = data.user;
    try {
      if (data.user?.uid) {
        const userDoc = await getDoc(doc(db, "users", data.user.uid));
        if (userDoc.exists()) {
          fullProfile = { ...userDoc.data(), ...data.user };
        }
      }
    } catch (e) {
      console.warn("Could not fetch user profile from Firestore:", e);
    }

    localStorage.setItem("sjtutor_authenticated_user", JSON.stringify(fullProfile));
    window.dispatchEvent(new Event("sjtutor_auth_changed"));

    return {
      status: "SUCCESS",
      user: fullProfile,
      message: "Security PIN verified successfully! Welcome to SJ Tutor AI.",
    };
  } catch (error: any) {
    console.error("SJ Tutor ID PIN verification error:", error);
    return {
      status: "ERROR",
      message: "Verification processing failed. Please try again.",
      error,
    };
  }
}

/**
 * Recover Account - Step 1 (Lookup Question & Masked Email)
 */
export async function recoverAccountStep1(emailOrId: string): Promise<{
  success: boolean;
  sjTutorId?: string;
  securityQuestion?: string;
  hasEmail?: boolean;
  maskedEmail?: string;
  message?: string;
}> {
  try {
    const response = await fetch("/api/auth/recover-account-step1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrId }),
    });
    const data = await safeParseAuthJson(response);
    if (!response.ok) {
      return { success: false, message: data.message || "No account found matching this identifier." };
    }
    return { ...data, success: true };
  } catch (err) {
    console.error(err);
    return { success: false, message: "Network connection error. Please try again." };
  }
}

/**
 * Recover Account - Step 2 (Verify Security Answer & Reset Password/PIN)
 */
export async function recoverAccountStep2Verify(params: {
  sjTutorId: string;
  securityAnswer: string;
  newPassword: string;
  newPin: string;
  pinLength: 4 | 6;
}): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/auth/recover-account-step2-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await safeParseAuthJson(response);
    if (!response.ok) {
      return { success: false, message: data.message || "Could not reset credentials." };
    }
    return { success: true, message: data.message || "Security credentials successfully updated!" };
  } catch (err) {
    console.error(err);
    return { success: false, message: "Network connection error. Please try again." };
  }
}

/**
 * Request Password Reset via Email
 */
export async function sendPasswordReset(emailOrId: string): Promise<{ success: boolean; message: string }> {
  const input = emailOrId.trim();

  if (input.includes("@")) {
    try {
      await sendPasswordResetEmail(auth, input);
      return {
        success: true,
        message: "Password reset link has been dispatched to your email address.",
      };
    } catch (error: any) {
      console.warn("Firebase password reset error:", error);
      return {
        success: true,
        message: "If an account matches this email, instructions have been sent.",
      };
    }
  }

  try {
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailOrId: input }),
    });
    const data = await safeParseAuthJson(res);
    return {
      success: true,
      message: data.message || "Recovery instructions have been dispatched.",
    };
  } catch {
    return {
      success: true,
      message: "If an account matches this identifier, recovery instructions have been sent.",
    };
  }
}

/**
 * Log out user from all active sessions
 */
export async function logOutUser(): Promise<void> {
  // Clear persistent session keys immediately before Firebase signs out to prevent auto-rehydration
  localStorage.removeItem("sjtutor_authenticated_user");
  localStorage.removeItem("sjtutor_active_user");
  localStorage.removeItem("sjtutor_device_login_time");
  localStorage.removeItem("sjtutor_active_chat_state");
  localStorage.removeItem("sjtutor_active_group_id");

  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Firebase signOut error:", e);
  } finally {
    localStorage.removeItem("sjtutor_authenticated_user");
    localStorage.removeItem("sjtutor_active_user");
    window.dispatchEvent(new Event("sjtutor_auth_changed"));
  }
}

/**
 * Log in with SJ Tutor AI ID card:
 * Searches and retrieves the student's account from Firestore (by UID, sjTutorId, registrationNumber, email, or QR payload),
 * persists their session, applies their membership plan (e.g. Achiever with 99,999 credits for sadanandj2011@gmail.com),
 * and activates their normal full functionality.
 */
export async function findAccountAndLoginWithIdCard(
  cardInputOrQrPayload: string
): Promise<{
  success: boolean;
  status: "SUCCESS" | "ACCOUNT_NOT_FOUND" | "ERROR";
  user?: any;
  message?: string;
}> {
  try {
    const raw = cardInputOrQrPayload.trim();
    if (!raw) {
      return {
        success: false,
        status: "ERROR",
        message: "Please provide an ID card number or scan your ID QR code.",
      };
    }

    let parsedId = raw;
    let parsedUid = "";
    let parsedEmail = "";
    let parsedName = "";
    let parsedPlan = "";
    let parsedInstitution = "";
    let parsedGrade = "";
    let parsedPhone = "";
    let isVerifiedSjCardQr = false;

    // If QR payload is JSON from the ID Card QR code
    if (raw.startsWith("{") && raw.endsWith("}")) {
      try {
        const parsed = JSON.parse(raw);
        parsedId = String(parsed.id || parsed.sjTutorId || parsed.registrationNumber || parsed.uid || raw).trim();
        parsedUid = String(parsed.uid || parsed.userId || "").trim();
        parsedEmail = String(parsed.email || "").trim();
        parsedName = String(parsed.name || parsed.displayName || "").trim();
        parsedPlan = String(parsed.plan || parsed.planType || "").trim();
        parsedInstitution = String(parsed.institution || "").trim();
        parsedGrade = String(parsed.grade || "").trim();
        parsedPhone = String(parsed.phone || parsed.phoneNumber || "").trim();
        isVerifiedSjCardQr =
          (parsed.app === "SJ Tutor AI" || Boolean(parsed.verified)) &&
          Boolean(parsedId || parsedUid || parsedEmail);
      } catch {
        // use raw
      }
    }

    const cleanId = parsedId.trim();
    const upperId = cleanId.toUpperCase();
    const cleanEmail = parsedEmail.trim().toLowerCase();
    const emailToSearch = cleanEmail || (cleanId.includes("@") ? cleanId.toLowerCase() : "");

    let foundUserDoc: any = null;
    let foundUserId = "";

    // 1. Check direct doc in Firestore by parsedUid or cleanId
    const directCandidates = Array.from(new Set([parsedUid, cleanId].filter((v) => v && !v.includes("/"))));
    for (const candidateUid of directCandidates) {
      if (foundUserDoc) break;
      try {
        const directSnap = await safeGetDocWithTimeout(doc(db, "users", candidateUid), 3500);
        if (directSnap && directSnap.exists()) {
          foundUserDoc = directSnap.data();
          foundUserId = directSnap.id;
        }
      } catch (err) {
        console.warn("Direct Firestore doc lookup error:", err);
      }
    }

    // 2. Check sj_tutor_ids lookup table (case-insensitive via uppercase doc key)
    if (!foundUserDoc && upperId && !upperId.includes("/")) {
      try {
        const idMapSnap = await safeGetDocWithTimeout(doc(db, "sj_tutor_ids", upperId), 3500);
        if (idMapSnap && idMapSnap.exists()) {
          const mapData = idMapSnap.data() || {};
          const mappedUid = mapData.userId || mapData.uid;
          if (mappedUid) {
            const linkedUserSnap = await safeGetDocWithTimeout(doc(db, "users", mappedUid), 3500);
            if (linkedUserSnap && linkedUserSnap.exists()) {
              foundUserDoc = linkedUserSnap.data();
              foundUserId = linkedUserSnap.id;
            } else {
              foundUserDoc = {
                uid: mappedUid,
                sjTutorId: mapData.sjTutorId || upperId,
                registrationNumber: mapData.sjTutorId || upperId,
                displayName: mapData.displayName || parsedName || "Student",
                email: mapData.email || emailToSearch || "",
                phoneNumber: mapData.phoneNumber || parsedPhone || "",
              };
              foundUserId = mappedUid;
            }
          }
        }
      } catch (err) {
        console.warn("Firestore sj_tutor_ids lookup error:", err);
      }
    }

    // 3. Query Firestore users collection by sjTutorId, registrationNumber, studentId (exact + uppercase)
    const idVariants = Array.from(new Set([cleanId, upperId].filter(Boolean)));
    const lookupFields = ["sjTutorId", "registrationNumber", "studentId"] as const;
    for (const field of lookupFields) {
      if (foundUserDoc) break;
      for (const variant of idVariants) {
        if (foundUserDoc) break;
        try {
          const q = query(collection(db, "users"), where(field, "==", variant));
          const snap = await Promise.race([
            getDocs(q),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
          ]);
          if (snap && !snap.empty) {
            foundUserDoc = snap.docs[0].data();
            foundUserId = snap.docs[0].id;
          }
        } catch (err) {
          console.warn(`Firestore query by ${field} error:`, err);
        }
      }
    }

    // 4. Query Firestore by email
    if (!foundUserDoc && emailToSearch) {
      try {
        const q = query(collection(db, "users"), where("email", "==", emailToSearch));
        const snap = await Promise.race([
          getDocs(q),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
        ]);
        if (snap && !snap.empty) {
          foundUserDoc = snap.docs[0].data();
          foundUserId = snap.docs[0].id;
        }
      } catch (err) {
        console.warn("Firestore query by email error:", err);
      }
    }

    // 5. Check server API fallback / seeded accounts
    if (!foundUserDoc) {
      try {
        const serverRes = await fetch("/api/auth/login-with-id-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: cleanId, email: emailToSearch, raw }),
        });
        if (serverRes.ok) {
          const serverData = await safeParseAuthJson(serverRes);
          if (serverData.user) {
            foundUserDoc = serverData.user;
            foundUserId = serverData.user.uid || serverData.user.userId || cleanId;
          }
        }
      } catch (serverErr) {
        console.warn("Server ID card lookup error:", serverErr);
      }
    }

    // 6. Check local cached profiles (works seamlessly offline or for recently generated SJ ID cards!)
    if (!foundUserDoc && typeof localStorage !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith("profile_")) continue;
          const itemRaw = localStorage.getItem(key);
          if (!itemRaw) continue;
          const prof = JSON.parse(itemRaw);
          if (!prof || typeof prof !== "object") continue;
          const profSjId = String(prof.sjTutorId || "").toUpperCase();
          const profReg = String(prof.registrationNumber || "").toUpperCase();
          const profEmail = String(prof.email || "").toLowerCase();
          const profUid = String(prof.uid || key.replace("profile_", ""));
          if (
            (upperId && (profSjId === upperId || profReg === upperId)) ||
            (parsedUid && profUid === parsedUid) ||
            (cleanId && profUid === cleanId) ||
            (emailToSearch && profEmail === emailToSearch)
          ) {
            foundUserDoc = prof;
            foundUserId = profUid;
            break;
          }
        }
      } catch {
        // ignore localStorage scan error
      }
    }

    // 7. Fallback seed for target accounts
    if (
      !foundUserDoc &&
      (emailToSearch === "sadanandj2011@gmail.com" ||
        upperId === "SJTA-ACHIEVER01" ||
        cleanId === "sadanand_uid_achiever" ||
        parsedUid === "sadanand_uid_achiever")
    ) {
      foundUserId = "sadanand_uid_achiever";
      foundUserDoc = {
        uid: "sadanand_uid_achiever",
        displayName: "Sadanand J",
        name: "Sadanand J",
        email: "sadanandj2011@gmail.com",
        sjTutorId: "SJTA-ACHIEVER01",
        registrationNumber: "SJTA-ACHIEVER01",
        planType: "Achiever",
        credits: 99999,
        institution: "SJ Tutor AI Academy",
        grade: "Class 10",
        role: "student",
        hasCompletedOnboarding: true,
        isRegisteredInFirestore: true,
      };
      setDoc(doc(db, "users", foundUserId), foundUserDoc, { merge: true }).catch(() => {});
    }

    if (
      !foundUserDoc &&
      (emailToSearch === "channabasavajyoti@gmail.com" ||
        upperId === "SJTA-ACHIEVER02" ||
        cleanId === "NL2WojxLh4UNN5tnFiWeJz3EAge2" ||
        parsedUid === "NL2WojxLh4UNN5tnFiWeJz3EAge2")
    ) {
      foundUserId = "NL2WojxLh4UNN5tnFiWeJz3EAge2";
      foundUserDoc = {
        uid: "NL2WojxLh4UNN5tnFiWeJz3EAge2",
        displayName: "Channabasava Jyoti",
        name: "Channabasava Jyoti",
        email: "channabasavajyoti@gmail.com",
        sjTutorId: "SJTA-ACHIEVER02",
        registrationNumber: "SJTA-ACHIEVER02",
        planType: "Achiever",
        credits: 99999,
        institution: "Jss Vidyagiri Dwd",
        grade: "6th Grade",
        role: "student",
        hasCompletedOnboarding: true,
        isRegisteredInFirestore: true,
      };
      setDoc(doc(db, "users", foundUserId), foundUserDoc, { merge: true }).catch(() => {});
    }

    // 8. Verified SJ Tutor AI ID Card QR payload hydration fallback (if scanned directly from an exported SJ ID card while offline/unindexed)
    if (!foundUserDoc && isVerifiedSjCardQr && (parsedUid || cleanId) && (parsedName || emailToSearch)) {
      foundUserId = parsedUid || `sjcard_${upperId.replace(/[^A-Z0-9_-]/g, "")}`;
      foundUserDoc = {
        uid: foundUserId,
        displayName: parsedName || "Student",
        name: parsedName || "Student",
        email: emailToSearch,
        sjTutorId: upperId || foundUserId,
        registrationNumber: upperId || foundUserId,
        institution: parsedInstitution || "SJ Tutor AI Academy",
        grade: parsedGrade || "10th Grade",
        phoneNumber: parsedPhone || "",
        planType: parsedPlan || "Scholar",
        credits: parsedPlan === "Achiever" ? 99999 : 2000,
        hasCompletedOnboarding: true,
        isRegisteredInFirestore: true,
      };
    }

    if (!foundUserDoc) {
      return {
        success: false,
        status: "ACCOUNT_NOT_FOUND",
        message: `No active student account found for "${cleanId || emailToSearch}". Please check your SJ Tutor ID Card number, email, or register first.`,
      };
    }

    // Apply latest membership / VIP plan rules
    const effectiveEmail = (foundUserDoc.email || emailToSearch || "").toLowerCase();
    const membership = getMembershipByEmail(effectiveEmail);

    // Fetch and merge streak details from Firestore streaks collection
    let streakCount = Number(foundUserDoc.streak ?? foundUserDoc.currentStreak ?? 0);
    let longestStreak = Number(foundUserDoc.highestStreak ?? foundUserDoc.longestStreak ?? streakCount);
    let lastStudyDate = foundUserDoc.lastStudyDate || null;
    let streakHistory = Array.isArray(foundUserDoc.streakHistory) ? foundUserDoc.streakHistory : [];
    let claimedMilestones = Array.isArray(foundUserDoc.claimedMilestones) ? foundUserDoc.claimedMilestones : [];

    const targetUid = foundUserId || foundUserDoc.uid || foundUserDoc.userId || cleanId;
    try {
      const streakDocSnap = await safeGetDocWithTimeout(doc(db, "streaks", targetUid), 2500);
      if (streakDocSnap && streakDocSnap.exists()) {
        const sData = streakDocSnap.data();
        if (typeof sData.currentStreak === "number") streakCount = Math.max(streakCount, sData.currentStreak);
        if (typeof sData.highestStreak === "number") longestStreak = Math.max(longestStreak, sData.highestStreak);
        if (sData.lastStudyDate) lastStudyDate = sData.lastStudyDate;
        if (Array.isArray(sData.streakHistory)) streakHistory = sData.streakHistory;
        if (Array.isArray(sData.claimedMilestones)) claimedMilestones = sData.claimedMilestones;
      }
    } catch (streakErr) {
      console.warn("Could not query streaks collection in Firestore:", streakErr);
    }

    const resolvedSjId = foundUserDoc.sjTutorId || foundUserDoc.registrationNumber || upperId || cleanId;

    const fullProfile = {
      ...foundUserDoc,
      uid: targetUid,
      displayName: foundUserDoc.displayName || foundUserDoc.name || parsedName || "Student",
      name: foundUserDoc.displayName || foundUserDoc.name || parsedName || "Student",
      email: effectiveEmail,
      photoURL: foundUserDoc.photoURL || null,
      sjTutorId: resolvedSjId,
      registrationNumber: foundUserDoc.registrationNumber || resolvedSjId,
      institution: foundUserDoc.institution || parsedInstitution || "SJ Tutor AI Academy",
      grade: foundUserDoc.grade || foundUserDoc.class || foundUserDoc.classGrade || parsedGrade || "Class 10",
      phoneNumber: foundUserDoc.phoneNumber || parsedPhone || "",
      credits: membership ? Math.max(membership.credits, foundUserDoc.credits || 0) : (foundUserDoc.credits ?? 2000),
      planType: membership ? membership.planType : (foundUserDoc.planType || parsedPlan || "Scholar"),
      role: membership?.role || foundUserDoc.role || "student",
      streak: streakCount,
      currentStreak: streakCount,
      highestStreak: longestStreak,
      longestStreak: longestStreak,
      lastStudyDate: lastStudyDate,
      streakHistory: streakHistory,
      claimedMilestones: claimedMilestones,
      hasCompletedOnboarding: true,
      isRegisteredInFirestore: true,
      lastLoginAt: Date.now(),
    };

    if (membership) {
      fullProfile.planType = membership.planType;
      fullProfile.credits = Math.max(membership.credits, fullProfile.credits || 0);
      fullProfile.hasCompletedOnboarding = true;
    }

    // Keep Firestore updated in background (never block login if offline)
    Promise.allSettled([
      setDoc(doc(db, "users", fullProfile.uid), fullProfile, { merge: true }),
      resolvedSjId && !resolvedSjId.includes("/")
        ? setDoc(
            doc(db, "sj_tutor_ids", resolvedSjId.toUpperCase()),
            {
              sjTutorId: resolvedSjId.toUpperCase(),
              userId: fullProfile.uid,
              displayName: fullProfile.displayName,
              email: fullProfile.email,
              updatedAt: Date.now(),
            },
            { merge: true }
          )
        : Promise.resolve(),
    ]).catch((e) => {
      console.warn("Error updating Firestore on ID card login:", e);
    });

    // Store active session in localStorage
    localStorage.setItem("sjtutor_authenticated_user", JSON.stringify(fullProfile));
    localStorage.setItem(`profile_${fullProfile.uid}`, JSON.stringify(fullProfile));
    localStorage.setItem("sjtutor_active_user", JSON.stringify(fullProfile));

    // Save streak data to localStorage for instant hydration
    try {
      const streakObj = {
        uid: fullProfile.uid,
        currentStreak: streakCount,
        highestStreak: longestStreak,
        lastStudyDate: lastStudyDate,
        totalDaysStudied: streakHistory.length || streakCount,
        streakHistory: streakHistory,
        freezesRemaining: foundUserDoc.freezesRemaining ?? 2,
        claimedMilestones: claimedMilestones,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(`sjtutor_streak_${fullProfile.uid}`, JSON.stringify(streakObj));
    } catch (streakStoreErr) {
      console.warn("Could not save streak to localStorage:", streakStoreErr);
    }

    // Mark login attempt so Two-Step Verification is only checked if configured
    try {
      SecurityPinService.markLoginAttempt(fullProfile.uid);
    } catch (secErr) {
      console.warn("SecurityPinService markLoginAttempt error:", secErr);
    }

    // Dispatch global events for immediate hydration and streak bottom-right reset
    window.dispatchEvent(new Event("sjtutor_user_logged_in"));
    window.dispatchEvent(new Event("sjtutor_auth_changed"));

    return {
      success: true,
      status: "SUCCESS",
      user: fullProfile,
      message: `Account verified! Welcome back, ${fullProfile.displayName}.`,
    };
  } catch (error: any) {
    console.error("ID Card login error:", error);
    return {
      success: false,
      status: "ERROR",
      message: error?.message || "An error occurred while finding your account from Firestore.",
    };
  }
}
