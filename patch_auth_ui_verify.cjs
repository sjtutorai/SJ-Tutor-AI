const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

const funcs = `
  const handleCheckVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        if (onSignUpSuccess) {
          onSignUpSuccess({
            displayName: auth.currentUser.displayName || '',
            photoURL: '',
          });
        } else {
          onClose();
        }
      } else {
        setError("Your email is not verified yet. Please check your inbox.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMessage("Verification email sent! Check your inbox.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: any, providerName: string) => {
`;
content = content.replace('const handleProviderSignIn = async (provider: any, providerName: string) => {', funcs);

const verifyUI = `
          {authMode === 'verify' ? (
            <div className="space-y-4 text-center">
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl border border-emerald-100 flex flex-col items-center gap-3">
                <Mail className="w-8 h-8" />
                <div>
                  <h3 className="font-bold text-lg mb-1">Verify your email</h3>
                  <p className="text-sm">We've sent a verification email to your email address. Please verify your email before signing in.</p>
                </div>
              </div>
              {error && (
                <div className="text-sm text-rose-500 bg-rose-50 px-4 py-3 rounded-lg border border-rose-100 flex items-start gap-2 text-left">
                  <X className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              {message && (
                <div className="text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 flex items-start gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  {message}
                </div>
              )}
              
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCheckVerification}
                  className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Continue
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => window.open('mailto:', '_blank')}
                  className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  Open Email App
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendVerification}
                  className="w-full py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all disabled:opacity-70"
                >
                  Resend Email
                </button>
                
                <button
                  type="button"
                  onClick={async () => {
                     await signOut(auth);
                     setAuthMode('signin');
                     setError(null);
                     setMessage(null);
                  }}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 underline font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <>
`;

content = content.replace('<div className="flex flex-col gap-3 mb-6">', verifyUI + '<div className="flex flex-col gap-3 mb-6">');

const closingTags = `
          {/* Bottom toggle link */}
`;
content = content.replace('{/* Bottom toggle link */}', '</>\n          )\n          }\n          {/* Bottom toggle link */}');

fs.writeFileSync('components/Auth.tsx', content);
console.log("Patch UI verify applied.");
