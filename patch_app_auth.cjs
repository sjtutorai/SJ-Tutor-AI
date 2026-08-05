const fs = require('fs');
let content = fs.readFileSync('App.tsx', 'utf8');

const oldAuthChanged = `const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        clearTimeout(timeoutId);
        if (currentUser) {
           try {
             const userProf = await getCurrentUserProfile(currentUser);
             setUserProfile({ ...initialProfileState, ...userProf } as any);
             if (!userProf.hasCompletedOnboarding) {
               setMode(AppMode.PROFILE);
             } else {
               setMode(AppMode.DASHBOARD);
             }
           } catch (e) {
             console.error("Error fetching/creating profile:", e);
           }
        } else {
          setUserProfile(initialProfileState);
          setMode(AppMode.DASHBOARD);
        }
        setAuthLoading(false);
      },
      (err) => {`;

const newAuthChanged = `const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        clearTimeout(timeoutId);
        if (currentUser) {
           const isEmailPassword = currentUser.providerData.some(p => p.providerId === 'password');
           if (isEmailPassword && !currentUser.emailVerified) {
              // Show verify email screen
              setUser(currentUser);
              setAuthModalMode('verify' as any);
              setShowAuthModal(true);
              setAuthLoading(false);
              return;
           }

           setUser(currentUser);
           try {
             const userProf = await getCurrentUserProfile(currentUser);
             setUserProfile({ ...initialProfileState, ...userProf } as any);
             if (!userProf.hasCompletedOnboarding) {
               setMode(AppMode.PROFILE);
             } else {
               setMode(AppMode.DASHBOARD);
             }
           } catch (e) {
             console.error("Error fetching/creating profile:", e);
           }
        } else {
          setUser(null);
          setUserProfile(initialProfileState);
          setMode(AppMode.DASHBOARD);
        }
        setAuthLoading(false);
      },
      (err) => {`;

content = content.replace(oldAuthChanged, newAuthChanged);

fs.writeFileSync('App.tsx', content);
console.log("App auth patched.");
