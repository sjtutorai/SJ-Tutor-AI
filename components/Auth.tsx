import React, { useState, useEffect } from 'react';
import { auth, googleProvider, githubProvider, appleProvider, yahooProvider } from '../firebaseConfig';
import { 
  signInWithPopup, 
  getAdditionalUserInfo,
  sendSignInLinkToEmail,
} from 'firebase/auth';
import { ArrowRight, Loader2, Mail, X, Github, Sparkles, CheckCircle2, User } from 'lucide-react';
import { UserProfile } from '../types';
import Logo from './Logo';

interface AuthProps {
  onSignUpSuccess?: (data?: Partial<UserProfile>) => void;
  onClose: () => void;
  onCountryDetected?: (country: string) => void;
  initialCountry?: string | null;
  initialMode?: 'signin' | 'signup';
}

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
  </svg>
);

const YahooIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" fill="currentColor">
    <path d="M410.3 36.3h-75.1l-68.5 186.2-74-186.2H115.1l111 257v182.4h83V295.4l101.2-259.1z" fill="#410093"/>
  </svg>
);

const Auth: React.FC<AuthProps> = ({ onSignUpSuccess, onClose, initialMode = 'signin' }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleProviderSignIn = async (provider: any, providerName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      if (additionalUserInfo?.isNewUser && onSignUpSuccess) {
        onSignUpSuccess({
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
        });
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError(`An account already exists with the same email but different sign-in credentials.`);
      } else {
        setError(`Failed to sign in with ${providerName}. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email address is invalid.");
      return;
    }

    if (authMode === 'signup' && !displayName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    setError(null);

    const actionCodeSettings = {
      url: window.location.href, // Redirect back to current URL
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      if (authMode === 'signup') {
        window.localStorage.setItem('displayNameForSignIn', displayName.trim());
      } else {
        window.localStorage.removeItem('displayNameForSignIn');
      }
      setEmailSent(true);
      setResendTimer(60);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-email') {
         setError("Email address is invalid.");
      } else if (err.code === 'auth/too-many-requests') {
         setError("Too many requests. Please wait a few minutes.");
      } else {
         setError("We couldn't send the sign-in link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md text-center animate-in fade-in zoom-in duration-300">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">Check your email</h2>
            <p className="text-slate-600 mb-6">
              We&apos;ve sent a secure sign-in link to <br/>
              <span className="font-bold text-slate-800">{email}</span>
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const domain = email.split('@')[1];
                  if (domain === 'gmail.com') window.open('https://mail.google.com', '_blank');
                  else if (domain === 'yahoo.com') window.open('https://mail.yahoo.com', '_blank');
                  else if (domain === 'outlook.com' || domain === 'hotmail.com') window.open('https://outlook.live.com', '_blank');
                }}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
              >
                <Mail className="w-5 h-5" />
                Open Email App
              </button>
              <button 
                onClick={handleEmailSignIn}
                disabled={resendTimer > 0 || loading}
                className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors bg-slate-50 rounded-xl"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (resendTimer > 0 ? `Resend Link (${resendTimer}s)` : "Resend Link")}
              </button>
              <button 
                onClick={() => setEmailSent(false)}
                className="w-full py-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Change Email Address
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in zoom-in duration-300">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6 text-center">
            <div className="flex justify-center mb-4">
               <Logo className="w-16 h-16" iconOnly />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {authMode === 'signin' ? 'Welcome Back 👋' : 'Create Your Account 🚀'}
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              {authMode === 'signin' 
                ? 'Continue your learning journey securely.' 
                : 'Join SJ Tutor AI and start learning today.'}
            </p>
          </div>

          {/* Mode Tab Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              onClick={() => {
                setAuthMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signin'
                  ? 'bg-white text-slate-850 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signup'
                  ? 'bg-white text-slate-855 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up / Register
            </button>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleProviderSignIn(googleProvider, 'Google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-sm text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  {authMode === 'signin' ? 'Continue with Google' : 'Sign Up with Google'}
                </>
              )}
            </button>

            <button
                onClick={() => handleProviderSignIn(yahooProvider, 'Yahoo')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all shadow-sm text-sm"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <YahooIcon className="w-5 h-5" />
                    {authMode === 'signin' ? 'Continue with Yahoo' : 'Sign Up with Yahoo'}
                  </>
                )}
            </button>

            <button
                onClick={() => handleProviderSignIn(githubProvider, 'GitHub')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-900 dark:bg-slate-950 border border-slate-800 dark:border-slate-800 rounded-xl font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-900 transition-all shadow-sm text-sm"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (
                  <>
                    <Github className="w-5 h-5" />
                    {authMode === 'signin' ? 'Continue with GitHub' : 'Sign Up with GitHub'}
                  </>
                )}
            </button>

            <button
                onClick={() => handleProviderSignIn(appleProvider, 'Apple')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black dark:bg-black border border-black dark:border-black rounded-xl font-semibold text-white hover:bg-gray-900 dark:hover:bg-gray-900 transition-all shadow-sm text-sm"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : (
                  <>
                    <AppleIcon className="w-5 h-5" />
                    {authMode === 'signin' ? 'Continue with Apple' : 'Sign Up with Apple'}
                  </>
                )}
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold tracking-wider">OR</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            {authMode === 'signup' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-xs font-bold text-slate-600 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="John Doe"
                    required={authMode === 'signup'}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-slate-400"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
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

            {error && (
              <div className="text-sm text-rose-500 bg-rose-50 px-4 py-3 rounded-lg border border-rose-100 flex items-start gap-2">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {authMode === 'signin' ? 'Sending secure link...' : 'Registering account...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {authMode === 'signin' ? 'Continue with Email' : 'Register with Email'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Bottom toggle link */}
          <div className="mt-6 text-center text-xs text-slate-500 font-medium">
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
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
