import React, { useState, useEffect } from 'react';
import { auth, googleProvider, githubProvider, appleProvider, yahooProvider } from '../firebaseConfig';
import { 
  signInWithPopup, 
  getAdditionalUserInfo, 
  sendSignInLinkToEmail 
} from 'firebase/auth';
import { 
  ArrowRight, 
  Loader2, 
  Mail, 
  X, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import Logo from './Logo';
import { UserProfile } from '../types';

interface AuthProps {
  onSignUpSuccess?: (data?: Partial<UserProfile>) => void;
  onClose: () => void;
  onCountryDetected?: (countryCode: string | null) => void;
  initialCountry?: string | null;
}

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
  </svg>
);

const Auth: React.FC<AuthProps> = ({ onClose, onSignUpSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  
  // Resend Timer State
  const [resendTimer, setResendTimer] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validateEmail = (emailStr: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const handleSendMagicLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);
    setResendStatus(null);

    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Store email locally for same-device verification
      window.localStorage.setItem('emailForSignIn', email);
      
      setLinkSent(true);
      setResendTimer(60);
      setResendStatus("Magic Link Sent Successfully!");
    } catch (err: any) {
      console.error("sendSignInLinkToEmail error:", err);
      let friendlyError = "Failed to send Magic Link. Please check your connection and try again.";
      if (err.code === 'auth/invalid-email') {
        friendlyError = "The email address is invalid. Please check and try again.";
      } else if (err.code === 'auth/network-request-failed') {
        friendlyError = "Unable to connect. Please check your internet connection.";
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSignIn = async (provider: any, providerName: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      // Save sign in state so App.tsx can display welcome back or created screen
      sessionStorage.setItem("just_signed_in_type", additionalUserInfo?.isNewUser ? "created" : "welcome");
      
      if (additionalUserInfo?.isNewUser && onSignUpSuccess) {
        onSignUpSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      let friendlyError = `Something went wrong. Please try again.`;
      if (err.code === 'auth/account-exists-with-different-credential') {
        friendlyError = "This email is associated with another sign-in method. Please use that method to continue.";
      } else if (err.code === 'auth/network-request-failed') {
        friendlyError = "Unable to connect. Please check your internet connection.";
      } else {
        friendlyError = `Failed to sign in with ${providerName}. Please try again.`;
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md text-center animate-in fade-in zoom-in duration-300">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Check your inbox!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              We have sent a secure sign-in link to <br/>
              <span className="font-bold text-slate-700 dark:text-slate-200">{email}</span>.
              <br/><br/>
              Please click the link in your email to continue.
            </p>
            
            <div className="space-y-3 mb-6">
              <button 
                onClick={() => handleSendMagicLink()}
                disabled={resendTimer > 0 || loading}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Link"}
              </button>
              
              <button 
                onClick={() => { setLinkSent(false); setError(null); }}
                className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                Change Email
              </button>
            </div>

            {resendStatus && (
               <div className="mb-4 text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-50 dark:bg-emerald-950/30 py-2 rounded-lg animate-in fade-in">
                 {resendStatus}
               </div>
            )}

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Didn&apos;t receive it? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-md animate-in fade-in zoom-in duration-300">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6 text-center">
            <div className="flex justify-center mb-4">
               <Logo className="w-20 h-20" iconOnly />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
              Welcome to SJ Tutor AI
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              Sign in securely without a password
            </p>
          </div>

          <form onSubmit={handleSendMagicLink} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-150 dark:border-red-900/50 flex flex-col gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="self-start text-xs font-bold text-red-600 dark:text-red-400 hover:underline uppercase tracking-wider"
                >
                  Dismiss
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span>Send Magic Link</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500 font-bold tracking-wider">Or Continue With</span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Continue with Google */}
            <button
              type="button"
              onClick={() => handleProviderSignIn(googleProvider, 'Google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 active:bg-slate-100 transition-all shadow-sm text-sm group"
            >
              <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105 duration-200" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Google</span>
            </button>

            {/* Continue with Yahoo */}
            <button
              type="button"
              onClick={() => handleProviderSignIn(yahooProvider, 'Yahoo')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 active:bg-slate-100 transition-all shadow-sm text-sm group"
            >
              <svg className="w-5 h-5 shrink-0 text-[#6001D2] transition-transform group-hover:scale-105 duration-200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.016 11.164l4.306-7.164h-2.825l-2.83 5.163-2.831-5.163h-2.832l4.307 7.164v5.836h2.705v-5.836zm6.305-7.164h2.001v8.5h-2.001v-8.5zm0 10.5h2.001v2.5h-2.001v-2.5z" />
              </svg>
              <span>Yahoo</span>
            </button>

            {/* Continue with GitHub */}
            <button
              type="button"
              onClick={() => handleProviderSignIn(githubProvider, 'GitHub')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 active:bg-slate-100 transition-all shadow-sm text-sm group"
            >
              <svg className="w-5 h-5 shrink-0 text-slate-900 dark:text-white transition-transform group-hover:scale-105 duration-200" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              <span>GitHub</span>
            </button>

            {/* Continue with Apple */}
            <button
              type="button"
              onClick={() => handleProviderSignIn(appleProvider, 'Apple')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 active:bg-slate-100 transition-all shadow-sm text-sm group"
            >
              <AppleIcon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105 duration-200 text-slate-900 dark:text-white" />
              <span>Apple</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              By continuing, you agree to SJ Tutor AI&apos;s Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
