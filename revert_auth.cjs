const fs = require('fs');

let authFile = fs.readFileSync('components/Auth.tsx', 'utf8');

// Replace handleEmailSignIn with original
const newHandleEmail = `const handleEmailSignIn = async (e: React.FormEvent) => {
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

authFile = authFile.replace(/const handleEmailSignIn = async \(e: React\.FormEvent\) => \{[\s\S]*?\} catch \(err: any\) \{/, newHandleEmail);

// Remove verify UI block and forgot password block
authFile = authFile.replace(/\{authMode === 'verify' \? \([\s\S]*?\) : \(\n            <>\n/, '');
authFile = authFile.replace(/<\/>\n          \)\n          \}\n          \{\/\* Bottom toggle link \*\/\}/, '{/* Bottom toggle link */}');
authFile = authFile.replace(/\{authMode === 'signin' && \(\n              <div className="flex justify-end">[\s\S]*?<\/div>\n            \)\}/, '');
authFile = authFile.replace(/\{message && \(\n              <div className="text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 flex items-start gap-2 text-left">\n                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0\.5" \/>\n                \{message\}\n              <\/div>\n            \)\}/g, '');

// Fix buttons text
authFile = authFile.replace(/\{authMode === 'reset' \? 'Sending reset link\.\.\.' : authMode === 'signin' \? 'Signing in\.\.\.' : 'Registering account\.\.\.'\}/g, "{authMode === 'signin' ? 'Signing in...' : 'Registering account...'}");
authFile = authFile.replace(/\{authMode === 'reset' \? 'Send Reset Link' : authMode === 'signin' \? 'Continue with Email' : 'Register with Email'\}/g, "{authMode === 'signin' ? 'Continue with Email' : 'Register with Email'}");

authFile = authFile.replace(/<div className="mt-6 text-center text-xs text-slate-500 font-medium">[\s\S]*?<\/div>/, `<div className="mt-6 text-center text-xs text-slate-500 font-medium">
            {authMode === 'signin' ? (
              <p>
                New to SJ Tutor AI?{' '}
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setError(null);
                  }}
                  className="text-primary-600 hover:text-primary-700 font-bold transition-colors underline"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                  }}
                  className="text-primary-600 hover:text-primary-700 font-bold transition-colors underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>`);

// Update type
authFile = authFile.replace(/useState<'signin' \| 'signup' \| 'reset' \| 'verify'>/g, "useState<'signin' | 'signup'>");
authFile = authFile.replace(/useState<'signin' \| 'signup' \| 'reset'>/g, "useState<'signin' | 'signup'>");
// Update message state
authFile = authFile.replace(/const \[message, setMessage\] = useState<string \| null>\(null\);\n/g, '');

// Clean imports
authFile = authFile.replace(/sendEmailVerification,\n  signOut,\n/, '');
authFile = authFile.replace(/sendPasswordResetEmail,\n  sendEmailVerification,\n/, '');

// Clean functions
authFile = authFile.replace(/const handleCheckVerification = async \(\) => \{[\s\S]*?const handleProviderSignIn/m, 'const handleProviderSignIn');

fs.writeFileSync('components/Auth.tsx', authFile);

let appFile = fs.readFileSync('App.tsx', 'utf8');

const oldAppAuth = `const unsubscribe = onAuthStateChanged(
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
           }`;
const newAppAuth = `const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        clearTimeout(timeoutId);
        if (currentUser) {`;
        
appFile = appFile.replace(oldAppAuth, newAppAuth);

fs.writeFileSync('App.tsx', appFile);
