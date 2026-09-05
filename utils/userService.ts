import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
  try {
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
    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (error) {
    console.error("Error creating user profile in Firestore:", error);
    throw error;
  }
};

/**
 * Updates an existing user profile in Firestore
 * @param uid The user's UID
 * @param data The data to update
 */
export const updateUserProfile = async (uid: string, data: Partial<any>) => {
  try {
    const userRef = doc(db, "users", uid);
    // Remove undefined values to avoid Firestore serialization errors
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    await updateDoc(userRef, {
      ...cleaned,
      updatedAt: serverTimestamp()
    });
    // Keep local cache in sync
    try {
      const currentRaw = localStorage.getItem(`profile_${uid}`);
      const current = currentRaw ? JSON.parse(currentRaw) : {};
      localStorage.setItem(`profile_${uid}`, JSON.stringify({ ...current, ...cleaned }));
    } catch (err) {
      console.debug("Local profile cache write notice:", err);
    }
  } catch (error) {
    console.error("Error updating user profile in Firestore:", error);
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

  const fetchProfileFromDb = async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
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
          updateDoc(userRef, cleanedPayload).catch((err) => {
            console.warn("Background update login info warning:", err);
          });
        } catch (updateError) {
          console.warn("Error preparing user login update:", updateError);
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
      console.error("Error getting user profile from Firestore:", error);
      if (cachedProfile) {
        return cachedProfile;
      }
      return {
        uid: user.uid,
        name: user.displayName || "",
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        credits: membership ? membership.credits : 100,
        planType: membership ? membership.planType : "Free",
        hasCompletedOnboarding: membership ? true : false,
        role: membership?.role || "student",
      };
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
