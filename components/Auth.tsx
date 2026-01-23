
import React, { useState } from 'react';
import { auth, googleProvider, githubProvider, appleProvider } from '../firebaseConfig';
import { 
  signInWithPopup, 
  getAdditionalUserInfo, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { ArrowRight, Loader2, Mail, X, Github, Sparkles, Lock, Eye, EyeOff, KeyRound, User, School, GraduationCap, Phone } from 'lucide-react';
import { UserProfile } from '../types';
import Logo from './Logo';

interface AuthProps {
  onSignUpSuccess?: (data?: Partial<UserProfile>) => void;
  onClose: () => void;
}

type AuthView = 'login' | 'signup' | 'forgot-password';

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 384 512" fill="currentColor">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z"/>
  </svg>
);

const Auth: React.FC<AuthProps> = ({ onSignUpSuccess, onClose }) => {
  const [view, setView] = useState<AuthView>('login');
  
  // Login Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Extra Sign Up Fields
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleProviderSignIn = async (provider: any, providerName: string) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else if (view === 'signup') {
        const allowedDomains = ['@gmail.com', '@outlook.com', '@microsoft.com'];
        const isValidDomain = allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
        
        if (!isValidDomain) {
          setError("Sign up is restricted to @gmail.com, @outlook.com, or @microsoft.com emails.");
          setLoading(false);
          return;
        }

        if (!name || !grade || !school || !phoneNumber) {
          setError("Please fill in all fields including phone number.");
          setLoading(false);
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        // Update Firebase Profile with Name
        if (result.user) {
            await updateProfile(result.user, {
                displayName: name
            });
        }

        if (onSignUpSuccess) {
          onSignUpSuccess({
              displayName: name,
              institution: school,
              grade: grade,
              phoneNumber: phoneNumber
          });
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Authentication failed.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "Invalid email or password.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already in use.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'forgot-password' && resetSent) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <Mail className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Check your inbox</h2>
            <p className="text-slate-500 mb-6">A password reset link has been sent to <span className="font-bold text-slate-700">{email}</span>.</p>
            <button 
              onClick={() => { setView('login'); setResetSent(false); }}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'forgot-password') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in zoom-in duration-300">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6 text-center">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
              <p className="text-slate-500 mt-2 text-sm">Enter your email and we'll send you a link to reset your password.</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900"
                  />
                </div>
              </div>
              {error && <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full text-sm font-semibold text-slate-500 hover:text-slate-700">Back to Login</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 
         FIX: Changed from absolute to fixed to ensure backdrop covers 
         the entire screen even when scrolling 
      */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* 
         FIX: Added flex container with min-h-full to ensure modal 
         centers correctly but allows scrolling when content is tall 
      */}
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
               <Logo className="w-20 h-20" iconOnly />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              {view === 'login' ? 'Welcome Back!' : 'Join SJ Tutor AI'}
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              {view === 'login' ? 'Log in with your account' : 'Enter your details to create an account.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => handleProviderSignIn(googleProvider, 'Google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </>
              )}
            </button>

            <div className="flex gap-3">
               <button
                  onClick={() => handleProviderSignIn(appleProvider, 'Apple')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-black border border-black rounded-xl font-semibold text-white hover:bg-gray-900 transition-all shadow-sm text-sm"
              >
                  <AppleIcon className="w-5 h-5" />
                  Apple
              </button>
              <button
                  onClick={() => handleProviderSignIn(githubProvider, 'GitHub')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl font-semibold text-white hover:bg-slate-800 transition-all shadow-sm text-sm"
              >
                  <Github className="w-5 h-5" />
                  GitHub
              </button>
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-bold tracking-wider">Or Email</span>
            </div>
          </div>

          <div className="flex gap-4 mb-6 bg-slate-50 p-1 rounded-xl">
            <button
              onClick={() => { setView('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                view === 'login' 
                  ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => { setView('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                view === 'signup' 
                  ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Sign Up Extra Fields */}
            {view === 'signup' && (
              <>
                 <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative">
                      <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required={view === 'signup'}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900"
                      />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Class/Grade</label>
                      <div className="relative">
                          <GraduationCap className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                          <input
                          type="text"
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          placeholder="10th"
                          required={view === 'signup'}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900"
                          />
                      </div>
                  </div>
                   <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">School</label>
                      <div className="relative">
                          <School className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                          <input
                          type="text"
                          value={school}
                          onChange={(e) => setSchool(e.target.value)}
                          placeholder="DPS"
                          required={view === 'signup'}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900"
                          />
                      </div>
                  </div>
                </div>

                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Phone Number</label>
                  <div className="relative">
                      <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                      <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 9876543210"
                      required={view === 'signup'}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900"
                      />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {view === 'login' && (
              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setView('forgot-password')}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 mt-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {view === 'login' ? 'Log In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              By continuing, you agree to SJ Tutor AI's Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
