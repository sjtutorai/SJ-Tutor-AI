
import { UserProfile } from '../types';

export const calculateProfileCompletion = (profile: UserProfile): number => {
  let completion = 0;
  
  if (profile.displayName && profile.displayName.length >= 2) completion += 10;
  if (profile.photoURL) completion += 10;
  if (profile.dob) completion += 10;
  if (profile.institution && profile.institution.trim().length > 0) completion += 10;
  if (profile.grade) completion += 10;
  if (profile.board) completion += 5;
  if (profile.state) completion += 5;
  if (profile.district) completion += 5;
  if (profile.bio && profile.bio.length >= 5) completion += 10;
  if (profile.phoneNumber) completion += 15;
  if (profile.learningGoal || (profile.learningGoals && profile.learningGoals.length > 0)) completion += 5;
  if (profile.learningStyle || (profile.learningStyles && profile.learningStyles.length > 0)) completion += 5;
  
  return Math.min(100, completion);
};

export const getMissingProfileFields = (profile: UserProfile): string[] => {
  const missing: string[] = [];
  
  if (!profile.displayName || profile.displayName.length < 2) missing.push("Full Name");
  if (!profile.photoURL) missing.push("Profile Photo");
  if (!profile.dob) missing.push("Date of Birth");
  if (!profile.institution || profile.institution.trim().length === 0) missing.push("School Selection");
  if (!profile.grade) missing.push("Class/Grade");
  if (!profile.board) missing.push("Board");
  if (!profile.state) missing.push("State");
  if (!profile.district) missing.push("District");
  if (!profile.bio || profile.bio.length < 5) missing.push("About Me");
  if (!profile.phoneNumber) missing.push("Phone Number");
  if (!profile.learningGoal && (!profile.learningGoals || profile.learningGoals.length === 0)) missing.push("Learning Goal");
  if (!profile.learningStyle && (!profile.learningStyles || profile.learningStyles.length === 0)) missing.push("Learning Style");
  
  return missing;
};

export const generateSjTutorId = (): string => {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const period = `${yy}${mm}`; // e.g. 2608
  
  // 6 random digits
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `SJTA-${period}-${randomNum}`;
};

export const generateRegistrationNumber = (profile: UserProfile): string => {
  if (profile.sjTutorId) return profile.sjTutorId;
  if (!profile.displayName) return generateSjTutorId();
  
  const names = profile.displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = names[0] || '';
  const lastName = names.length > 1 ? names[names.length - 1] : '';
  
  const firstLetter = firstName ? (firstName.charAt(0).toUpperCase() || 'X') : 'X';
  const surnameLetter = lastName ? (lastName.charAt(0).toUpperCase() || firstLetter) : firstLetter; 
  
  // Format DOB: YYYY-MM-DD -> DDMMYYYY
  let dobString = '00000000';
  if (profile.dob) {
    const cleanDob = profile.dob.replace(/[^0-9]/g, '');
    if (profile.dob.includes('-')) {
      const parts = profile.dob.split('-');
      if (parts.length === 3) {
        // Assuming YYYY-MM-DD (standard for <input type="date">)
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        dobString = `${day}${month}${year}`;
      } else {
        dobString = cleanDob;
      }
    } else {
      dobString = cleanDob;
    }
  }
  
  return `SJ-${firstLetter}${surnameLetter}-${dobString}`.trim();
};

export const calculateGradeFromAge = (dob: string): string => {
  if (!dob) return '';
  
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Educational mapping (approximate for most systems)
  if (age < 3) return "Preschool";
  if (age === 3) return "Nursery";
  if (age === 4) return "LKG";
  if (age === 5) return "UKG";
  if (age === 6) return "1st Grade";
  if (age === 7) return "2nd Grade";
  if (age === 8) return "3rd Grade";
  if (age === 9) return "4th Grade";
  if (age === 10) return "5th Grade";
  if (age === 11) return "6th Grade";
  if (age === 12) return "7th Grade";
  if (age === 13) return "8th Grade";
  if (age === 14) return "9th Grade";
  if (age === 15) return "10th Grade";
  if (age === 16) return "11th Grade";
  if (age === 17) return "12th Grade";
  if (age >= 18 && age <= 21) return "Undergraduate";
  if (age > 21) return "Postgraduate";
  
  return "";
};

export interface ProfileCooldownInfo {
  canUpdate: boolean;
  cooldownDays: number;
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  nextAvailableDate: Date | null;
  completionPercentage: number;
  isLowCompletion: boolean;
  isPremium: boolean;
}

export const calculateProfileUpdateCooldown = (profile: UserProfile): ProfileCooldownInfo => {
  const isPremium = Boolean(profile.planType && profile.planType !== 'Free');
  const completionPercentage = calculateProfileCompletion(profile);
  
  if (isPremium) {
    return {
      canUpdate: true,
      cooldownDays: 0,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      nextAvailableDate: null,
      completionPercentage,
      isLowCompletion: completionPercentage <= 30,
      isPremium: true
    };
  }

  // If never updated yet (or onboarding), allowed
  if (!profile.lastProfileUpdate) {
    return {
      canUpdate: true,
      cooldownDays: completionPercentage <= 30 ? 3 : 7,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      nextAvailableDate: null,
      completionPercentage,
      isLowCompletion: completionPercentage <= 30,
      isPremium: false
    };
  }

  // If profile is <= 30% full, 3 days cooldown; otherwise 7 days cooldown
  const isLowCompletion = completionPercentage <= 30;
  const cooldownDays = isLowCompletion ? 3 : 7;
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const timeSinceLastUpdate = Date.now() - profile.lastProfileUpdate;
  const remainingMs = cooldownMs - timeSinceLastUpdate;

  if (remainingMs <= 0) {
    return {
      canUpdate: true,
      cooldownDays,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      nextAvailableDate: null,
      completionPercentage,
      isLowCompletion,
      isPremium: false
    };
  }

  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
  const nextAvailableDate = new Date(profile.lastProfileUpdate + cooldownMs);

  return {
    canUpdate: false,
    cooldownDays,
    remainingDays,
    remainingHours,
    remainingMinutes,
    nextAvailableDate,
    completionPercentage,
    isLowCompletion,
    isPremium: false
  };
};
