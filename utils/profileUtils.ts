
import { UserProfile } from '../types';

export const calculateProfileCompletion = (profile: UserProfile): number => {
  let completion = 0;
  
  if (profile.displayName && profile.displayName.length >= 2) completion += 10;
  if (profile.photoURL) completion += 15;
  if (profile.dob) completion += 15;
  if (profile.institution) completion += 10;
  if (profile.grade) completion += 10;
  if (profile.bio && profile.bio.length >= 5) completion += 15;
  if (profile.phoneNumber) completion += 15;
  if (profile.learningGoal) completion += 5;
  if (profile.learningStyle) completion += 5;
  
  return Math.min(100, completion);
};

export const getMissingProfileFields = (profile: UserProfile): string[] => {
  const missing: string[] = [];
  
  if (!profile.displayName || profile.displayName.length < 2) missing.push("Full Name");
  if (!profile.photoURL) missing.push("Profile Photo");
  if (!profile.dob) missing.push("Date of Birth");
  if (!profile.institution) missing.push("School/Institution");
  if (!profile.grade) missing.push("Class/Grade");
  if (!profile.bio || profile.bio.length < 5) missing.push("About Me");
  if (!profile.phoneNumber) missing.push("Phone Number");
  if (!profile.learningGoal) missing.push("Learning Goal");
  if (!profile.learningStyle) missing.push("Learning Style");
  
  return missing;
};

export const generateRegistrationNumber = (profile: UserProfile): string => {
  if (!profile.displayName) return '';
  
  const names = profile.displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = names[0] || '';
  const lastName = names.length > 1 ? names[names.length - 1] : '';
  
  const firstLetter = firstName.charAt(0).toUpperCase();
  const surnameLetter = lastName.charAt(0).toUpperCase() || (firstName.length > 1 ? firstName.charAt(1).toUpperCase() : 'X'); 
  
  // Stable 6-digit unique registration number
  const seed = (profile.dob || '') + (profile.phoneNumber || '') + (profile.displayName || '');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const regNum = Math.abs(hash).toString().substring(0, 6).padStart(6, '0');
  
  return `SJ-${firstLetter}${surnameLetter}-${regNum}`;
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
