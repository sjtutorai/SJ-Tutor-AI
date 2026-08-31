import React from 'react';
import { UserProfile } from '../types';
import OnboardingWizard from './OnboardingWizard';
import { auth } from '../firebaseConfig';

interface AuthProps {
  onSignUpSuccess?: (data?: Partial<UserProfile>) => void;
  onClose: () => void;
  onCountryDetected?: (country: string) => void;
  initialCountry?: string | null;
  initialMode?: 'signin' | 'signup';
  initialStep?: number;
  initialProfile?: Partial<UserProfile>;
  onNavigateToTerms?: () => void;
  onNavigateToPrivacy?: () => void;
}

const Auth: React.FC<AuthProps> = ({ 
  onSignUpSuccess, 
  onClose, 
  initialMode = 'signin',
  initialStep = 1,
  initialProfile = {},
  onNavigateToTerms,
  onNavigateToPrivacy
}) => {
  const currentUser = auth.currentUser;

  const handleComplete = (profile: UserProfile) => {
    if (onSignUpSuccess) {
      onSignUpSuccess(profile);
    }
    onClose();
  };

  return (
    <OnboardingWizard
      initialUser={currentUser}
      initialProfile={initialProfile}
      initialStep={initialStep}
      initialMode={initialMode}
      onComplete={handleComplete}
      onClose={onClose}
      onNavigateToTerms={onNavigateToTerms}
      onNavigateToPrivacy={onNavigateToPrivacy}
    />
  );
};

export default Auth;
