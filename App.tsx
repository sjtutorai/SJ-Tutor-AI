import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Login } from './Login';
import { Onboarding } from './Onboarding';
import { Dashboard } from './Dashboard';
import { SuccessModal } from './SuccessModal';
import { WelcomeBackModal } from './WelcomeBackModal';
import { Tutorial } from './Tutorial';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { user, userData, loading, isAuthReady } = useAuth();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Handle modals logic
  useEffect(() => {
    if (isAuthReady && user && userData) {
      if (userData.hasCompletedOnboarding) {
        // Check if we just finished onboarding or if it's a returning session
        const sessionKey = `welcome_shown_${user.uid}`;
        if (!sessionStorage.getItem(sessionKey)) {
          setShowWelcomeModal(true);
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
    }
  }, [isAuthReady, user, userData]);

  const handleOnboardingComplete = () => {
    setShowSuccessModal(true);
  };

  const startTutorial = () => {
    setShowSuccessModal(false);
    setShowTutorial(true);
  };

  const tutorialSteps = [
    {
      targetId: 'btn-start-quiz',
      title: 'Start Your Journey',
      description: 'Click here to take a mock quiz and test your knowledge. It helps us understand your progress!'
    },
    {
      targetId: 'nav-dashboard',
      title: 'Your Command Center',
      description: 'This is your dashboard where you can see your active courses and overall study time.'
    },
    {
      targetId: 'nav-results',
      title: 'Track Your Growth',
      description: 'View all your past quiz results and detailed solutions here to improve your scores.'
    }
  ];

  if (!isAuthReady || (user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!userData || !userData.hasCompletedOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <Dashboard onStartTutorial={() => setShowTutorial(true)} />
      
      <SuccessModal 
        isOpen={showSuccessModal} 
        onStartTutorial={startTutorial}
        onSkip={() => setShowSuccessModal(false)}
      />
      
      <WelcomeBackModal 
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        name={userData.name}
      />

      {showTutorial && (
        <Tutorial 
          steps={tutorialSteps} 
          onFinish={() => setShowTutorial(false)} 
        />
      )}
    </>
  );
};

export default App;
