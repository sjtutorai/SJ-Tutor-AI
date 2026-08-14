import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";

/**
 * Creates a new user profile in Firestore
 * @param user The Firebase Auth user object
 */
export const createUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const newProfile = {
      uid: user.uid,
      name: user.displayName || "",
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      provider: user.providerData[0]?.providerId || "password",
      class: "",
      role: "student",
      phoneNumber: user.phoneNumber || "",
      hasCompletedOnboarding: false,
      streak: 0,
      totalStudyTime: 0,
      points: 0,
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

    if (docSnap.exists()) {
      // Update existing profile
      const data = docSnap.data();
      const trialStartDate = data.trialStartDate || Date.now();
      try {
        const updatePayload: Record<string, any> = {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          name: user.displayName || data.name || "",
          displayName: user.displayName || data.displayName || data.name || "",
          email: user.email || data.email || "",
          photoURL: user.photoURL || data.photoURL || "",
        };
        if (!data.trialStartDate) {
          updatePayload.trialStartDate = trialStartDate;
        }
        await updateDoc(userRef, updatePayload);
      } catch (updateError) {
        console.error("Error updating user login info in Firestore:", updateError);
      }
      return {
        ...data,
        trialStartDate,
        uid: user.uid,
        isRegisteredInFirestore: true,
        hasCompletedOnboarding: data.hasCompletedOnboarding ?? true,
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
    // Return a default object so the app doesn't crash completely, but don't save to DB
    return {
      uid: user.uid,
      name: user.displayName || "",
      displayName: user.displayName || "",
      email: user.email || "",
      photoURL: user.photoURL || "",
      hasCompletedOnboarding: false,
      role: "student",
    };
  }
};
