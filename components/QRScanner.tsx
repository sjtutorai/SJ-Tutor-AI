
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, User, School, GraduationCap, ShieldCheck, Zap, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRScannerProps {
  onClose: () => void;
}

interface ScannedUser {
  name: string;
  id: string;
  institution?: string;
  grade?: string;
  plan?: string;
  phone?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onClose }) => {
  const [scannedData, setScannedData] = useState<ScannedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

        const onScanSuccess = (decodedText: string) => {
          try {
            console.log("Scanned QR Text:", decodedText);
            const trimmed = decodedText.trim();
            // Handle JSON format
            let data: ScannedUser;
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              const parsed = JSON.parse(trimmed);
              data = {
                name: parsed.name || "Student",
                id: parsed.id || trimmed,
                institution: parsed.institution || "SJ Tutor AI",
                grade: parsed.grade || "N/A",
                plan: parsed.plan || "Scholar",
                phone: parsed.phone || "N/A"
              };
            } else {
              // Plain text ID fallback
              data = {
                name: "Member",
                id: trimmed,
                institution: "SJ Tutor AI",
                grade: "N/A",
                plan: "Student"
              };
            }

            if (data.id) {
              setScannedData(data);
              if (scannerRef.current) {
                scannerRef.current.clear().catch(() => {});
              }
            } else {
              setError("Unrecognized ID format.");
            }
          } catch (err) {
            console.error("Scan Error:", err);
            setError("Could not parse QR code. Please scan a valid SJ Tutor ID.");
          }
        };

    const onScanFailure = () => {
      // Optional: handle scan failures
    };

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
          console.error("Failed to clear scanner", err);
        });
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-md w-full relative border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">QR Code Scanner</h3>
            <p className="text-xs text-slate-500">Scan an SJ Tutor Student ID</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
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
                <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"></div>
                {error && (
                  <p className="text-red-500 text-xs text-center font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                    {error}
                  </p>
                )}
                <p className="text-center text-xs text-slate-400">
                  Align ID card QR code within the frame to scan
                </p>
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
                    {scannedData.name || 'Anonymous Student'}
                  </h4>
                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1.5">Reg ID:</span>
                    <code className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono italic">{scannedData.id}</code>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm col-span-2">
                    <div className="flex items-center gap-2 text-primary-500 mb-2">
                      <School className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Institution / School</span>
                    </div>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                      {scannedData.institution || 'Not Specified'}
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-500 mb-2">
                      <Phone className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Phone Number</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {scannedData.phone || 'Not Provided'}
                    </p>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 text-indigo-500 mb-2">
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Grade / Class</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {scannedData.grade || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-2xl border border-primary-100 dark:border-primary-900/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
                      <Zap className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-primary-600/60 font-bold uppercase tracking-wider">Member Since</p>
                      <p className="text-sm font-bold text-primary-900 dark:text-primary-100">
                        {scannedData.plan || 'Scholar'}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                    ACTIVE
                  </div>
                </div>

                <button 
                  onClick={() => setScannedData(null)}
                  className="w-full py-3.5 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/20 hover:bg-primary-700 transition-all active:scale-95"
                >
                  Scan Another ID
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default QRScanner;
