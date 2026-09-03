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
    const membership = getMembershipByEmail(userEmail);

    // 1. Direct UID check in "users" collection
    if (user.uid) {
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const hasCompleted = data.hasCompletedOnboarding === true || 
                             data.isRegisteredInFirestore === true ||
                             Boolean(data.registrationNumber || data.sjTutorId) ||
                             Boolean(data.displayName && (data.grade || data.class || data.institution)) ||
                             Boolean(membership);
        if (hasCompleted || membership) {
          const resolvedDob = data.dob || data.dateOfBirth || data.birthDate || "";
          return {
            isRegistered: true,
            profile: {
              ...data,
              dob: resolvedDob,
              dateOfBirth: resolvedDob,
              uid: user.uid,
              email: userEmail || data.email || "",
              planType: membership ? membership.planType : (data.planType || "Free"),
              credits: membership ? Math.max(membership.credits, data.credits || membership.credits) : (data.credits ?? 100),
              role: membership ? membership.role : (data.role || "student"),
              isRegisteredInFirestore: true,
              hasCompletedOnboarding: true,
            }
          };
        }
      }
    }

    // 2. Query by email in "users" collection
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
                             Boolean(data.displayName && (data.grade || data.class || data.institution)) ||
                             Boolean(membership);
        if (hasCompleted || membership) {
          const resolvedDob = data.dob || data.dateOfBirth || data.birthDate || "";
          return {
            isRegistered: true,
            profile: {
              ...data,
              dob: resolvedDob,
              dateOfBirth: resolvedDob,
              uid: matchedDoc.id,
              email: userEmail || data.email || "",
              planType: membership ? membership.planType : (data.planType || "Free"),
              credits: membership ? Math.max(membership.credits, data.credits || membership.credits) : (data.credits ?? 100),
              role: membership ? membership.role : (data.role || "student"),
              isRegisteredInFirestore: true,
              hasCompletedOnboarding: true,
            }
          };
        }
      }
    }

    // 3. Predefined admin/scholar accounts without prior Firestore document
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

    const resolvedDob = initialData?.dob || initialData?.dateOfBirth || (initialData as any)?.birthDate || "";
    const newProfile = {
      uid: user.uid,
      name: user.displayName || initialData?.displayName || "",
      displayName: user.displayName || initialData?.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || initialData?.photoURL || "",
      provider: user.providerData[0]?.providerId || "password",
      class: initialData?.grade || initialData?.class || "",
      grade: initialData?.grade || initialData?.class || "",
      dob: resolvedDob,
      dateOfBirth: resolvedDob,
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
 * Robustly checks by UID, falls back to email query or local cache,
 * and preserves all personal details on login without overwriting them.
 * @param user The Firebase Auth user object
 */
export const getCurrentUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    const membership = getMembershipByEmail(user.email);

    let data: any = null;

    if (docSnap.exists()) {
      data = docSnap.data();
    } else if (user.email) {
      // Fallback: Query by email in case document is registered with a different key (e.g., ID-based)
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", user.email.toLowerCase().trim()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          data = snap.docs[0].data();
        }
      } catch (qErr) {
        console.warn("Could not query user by email in Firestore:", qErr);
      }
    }

    // Secondary fallback: Check cached profile in localStorage if Firestore is slow or doc is offline
    if (!data) {
      try {
        const cachedRaw = localStorage.getItem(`profile_${user.uid}`) || localStorage.getItem('sjtutor_user_profile');
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (parsed && (parsed.displayName || parsed.grade || parsed.institution || parsed.phoneNumber || parsed.isRegisteredInFirestore)) {
            data = parsed;
          }
        }
      } catch (cacheErr) {
        console.debug("Error reading cached profile:", cacheErr);
      }
    }

    if (data) {
      // Existing profile found
      const trialStartDate = data.trialStartDate || Date.now();
      const planType = membership 
        ? membership.planType 
        : (data.planType || "Free");
      const credits = membership 
        ? Math.max(membership.credits, data.credits || membership.credits) 
        : (data.credits ?? 100);

      const resolvedDob = data.dob || data.dateOfBirth || data.birthDate || "";
      const resolvedGrade = data.grade || data.class || data.gradeClass || "";
      const resolvedBoard = data.board || "";
      const resolvedInstitution = data.institution || data.school || "";
      const resolvedPhone = data.phoneNumber || data.phone || "";
      const resolvedDisplayName = data.displayName || data.name || user.displayName || "";
      const resolvedPhotoURL = data.photoURL || user.photoURL || "";
      const resolvedBio = data.bio || "";
      const resolvedState = data.state || "";
      const resolvedDistrict = data.district || "";
      const resolvedLanguage = data.language || "English";
      const resolvedGoal = data.learningGoal || "";
      const resolvedGoals = data.learningGoals || (data.learningGoal ? [data.learningGoal] : []);
      const resolvedStyle = data.learningStyle || "Visual";
      const resolvedStyles = data.learningStyles || (data.learningStyle ? [data.learningStyle] : []);
      const resolvedSjTutorId = data.sjTutorId || data.registrationNumber || "";
      const resolvedRegNum = data.registrationNumber || data.sjTutorId || "";

      try {
        const updatePayload: Record<string, any> = {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          displayName: resolvedDisplayName,
          email: user.email || data.email || "",
          photoURL: resolvedPhotoURL,
          isRegisteredInFirestore: true,
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
        await setDoc(userRef, removeUndefinedFields({ ...data, ...updatePayload }), { merge: true });
      } catch (updateError) {
        console.error("Error updating user login info in Firestore:", updateError);
      }

      const fullProfile = {
        ...data,
        displayName: resolvedDisplayName,
        name: resolvedDisplayName,
        email: user.email || data.email || "",
        photoURL: resolvedPhotoURL,
        phoneNumber: resolvedPhone,
        institution: resolvedInstitution,
        grade: resolvedGrade,
        class: resolvedGrade,
        board: resolvedBoard,
        dob: resolvedDob,
        dateOfBirth: resolvedDob,
        bio: resolvedBio,
        state: resolvedState,
        district: resolvedDistrict,
        language: resolvedLanguage,
        learningGoal: resolvedGoal,
        learningGoals: resolvedGoals,
        learningStyle: resolvedStyle,
        learningStyles: resolvedStyles,
        sjTutorId: resolvedSjTutorId,
        registrationNumber: resolvedRegNum,
        planType,
        credits,
        trialStartDate,
        uid: user.uid,
        isRegisteredInFirestore: true,
        hasCompletedOnboarding: membership ? true : (data.hasCompletedOnboarding ?? true),
      };

      // Ensure cache is updated
      try {
        localStorage.setItem(`profile_${user.uid}`, JSON.stringify(fullProfile));
        localStorage.setItem('sjtutor_user_profile', JSON.stringify(fullProfile));
      } catch (cacheErr) {
        console.debug("Error updating cached profile:", cacheErr);
      }

      return fullProfile;
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
    let cachedFallback: any = null;
    try {
      const cached = localStorage.getItem(`profile_${user.uid}`) || localStorage.getItem('sjtutor_user_profile');
      if (cached) cachedFallback = JSON.parse(cached);
    } catch (cacheErr) {
      console.debug("Error reading fallback cached profile:", cacheErr);
    }

    return {
      ...(cachedFallback || {}),
      uid: user.uid,
      name: cachedFallback?.displayName || user.displayName || "",
      displayName: cachedFallback?.displayName || user.displayName || "",
      email: user.email || cachedFallback?.email || "",
      photoURL: cachedFallback?.photoURL || user.photoURL || "",
      credits: membership ? membership.credits : (cachedFallback?.credits ?? 100),
      planType: membership ? membership.planType : (cachedFallback?.planType || "Free"),
      hasCompletedOnboarding: membership ? true : Boolean(cachedFallback?.hasCompletedOnboarding),
      isRegisteredInFirestore: Boolean(cachedFallback?.isRegisteredInFirestore),
      role: membership?.role || cachedFallback?.role || "student",
    };
  }
};
