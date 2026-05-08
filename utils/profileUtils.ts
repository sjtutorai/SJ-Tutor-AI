
import { UserProfile } from '../types';

export const calculateProfileCompletion = (profile: UserProfile): number => {
  let completion = 0;
  
  if (profile.displayName && profile.displayName.length >= 2) completion += 10;
  if (profile.photoURL) completion += 15;
  if (profile.dob) completion += 15;
  if (profile.institution) completion += 10;
  if (profile.grade) completion += 10;
  if (profile.bio && profile.bio.length >= 5) completion += 10;
  if (profile.phoneNumber) completion += 10;
  if (profile.phoneVerified) completion += 10;
  if (profile.learningGoal) completion += 5;
  if (profile.learningStyle) completion += 5;
  
  return Math.min(100, completion);
};

export const generateRegistrationNumber = (profile: UserProfile): string => {
  if (!profile.displayName || !profile.dob) return '';
  
  const names = profile.displayName.trim().split(/\s+/);
  const firstName = names[0] || '';
  const lastName = names.length > 1 ? names[names.length - 1] : '';
  
  const firstLetter = firstName.charAt(0).toUpperCase();
  const surnameLetter = lastName.charAt(0).toUpperCase() || firstLetter; // Fallback to first letter if no surname
  
  // Format DOB: YYYY-MM-DD -> DDMMYYYY or similar
  // Assuming dob is stored as YYYY-MM-DD from input type="date"
  const dobParts = profile.dob.split('-');
  let dobString = '';
  if (dobParts.length === 3) {
    // YYYY-MM-DD -> DDMMYYYY
    dobString = `${dobParts[2]}${dobParts[1]}${dobParts[0]}`;
  } else {
    // Fallback or cleanup
    dobString = profile.dob.replace(/[^0-9]/g, '');
  }
  
  return `${firstLetter}${surnameLetter}${dobString}`;
};
