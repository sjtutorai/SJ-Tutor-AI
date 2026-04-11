
import React, { useState, useRef } from 'react';
import { X, Check, Crown, Zap, Shield, Smartphone, Upload, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { SJTUTOR_AVATAR } from '../types';

interface PremiumModalProps {
  onClose: () => void;
  onPaymentSuccess: (credits: number, planName: 'STARTER' | 'SCHOLAR' | 'ACHIEVER') => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ onClose, onPaymentSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'SCHOLAR' | 'ACHIEVER'>('SCHOLAR');
  const [step, setStep] = useState<'PLANS' | 'PAYMENT' | 'VERIFY'>('PLANS');
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
      btnColor: 'bg-blue-600 hover:bg-blue-700'
    },
    SCHOLAR: {
      name: 'Scholar',
      price: 299,
      creditAmount: 2000,
      generations: 2000,
      features: ['2000 AI Generations', 'Priority Support', 'Fast Generation', 'Export to PDF'],
      color: 'bg-primary-50 border-primary-200 text-primary-900',
      btnColor: 'bg-primary-600 hover:bg-primary-700'
    },
    ACHIEVER: {
      name: 'Achiever',
      price: 499,
      creditAmount: 99999,
      generations: 'Unlimited',
      features: ['Unlimited Generations', '24/7 Priority Support', 'Turbo Speed', 'All Future Features'],
      color: 'bg-purple-50 border-purple-200 text-purple-900',
      btnColor: 'bg-purple-600 hover:bg-purple-700'
    }
  };

  const currentPlan = plans[selectedPlan];
  
  // UPI Payment URL
  const upiUrl = `upi://pay?pa=shivabasavaraj@ybl&pn=SHIVABASAVARAJ%20SADASHIVAPPA%20JYOTI&am=${currentPlan.price}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

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
                   <p className="text-slate-500 mt-1">Total: ₹{currentPlan.price}</p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl text-left text-sm text-slate-600 border border-slate-100">
                  <p className="flex items-center gap-2 mb-2"><Check className="w-4 h-4 text-green-500" /> Instant activation</p>
                  <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Secure payment via UPI</p>
                </div>

                <button 
                  onClick={() => setStep('PAYMENT')}
                  className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 ${currentPlan.btnColor}`}
                >
                  Proceed to Payment
                </button>
             </div>
          )}

          {step === 'PAYMENT' && (
             <div className="w-full animate-in fade-in slide-in-from-right-4">
                <button onClick={() => setStep('PLANS')} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1">
                   ← Back
                </button>

                <div className="mb-6 mt-2">
                  <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600">
                      <Smartphone className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Scan to Pay</h3>
                  <p className="text-sm text-slate-400 mt-1">Use any UPI app (GPay, PhonePe, Paytm)</p>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 mb-6 relative group inline-block">
                  <img 
                    src={qrCodeUrl} 
                    alt="UPI QR Code" 
                    className="w-40 h-40 object-contain mix-blend-multiply"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl backdrop-blur-sm">
                      <p className="font-bold text-slate-800">₹{currentPlan.price}</p>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-left">
                      <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Paying to</p>
                      <p className="font-bold text-slate-800 text-sm break-words">SHIVABASAVARAJ SADASHIVAPPA JYOTI</p>
                      <p className="font-mono text-xs text-slate-500 select-all">shivabasavaraj@ybl</p>
                  </div>

                  <button 
                    onClick={() => setStep('VERIFY')}
                    className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 ${currentPlan.btnColor}`}
                  >
                    I've Completed Payment
                  </button>
                </div>
             </div>
          )}

          {step === 'VERIFY' && (
            <div className="w-full animate-in fade-in slide-in-from-right-4">
               <button onClick={() => setStep('PAYMENT')} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1">
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
