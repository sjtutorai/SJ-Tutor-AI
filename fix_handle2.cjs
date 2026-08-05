const fs = require('fs');

let authFile = fs.readFileSync('components/Auth.tsx', 'utf8');

const regex = /const handleEmailSignIn = async \(e: React\.FormEvent\) => \{[\s\S]*?\};\n\n\n  return \(/m;

const correctHandle = `const handleEmailSignIn = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("An account already exists with this email.");
      } else {
        setError("An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };


  return (`

authFile = authFile.replace(regex, correctHandle);

fs.writeFileSync('components/Auth.tsx', authFile);
