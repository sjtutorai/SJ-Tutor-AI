const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

// Update imports
content = content.replace(
  "updateProfile,",
  "updateProfile,\n  sendPasswordResetEmail,\n  sendEmailVerification,"
);

// Add resetMode state
content = content.replace(
  "const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);",
  "const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>(initialMode as any);"
);

// Add message state for success
content = content.replace(
  "const [error, setError] = useState<string | null>(null);",
  "const [error, setError] = useState<string | null>(null);\n  const [message, setMessage] = useState<string | null>(null);"
);

// Update handleEmailSignIn
const oldHandleEmail = `const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (authMode === 'signup' && !displayName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName.trim() });
        if (onSignUpSuccess) {
          onSignUpSuccess({
            displayName: displayName.trim(),
            photoURL: '',
          });
        } else {
          onClose();
        }
      }
    } catch (err: any) {`;

const newHandleEmail = `const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === 'reset') {
      if (!email) {
        setError("Email is required to reset password.");
        return;
      }
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent! Check your inbox.");
        setTimeout(() => setAuthMode('signin'), 3000);
      } catch (err: any) {
        console.error(err);
        if (err.code === 'auth/invalid-email' || err.code === 'auth/user-not-found') {
          setError("Invalid email address.");
        } else {
          setError("Failed to send reset email.");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (authMode === 'signup' && !displayName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (authMode === 'signin') {
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
      }
    } catch (err: any) {`;

content = content.replace(oldHandleEmail, newHandleEmail);

fs.writeFileSync('components/Auth.tsx', content);
console.log("Patch applied.");
