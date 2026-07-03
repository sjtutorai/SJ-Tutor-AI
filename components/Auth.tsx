import React, { useState, useEffect } from 'react';
import { auth, googleProvider, githubProvider, appleProvider } from '../firebaseConfig';
import { 
  signInWithPopup, 
  getAdditionalUserInfo,
  sendSignInLinkToEmail,
} from 'firebase/auth';
import { 
  ArrowRight, 
  Loader2, 
  Mail, 
  X, 
  Github, 
  Sparkles, 
  BookOpen, 
  Sparkle, 
  Brain, 
  GraduationCap, 
  AlertCircle,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import Logo from './Logo';

interface AuthProps {
  onSignUpSuccess?: (data?: Partial<UserProfile>) => void;
  onClose: () => void;
  onCountryDetected?: (country: string) => void;
  initialCountry?: string;
}

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
  </svg>
);

const Auth: React.FC<AuthProps> = ({ onSignUpSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null); // 'google' | 'github' | 'apple' | 'yahoo' | 'email' | null
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Track offline status
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Email validation helper
  const isEmailValid = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleProviderSignIn = async (provider: any, providerName: string, id: string) => {
    if (!isOnline) {
      setError("You appear to be offline. Please verify your internet connection.");
      return;
    }
    setLoading(id);
    setError(null);
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      if (additionalUserInfo?.isNewUser && onSignUpSuccess) {
        onSignUpSuccess();
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
      setLoading(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter an email address.");
      return;
    }
    if (!isEmailValid(email)) {
      setError("Email address is invalid.");
      return;
    }
    if (!isOnline) {
      setError("You are currently offline. Connect to the internet to sign in.");
      return;
    }
    setLoading('email');
    setError(null);

    const actionCodeSettings = {
      url: window.location.origin + "/", // Redirect back to homepage
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setEmailSent(true);
      setResendTimer(60);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-email') {
         setError("Email address is invalid.");
      } else if (err.code === 'auth/too-many-requests') {
         setError("Too many attempts. Please try again after some time.");
      } else {
         setError("We couldn't send the magic link. Please check your network and try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      {/* Container wrapper */}
      <div className="w-full max-w-5xl h-full lg:h-[650px] bg-slate-900 lg:border lg:border-slate-800 rounded-none lg:rounded-3xl shadow-2xl flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 z-50 p-2.5 text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 rounded-full transition-all active:scale-95"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT MARKETING SIDE: Desktop Only Animation */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800/80">
          
          {/* Subtle slow moving glowing background blobs */}
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[70px] pointer-events-none"></div>

          {/* Logo header */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-blue-500 shadow-md">
              <Logo className="w-full h-full" iconOnly />
            </div>
            <div>
              <h2 className="text-md font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tight leading-none">
                SJ Tutor AI
              </h2>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                Interactive Study Suite
              </span>
            </div>
          </div>

          {/* Interactive floating elements animation */}
          <div className="relative h-60 flex items-center justify-center">
            {/* Center Brain Element */}
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 3, -3, 0]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="w-32 h-32 bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-cyan-500/20 border border-blue-500/30 rounded-full flex items-center justify-center relative z-20 backdrop-blur-md shadow-2xl"
            >
              <Brain className="w-14 h-14 text-blue-400 animate-pulse" />
              
              {/* Spinning particle ring */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-12px] border border-dashed border-purple-500/30 rounded-full"
              />
            </motion.div>

            {/* Float Item 1: Books */}
            <motion.div
              animate={{ y: [0, -15, 0], x: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-8 left-10 p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center gap-2 shadow-lg"
            >
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span className="text-xs text-slate-300 font-bold">Interactive Learning</span>
            </motion.div>

            {/* Float Item 2: Graduation Cap */}
            <motion.div
              animate={{ y: [0, 12, 0], x: [0, -8, 8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-8 right-12 p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl flex items-center gap-2 shadow-lg"
            >
              <GraduationCap className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-slate-300 font-bold">CBSE / ICSE Mastery</span>
            </motion.div>

            {/* Math icon floating particle */}
            <motion.span 
              animate={{ opacity: [0.3, 0.8, 0.3], y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-10 right-24 text-cyan-400 font-mono text-xl font-bold"
            >
              f(x)
            </motion.span>

            {/* Science atom floating particle */}
            <motion.span 
              animate={{ opacity: [0.2, 0.7, 0.2], rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-16 left-20 text-purple-400"
            >
              <Sparkle className="w-6 h-6" />
            </motion.span>
          </div>

          {/* Titles & copy */}
          <div className="space-y-3 relative z-10">
            <h1 className="text-3xl font-black text-white leading-tight">
              Study Smarter with AI
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Join thousands of students using AI to learn faster, score higher, and stay organized.
            </p>
          </div>
        </div>

        {/* RIGHT CARD SIDE: Sign Up experience */}
        <div className="w-full lg:w-1/2 bg-slate-900 p-8 sm:p-12 flex flex-col justify-center overflow-y-auto relative">
          
          <AnimatePresence mode="wait">
            {!emailSent ? (
              /* CARD: ENTER CREDENTIALS SCREEN */
              <motion.div
                key="login-form-card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-[420px] mx-auto w-full space-y-6"
              >
                {/* Mobile Top Header */}
                <div className="text-center lg:text-left space-y-2">
                  <div className="lg:hidden flex justify-center mb-3">
                    <Logo className="w-14 h-14" iconOnly />
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Create your account
                  </h3>
                  <p className="text-xs text-slate-400">
                    Start your learning journey in less than 30 seconds.
                  </p>
                </div>

                {/* Offline State Alert */}
                {!isOnline && (
                  <div className="bg-amber-950/40 border border-amber-900/40 text-amber-300 p-3 rounded-xl flex items-center gap-2.5 text-xs">
                    <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Working Offline. Network-based features are suspended.</span>
                  </div>
                )}

                {/* Social Logins */}
                <div className="space-y-2.5">
                  {/* Google */}
                  <button
                    onClick={() => handleProviderSignIn(googleProvider, 'Google', 'google')}
                    disabled={!!loading}
                    className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl font-bold text-slate-200 text-sm transition-all flex items-center justify-center gap-3 active:scale-98"
                  >
                    {loading === 'google' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    ) : (
                      <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                    )}
                    <span>Continue with Google</span>
                  </button>

                  {/* GitHub */}
                  <button
                    onClick={() => handleProviderSignIn(githubProvider, 'GitHub', 'github')}
                    disabled={!!loading}
                    className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl font-bold text-slate-200 text-sm transition-all flex items-center justify-center gap-3 active:scale-98"
                  >
                    {loading === 'github' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Github className="w-4.5 h-4.5 text-white shrink-0" />
                    )}
                    <span>Continue with GitHub</span>
                  </button>

                  {/* Apple (Only if verified support) */}
                  <button
                    onClick={() => handleProviderSignIn(appleProvider, 'Apple', 'apple')}
                    disabled={!!loading}
                    className="w-full py-3 px-4 bg-black hover:bg-black/90 border border-slate-800 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-3 active:scale-98"
                  >
                    {loading === 'apple' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <AppleIcon className="w-4.5 h-4.5 text-white shrink-0" />
                    )}
                    <span>Continue with Apple</span>
                  </button>
                </div>

                {/* Divider OR */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-3 text-slate-500 font-bold tracking-widest font-mono">OR</span>
                  </div>
                </div>

                {/* Passwordless Magic Link form */}
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 font-mono">EMAIL ADDRESS</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-500" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@gmail.com"
                        required
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition font-medium"
                      />
                    </div>
                    {email && !isEmailValid(email) && (
                      <p className="text-[10px] text-amber-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Please provide a valid email format.
                      </p>
                    )}
                  </div>

                  {error && (
                    <div className="text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 p-3.5 rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!!loading || !email || !isEmailValid(email)}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
                  >
                    {loading === 'email' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending secure link...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-cyan-300" />
                        <span>Continue with Email</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer terms agreement */}
                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  By continuing, you agree to our <a href="#/terms" className="text-slate-400 hover:underline">Terms of Service</a> and <a href="#/privacy" className="text-slate-400 hover:underline">Privacy Policy</a>. <br/> Need help? <a href="mailto:support@sjtutorai.com" className="text-blue-400 hover:underline">Contact Support</a>
                </p>
              </motion.div>
            ) : (
              /* CARD: EMAIL SENT SUCCESS SCREEN */
              <motion.div
                key="email-sent-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-[420px] mx-auto w-full text-center space-y-6"
              >
                <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto relative shadow-2xl">
                  <Mail className="w-10 h-10 text-blue-400 animate-pulse" />
                  <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full border border-slate-900 animate-ping"></div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white">Magic Link Sent!</h3>
                  <p className="text-xs text-slate-400">
                    We sent a secure, passwordless magic sign-in link to:
                  </p>
                  <p className="text-sm font-black text-blue-400 underline font-mono select-all">
                    {email}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs text-slate-400 leading-relaxed">
                  📋 <strong>How to continue:</strong> Check your inbox and spam folder. Click the secure sign-in link inside the email to complete authentication and start onboarding.
                </div>

                <div className="space-y-3 pt-3">
                  {/* Open Gmail App */}
                  <button
                    onClick={() => {
                      const domain = email.split('@')[1]?.toLowerCase();
                      if (domain === 'gmail.com') window.open('https://mail.google.com', '_blank');
                      else if (domain === 'yahoo.com') window.open('https://mail.yahoo.com', '_blank');
                      else if (domain === 'outlook.com' || domain === 'hotmail.com') window.open('https://outlook.live.com', '_blank');
                      else window.open('https://mail.google.com', '_blank');
                    }}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
                  >
                    Open Gmail / Inbox
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Resend Link */}
                    <button
                      onClick={handleEmailSignIn}
                      disabled={resendTimer > 0 || !!loading}
                      className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-xl font-bold text-xs transition"
                    >
                      {resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend Link'}
                    </button>

                    {/* Change Email */}
                    <button
                      onClick={() => setEmailSent(false)}
                      className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
                    >
                      Change Email
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setEmailSent(false)}
                  className="text-xs text-slate-500 hover:text-white font-bold inline-flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Go Back</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default Auth;
