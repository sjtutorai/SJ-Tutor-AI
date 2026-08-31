import React, { useState, useRef, useEffect } from 'react';
import { 
  CreditCard, 
  Camera, 
  Upload, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import { IdAuthService } from '../services/idAuthService';
import { UserProfile } from '../types';

interface IdLoginViewProps {
  onSuccess: (profile: UserProfile, bypass2Step: boolean, uid: string) => void;
  onBack: () => void;
}

export const IdLoginView: React.FC<IdLoginViewProps> = ({ onSuccess, onBack }) => {
  const [activeTab, setActiveTab] = useState<'card' | 'reg'>('card');
  
  // Registration Form State
  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Scanning State
  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  
  // Shared State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<{ name: string; id: string; plan?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);

  // Stop camera when tab changes or unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const handleStartCamera = () => {
    setError(null);
    setCameraActive(true);
    setScanStatus('Starting camera...');

    setTimeout(() => {
      try {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }

        const scanner = new Html5QrcodeScanner(
          'id-card-qr-reader',
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
          },
          false
        );

        scannerRef.current = scanner;

        scanner.render(
          async (decodedText) => {
            console.log('Scanned ID Card QR:', decodedText);
            setScanStatus('Verifying ID Card with Firestore...');
            scanner.clear().catch(() => {});
            setCameraActive(false);
            await processIdCardAuth(decodedText);
          },
          () => {
            // Frame scan failure (normal before QR appears in frame)
          }
        );
      } catch (e: any) {
        console.error('Camera Init Error:', e);
        setError('Camera permission denied or camera unavailable. You can upload an image of your ID card instead.');
        setCameraActive(false);
      }
    }, 150);
  };

  const handleStopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setCameraActive(false);
    setScanStatus(null);
  };

  // Handle ID Card image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setScanStatus('Scanning uploaded ID card image...');

    try {
      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode('file-qr-decoder-temp');
      }

      let decodedText: string | null = null;

      try {
        decodedText = await fileScannerRef.current.scanFile(file, true);
      } catch {
        try {
          decodedText = await fileScannerRef.current.scanFile(file, false);
        } catch {
          // File scan failed, will check fallback below
        }
      }

      if (decodedText) {
        console.log('Decoded file QR text:', decodedText);
        await processIdCardAuth(decodedText);
      } else {
        // Fallback: Check if file name has student ID pattern (e.g. SJTA-2608-123456 or SJ-...)
        const fileNameMatch = file.name.match(/(SJ[A-Z0-9_-]+)/i);
        if (fileNameMatch) {
          await processIdCardAuth(fileNameMatch[0]);
        } else {
          setError('Could not detect a clear SJ Tutor AI QR code from the uploaded image. Please ensure the QR code is clearly visible, or enter your Registration ID.');
        }
      }
    } catch (err: any) {
      console.warn('QR decode error from file:', err);
      setError('Could not process ID Card image. Please try another image or enter your Registration ID.');
    } finally {
      setLoading(false);
      setScanStatus(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Process ID Card authentication (requiring 2-step verification password after)
  const processIdCardAuth = async (cardPayload: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await IdAuthService.loginWithIdCard(cardPayload);

      if (result.success && result.profile && result.uid) {
        setVerifiedStudent({
          name: result.profile.displayName || 'Student',
          id: result.profile.registrationNumber || result.profile.sjTutorId || result.uid,
          plan: result.profile.planType,
        });

        setTimeout(() => {
          onSuccess(result.profile!, false, result.uid!);
        }, 1000);
      } else {
        setError(result.error || 'Failed to authenticate with ID Card.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error with ID Card.');
    } finally {
      setLoading(false);
    }
  };

  // Process Registration Number + 2-Step Password login
  const handleRegLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber.trim()) {
      setError('Please enter your Registration Number or SJ Tutor ID.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your 2-Step Verification Password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await IdAuthService.loginWithRegistrationNumber(regNumber, password);

      if (result.success && result.profile && result.uid) {
        setVerifiedStudent({
          name: result.profile.displayName || 'Student',
          id: result.profile.registrationNumber || result.profile.sjTutorId || regNumber,
          plan: result.profile.planType,
        });

        setTimeout(() => {
          onSuccess(result.profile!, false, result.uid!);
        }, 1000);
      } else {
        setError(result.error || 'Invalid Registration Number or 2-Step Password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto animate-in fade-in duration-300">
      {/* Off-screen container for QR file decoder */}
      <div 
        id="file-qr-decoder-temp" 
        style={{ width: '400px', height: '400px', position: 'fixed', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none' }}
      />
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      {/* Back Button */}
      <button
        type="button"
        onClick={() => {
          handleStopCamera();
          onBack();
        }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to all sign-in options
      </button>

      {/* Mode Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            handleStopCamera();
            setActiveTab('card');
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'card'
              ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>SJ Tutor ID Card</span>
        </button>

        <button
          type="button"
          onClick={() => {
            handleStopCamera();
            setActiveTab('reg');
            setError(null);
          }}
          className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'reg'
              ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Registration &amp; Password</span>
        </button>
      </div>

      {/* Success Notification Animation */}
      {verifiedStudent && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex items-center gap-3 animate-in zoom-in-95">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                Verified Identity!
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-md">
                {verifiedStudent.plan || 'Scholar'}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Welcome back, {verifiedStudent.name}!
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              ID: {verifiedStudent.id}
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && !verifiedStudent && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= TAB 1: ID CARD LOGIN ================= */}
      {activeTab === 'card' && !verifiedStudent && (
        <div className="space-y-4">
          <div className="p-3 bg-primary-50/70 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 rounded-2xl flex items-start gap-2.5 text-xs text-primary-900 dark:text-primary-200">
            <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-primary-950 dark:text-primary-100">
                ID Card Authentication
              </strong>
              <p className="text-[11px] text-primary-800/80 dark:text-primary-300/90 mt-0.5 leading-relaxed">
                Scan or upload your official SJ Tutor AI Student ID card. You will be prompted to enter your 2-Step Verification password after signing in to securely access your dashboard.
              </p>
            </div>
          </div>

          {/* Camera Scanner View */}
          {cameraActive ? (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border-2 border-primary-500 bg-slate-900 shadow-xl">
                <div id="id-card-qr-reader" className="w-full min-h-[280px]"></div>
                {scanStatus && (
                  <div className="absolute bottom-2 inset-x-2 p-2 bg-black/70 backdrop-blur-md rounded-xl text-[11px] text-white text-center font-medium">
                    {scanStatus}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleStopCamera}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Scan with Camera Button */}
              <button
                type="button"
                onClick={handleStartCamera}
                disabled={loading}
                className="p-5 rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-700/60 bg-primary-50/40 dark:bg-primary-950/20 hover:bg-primary-50 dark:hover:bg-primary-950/40 hover:border-primary-500 flex flex-col items-center justify-center gap-2.5 text-center transition-all group active:scale-98"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Scan ID Camera</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Align your ID Card QR code
                  </p>
                </div>
              </button>

              {/* Upload ID Card Image Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-primary-500 flex flex-col items-center justify-center gap-2.5 text-center transition-all group active:scale-98"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary-500" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Upload ID Card Image</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    PNG, JPG, or Screenshot
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Quick ID Card Code Input Fallback */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 block">
              Or paste ID Card JSON / Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='e.g. {"id":"SJ-SJ-123456", ...}'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    processIdCardAuth((e.target as HTMLInputElement).value);
                  }
                }}
                id="quick-card-input"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('quick-card-input') as HTMLInputElement;
                  if (input && input.value) {
                    processIdCardAuth(input.value);
                  }
                }}
                disabled={loading}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: REGISTRATION NUMBER & 2-STEP PASSWORD ================= */}
      {activeTab === 'reg' && !verifiedStudent && (
        <form onSubmit={handleRegLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Registration Number / SJ Tutor ID *</span>
              <span className="text-[10px] font-normal text-slate-400 font-mono">e.g. SJTA-2608-123456</span>
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.trim())}
                placeholder="Enter your Registration Number"
                required
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-sm uppercase tracking-wide focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                2-Step Verification Password *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your 2-step verification password"
                required
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Your password set in Settings &gt; Privacy &amp; Security or during first registration.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md shadow-primary-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying with Firestore...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Sign In</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
