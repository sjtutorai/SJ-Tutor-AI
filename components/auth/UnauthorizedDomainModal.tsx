import React, { useState } from 'react';
import { ShieldAlert, Globe, Copy, Check, ExternalLink, Mail, KeyRound, RotateCw, X, CheckCircle2 } from 'lucide-react';

interface UnauthorizedDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain?: string;
  provider?: string;
  onRetry?: () => void;
  onSwitchToEmail?: () => void;
  onSwitchToId?: () => void;
}

export const UnauthorizedDomainModal: React.FC<UnauthorizedDomainModalProps> = ({
  isOpen,
  onClose,
  domain: propDomain,
  provider = 'Google',
  onRetry,
  onSwitchToEmail,
  onSwitchToId,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentDomain = propDomain || (typeof window !== 'undefined' ? window.location.hostname : '');
  const consoleSettingsUrl = 'https://console.firebase.google.com/project/sj-tutorai/authentication/settings';

  const handleCopy = async () => {
    if (!currentDomain) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentDomain);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentDomain;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy domain', e);
    }
  };

  const formattedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unauthorized-domain-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 id="unauthorized-domain-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Domain Authorization Required
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Firebase Authentication protects {formattedProvider} Sign-In by requiring this web domain to be allowlisted in the Firebase Console.
            </p>
          </div>
        </div>

        {/* Domain Highlight Box */}
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              Domain to authorize:
            </span>
            {copied && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                <CheckCircle2 className="w-3 h-3" /> Copied!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-mono rounded-lg overflow-x-auto select-all">
              {currentDomain || 'ais-dev-...run.app'}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex-shrink-0"
              title="Copy domain to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* 3 Step Instructions */}
        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-3.5">
          <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">!</span>
            How to authorize in 30 seconds:
          </div>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] sm:text-xs">
            <li>Click <strong>Open Firebase Console</strong> below.</li>
            <li>Scroll down to the <strong>Authorized domains</strong> section.</li>
            <li>Click <strong>Add domain</strong>, paste the domain above, and click <strong>Add</strong>.</li>
          </ol>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <a
            href={consoleSettingsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-sm transition-all hover:shadow-amber-500/20"
          >
            <span>Open Firebase Console Settings</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          {onRetry && (
            <button
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-xs sm:text-sm transition-colors"
            >
              <RotateCw className="w-4 h-4 text-amber-500" />
              <span>I&apos;ve added the domain — Retry {formattedProvider} Sign-In</span>
            </button>
          )}
        </div>

        {/* Alternative Sign-In Options (No Domain Whitelist Needed) */}
        {(onSwitchToEmail || onSwitchToId) && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
              OR CONTINUE IMMEDIATELY (NO SETUP NEEDED)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {onSwitchToEmail && (
                <button
                  onClick={() => {
                    onClose();
                    onSwitchToEmail();
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-500" />
                  <span>Email & Password</span>
                </button>
              )}
              {onSwitchToId && (
                <button
                  onClick={() => {
                    onClose();
                    onSwitchToId();
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>SJ Tutor ID & PIN</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
