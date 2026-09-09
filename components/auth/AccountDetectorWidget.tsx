import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertCircle, ArrowRight, Loader2, UserCheck, UserPlus } from 'lucide-react';
import { detectUserRegistration, getDeviceRegisteredUser, AccountDetectionResult } from '../../utils/registrationDetection';

interface AccountDetectorWidgetProps {
  onSelectAction: (mode: 'signin' | 'signup', prefilledIdentifier?: string) => void;
  variant?: 'modal' | 'landing' | 'inline';
  initialIdentifier?: string;
  autoCheckDevice?: boolean;
}

export const AccountDetectorWidget: React.FC<AccountDetectorWidgetProps> = ({
  onSelectAction,
  variant = 'modal',
  initialIdentifier = '',
  autoCheckDevice = true,
}) => {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<AccountDetectionResult | null>(null);
  const [deviceUser, setDeviceUser] = useState<any>(null);

  useEffect(() => {
    if (autoCheckDevice) {
      const dev = getDeviceRegisteredUser();
      if (dev.hasRegistered) {
        setDeviceUser(dev);
      }
    }
  }, [autoCheckDevice]);

  const handleCheck = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) return;

    setIsChecking(true);
    setResult(null);

    try {
      const res = await detectUserRegistration(identifier.trim());
      setResult(res);
    } catch (err) {
      console.error("Error detecting registration:", err);
    } finally {
      setIsChecking(false);
    }
  };

  // If user types a new identifier, reset previous result
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    if (result) setResult(null);
  };

  const isLandingVariant = variant === 'landing';

  return (
    <div
      className={`w-full rounded-2xl transition-all ${
        isLandingVariant
          ? 'bg-slate-900/90 border border-slate-800 p-5 md:p-6 shadow-2xl backdrop-blur-md'
          : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5'
      }`}
    >
      {/* Header / Intro */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              Registration Detector
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Smart Check
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Check if you already have an account or need to register
            </p>
          </div>
        </div>

        {deviceUser && !result && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Device recognized
          </span>
        )}
      </div>

      {/* Device Auto-detection banner if available & no custom search result */}
      {deviceUser && !result && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-xs text-emerald-800 dark:text-emerald-200">
              Existing student detected on this device:{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {deviceUser.name || deviceUser.email || deviceUser.sjTutorId}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectAction('signin', deviceUser.email || deviceUser.sjTutorId)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0"
          >
            <span>Log In Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Input Form */}
      <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={identifier}
            onChange={handleInputChange}
            placeholder="Enter your Email or SJ Tutor ID (e.g. student@email.com or SJTA-123456)"
            className="w-full pl-3 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
          />
          {identifier && (
            <button
              type="button"
              onClick={() => {
                setIdentifier('');
                setResult(null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isChecking || !identifier.trim()}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Detecting...</span>
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              <span>Detect Account</span>
            </>
          )}
        </button>
      </form>

      {/* Result Display & Recommendation Banner */}
      {result && (
        <div className="mt-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
          {result.isRegistered ? (
            /* ────────── REGISTERED USER DETECTED ────────── */
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      Registered Account Detected!
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                      Action Required: Log In
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-1 leading-relaxed">
                    We found an existing registered account for{' '}
                    <span className="font-semibold text-emerald-950 dark:text-emerald-100">
                      {result.matchedName ? `${result.matchedName} (${result.identifier})` : result.identifier}
                    </span>
                    . You should <strong>Log In</strong> with your credentials.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectAction('signin', result.matchedEmail || result.matchedSjTutorId || result.identifier)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Proceed to Log In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectAction('signup')}
                      className="px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                    >
                      Need a different account? Register
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ────────── UNREGISTERED USER DETECTED ────────── */
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                      No Registered Account Found
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                      Action Required: Register
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                    We searched our records and found no account registered for{' '}
                    <span className="font-semibold text-amber-950 dark:text-amber-100">
                      {result.identifier}
                    </span>
                    . You should <strong>Register (Sign Up)</strong> to get your personalized student ID and AI study tools.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectAction('signup', result.identifier.includes('@') ? result.identifier : undefined)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Proceed to Register (Sign Up)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectAction('signin')}
                      className="px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      Already registered with another email? Log In
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
