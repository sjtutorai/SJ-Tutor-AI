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
      console.error('Error detecting registration:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    if (result) setResult(null);
  };

  const isDarkSurface = variant === 'landing';

  return (
    <div
      className={`w-full rounded-2xl transition-all ${
        isDarkSurface
          ? 'bg-[#08102B]/90 border border-blue-400/20 p-5 md:p-6 shadow-2xl backdrop-blur-xl text-slate-100'
          : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              isDarkSurface
                ? 'bg-blue-500/15 text-blue-400 border-blue-400/25'
                : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            }`}
          >
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDarkSurface ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              <span>Registration Detector</span>
              <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest">
                · Smart Check
              </span>
            </h3>
            <p className={`text-xs ${isDarkSurface ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
              Check if you already have an account or need to register
            </p>
          </div>
        </div>

        {deviceUser && !result && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Device recognized</span>
          </span>
        )}
      </div>

      {/* Device Auto-detection banner */}
      {deviceUser && !result && (
        <div
          className={`mb-3 p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 ${
            isDarkSurface
              ? 'bg-emerald-500/10 border-emerald-400/25'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className={`text-xs ${isDarkSurface ? 'text-emerald-200' : 'text-emerald-800 dark:text-emerald-200'}`}>
              Existing student detected:{' '}
              <strong className={`font-semibold ${isDarkSurface ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {deviceUser.name || deviceUser.email || deviceUser.sjTutorId}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectAction('signin', deviceUser.email || deviceUser.sjTutorId)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
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
            placeholder="Enter Email or SJ Tutor ID (e.g. SJTA-123456)"
            className={`w-full pl-3.5 pr-9 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm border ${
              isDarkSurface
                ? 'bg-[#04091E]/90 border-blue-400/25 text-white placeholder-slate-400'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400'
            }`}
          />
          {identifier && (
            <button
              type="button"
              onClick={() => {
                setIdentifier('');
                setResult(null);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isChecking || !identifier.trim()}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
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

      {/* Result Display */}
      {result && (
        <div className="mt-3.5">
          {result.isRegistered ? (
            <div
              className={`p-3.5 rounded-xl border ${
                isDarkSurface
                  ? 'bg-emerald-950/50 border-emerald-500/35'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className={`text-xs sm:text-sm font-bold ${isDarkSurface ? 'text-emerald-200' : 'text-emerald-900 dark:text-emerald-200'}`}>
                      Registered Account Detected
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Action: Log In
                    </span>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${isDarkSurface ? 'text-emerald-200/80' : 'text-emerald-800 dark:text-emerald-300/90'}`}>
                    We found an existing account for{' '}
                    <span className={`font-semibold ${isDarkSurface ? 'text-white' : 'text-emerald-950 dark:text-emerald-100'}`}>
                      {result.matchedName ? `${result.matchedName} (${result.identifier})` : result.identifier}
                    </span>
                    .
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectAction('signin', result.matchedEmail || result.matchedSjTutorId || result.identifier)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Proceed to Log In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectAction('signup')}
                      className={`px-3 py-2 text-xs font-medium hover:underline cursor-pointer ${
                        isDarkSurface ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      Register another account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`p-3.5 rounded-xl border ${
                isDarkSurface
                  ? 'bg-blue-950/50 border-blue-500/35'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/60'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className={`text-xs sm:text-sm font-bold ${isDarkSurface ? 'text-blue-200' : 'text-blue-900 dark:text-blue-200'}`}>
                      No Registered Account Found
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      Action: Register
                    </span>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${isDarkSurface ? 'text-blue-200/80' : 'text-blue-800 dark:text-blue-300/90'}`}>
                    No account registered for{' '}
                    <span className={`font-semibold ${isDarkSurface ? 'text-white' : 'text-blue-950 dark:text-blue-100'}`}>
                      {result.identifier}
                    </span>
                    . Register to get your personalized student ID and AI study tools.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectAction('signup', result.identifier.includes('@') ? result.identifier : undefined)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Proceed to Sign Up</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectAction('signin')}
                      className={`px-3 py-2 text-xs font-medium hover:underline cursor-pointer ${
                        isDarkSurface ? 'text-blue-300' : 'text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      Already registered? Log In
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
