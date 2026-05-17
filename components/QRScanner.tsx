
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { X, User, School, GraduationCap, ShieldCheck, Zap, Phone, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

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
  photoURL?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onClose }) => {
  const [scannedData, setScannedData] = useState<ScannedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processDecodedText = async (decodedText: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Processing Text:", decodedText);
      const trimmed = decodedText.trim();
      let studentId = trimmed;
      
      // If it looks like JSON, try to extract ID
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          studentId = parsed.id || trimmed;
        } catch {
          // Fallback to searching the whole string if JSON parse fails
        }
      }

      // 1. Check for Demo Case First (Always works)
      if (studentId.startsWith("SJT-DEMO-")) {
        setScannedData({
          name: "Ankit Sharma",
          id: studentId,
          institution: "Delhi Public School",
          grade: "12th Science",
          plan: "Achiever",
          phone: "+91 98765 43210",
          photoURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop"
        });
        setError(null);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
        return;
      }

      // 2. Fetch from Firestore for real IDs
      let studentDoc;
      try {
        studentDoc = await getDoc(doc(db, 'students', studentId));
      } catch (error: any) {
        console.error("Firestore Error:", error);
        
        // Follow integration[firebase] error handling requirements
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          authInfo: {
            userId: null, // Scanners often run without auth
            email: null,
            emailVerified: null,
            isAnonymous: null,
            providerInfo: []
          },
          operationType: 'get',
          path: `students/${studentId}`
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        
        const message = error.message || "";
        if (message.includes("permission-denied")) {
          setError("Access Denied: Please check Firestore Security Rules.");
        } else if (message.includes("offline")) {
          setError("Connections Error: You seem to be offline.");
        } else {
          setError("Error retrieving student details. Make sure Firestore is enabled.");
        }
        return;
      }
      
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        setScannedData({
          name: data.name || "Student",
          id: studentId,
          institution: data.institution || "SJ Tutor AI Member",
          grade: data.grade || data.class || "N/A",
          plan: data.plan || "Scholar",
          phone: data.phone || data.phoneNumber || "N/A",
          photoURL: data.photoURL || data.profilePicture
        });
        setError(null);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      } else {
        setError(`Student with ID ${studentId} not found.`);
      }
    } catch (err: any) {
      console.error(err);
      const message = err.message || "";
      if (message.includes("permission-denied")) {
        setError("Access Denied: Please check Firestore Security Rules.");
      } else if (message.includes("offline")) {
        setError("Connections Error: You seem to be offline.");
      } else {
        setError("Error retrieving student details. Make sure Firestore is enabled.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const html5QrCode = new Html5Qrcode("qr-reader-hidden");
    try {
      const result = await html5QrCode.scanFile(file, true);
      processDecodedText(result);
    } catch {
      setError("No QR code found in this image.");
    } finally {
      html5QrCode.clear();
    }
  };

  useEffect(() => {
    if (!scannedData) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scannerRef.current.render(processDecodedText, () => {});
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [scannedData]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div id="qr-reader-hidden" style={{ display: 'none' }}></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-md w-full relative border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Student Retrieval</h3>
            <p className="text-xs text-slate-500">Scan QR Code or Upload Image</p>
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
                key="input-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div id="qr-reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"></div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-100 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-semibold"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Upload QR Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs text-center font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                    {error}
                  </p>
                )}
                
                {isLoading && (
                   <div className="flex justify-center p-4">
                      <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                   </div>
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
                  <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-xl shadow-primary-500/20 relative overflow-hidden">
                    {scannedData.photoURL ? (
                      <img src={scannedData.photoURL} alt={scannedData.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-slate-400" />
                    )}
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
