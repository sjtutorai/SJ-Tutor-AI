
import React, { useState } from 'react';
import { auth, googleProvider, githubProvider } from '../firebaseConfig';
import { sendSignInLinkToEmail, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { ArrowRight, Loader2, Mail, X, Github, Sparkles, CheckCircle } from 'lucide-react';
import { SJTUTOR_AVATAR } from '../App';

interface AuthProps {
  onSignUpSuccess?: () => void;
  onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSignUpSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      if (additionalUserInfo?.isNewUser && onSignUpSuccess) onSignUpSuccess();
      else onClose();
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in with Google.");
    } finally { setLoading(false); }
  };

  const handleGithubSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      if (additionalUserInfo?.isNewUser && onSignUpSuccess) onSignUpSuccess();
      else onClose();
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in with GitHub.");
    } finally { setLoading(false); }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const actionCodeSettings = {
      // Must be a valid URL pointing back to where your app is hosted
      url: window.location.href,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setLinkSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send magic link. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
        <div className="relative bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md text-center animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email!</h2>
          <p className="text-slate-500 mb-6">We've sent a magic link to <strong>{email}</strong>. Click the link in your inbox to sign in instantly.</p>
          <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Got it!</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"><X className="w-5 h-5" /></button>

        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center shadow-xl shadow-primary-500/20 mx-auto mb-4 overflow-hidden border-4 border-white">
            <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Passwordless Sign In</h2>
          <p className="text-slate-500 mt-2 text-sm">Enter your email and we'll send you a magic link to sign in instantly.</p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <button onClick={handleGoogleSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <button onClick={handleGithubSignIn} disabled={loading} className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-900 border border-slate-800 rounded-xl font-semibold text-white hover:bg-slate-800 transition-all shadow-sm">
            <Github className="w-5 h-5" /> Continue with GitHub
          </button>
        </div>

        <div className="relative mb-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <span className="relative bg-white px-2 text-xs uppercase text-slate-400 font-bold tracking-wider">Or use email</span>
        </div>

        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all text-slate-900" />
            </div>
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">{error}</div>}

          <button type="submit" disabled={loading || !email} className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Magic Link <Sparkles className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">No password needed. Just a simple, secure link.</p>
      </div>
    </div>
  );
};

export default Auth;
