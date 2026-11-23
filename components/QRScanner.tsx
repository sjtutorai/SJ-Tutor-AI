import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  X,
  User,
  School,
  GraduationCap,
  ShieldCheck,
  Zap,
  Phone,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles,
  Camera,
  UploadCloud,
  KeyRound,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findAccountAndLoginWithIdCard } from '../services/authService';
import { decodeQrFromImageFile } from '../utils/qrImageDecoder';

interface QRScannerProps {
  onClose: () => void;
  onLoginSuccess?: (userData: any) => void;
}

interface ScannedUser {
  name: string;
  id: string;
  email?: string;
  institution?: string;
  grade?: string;
  plan?: string;
  phone?: string;
  credits?: number;
  streak?: number;
}

const QRScanner: React.FC<QRScannerProps> = ({ onClose, onLoginSuccess }) => {
  const [scanTab, setScanTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [scannedData, setScannedData] = useState<ScannedUser | null>(null);
  const [authenticatedAccount, setAuthenticatedAccount] = useState<any | null>(null);
  const [searchingDb, setSearchingDb] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processDecodedId = async (decodedText: string) => {
    const trimmed = decodedText.trim();
    if (!trimmed) return;
    setError(null);

    try {
      let data: ScannedUser;
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        data = {
          name: parsed.name || parsed.displayName || 'Student',
          id: parsed.id || parsed.sjTutorId || parsed.uid || trimmed,
          email: parsed.email || '',
          institution: parsed.institution || 'SJ Tutor AI Academy',
          grade: parsed.grade || 'Class 10',
          plan: parsed.plan || parsed.planType || 'Scholar',
          phone: parsed.phone || parsed.phoneNumber || 'Not Provided',
        };
      } else {
        data = {
          name: 'Student',
          id: trimmed,
          institution: 'SJ Tutor AI Academy',
          grade: 'Class 10',
          plan: 'Scholar',
        };
      }

      if (!data.id) {
        setError('Unrecognized SJ Tutor ID format.');
        return;
      }

      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }

      setSearchingDb(true);
      try {
        const authRes = await findAccountAndLoginWithIdCard(trimmed);
        if (authRes.success && authRes.user) {
          setAuthenticatedAccount(authRes.user);
          setScannedData({
            name: authRes.user.displayName || authRes.user.name || data.name,
            id: authRes.user.sjTutorId || authRes.user.registrationNumber || data.id,
            email: authRes.user.email || data.email,
            institution: authRes.user.institution || data.institution,
            grade: authRes.user.grade || data.grade,
            plan: authRes.user.planType || data.plan,
            credits: authRes.user.credits,
            streak: authRes.user.streak ?? authRes.user.currentStreak ?? 0,
            phone: authRes.user.phoneNumber || data.phone,
          });
        } else {
          setError(authRes.message || 'No matching SJ Tutor AI account found for this ID Card.');
        }
      } catch (e: any) {
        console.warn('Account lookup error during scan:', e);
        setError(e?.message || 'Could not verify this ID card right now. Please try again.');
      } finally {
        setSearchingDb(false);
      }
    } catch (err) {
      console.error('Scan Error:', err);
      setError('Could not parse QR code. Please scan a valid SJ Tutor ID.');
    }
  };

  useEffect(() => {
    if (scanTab !== 'camera' || scannedData) return;

    const timer = setTimeout(() => {
      const container = document.getElementById('qr-reader');
      if (!container) return;
      try {
        scannerRef.current = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 10, qrbox: { width: 240, height: 240 } },
          false
        );
        scannerRef.current.render(
          (decodedText) => {
            processDecodedId(decodedText);
          },
          () => {}
        );
      } catch (e) {
        console.warn('Camera scanner init warning:', e);
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scanTab, scannedData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSearchingDb(true);
    setError(null);
    try {
      const decoded = await decodeQrFromImageFile(file);
      if (!decoded) {
        setError('Could not detect a QR code in this image. Try uploading the downloaded Front ID or QR PNG, or enter your ID manually.');
        setSearchingDb(false);
        return;
      }
      await processDecodedId(decoded);
    } catch (err) {
      console.warn('QR image upload scan failed:', err);
      setError('Unable to scan this image. Please try another photo or enter your ID number manually.');
      setSearchingDb(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setError('Please enter your SJ Tutor ID Card number or email.');
      return;
    }
    await processDecodedId(manualInput.trim());
  };

  const handleConfirmLogin = () => {
    if (authenticatedAccount && onLoginSuccess) {
      onLoginSuccess(authenticatedAccount);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-md w-full relative border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">SJ ID Card Scanner</h3>
            <p className="text-xs text-slate-500">Scan, upload, or enter an SJ Tutor Student ID</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {!scannedData ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Mode Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setScanTab('camera');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      scanTab === 'camera'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setScanTab('upload');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      scanTab === 'upload'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setScanTab('manual');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      scanTab === 'manual'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter ID</span>
                  </button>
                </div>

                {error && (
                  <p className="text-red-500 text-xs text-center font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-2.5 rounded-xl">
                    {error}
                  </p>
                )}

                {scanTab === 'camera' && (
                  <div className="space-y-3">
                    <div
                      id="qr-reader"
                      className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                    />
                    <p className="text-center text-xs text-slate-400">
                      Align your SJ Tutor ID card QR code within the frame
                    </p>
                  </div>
                )}

                {scanTab === 'upload' && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Upload SJ ID Card PNG or QR Screenshot
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Works with downloaded Front ID, Back ID, or QR PNG files
                    </p>
                    {searchingDb && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Scanning QR &amp; verifying account...</span>
                      </div>
                    )}
                  </div>
                )}

                {scanTab === 'manual' && (
                  <form onSubmit={handleManualSubmit} className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        autoFocus
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        placeholder="SJTA-XXXXXX, SJ-XX-XXXXXX, or email"
                        className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                    <button
                      type="submit"
                      disabled={searchingDb}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {searchingDb ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Finding Account...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify Student ID</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-xl shadow-primary-500/20 relative">
                    <User className="w-12 h-12 text-primary-600" />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight leading-none">
                    {scannedData.name || 'Student'}
                  </h4>
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1.5">
                      Reg ID:
                    </span>
                    <code className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono italic">
                      {scannedData.id}
                    </code>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm col-span-2">
                    <div className="flex items-center gap-2 text-primary-500 mb-2">
                      <School className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Institution / School
                      </span>
                    </div>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {scannedData.institution || 'Not Specified'}
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                      <Phone className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Phone Number
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {scannedData.phone || 'Not Provided'}
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 text-indigo-500 mb-2">
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Grade / Class
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {scannedData.grade || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
                      {scannedData.plan === 'Achiever' ? (
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Zap className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-primary-600/60 font-bold uppercase tracking-wider">
                        Plan &amp; Status
                      </p>
                      <p className="text-sm font-bold text-primary-900 dark:text-primary-100 flex items-center gap-1.5 flex-wrap">
                        <span>{scannedData.plan || 'Scholar'}</span>
                        {scannedData.credits ? <span>• {scannedData.credits.toLocaleString()} Credits</span> : null}
                        {typeof scannedData.streak === 'number' && (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                            • 🔥 {scannedData.streak}d streak
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>VERIFIED</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleConfirmLogin}
                    disabled={searchingDb || !authenticatedAccount}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-2xl font-bold shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>Switch / Log In to this Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScannedData(null);
                      setAuthenticatedAccount(null);
                      setError(null);
                    }}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
                  >
                    Scan Another ID
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default QRScanner;
