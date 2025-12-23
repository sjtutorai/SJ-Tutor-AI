
import React, { useState } from 'react';
import { auth, googleProvider } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { ArrowRight, Loader2, Mail, Lock, X } from 'lucide-react';
import { SJTUTOR_AVATAR } from '../App';

interface AuthProps {
  onSignUpSuccess?: () => void;
  onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSignUpSuccess, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      if (additionalUserInfo?.isNewUser && onSignUpSuccess) {
        onSignUpSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Domain Validation for Sign Up
    if (!isLogin) {
      const allowedDomains = ['@gmail.com', '@outlook.com', '@microsoft.com'];
      const isValidDomain = allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
      
      if (!isValidDomain) {
        setError("Sign up is restricted to @gmail.com, @outlook.com, or @microsoft.com emails.");
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onClose(); // Close modal on successful login
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        if (onSignUpSuccess) {
          onSignUpSuccess();
        }
        // Don't close immediately on signup so onboarding can happen (handled by parent)
      }
    } catch (err: any) {
      const firebaseError = err as { code: string; message: string };
      let errorMessage = "An error occurred. Please try again.";
      
      switch (firebaseError.code) {
        case 'auth/invalid-email':
          errorMessage = "Invalid email address.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled.";
          break;
        case 'auth/user-not-found':
          errorMessage = "No account found with this email.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password.";
          break;
        case 'auth/email-already-in-use':
          errorMessage = "Email is already in use.";
          break;
        case 'auth/weak-password':
          errorMessage = "Password should be at least 6 characters.";
          break;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            {isLogin ? 'Sign in to sync your progress.' : 'Create an account to start your AI learning journey.'}
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all mb-6 shadow-sm"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-bold tracking-wider">Or continue with email</span>
          </div>
        </div>

        <div className="flex gap-4 mb-6 bg-slate-50 p-1 rounded-xl">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              isLogin 
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isLogin 
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900"
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
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
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
  );
};

export default Auth;
