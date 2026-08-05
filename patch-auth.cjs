const fs = require('fs');
let code = fs.readFileSync('components/Auth.tsx', 'utf8');

// Replace imports
code = code.replace(
  "sendSignInLinkToEmail",
  "signInWithEmailAndPassword,\n  createUserWithEmailAndPassword"
);

// We need to remove the emailSent view since we won't need it.
code = code.replace(
  "const [emailSent, setEmailSent] = useState(false);\n  const [resendTimer, setResendTimer] = useState(0);\n\n  useEffect(() => {\n    let interval: any;\n    if (resendTimer > 0) {\n      interval = setInterval(() => {\n        setResendTimer((prev) => prev - 1);\n      }, 1000);\n    }\n    return () => clearInterval(interval);\n  }, [resendTimer]);",
  "const [password, setPassword] = useState('');"
);

// We can remove the entire if (emailSent) block
const emailSentBlockStart = code.indexOf('if (emailSent) {');
const emailSentBlockEnd = code.indexOf('return (', emailSentBlockStart + 10) - 1;

code = code.substring(0, emailSentBlockStart) + code.substring(emailSentBlockEnd);

// Replace handleEmailSignIn
const handleEmailSignInRegex = /const handleEmailSignIn = async \(e: React\.FormEvent\) => \{[\s\S]*?finally \{\s*setLoading\(false\);\s*\}\s*\};/m;

const newHandleEmailSignIn = `const handleEmailSignIn = async (e: React.FormEvent) => {
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
        const result = await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
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
      if (err.code === 'auth/invalid-email') {
         setError("Email address is invalid.");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
         setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
         setError("An account already exists with this email.");
      } else if (err.code === 'auth/weak-password') {
         setError("Password should be at least 6 characters.");
      } else {
         setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };`;

code = code.replace(handleEmailSignInRegex, newHandleEmailSignIn);

// Add password field to UI
const emailInputHtml = `<div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-slate-400"
                />
              </div>
            </div>`;

const passwordInputHtml = `<div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-slate-400"
                />
              </div>
            </div>`;

code = code.replace(emailInputHtml, passwordInputHtml);

fs.writeFileSync('components/Auth.tsx', code);
