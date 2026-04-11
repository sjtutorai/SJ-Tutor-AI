import React, { useState } from 'react';
import { auth, googleProvider, githubProvider, appleProvider } from './firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { motion } from 'framer-motion';
import { LogIn, Github, Mail, Chrome } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSocialLogin = async (provider: any) => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-100 to-primary-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary-600/20">
              <LogIn className="text-white w-8 h-8" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">SJ Tutor AI</CardTitle>
            <CardDescription className="text-slate-500">Your intelligent study companion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="rounded-xl h-12" onClick={() => handleSocialLogin(googleProvider)} disabled={loading}>
                <Chrome className="w-5 h-5" />
              </Button>
              <Button variant="outline" className="rounded-xl h-12" onClick={() => handleSocialLogin(githubProvider)} disabled={loading}>
                <Github className="w-5 h-5" />
              </Button>
              <Button variant="outline" className="rounded-xl h-12" onClick={() => handleSocialLogin(appleProvider)} disabled={loading}>
                <span className="font-bold text-lg"></span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="rounded-xl h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  className="rounded-xl h-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button type="submit" className="w-full btn-primary h-12 rounded-xl" disabled={loading}>
                {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 bg-slate-50/50 py-4">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary-700 hover:text-primary-800 font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};
