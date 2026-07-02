
import { UserProfile } from '../types';

export const calculateProfileCompletion = (profile: UserProfile): number => {
  let completion = 0;
  
  // 1. Name (6%)
  if (profile.displayName && profile.displayName.trim().length >= 2) completion += 6;
  // 2. Email (6%)
  if (profile.email && profile.email.trim().length > 0) completion += 6;
  // 3. DOB (6%)
  if (profile.dob && profile.dob.trim().length > 0) completion += 6;
  // 4. Gender (5%)
  if (profile.gender && profile.gender.trim().length > 0) completion += 5;
  // 5. Class (6%)
  const classVal = profile.grade || '';
  if (classVal && classVal.trim().length > 0) completion += 6;
  // 6. Board (5%)
  if (profile.board && profile.board.trim().length > 0) completion += 5;
  // 7. School (6%)
  if (profile.institution && profile.institution.trim().length > 0) completion += 6;
  // 8. Phone (6%)
  if (profile.phoneNumber && profile.phoneNumber.trim().length > 0) completion += 6;
  // 9. Recovery Email (5%)
  if (profile.recoveryEmail && profile.recoveryEmail.trim().length > 0) completion += 5;
  // 10. Profile Photo (6%)
  if (profile.photoURL && profile.photoURL.trim().length > 0) completion += 6;
  // 11. Parent Details (5%)
  if (profile.parentDetails && (typeof profile.parentDetails === 'string' ? profile.parentDetails.trim().length > 0 : Object.keys(profile.parentDetails).length > 0)) completion += 5;
  // 12. Address (5%)
  if (profile.address && profile.address.trim().length > 0) completion += 5;
  // 13. Language (5%)
  if (profile.language && profile.language.trim().length > 0) completion += 5;
  // 14. Bio (6%)
  if (profile.bio && profile.bio.trim().length >= 5) completion += 6;
  // 15. Interest (6%)
  const interestVal = profile.interest || profile.learningGoal;
  if (interestVal && (typeof interestVal === 'string' ? interestVal.trim().length > 0 : (Array.isArray(interestVal) && interestVal.length > 0))) completion += 6;
  // 16. Theme (6%)
  if (profile.theme && profile.theme.trim().length > 0) completion += 6;
  // 17. Notifications (5%)
  if (profile.notifications && (typeof profile.notifications === 'object' ? Object.keys(profile.notifications).length > 0 : String(profile.notifications).length > 0)) completion += 5;
  // 18. Security (5%)
  if (profile.security && (typeof profile.security === 'object' ? Object.keys(profile.security).length > 0 : String(profile.security).length > 0)) completion += 5;

  return Math.min(100, completion);
};

export const getMissingProfileFields = (profile: UserProfile): string[] => {
  const missing: string[] = [];
  
  if (!profile.displayName || profile.displayName.trim().length < 2) missing.push("Full Name");
  if (!profile.email || profile.email.trim().length === 0) missing.push("Email");
  if (!profile.dob || profile.dob.trim().length === 0) missing.push("Date of Birth");
  if (!profile.gender || profile.gender.trim().length === 0) missing.push("Gender");
  if (!profile.grade || profile.grade.trim().length === 0) missing.push("Class/Grade");
  if (!profile.board || profile.board.trim().length === 0) missing.push("Education Board");
  if (!profile.institution || profile.institution.trim().length === 0) missing.push("School/Institution");
  if (!profile.phoneNumber || profile.phoneNumber.trim().length === 0) missing.push("Phone Number");
  if (!profile.recoveryEmail || profile.recoveryEmail.trim().length === 0) missing.push("Recovery Email");
  if (!profile.photoURL) missing.push("Profile Photo");
  if (!profile.parentDetails || (typeof profile.parentDetails === 'object' && Object.keys(profile.parentDetails).length === 0)) missing.push("Parent Details");
  if (!profile.address || profile.address.trim().length === 0) missing.push("Address");
  if (!profile.language || profile.language.trim().length === 0) missing.push("Preferred Language");
  if (!profile.bio || profile.bio.trim().length < 5) missing.push("About Me (Bio)");
  if (!profile.interest && !profile.learningGoal) missing.push("Interests/Learning Goal");
  if (!profile.theme) missing.push("Theme Settings");
  if (!profile.notifications) missing.push("Notifications Preference");
  if (!profile.security) missing.push("Security/Privacy Configuration");
  
  return missing;
};

export const generateRegistrationNumber = (profile: UserProfile): string => {
  if (!profile.displayName) return '';
  
  const names = profile.displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = names[0] || '';
  const lastName = names.length > 1 ? names[names.length - 1] : '';
  
  const firstLetter = firstName.charAt(0).toUpperCase() || 'X';
  const surnameLetter = lastName.charAt(0).toUpperCase() || firstLetter; 
  
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
