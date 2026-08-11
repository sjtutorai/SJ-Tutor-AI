
import React, { useState, useRef, useEffect } from 'react';
import { X, Check, Crown, Zap, Shield, Upload, Loader2, Image as ImageIcon, AlertCircle, ExternalLink, QrCode, Copy, CheckCircle, Clock } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { SJTUTOR_AVATAR, UserProfile } from '../types';
import { calculateTrialInfo, TrialInfo } from './TrialTimerWidget';

interface PremiumModalProps {
  onClose: () => void;
  onPaymentSuccess: (credits: number, planName: 'STARTER' | 'SCHOLAR' | 'ACHIEVER') => void;
  userProfile?: UserProfile;
  uid?: string;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, onPaymentSuccess, userProfile, uid }) => {
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'SCHOLAR' | 'ACHIEVER'>('SCHOLAR');
  const [step, setStep] = useState<'PLANS' | 'VERIFY'>('PLANS');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [trial, setTrial] = useState<TrialInfo>(() => calculateTrialInfo(userProfile, uid));

  useEffect(() => {
    const interval = setInterval(() => {
      setTrial(calculateTrialInfo(userProfile, uid));
    }, 1000);
    return () => clearInterval(interval);
  }, [userProfile, uid]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const upiId = '8105423488@ybl';

  const plans = {
    STARTER: {
      name: 'Starter',
      price: 99,
      creditAmount: 500,
      generations: 500,
      features: ['500 AI Generations', 'Basic Support', 'Standard Speed'],
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      btnColor: 'bg-blue-600 hover:bg-blue-700',
      paymentUrl: 'https://rzp.io/rzp/AaR3YkeN'
    },
    SCHOLAR: {
      name: 'Scholar',
      price: 299,
      creditAmount: 2000,
      generations: 2000,
      features: ['2000 AI Generations', 'Priority Support', 'Fast Generation', 'Export to PDF'],
      color: 'bg-primary-50 border-primary-200 text-primary-900',
      btnColor: 'bg-primary-600 hover:bg-primary-700',
      paymentUrl: 'https://rzp.io/rzp/pOcXrKBU'
    },
    ACHIEVER: {
      name: 'Achiever',
      price: 499,
      creditAmount: 99999,
      generations: 'Unlimited',
      features: ['Unlimited Generations', '24/7 Priority Support', 'Turbo Speed', 'All Future Features'],
      color: 'bg-purple-50 border-purple-200 text-purple-900',
      btnColor: 'bg-purple-600 hover:bg-purple-700',
      paymentUrl: 'https://rzp.io/rzp/pOcXrKBU'
    }
  };

  const currentPlan = plans[selectedPlan];

  const upiPayString = `upi://pay?pa=${upiId}&pn=SHIVABASAVARAJ%20SADASHIVAPPA%20JYOTI&am=${currentPlan.price}&cu=INR&tn=SJ%20Tutor%20AI%20${currentPlan.name}%20Plan`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayString)}`;

  const copyUpiToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentScreenshot(reader.result as string);
        setVerificationError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const verifyPayment = async () => {
    if (!paymentScreenshot) return;
    
    setIsVerifying(true);
    setVerificationError(null);

    try {
      const result = await GeminiService.validatePaymentScreenshot(
        paymentScreenshot, 
        currentPlan.name, 
        currentPlan.price
      );

      if (result.isValid) {
        onPaymentSuccess(
          currentPlan.creditAmount === 99999 ? 1000000 : currentPlan.creditAmount,
          selectedPlan
        );
        onClose();
        alert(`Payment Verified! ${currentPlan.generations} generations added to your account.`);
      } else {
        setVerificationError(result.reason || "We couldn't verify the payment from this image. Please ensure the payee is SHIVABASAVARAJ SADASHIVAPPA JYOTI and the amount is correct.");
      }
    } catch (error) {
      console.error(error);
      setVerificationError("An error occurred during verification. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-slate-500" />
        </button>

        {/* Left Side: Plans Selection (Visible on PLANS step) */}
        <div className={`flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50/50 ${step !== 'PLANS' ? 'hidden md:block opacity-50 pointer-events-none' : ''}`}>
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Upgrade to Premium</h2>
            <p className="text-slate-500 mb-4">Choose the plan that fits your learning needs.</p>

            {/* Trial Status Callout */}
            {!trial.isPro && (
              <div className="max-w-md mx-auto p-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl border border-indigo-500/30 shadow-md flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      {trial.isExpired ? '10-Day Trial Expired' : '10-Day Free Trial Active'}
                    </span>
                    <span className="text-xs font-mono font-extrabold text-white">
                      {trial.isExpired ? 'Trial Finished' : `${trial.days}d ${trial.hours}h ${trial.minutes}m ${trial.seconds}s Remaining`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-300 block">Status</span>
                  <span className="text-[11px] font-extrabold text-amber-300">
                    {trial.isExpired ? 'Free Tier' : 'Full Access'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => {
              const plan = plans[key];
              const isSelected = selectedPlan === key;
              
              return (
                <div 
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? `${plan.color} border-current shadow-lg scale-[1.02]` 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {key === 'ACHIEVER' && <Crown className="w-5 h-5 fill-current" />}
                      {plan.name}
                    </h3>
                    {isSelected && <div className="bg-current rounded-full p-1"><Check className="w-4 h-4 text-white" /></div>}
                  </div>
                  
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold">₹{plan.price}</span>
                    <span className="text-sm opacity-80">/ lifetime</span>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="text-sm flex items-center gap-2">
                        <Check className="w-4 h-4" /> {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Payment & Verification Flow */}
        <div className="w-full md:w-[450px] bg-white border-l border-slate-100 p-8 flex flex-col items-center justify-center text-center relative transition-all">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-400 via-primary-500 to-purple-500"></div>
          
          {step === 'PLANS' && (
             <div className="space-y-6 w-full animate-in fade-in slide-in-from-right-4">
                <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto text-primary-600 border-4 border-white shadow-lg overflow-hidden">
                   <img src={SJTUTOR_AVATAR} alt="SJ Tutor AI" className="w-full h-full object-cover" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold text-slate-800">Selected: {currentPlan.name}</h3>
                   <p className="text-slate-500 mt-1 font-semibold text-lg">Total: ₹{currentPlan.price}</p>
                </div>
                
                {/* QR Code Payment Box */}
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-5 rounded-3xl text-center text-white shadow-xl border border-slate-800 relative overflow-hidden">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 py-1 px-3 rounded-full w-fit mx-auto mb-3 border border-amber-500/20">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan QR Code to Pay</span>
                  </div>

                  {/* QR Image */}
                  <div className="bg-white p-3 rounded-2xl w-44 h-44 mx-auto shadow-inner flex items-center justify-center border-4 border-slate-800">
                    <img 
                      src={qrCodeUrl} 
                      alt={`Pay ₹${currentPlan.price} via UPI QR`} 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium mt-2.5">
                    Scan using Google Pay, PhonePe, Paytm or BHIM
                  </p>

                  {/* UPI ID Copy Box */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-900/80 px-3 py-2 rounded-xl text-left">
                    <div className="min-w-0">
                      <span className="text-[9px] text-slate-400 font-semibold block uppercase">UPI ID</span>
                      <span className="text-xs font-mono font-bold text-amber-300 truncate block">{upiId}</span>
                    </div>
                    <button
                      onClick={copyUpiToClipboard}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-xs font-semibold flex items-center gap-1 shrink-0"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mobile Direct Pay */}
                  <a
                    href={upiPayString}
                    className="mt-2.5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    ⚡ Open UPI App (GPay / PhonePe / Paytm)
                  </a>

                  <div className="mt-2 text-center">
                    <a
                      href={currentPlan.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-slate-400 hover:text-amber-400 underline transition inline-flex items-center gap-1"
                    >
                      Or pay via Razorpay web link <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => setStep('VERIFY')}
                    className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-extrabold rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> I&apos;ve Paid — Verify Screenshot
                  </button>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Upload your payment receipt screenshot to instantly verify and unlock credits.
                  </p>
                </div>
             </div>
          )}

          {step === 'VERIFY' && (
            <div className="w-full animate-in fade-in slide-in-from-right-4">
               <button onClick={() => setStep('PLANS')} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 font-semibold">
                  ← Back
               </button>

               <div className="mb-6 mt-4">
                  <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
                      <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Verify Payment</h3>
                  <p className="text-sm text-slate-400 mt-1">Upload screenshot or share directly via WhatsApp for manual verification.</p>
                  
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-left flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Need Instant Manual Verification?</p>
                      <p className="text-[11px] text-emerald-700">Share screenshot on WhatsApp: <span className="font-mono font-bold">+91 8105423488</span></p>
                    </div>
                    <a
                      href="https://wa.me/918105423488?text=Hello%2C%20I%20have%20sent%20my%20payment%20screenshot%20for%20SJ%20Tutor%20AI%20verification."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm whitespace-nowrap flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </div>
               </div>

               <div className="space-y-4">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${paymentScreenshot ? 'border-primary-300 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
                 >
                    {paymentScreenshot ? (
                       <div className="relative w-full h-32">
                          <img src={paymentScreenshot} alt="Payment Proof" className="w-full h-full object-contain rounded-lg" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); setPaymentScreenshot(null); }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                             <X className="w-4 h-4" />
                          </button>
                       </div>
                    ) : (
                       <>
                         <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                         <span className="text-sm font-medium text-slate-600">Click to upload screenshot</span>
                         <span className="text-xs text-slate-400 mt-1">JPG, PNG, JPEG accepted</span>
                       </>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden" 
                    />
                 </div>

                 {verificationError && (
                   <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-left">
                     <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                     <p className="text-xs text-red-600">{verificationError}</p>
                   </div>
                 )}

                 <button 
                    onClick={verifyPayment}
                    disabled={!paymentScreenshot || isVerifying}
                    className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${currentPlan.btnColor} disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Activate"
                    )}
                  </button>
               </div>
            </div>
          )}

          <div className="mt-8 flex gap-4 text-slate-300 justify-center w-full">
             <Shield className="w-6 h-6" />
             <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
