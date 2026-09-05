import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  getAdditionalUserInfo,
} from "firebase/auth";
import {
  doc,
  getDoc,
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
import { getMembershipByEmail } from "../utils/userService";
import type { AuthProviderType } from "../types";

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
      const data = await response.json();
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
    return await res.json();
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
  mode: "signin" | "signup"
): Promise<AuthResult> {
  const provider =
    providerType === "google"
      ? googleProvider
      : providerType === "apple"
      ? appleProvider
      : providerType === "yahoo"
      ? yahooProvider
      : githubProvider;

  try {
    const userCred = await signInWithPopup(auth, provider);
    const currentUser = userCred.user;
    const additionalInfo = getAdditionalUserInfo(userCred);

    // Check if user document already exists in Firestore or server
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    const existingFirestoreAccount = userDocSnap.exists();
    const isNew = additionalInfo?.isNewUser ?? !existingFirestoreAccount;

    const identityKey = `${providerType}_${currentUser.uid}`;
    const identityDoc = await getDoc(doc(db, "linked_identities", identityKey));

    let serverExists = false;
    if (currentUser.email) {
      serverExists = await checkIdentityExists({ email: currentUser.email, provider: providerType, identifier: currentUser.uid });
    }

    const isRegistered = existingFirestoreAccount || identityDoc.exists() || serverExists || (!isNew && userDocSnap.data()?.sjTutorId);

    // ----------------------------------------------------
    // CASE A: User is in SIGN UP mode, but account ALREADY exists!
    // ----------------------------------------------------
    if (mode === "signup" && isRegistered) {
      console.warn(`[AUTH] Account already exists for ${providerType} (${currentUser.email || currentUser.uid})`);
      await signOut(auth);
      return {
        status: "ACCOUNT_ALREADY_EXISTS",
        message: "This account is already registered with SJ Tutor AI. Please try logging in instead.",
      };
    }

    // ----------------------------------------------------
    // CASE B: User is in LOGIN mode, but account does NOT exist!
    // ----------------------------------------------------
    if (mode === "signin" && !isRegistered) {
      console.warn(`[AUTH] Account not found for ${providerType} (${currentUser.email || currentUser.uid})`);
      await signOut(auth);
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
    const profileData = userDocSnap.data() || {};
    return {
      status: "SUCCESS",
      user: { ...currentUser, ...profileData },
      message: "Welcome back to SJ Tutor AI!",
    };
  } catch (error: any) {
    console.error(`Error during ${providerType} auth (${mode}):`, error);

    if (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request") {
      return {
        status: "ERROR",
        message: "Sign-in was cancelled.",
        error,
      };
    }

    if (error.code === "auth/account-exists-with-different-credential") {
      return {
        status: "ACCOUNT_ALREADY_EXISTS",
        message: "This email is already associated with another login provider. Please log in with your original method.",
        error,
      };
    }

    return {
      status: "ERROR",
      message: error.message || "Authentication failed. Please try again.",
      error,
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
export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const user = cred.user;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      await signOut(auth);
      return {
        status: "ACCOUNT_NOT_FOUND",
        message: "We couldn't find an SJ Tutor AI account associated with this login. Please try signing up first.",
      };
    }

    return {
      status: "SUCCESS",
      user: { ...user, ...userDoc.data() },
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
  authIdentity: any;
  firstName: string;
  lastName: string;
  username: string;
  photoURL?: string;
  classGrade?: string;
  subjects?: string[];
  learningPreferences?: string[];
  preferredLanguage?: string;
}): Promise<AuthResult> {
  try {
    let authUid = params.authIdentity?.uid;
    const email = params.authIdentity?.email || "";
    const provider = params.authIdentity?.provider || "email_password";
    const initialPassword = params.authIdentity?.password;

    // If email_password and user not yet created in Firebase
    if (provider === "email_password" && !authUid && email && initialPassword) {
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
      } catch (fbErr: any) {
        if (fbErr.code === "auth/email-already-in-use") {
          return {
            status: "ACCOUNT_ALREADY_EXISTS",
            message: "This account is already registered with SJ Tutor AI. Please try logging in instead.",
          };
        }
        console.warn("Firebase Auth creation notice:", fbErr);
      }
    }

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
        photoURL: params.photoURL,
        classGrade: params.classGrade,
        subjects: params.subjects,
        learningPreferences: params.learningPreferences,
        preferredLanguage: params.preferredLanguage || "English",
        initialPassword,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (data.error === "ACCOUNT_ALREADY_EXISTS") {
        return {
          status: "ACCOUNT_ALREADY_EXISTS",
          message: data.message || "This account is already registered with SJ Tutor AI. Please try logging in instead.",
        };
      }
      return {
        status: "ERROR",
        message: data.message || "Failed to create account",
      };
    }

    const generatedId = data.sjTutorId;
    const finalUid = data.user?.uid || authUid || `sjta_${generatedId.toLowerCase()}`;

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
          photoURL: params.photoURL || "",
          grade: params.classGrade || "",
          classGrade: params.classGrade || "",
          subjects: params.subjects || [],
          learningStyle: (params.learningPreferences || []).join(", "),
          learningPreferences: params.learningPreferences || [],
          preferredLanguage: params.preferredLanguage || "English",
          credits: 100,
          planType: "Free",
          hasCompletedOnboarding: true,
          twoFactorEnabled: true,
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
        twoStepEnabled: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
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
      },
      message: "Your SJ Tutor AI account has been successfully created!",
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

    const data = await response.json();
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

    const data = await response.json();

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

    const data = await response.json();

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
    const data = await response.json();
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
    const data = await response.json();
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
    const data = await res.json();
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
  try {
    await signOut(auth);
  } catch (e) {
    console.warn("Firebase signOut error:", e);
  }
  localStorage.removeItem("sjtutor_authenticated_user");
  window.dispatchEvent(new Event("sjtutor_auth_changed"));
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
    let parsedEmail = "";
    let parsedName = "";
    let parsedPlan = "";
    let parsedInstitution = "";
    let parsedGrade = "";
    let parsedPhone = "";

    // If QR payload is JSON from the ID Card QR code
    if (raw.startsWith("{") && raw.endsWith("}")) {
      try {
        const parsed = JSON.parse(raw);
        parsedId = parsed.id || parsed.sjTutorId || parsed.uid || raw;
        parsedEmail = parsed.email || "";
        parsedName = parsed.name || parsed.displayName || "";
        parsedPlan = parsed.plan || parsed.planType || "";
        parsedInstitution = parsed.institution || "";
        parsedGrade = parsed.grade || "";
        parsedPhone = parsed.phone || parsed.phoneNumber || "";
      } catch {
        // use raw
      }
    }

    const cleanId = parsedId.trim();
    const cleanEmail = parsedEmail.trim().toLowerCase();

    let foundUserDoc: any = null;
    let foundUserId = "";

    // 1. Check direct doc in Firestore: doc(db, "users", cleanId)
    try {
      if (cleanId) {
        const directSnap = await getDoc(doc(db, "users", cleanId));
        if (directSnap.exists()) {
          foundUserDoc = directSnap.data();
          foundUserId = directSnap.id;
        }
      }
    } catch (err) {
      console.warn("Direct Firestore doc lookup error:", err);
    }

    // 2. Query Firestore users collection by sjTutorId
    if (!foundUserDoc && cleanId) {
      try {
        const q = query(collection(db, "users"), where("sjTutorId", "==", cleanId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundUserDoc = snap.docs[0].data();
          foundUserId = snap.docs[0].id;
        }
      } catch (err) {
        console.warn("Firestore query by sjTutorId error:", err);
      }
    }

    // 3. Query Firestore by registrationNumber
    if (!foundUserDoc && cleanId) {
      try {
        const q = query(collection(db, "users"), where("registrationNumber", "==", cleanId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundUserDoc = snap.docs[0].data();
          foundUserId = snap.docs[0].id;
        }
      } catch (err) {
        console.warn("Firestore query by registrationNumber error:", err);
      }
    }

    // 4. Query Firestore by studentId
    if (!foundUserDoc && cleanId) {
      try {
        const q = query(collection(db, "users"), where("studentId", "==", cleanId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundUserDoc = snap.docs[0].data();
          foundUserId = snap.docs[0].id;
        }
      } catch (err) {
        console.warn("Firestore query by studentId error:", err);
      }
    }

    // 5. Query Firestore by email
    const emailToSearch = cleanEmail || (cleanId.includes("@") ? cleanId.toLowerCase() : "");
    if (!foundUserDoc && emailToSearch) {
      try {
        const q = query(collection(db, "users"), where("email", "==", emailToSearch));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundUserDoc = snap.docs[0].data();
          foundUserId = snap.docs[0].id;
        }
      } catch (err) {
        console.warn("Firestore query by email error:", err);
      }
    }

    // 6. Check server API fallback / seeded accounts
    if (!foundUserDoc) {
      try {
        const serverRes = await fetch("/api/auth/login-with-id-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: cleanId, email: emailToSearch, raw }),
        });
        if (serverRes.ok) {
          const serverData = await serverRes.json();
          if (serverData.user) {
            foundUserDoc = serverData.user;
            foundUserId = serverData.user.uid || cleanId;
          }
        }
      } catch (serverErr) {
        console.warn("Server ID card lookup error:", serverErr);
      }
    }

    // Fallback seed for target account (e.g. sadanandj2011@gmail.com / SJTA-ACHIEVER01)
    if (!foundUserDoc && (emailToSearch === "sadanandj2011@gmail.com" || cleanId.toUpperCase() === "SJTA-ACHIEVER01" || cleanId === "sadanand_uid_achiever")) {
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
      try {
        await setDoc(doc(db, "users", foundUserId), foundUserDoc, { merge: true });
      } catch (e) {
        console.warn("Error seeding found account to Firestore:", e);
      }
    }

    if (!foundUserDoc) {
      return {
        success: false,
        status: "ACCOUNT_NOT_FOUND",
        message: `No active student account found in Firestore for "${cleanId || emailToSearch}". Please check the ID Card or register first.`,
      };
    }

    // Apply latest membership / VIP plan rules (e.g. Achiever for sadanandj2011@gmail.com)
    const effectiveEmail = (foundUserDoc.email || emailToSearch || "").toLowerCase();
    const membership = getMembershipByEmail(effectiveEmail);

    // Fetch and merge streak details from Firestore streaks collection
    let streakCount = Number(foundUserDoc.streak ?? foundUserDoc.currentStreak ?? 0);
    let longestStreak = Number(foundUserDoc.highestStreak ?? foundUserDoc.longestStreak ?? streakCount);
    let lastStudyDate = foundUserDoc.lastStudyDate || null;
    let streakHistory = Array.isArray(foundUserDoc.streakHistory) ? foundUserDoc.streakHistory : [];
    let claimedMilestones = Array.isArray(foundUserDoc.claimedMilestones) ? foundUserDoc.claimedMilestones : [];

    const targetUid = foundUserId || foundUserDoc.uid || cleanId;
    try {
      const streakDocSnap = await getDoc(doc(db, "streaks", targetUid));
      if (streakDocSnap.exists()) {
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

    const fullProfile = {
      uid: targetUid,
      displayName: foundUserDoc.displayName || foundUserDoc.name || parsedName || "Student",
      name: foundUserDoc.displayName || foundUserDoc.name || parsedName || "Student",
      email: effectiveEmail,
      photoURL: foundUserDoc.photoURL || null,
      sjTutorId: foundUserDoc.sjTutorId || cleanId,
      registrationNumber: foundUserDoc.registrationNumber || foundUserDoc.sjTutorId || cleanId,
      institution: foundUserDoc.institution || parsedInstitution || "SJ Tutor AI Academy",
      grade: foundUserDoc.grade || foundUserDoc.class || parsedGrade || "Class 10",
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
      ...foundUserDoc,
    };

    // Ensure streak values override any old/zero values in foundUserDoc
    fullProfile.streak = streakCount;
    fullProfile.currentStreak = streakCount;
    fullProfile.highestStreak = longestStreak;
    fullProfile.longestStreak = longestStreak;
    fullProfile.lastStudyDate = lastStudyDate;
    fullProfile.streakHistory = streakHistory;
    fullProfile.claimedMilestones = claimedMilestones;

    if (membership) {
      fullProfile.planType = membership.planType;
      fullProfile.credits = Math.max(membership.credits, fullProfile.credits || 0);
      fullProfile.hasCompletedOnboarding = true;
    }

    // Keep Firestore updated with fullProfile
    try {
      await setDoc(doc(db, "users", fullProfile.uid), fullProfile, { merge: true });
    } catch (e) {
      console.warn("Error updating Firestore on ID card login:", e);
    }

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

    // Mark login attempt so Two-Step Verification is strictly enforced upon login
    try {
      SecurityPinService.markLoginAttempt(fullProfile.uid);
    } catch (secErr) {
      console.warn("SecurityPinService markLoginAttempt error:", secErr);
    }

    // Dispatch global event for immediate hydration
    window.dispatchEvent(new Event("sjtutor_auth_changed"));

    return {
      success: true,
      status: "SUCCESS",
      user: fullProfile,
      message: `Account found in Firestore! Welcome back, ${fullProfile.displayName}.`,
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
