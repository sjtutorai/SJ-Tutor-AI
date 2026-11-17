import { db, isFirestoreOfflineError } from "../firebaseConfig";
import { doc, getDoc, getDocFromCache, setDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";

/**
 * Helper to get predefined membership & credits by email
 */
export const getMembershipByEmail = (email?: string | null) => {
  const normalized = email?.toLowerCase().trim() || "";
  if (normalized === "sjtutorai@gmail.com") {
    return {
      planType: "Achiever" as const,
      credits: 99999,
      role: "admin",
      hasCompletedOnboarding: true,
    };
  }
  if (normalized === "sadanandj2011@gmail.com") {
    return {
      planType: "Achiever" as const,
      credits: 99999,
      role: "student",
      hasCompletedOnboarding: true,
    };
  }
  if (normalized === "channabasavajyoti@gmail.com") {
    return {
      planType: "Achiever" as const,
      credits: 99999,
      role: "student",
      hasCompletedOnboarding: true,
    };
  }
  if (normalized === "krishay5712@gmail.com") {
    return {
      planType: "Scholar" as const,
      credits: 2000,
      role: "student",
      hasCompletedOnboarding: true,
    };
  }
  return null;
};

/**
 * Creates a new user profile in Firestore
 * @param user The Firebase Auth user object
 * @param initialData Optional initial profile data (e.g. language)
 */
export const createUserProfile = async (user: User, initialData?: Partial<any>) => {
  const membership = getMembershipByEmail(user.email);
  const userRef = doc(db, "users", user.uid);
  const newProfile = {
    uid: user.uid,
    name: user.displayName || initialData?.displayName || "",
    displayName: user.displayName || initialData?.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || initialData?.photoURL || "",
    provider: user.providerData[0]?.providerId || "password",
    class: "",
    language: initialData?.language || "English",
    role: membership?.role || "student",
    phoneNumber: user.phoneNumber || "",
    hasCompletedOnboarding: membership ? true : false,
    streak: 0,
    totalStudyTime: 0,
    points: 0,
    credits: membership ? membership.credits : 100,
    planType: membership ? membership.planType : "Free",
    trialStartDate: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    isActive: true,
    ...initialData,
  };

  try {
    localStorage.setItem(`profile_${user.uid}`, JSON.stringify(newProfile));
  } catch (err) {
    console.debug("Local profile cache write notice:", err);
  }

  try {
    await setDoc(userRef, newProfile, { merge: true });
    return newProfile;
  } catch (error) {
    if (isFirestoreOfflineError(error)) {
      console.warn("Creating user profile deferred to offline cache:", (error as Error)?.message || error);
      return newProfile;
    }
    console.warn("Error creating user profile in Firestore:", error);
    return newProfile;
  }
};

/**
 * Updates an existing user profile in Firestore
 * @param uid The user's UID
 * @param data The data to update
 */
export const updateUserProfile = async (uid: string, data: Partial<any>) => {
  // Remove undefined values to avoid Firestore serialization errors
  const cleaned = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );

  // Keep local cache in sync immediately
  try {
    const currentRaw = localStorage.getItem(`profile_${uid}`);
    const current = currentRaw ? JSON.parse(currentRaw) : {};
    localStorage.setItem(`profile_${uid}`, JSON.stringify({ ...current, ...cleaned }));
  } catch (err) {
    console.debug("Local profile cache write notice:", err);
  }

  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        ...cleaned,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    if (isFirestoreOfflineError(error)) {
      console.warn("Updating user profile deferred (offline mode):", (error as Error)?.message || error);
      return;
    }
    console.warn("Error updating user profile in Firestore:", error);
    throw error;
  }
};

/**
 * Gets the current user profile from Firestore, creating it if it doesn't exist.
 * Also updates lastLoginAt and basic profile info on every login.
 * Seamlessly leverages local storage cache to eliminate blank/empty profile states.
 * @param user The Firebase Auth user object
 */
export const getCurrentUserProfile = async (user: User) => {
  // Read local cache immediately to ensure instant display & offline resilience
  let cachedProfile: any = null;
  try {
    const local = localStorage.getItem(`profile_${user.uid}`);
    if (local) {
      cachedProfile = JSON.parse(local);
    }
  } catch (e) {
    console.warn("Failed reading cached profile:", e);
  }

  const membership = getMembershipByEmail(user.email);

  const buildFallbackProfile = () => {
    if (cachedProfile) {
      return {
        ...cachedProfile,
        uid: user.uid,
        email: cachedProfile.email || user.email || "",
        displayName: cachedProfile.displayName || cachedProfile.name || user.displayName || "",
        name: cachedProfile.name || cachedProfile.displayName || user.displayName || "",
        photoURL: cachedProfile.photoURL || user.photoURL || "",
      };
    }
    const synthesized = {
      uid: user.uid,
      name: user.displayName || "",
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      credits: membership ? membership.credits : 100,
      planType: membership ? membership.planType : "Free",
      hasCompletedOnboarding: membership ? true : false,
      role: membership?.role || "student",
      trialStartDate: Date.now(),
    };
    try {
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(synthesized));
    } catch {
      // Ignore storage quota issues
    }
    return synthesized;
  };

  const fetchProfileFromDb = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      let docSnap;
      try {
        docSnap = await getDoc(userRef);
      } catch (readErr) {
        if (isFirestoreOfflineError(readErr)) {
          try {
            docSnap = await getDocFromCache(userRef);
          } catch {
            return buildFallbackProfile();
          }
        } else {
          throw readErr;
        }
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data();
        const trialStartDate = data.trialStartDate || Date.now();
        const planType = membership 
          ? membership.planType 
          : (data.planType || "Free");
        const credits = membership 
          ? Math.max(membership.credits, data.credits || membership.credits) 
          : (data.credits ?? 100);

        // Background update login info without blocking profile return
        try {
          const updatePayload: Record<string, any> = {
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            name: data.displayName || data.name || user.displayName || "",
            displayName: data.displayName || data.name || user.displayName || "",
            email: data.email || user.email || "",
            photoURL: data.photoURL || user.photoURL || "",
          };
          if (membership) {
            updatePayload.planType = membership.planType;
            updatePayload.credits = credits;
            if (membership.role) updatePayload.role = membership.role;
            updatePayload.hasCompletedOnboarding = true;
          }
          if (!data.trialStartDate) {
            updatePayload.trialStartDate = trialStartDate;
          }
          // Filter out any undefined values
          const cleanedPayload = Object.fromEntries(
            Object.entries(updatePayload).filter(([, v]) => v !== undefined)
          );
          setDoc(userRef, cleanedPayload, { merge: true }).catch((err) => {
            console.debug("Background update login info notice:", err);
          });
        } catch (updateError) {
          console.debug("Error preparing user login update:", updateError);
        }

        const fullProfile = {
          ...data,
          planType,
          credits,
          trialStartDate,
          uid: user.uid,
          name: data.displayName || data.name || user.displayName || "",
          displayName: data.displayName || data.name || user.displayName || "",
          email: data.email || user.email || "",
          photoURL: data.photoURL || user.photoURL || "",
          isRegisteredInFirestore: true,
          hasCompletedOnboarding: membership ? true : (data.hasCompletedOnboarding ?? true),
        };

        // Cache the complete, hydrated profile
        try {
          localStorage.setItem(`profile_${user.uid}`, JSON.stringify(fullProfile));
        } catch (err) {
          console.debug("Profile localStorage cache write notice:", err);
        }

        return fullProfile;
      } else {
        // Create new profile
        const newProfile = await createUserProfile(user);
        const res = {
          ...newProfile,
          isRegisteredInFirestore: false,
        };
        try {
          localStorage.setItem(`profile_${user.uid}`, JSON.stringify(res));
        } catch (err) {
          console.debug("New profile localStorage cache write notice:", err);
        }
        return res;
      }
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        console.warn("User profile loaded from local cache (client is offline).");
      } else {
        console.warn("Could not fetch user profile from Firestore, using local cache:", error);
      }
      return buildFallbackProfile();
    }
  };

  // If we already have a cached profile with rich data, return it if the network takes longer than 2.5s,
  // while still letting the background fetch refresh the cache and sync.
  if (cachedProfile && (cachedProfile.displayName || cachedProfile.class || cachedProfile.sjTutorId)) {
    const timeoutFallback = new Promise<any>((resolve) => {
      setTimeout(() => {
        resolve(cachedProfile);
      }, 2500);
    });
    return Promise.race([fetchProfileFromDb(), timeoutFallback]);
  }

  // Otherwise wait for Firestore to respond
  return fetchProfileFromDb();
};

