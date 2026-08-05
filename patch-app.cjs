const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// import getCurrentUserProfile
if (!code.includes('getCurrentUserProfile')) {
  code = code.replace(
    'import { auth } from "./firebaseConfig";',
    'import { auth } from "./firebaseConfig";\nimport { getCurrentUserProfile } from "./utils/userService";'
  );
}

const regex = /const unsubscribe = onAuthStateChanged\([\s\S]*?\([\s\S]*?console\.error\("Auth Error:", err\);[\s\S]*?\}\s*,\s*\);/m;
const newAuthCode = `const unsubscribe = onAuthStateChanged(
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
      (err) => {
        console.error("Auth Error:", err);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      },
    );`;

code = code.replace(regex, newAuthCode);
fs.writeFileSync('App.tsx', code);
