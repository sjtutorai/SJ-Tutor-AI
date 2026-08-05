const fs = require('fs');
let content = fs.readFileSync('components/Auth.tsx', 'utf8');

// Update password field condition
content = content.replace(
  '<div className="space-y-1.5">\n              <label className="text-xs font-bold text-slate-600 ml-1">Password</label>',
  '{authMode !== "reset" && (\n              <div className="space-y-1.5">\n              <label className="text-xs font-bold text-slate-600 ml-1">Password</label>'
);

content = content.replace(
  'className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-slate-400"\n                />\n              </div>\n            </div>',
  'className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-slate-400"\n                />\n              </div>\n            </div>\n            )}'
);

// Add message block and forgot password link
const errorBlock = `{error && (
              <div className="text-sm text-rose-500 bg-rose-50 px-4 py-3 rounded-lg border border-rose-100 flex items-start gap-2">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}`;

const messageBlock = `{error && (
              <div className="text-sm text-rose-500 bg-rose-50 px-4 py-3 rounded-lg border border-rose-100 flex items-start gap-2">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {message && (
              <div className="text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                {message}
              </div>
            )}
            
            {authMode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('reset');
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}`;

content = content.replace(errorBlock, messageBlock);

// Update button text
content = content.replace(
  `{authMode === 'signin' ? 'Signing in...' : 'Registering account...'}`,
  `{authMode === 'reset' ? 'Sending reset link...' : authMode === 'signin' ? 'Signing in...' : 'Registering account...'}`
);

content = content.replace(
  `{authMode === 'signin' ? 'Continue with Email' : 'Register with Email'}`,
  `{authMode === 'reset' ? 'Send Reset Link' : authMode === 'signin' ? 'Continue with Email' : 'Register with Email'}`
);

// Update bottom toggle links
const bottomLinks = `<div className="mt-6 text-center text-xs text-slate-500 font-medium">
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
          </div>`;

const newBottomLinks = `<div className="mt-6 text-center text-xs text-slate-500 font-medium">
            {authMode === 'reset' ? (
              <p>
                Remember your password?{' '}
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setMessage(null);
                  }}
                  className="text-primary-600 hover:text-primary-700 font-bold transition-colors underline"
                >
                  Back to Sign in
                </button>
              </p>
            ) : authMode === 'signin' ? (
              <p>
                New to SJ Tutor AI?{' '}
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setError(null);
                    setMessage(null);
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
                    setMessage(null);
                  }}
                  className="text-primary-600 hover:text-primary-700 font-bold transition-colors underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>`;

content = content.replace(bottomLinks, newBottomLinks);

fs.writeFileSync('components/Auth.tsx', content);
console.log("Patch UI applied.");
