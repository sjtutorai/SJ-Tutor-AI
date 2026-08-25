import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";

/**
 * Creates a new user profile in Firestore
 * @param user The Firebase Auth user object
 */
export const createUserProfile = async (user: User) => {
  try {
    const isOwnerEmail = user.email?.toLowerCase() === "sjtutorai@gmail.com";
    const userRef = doc(db, "users", user.uid);
    const newProfile = {
      uid: user.uid,
      name: user.displayName || "",
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      provider: user.providerData[0]?.providerId || "password",
      class: "",
      role: isOwnerEmail ? "admin" : "student",
      phoneNumber: user.phoneNumber || "",
      hasCompletedOnboarding: isOwnerEmail ? true : false,
      streak: 0,
      totalStudyTime: 0,
      points: 0,
      credits: isOwnerEmail ? 99999 : 100,
      planType: isOwnerEmail ? "Achiever" : "Free",
      trialStartDate: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      isActive: true,
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
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating user profile in Firestore:", error);
    throw error;
  }
};

/**
 * Gets the current user profile from Firestore, creating it if it doesn't exist.
 * Also updates lastLoginAt and basic profile info on every login.
 * @param user The Firebase Auth user object
 */
export const getCurrentUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);
    const isOwnerEmail = user.email?.toLowerCase() === "sjtutorai@gmail.com";

    if (docSnap.exists()) {
      // Update existing profile
      const data = docSnap.data();
      const trialStartDate = data.trialStartDate || Date.now();
      const isAchiever = isOwnerEmail || data.planType === "Achiever";
      const planType = isAchiever ? "Achiever" : (data.planType || "Free");
      const credits = isAchiever ? Math.max(99999, data.credits || 99999) : (data.credits ?? 100);

      try {
        const updatePayload: Record<string, any> = {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          name: user.displayName || data.name || "",
          displayName: user.displayName || data.displayName || data.name || "",
          email: user.email || data.email || "",
          photoURL: user.photoURL || data.photoURL || "",
        };
        if (isOwnerEmail) {
          updatePayload.planType = "Achiever";
          updatePayload.credits = 99999;
          updatePayload.role = "admin";
          updatePayload.hasCompletedOnboarding = true;
        }
        if (!data.trialStartDate) {
          updatePayload.trialStartDate = trialStartDate;
        }
        await updateDoc(userRef, updatePayload);
      } catch (updateError) {
        console.error("Error updating user login info in Firestore:", updateError);
      }

      return {
        credits,
        planType,
        ...data,
        planType,
        credits,
        trialStartDate,
        uid: user.uid,
        isRegisteredInFirestore: true,
        hasCompletedOnboarding: isOwnerEmail ? true : (data.hasCompletedOnboarding ?? true),
      };
    } else {
      // Create new profile
      const newProfile = await createUserProfile(user);
      return {
        ...newProfile,
        isRegisteredInFirestore: false,
      };
    }
  } catch (error) {
    console.error("Error getting user profile from Firestore:", error);
    const isOwnerEmail = user.email?.toLowerCase() === "sjtutorai@gmail.com";
    return {
      uid: user.uid,
      name: user.displayName || "",
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      credits: isOwnerEmail ? 99999 : 100,
      planType: isOwnerEmail ? "Achiever" : "Free",
      hasCompletedOnboarding: isOwnerEmail ? true : false,
      role: isOwnerEmail ? "admin" : "student",
    };
  }
};
