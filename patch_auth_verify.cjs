const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

// Update imports
if (!content.includes('signOut')) {
  content = content.replace(
    'sendEmailVerification,',
    'sendEmailVerification,\n  signOut,'
  );
}

// Add verify mode
content = content.replace(
  "useState<'signin' | 'signup' | 'reset'>",
  "useState<'signin' | 'signup' | 'reset' | 'verify'>"
);

// Update handleEmailSignIn for verify
const oldHandleEmail = `if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName.trim() });
        await sendEmailVerification(userCredential.user);
        
        if (onSignUpSuccess) {
          onSignUpSuccess({
            displayName: displayName.trim(),
            photoURL: '',
          });
        } else {
          onClose();
        }
      }`;

const newHandleEmail = `if (authMode === 'signin') {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (!userCred.user.emailVerified) {
          setAuthMode('verify');
          return;
        }
        onClose();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName.trim() });
        await sendEmailVerification(userCredential.user);
        setAuthMode('verify');
      }`;

content = content.replace(oldHandleEmail, newHandleEmail);

fs.writeFileSync('components/Auth.tsx', content);
console.log("Patch verify basic applied.");
