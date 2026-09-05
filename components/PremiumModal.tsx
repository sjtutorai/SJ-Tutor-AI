import React, { useState, useEffect } from 'react';
import { X, Check, Crown, Zap, Shield, ExternalLink, QrCode, Copy, CheckCircle, Clock, MessageSquare, PhoneCall, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import Logo from './Logo';
import { calculateTrialInfo, TrialInfo } from './TrialTimerWidget';

interface PremiumModalProps {
  onClose: () => void;
  onPaymentSuccess?: (credits: number, planName: 'STARTER' | 'SCHOLAR' | 'ACHIEVER') => void;
  userProfile?: UserProfile;
  uid?: string;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, userProfile, uid }) => {
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'SCHOLAR' | 'ACHIEVER'>('SCHOLAR');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [trial, setTrial] = useState<TrialInfo>(() => calculateTrialInfo(userProfile, uid));

  // Sync URL for direct link bookmarking / routing
  useEffect(() => {
    const originalPath = window.location.pathname;
    window.history.replaceState(null, 'Premium Plans - SJ Tutor AI', '/premium');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.history.replaceState(null, '', originalPath === '/premium' || originalPath === '/pricing' ? '/dashboard' : originalPath);
    };
  }, [onClose]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrial(calculateTrialInfo(userProfile, uid));
    }, 1000);
    return () => clearInterval(interval);
  }, [userProfile, uid]);

  const upiId = '8105423488@ybl';
  const whatsappNumber = '+91 8105423488';
  const payeeName = 'SHIVABASAVARAJ SADASHIVAPPA JYOTI';

  const plans = {
    STARTER: {
      name: 'Starter',
      price: 99,
      creditAmount: 500,
      generations: '500 Generations',
      features: ['500 AI Generations', 'Basic Support', 'Standard Speed', 'All Study Tools'],
      color: 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
      btnColor: 'bg-blue-600 hover:bg-blue-700'
    },
    SCHOLAR: {
      name: 'Scholar',
      price: 299,
      creditAmount: 2000,
      generations: '2000 Generations',
      features: ['2000 AI Generations', 'Priority Support', 'Fast Generation', 'Export to PDF', 'All Study Modes'],
      color: 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100',
      btnColor: 'bg-amber-600 hover:bg-amber-700'
    },
    ACHIEVER: {
      name: 'Achiever',
      price: 499,
      creditAmount: 99999,
      generations: 'Unlimited Generations',
      features: ['Unlimited Generations', '24/7 Priority Support', 'Turbo Speed', 'All Future AI Features', 'Lifetime Access'],
      color: 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100',
      btnColor: 'bg-purple-600 hover:bg-purple-700'
    }
  };

  const currentPlan = plans[selectedPlan];

  const upiPayString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${currentPlan.price}&cu=INR&tn=SJ%20Tutor%20AI%20${currentPlan.name}%20Plan`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayString)}`;

  const copyUpiToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const copyUidToClipboard = () => {
    if (uid || userProfile?.email) {
      navigator.clipboard.writeText(uid || userProfile?.email || '');
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello SJ Tutor AI Team,\n\nI have completed the payment of ₹${currentPlan.price} for the ${currentPlan.name} Plan.\n\n👤 Name: ${userProfile?.displayName || 'Student'}\n📧 Email: ${userProfile?.email || 'N/A'}\n🆔 User ID: ${uid || 'N/A'}\n\nPlease find my payment screenshot attached for manual verification and activation.`
  );

  const whatsappUrl = `https://wa.me/918105423488?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row border border-slate-200 dark:border-slate-800">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Plans Selection */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50/60 dark:bg-slate-950/60 custom-scrollbar">
          <div className="text-center md:text-left mb-6">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <Crown className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Upgrade Your Plan</h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select your preferred plan and complete manual payment verification.
            </p>

            {/* Trial Status Callout */}
            {!trial.isPro && (
              <div className="mt-4 p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl border border-indigo-500/30 shadow-sm flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <Clock className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      {trial.isExpired ? '10-Day Trial Concluded' : '10-Day Free Trial Active'}
                    </span>
                    <span className="text-xs font-mono font-extrabold text-white">
                      {trial.isExpired ? '100 Free Credits Active' : `${trial.days}d ${trial.hours}h ${trial.minutes}m Remaining`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-300 block">Status</span>
                  <span className="text-xs font-extrabold text-amber-300">
                    {trial.isExpired ? `${userProfile?.credits ?? 100} Credits` : 'Unlimited'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3.5">
            {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => {
              const plan = plans[key];
              const isSelected = selectedPlan === key;
              
              return (
                <div 
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`relative p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? `${plan.color} border-primary-500 dark:border-primary-400 shadow-md scale-[1.01]` 
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                      {key === 'ACHIEVER' && <Sparkles className="w-4 h-4 text-purple-500 fill-purple-500" />}
                      {plan.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-900 dark:text-white">₹{plan.price}</span>
                      {isSelected ? (
                        <div className="bg-primary-600 text-white rounded-full p-1 shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600" />
                      )}
                    </div>
                  </div>

                  <ul className="space-y-1 mt-2">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="text-xs flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Manual Payment & WhatsApp Verification Flow */}
        <div className="w-full md:w-[440px] bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 p-6 md:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar">
          <div>
            {/* Header branding */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/40 rounded-xl flex items-center justify-center text-primary-600 border border-primary-200 dark:border-primary-800 overflow-hidden">
                  <Logo className="w-full h-full" iconOnly noBorder />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {currentPlan.name} Plan
                  </h4>
                  <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                    Amount: ₹{currentPlan.price}
                  </span>
                </div>
              </div>

              <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <Shield className="w-3 h-3" /> Manual Verification
              </div>
            </div>

            {/* QR Code Box */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md border border-slate-800 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-500/10 py-1 px-3 rounded-full w-fit mx-auto mb-2.5 border border-amber-500/20">
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan with any UPI App</span>
              </div>

              {/* QR Image */}
              <div className="bg-white p-2.5 rounded-xl w-36 h-36 mx-auto shadow-inner flex items-center justify-center border-2 border-slate-700">
                <img 
                  src={qrCodeUrl} 
                  alt={`Pay ₹${currentPlan.price} via UPI QR`} 
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-[10px] text-slate-300 font-medium mt-2">
                Payee: <strong className="text-white">{payeeName}</strong>
              </p>

              {/* UPI ID Copy Box */}
              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg text-left">
                <div className="min-w-0">
                  <span className="text-[8px] text-slate-400 font-bold uppercase block">UPI ID</span>
                  <span className="text-xs font-mono font-bold text-amber-300 truncate block">{upiId}</span>
                </div>
                <button
                  onClick={copyUpiToClipboard}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition text-xs font-bold flex items-center gap-1 shrink-0"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Mobile Direct Pay */}
              <a
                href={upiPayString}
                className="mt-2.5 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                ⚡ Open UPI App (GPay / PhonePe / Paytm)
              </a>
            </div>

            {/* Manual Verification Steps */}
            <div className="mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-left space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Manual Verification on WhatsApp
                </h5>
              </div>

              <ol className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1 pl-4 list-decimal leading-snug">
                <li>Complete payment using the QR code or UPI ID above.</li>
                <li>Take a screenshot of the completed payment receipt.</li>
                <li>Send the screenshot to WhatsApp <strong>{whatsappNumber}</strong> for instant manual approval.</li>
              </ol>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-center active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" /> Send Screenshot on WhatsApp
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
                  <span>Help line: {whatsappNumber}</span>
                  {(uid || userProfile?.email) && (
                    <button 
                      onClick={copyUidToClipboard}
                      className="underline font-semibold hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {copiedUid ? 'Copied Details!' : 'Copy User ID / Email'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-primary-500" /> Support: 8105423488
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" /> Manual Activation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
