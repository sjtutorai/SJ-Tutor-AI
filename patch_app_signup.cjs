const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

const oldHandle = `const handleSignUpSuccess = async (initialData?: Partial<UserProfile>) => {
    setShowAuthModal(false);
  };`;

const newHandle = `const handleSignUpSuccess = async (initialData?: Partial<UserProfile>) => {
    if (auth.currentUser) {
      try {
        const userProf = await getCurrentUserProfile(auth.currentUser);
        setUserProfile({ ...initialProfileState, ...userProf } as any);
        if (!userProf.hasCompletedOnboarding) {
          setMode(AppMode.PROFILE);
        } else {
          setMode(AppMode.DASHBOARD);
        }
      } catch (e) {
        console.error("Error fetching/creating profile on signup success:", e);
      }
    }
    setShowAuthModal(false);
  };`;

content = content.replace(oldHandle, newHandle);

fs.writeFileSync('App.tsx', content);
console.log("App signup success patched.");
