
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
  
  const names = profile.displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = names[0] || '';
  const lastName = names.length > 1 ? names[names.length - 1] : '';
  
  const firstLetter = firstName.charAt(0).toUpperCase();
  const surnameLetter = lastName.charAt(0).toUpperCase() || firstLetter; 
  
  // Format DOB: YYYY-MM-DD -> DDMMYYYY
  const cleanDob = profile.dob.replace(/[^0-9]/g, '');
  let dobString = '';
  
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
  
  return `${firstLetter}${surnameLetter}${dobString}`.trim();
};
