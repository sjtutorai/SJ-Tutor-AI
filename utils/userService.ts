import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { removeUndefinedFields } from "./firebaseUtils";

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
  if (normalized === "sadanandj2011@gmail.com" || normalized === "krishay5712@gmail.com") {
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
 * Checks if a user is registered in Firestore.
 * A user is considered registered if:
 * 1. A document exists in the "users" collection for their UID, and has completed onboarding or has profile details.
 * 2. Or if their email is already linked to a registered profile in Firestore.
 * 3. Or if their email is one of the predefined administrative accounts (sjtutorai@gmail.com, etc.).
 */
export const checkUserRegistrationStatus = async (user: User | { uid: string; email?: string | null }): Promise<{
  isRegistered: boolean;
  profile?: any;
}> => {
  try {
    const userEmail = user.email?.toLowerCase().trim() || "";

    // 1. Predefined admin/scholar accounts are automatically recognized
    const membership = getMembershipByEmail(userEmail);
    if (membership) {
      return {
        isRegistered: true,
        profile: {
          uid: user.uid,
          email: userEmail,
          planType: membership.planType,
          credits: membership.credits,
          role: membership.role,
          isRegisteredInFirestore: true,
          hasCompletedOnboarding: true,
        }
      };
    }

    // 2. Direct UID check in "users" collection
    if (user.uid) {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const hasCompleted = data.hasCompletedOnboarding === true || 
                             data.isRegisteredInFirestore === true ||
                             Boolean(data.registrationNumber || data.sjTutorId) ||
                             Boolean(data.displayName && (data.grade || data.class || data.institution));
        if (hasCompleted) {
          return {
            isRegistered: true,
            profile: {
              ...data,
              uid: user.uid,
              isRegisteredInFirestore: true,
              hasCompletedOnboarding: true,
            }
          };
        }
      }
    }

    // 3. Query by email in "users" collection
    if (userEmail) {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userEmail));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const matchedDoc = querySnap.docs[0];
        const data = matchedDoc.data();
        const hasCompleted = data.hasCompletedOnboarding === true || 
                             data.isRegisteredInFirestore === true ||
                             Boolean(data.registrationNumber || data.sjTutorId) ||
                             Boolean(data.displayName && (data.grade || data.class || data.institution));
        if (hasCompleted) {
          return {
            isRegistered: true,
            profile: {
              ...data,
              uid: matchedDoc.id,
              isRegisteredInFirestore: true,
              hasCompletedOnboarding: true,
            }
          };
        }
      }
    }

    // 4. Check cached profile in LocalStorage as offline fallback
    if (user.uid) {
      const cachedRaw = localStorage.getItem(`profile_${user.uid}`);
      if (cachedRaw) {
        try {
          const parsed = JSON.parse(cachedRaw);
          if (parsed && (parsed.hasCompletedOnboarding || parsed.isRegisteredInFirestore || parsed.sjTutorId)) {
            return {
              isRegistered: true,
              profile: {
                ...parsed,
                uid: user.uid,
                isRegisteredInFirestore: true,
              }
            };
          }
        } catch {
          // Ignore
        }
      }
    }

    return { isRegistered: false };
  } catch (error) {
    console.error("Error checking user registration in Firestore:", error);
    if (user.email && getMembershipByEmail(user.email)) {
      return { isRegistered: true };
    }
    return { isRegistered: false };
  }
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
    let initialStreak = initialData?.streak || initialData?.currentStreak || 0;
    try {
      const guestStreakRaw = localStorage.getItem('sjtutor_streak_guest');
      if (guestStreakRaw) {
        const parsedGuest = JSON.parse(guestStreakRaw);
        if (parsedGuest && typeof parsedGuest.currentStreak === 'number') {
          initialStreak = Math.max(initialStreak, parsedGuest.currentStreak, parsedGuest.highestStreak || 0);
        }
      }
    } catch (e) {
      console.debug('No saved guest streak found during profile creation:', e);
    }

    const newProfile = {
      uid: user.uid,
      name: user.displayName || initialData?.displayName || "",
      displayName: user.displayName || initialData?.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || initialData?.photoURL || "",
      provider: user.providerData[0]?.providerId || "password",
      class: initialData?.grade || initialData?.class || "",
      grade: initialData?.grade || initialData?.class || "",
      dob: initialData?.dob || "",
      language: initialData?.language || "English",
      role: membership?.role || "student",
      phoneNumber: user.phoneNumber || initialData?.phoneNumber || "",
      hasCompletedOnboarding: true,
      isRegisteredInFirestore: true,
      streak: initialStreak,
      currentStreak: initialStreak,
      highestStreak: initialStreak,
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
    const cleanProfile = removeUndefinedFields(newProfile);
    await setDoc(userRef, cleanProfile);
    return cleanProfile;
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
    const cleanData = removeUndefinedFields({
      ...data,
      updatedAt: serverTimestamp()
    });
    await updateDoc(userRef, cleanData);
  } catch (error) {
    console.error("Error updating user profile in Firestore:", error);
    throw error;
  }
};

/**
 * Gets the current user profile from Firestore.
 * Also updates lastLoginAt and basic profile info on every login.
 * @param user The Firebase Auth user object
 */
export const getCurrentUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    const membership = getMembershipByEmail(user.email);

    if (docSnap.exists()) {
      // Update existing profile
      const data = docSnap.data();
      const trialStartDate = data.trialStartDate || Date.now();
      const planType = membership 
        ? membership.planType 
        : (data.planType || "Free");
      const credits = membership 
        ? Math.max(membership.credits, data.credits || membership.credits) 
        : (data.credits ?? 100);

      try {
        const updatePayload: Record<string, any> = {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          name: user.displayName || data.name || "",
          displayName: user.displayName || data.displayName || data.name || "",
          email: user.email || data.email || "",
          photoURL: user.photoURL || data.photoURL || "",
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
        await updateDoc(userRef, removeUndefinedFields(updatePayload));
      } catch (updateError) {
        console.error("Error updating user login info in Firestore:", updateError);
      }

      return {
        ...data,
        grade: data.grade || data.class || "",
        class: data.class || data.grade || "",
        dob: data.dob || "",
        planType,
        credits,
        trialStartDate,
        uid: user.uid,
        isRegisteredInFirestore: true,
        hasCompletedOnboarding: membership ? true : (data.hasCompletedOnboarding ?? true),
      };
    } else {
      if (membership) {
        // Admin or pre-authorized account
        const newProfile = await createUserProfile(user);
        return {
          ...newProfile,
          isRegisteredInFirestore: true,
          hasCompletedOnboarding: true,
        };
      }

      // Return unregistered profile object without writing incomplete document
      return {
        uid: user.uid,
        name: user.displayName || "",
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        provider: user.providerData[0]?.providerId || "password",
        credits: 100,
        planType: "Free",
        hasCompletedOnboarding: false,
        isRegisteredInFirestore: false,
        role: "student",
      };
    }
  } catch (error) {
    console.error("Error getting user profile from Firestore:", error);
    const membership = getMembershipByEmail(user.email);
    return {
      uid: user.uid,
      name: user.displayName || "",
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      credits: membership ? membership.credits : 100,
      planType: membership ? membership.planType : "Free",
      hasCompletedOnboarding: membership ? true : false,
      isRegisteredInFirestore: false,
      role: membership?.role || "student",
    };
  }
};
