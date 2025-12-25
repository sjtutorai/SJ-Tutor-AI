
import React, { useState, useEffect } from 'react';
import { auth, googleProvider, githubProvider } from '../firebaseConfig';
import { 
  sendSignInLinkToEmail, 
  signInWithPopup, 
  getAdditionalUserInfo, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { ArrowRight, Loader2, Mail, X, Github, Sparkles, CheckCircle, Phone, Key } from 'lucide-react';
import { SJTUTOR_AVATAR } from '../App';

interface AuthProps {
  onSignUpSuccess?: () => void;
  onClose: () => void;
}

type AuthMethod = 'EMAIL' | 'PHONE';

const Auth: React.FC<AuthProps> = ({ onSignUpSuccess, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('EMAIL');
  
  // Email States
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  // Phone States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  // General States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[Auth] Component mounted. Current mode:", isLogin ? "Login" : "SignUp");
    return () => console.log("[Auth] Component unmounted.");
  }, [isLogin]);

  const setupRecaptcha = (buttonId: string) => {
    try {
      console.log("[Auth] Setting up Recaptcha on element:", buttonId);
      return new RecaptchaVerifier(auth, buttonId, {
        'size': 'invisible',
        'callback': (response: any) => {
          console.log("[Auth] Recaptcha verified successfully.");
        },
        'expired-callback': () => {
          console.warn("[Auth] Recaptcha expired.");
        }
      });
    } catch (err) {
      console.error("[Auth] Error setting up Recaptcha:", err);
      return null;
    }
  };

  const handleGoogleSignIn = async () => {
    console.log("[Auth] Initiating Google Sign-In...");
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      console.log("[Auth] Google Sign-In successful. New User:", additionalUserInfo?.isNewUser);
      
      if (additionalUserInfo?.isNewUser && onSignUpSuccess) {
        onSignUpSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error("[Auth] Google Sign-In error:", err);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    console.log("[Auth] Initiating GitHub Sign-In...");
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      console.log("[Auth] GitHub Sign-In successful. New User:", additionalUserInfo?.isNewUser);
      
      if (additionalUserInfo?.isNewUser && onSignUpSuccess) {
        onSignUpSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error("[Auth] GitHub Sign-In error:", err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError("An account already exists with the same email but different sign-in credentials. Please use Google.");
      } else {
        setError("Failed to sign in with GitHub. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Auth] Requesting Magic Link for:", email);
    setLoading(true);
    setError(null);

    const actionCodeSettings = {
      url: window.location.href.split('?')[0].split('#')[0],
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      console.log("[Auth] Magic link sent successfully.");
      setLinkSent(true);
    } catch (err: any) {
      console.error("[Auth] Magic link error:", err);
      setError(err.message || "Failed to send magic link. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Auth] Requesting Phone OTP for:", phoneNumber);
    setLoading(true);
    setError(null);

    const appVerifier = setupRecaptcha('phone-signin-button');
    if (!appVerifier) {
      setError("Failed to initialize security verification. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      console.log("[Auth] Phone OTP sent successfully.");
      setOtpSent(true);
    } catch (err: any) {
      console.error("[Auth] Phone Sign-In error:", err);
      setError(err.message || "Failed to send OTP. Ensure the phone number is in international format (e.g., +919876543210).");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    
    console.log("[Auth] Verifying Phone OTP...");
    setLoading(true);
    setError(null);

    try {
      const result = await confirmationResult.confirm(verificationCode);
      const additionalUserInfo = getAdditionalUserInfo(result);
      console.log("[Auth] Phone Sign-In verified. New User:", additionalUserInfo?.isNewUser);

      if (additionalUserInfo?.isNewUser && onSignUpSuccess) {
        onSignUpSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error("[Auth] OTP Verification error:", err);
      setError("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md text-center animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email!</h2>
          <p className="text-slate-500 mb-6 text-sm">We've sent a magic link to <strong>{email}</strong>. Click the link in your inbox to sign in instantly.</p>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center shadow-xl shadow-primary-500/20 mx-auto mb-4 overflow-hidden border-4 border-white">
            <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            {isLogin ? 'Welcome Back!' : 'Join SJ Tutor AI'}
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            {otpSent ? 'Enter the code sent to your phone.' : (isLogin ? 'Sign in to access your dashboard.' : 'Enter your details to create an account.')}
          </p>
        </div>

        {!otpSent && (
          <>
            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={handleGithubSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-900 border border-slate-800 rounded-xl font-semibold text-white hover:bg-slate-800 transition-all shadow-sm"
              >
                <Github className="w-5 h-5" />
                Continue with GitHub
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold tracking-wider">Or use magic link</span>
              </div>
            </div>

            <div className="flex gap-4 mb-6 bg-slate-50 p-1 rounded-xl">
              <button
                onClick={() => { setAuthMethod('EMAIL'); setError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  authMethod === 'EMAIL' 
                    ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                onClick={() => { setAuthMethod('PHONE'); setError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  authMethod === 'PHONE' 
                    ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Phone className="w-4 h-4" />
                Phone
              </button>
            </div>
          </>
        )}

        {authMethod === 'EMAIL' && !otpSent && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 mt-4 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Magic Link <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}

        {authMethod === 'PHONE' && !otpSent && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+919876543210"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 text-sm"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 ml-1">Include country code (e.g., +91 for India)</p>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              id="phone-signin-button"
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 mt-4 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <Sparkles className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {otpSent && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Verification Code</label>
              <div className="relative">
                <Key className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900 text-sm tracking-[0.5em] font-mono text-center"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !verificationCode}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 mt-4 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify Code <CheckCircle className="w-5 h-5" /></>}
            </button>

            <button
              type="button"
              onClick={() => { setOtpSent(false); setVerificationCode(''); }}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
            >
              Edit Phone Number
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            {authMethod === 'EMAIL' ? 'No password needed. Click the link we send.' : 'We\'ll send a one-time code to your phone.'}
          </p>
          {!otpSent && (
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="mt-2 text-xs font-bold text-primary-600 hover:underline"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
