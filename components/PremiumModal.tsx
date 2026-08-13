
import React, { useState, useRef } from 'react';
import { X, Check, Crown, Zap, Shield, Upload, Loader2, Image as ImageIcon, AlertCircle, ExternalLink, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GeminiService } from '../services/geminiService';
import { SJTUTOR_AVATAR } from '../types';

interface PremiumModalProps {
  onClose: () => void;
  onPaymentSuccess: (credits: number, planName: 'STARTER' | 'SCHOLAR' | 'ACHIEVER') => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, onPaymentSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'SCHOLAR' | 'ACHIEVER'>('SCHOLAR');
  const [step, setStep] = useState<'PLANS' | 'VERIFY'>('PLANS');
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Upgrade to Premium</h2>
            <p className="text-slate-500">Choose the plan that fits your learning needs.</p>
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
                
                <div className="bg-emerald-50/80 border border-emerald-200/80 p-5 rounded-2xl text-left text-sm text-emerald-900 shadow-sm flex flex-col items-center">
                  <p className="flex items-center gap-2 mb-1.5 font-extrabold text-emerald-950 text-base w-full">
                    <QrCode className="w-5 h-5 text-emerald-600 fill-emerald-500" /> Scan QR to Pay
                  </p>
                  <p className="text-xs mb-4 text-emerald-800/90 leading-relaxed font-medium w-full">
                    Scan this QR Code using any UPI App (Google Pay, PhonePe, Paytm) to instantly pay ₹{currentPlan.price} and activate your plan.
                  </p>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm mb-3">
                    <QRCodeSVG value={currentPlan.paymentUrl} size={150} level="M" />
                  </div>
                  <button
                    onClick={() => window.open(currentPlan.paymentUrl, '_blank')}
                    className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all mb-3"
                  >
                    💳 Or click here to pay online <ExternalLink className="w-3 h-3" />
                  </button>
                  <p className="text-[11px] text-center text-emerald-800/80 font-semibold w-full mt-2 border-t border-emerald-200/50 pt-2">
                    ✅ After payment, verify by sharing the screenshot to <br/><a href="https://wa.me/918105423488" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold">+91 8105423488</a>
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => setStep('VERIFY')}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center justify-center gap-2"
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
                  <p className="text-sm text-slate-400 mt-1">Upload a screenshot of your successful transaction.</p>
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
