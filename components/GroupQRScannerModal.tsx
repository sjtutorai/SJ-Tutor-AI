import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Upload, Users, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Sparkles, BookOpen, User, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { StudyGroup } from '../types';

interface GroupQRScannerModalProps {
  onClose: () => void;
  onJoinGroup: (targetIdOrCode: string) => void | Promise<void>;
}

export const GroupQRScannerModal: React.FC<GroupQRScannerModalProps> = ({ onClose, onJoinGroup }) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<{
    type: 'group' | 'user' | 'unknown';
    rawText: string;
    groupId?: string;
    groupData?: StudyGroup | null;
    userData?: any;
  } | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [joining, setJoining] = useState(false);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to parse QR decoded text
  const processDecodedText = async (decodedText: string) => {
    const trimmed = decodedText.trim();
    setScanError(null);
    setLoadingGroup(true);

    let extractedGroupIdOrCode: string | null = null;

    // 1. Check if URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        const params = new URLSearchParams(url.search);
        extractedGroupIdOrCode = params.get('groupId') || params.get('groupInvite') || params.get('invite') || params.get('id');
      } catch {
        const match = trimmed.match(/(?:groupId|groupInvite|invite)=([^&]+)/);
        if (match) extractedGroupIdOrCode = match[1];
      }
    }

    // 2. Check if JSON
    if (!extractedGroupIdOrCode && trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.groupId || parsed.inviteCode || (parsed.id && (parsed.id.startsWith('group_') || parsed.id.startsWith('JOIN')))) {
          extractedGroupIdOrCode = parsed.groupId || parsed.inviteCode || parsed.id;
        } else if (parsed.id && parsed.name) {
          // Student ID QR
          setScannedResult({
            type: 'user',
            rawText: trimmed,
            userData: parsed
          });
          setLoadingGroup(false);
          return;
        }
      } catch (e) {
        console.warn('JSON parse error:', e);
      }
    }

    // 3. Fallback to raw text as ID or Invite Code
    if (!extractedGroupIdOrCode) {
      extractedGroupIdOrCode = trimmed;
    }

    try {
      // Query group in Firestore
      let foundGroup: StudyGroup | null = null;
      if (extractedGroupIdOrCode) {
        // Direct doc get
        const groupRef = doc(db, 'groups', extractedGroupIdOrCode);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          foundGroup = groupSnap.data() as StudyGroup;
        } else {
          // Query by inviteCode
          const q = query(collection(db, 'groups'), where('inviteCode', '==', extractedGroupIdOrCode));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            foundGroup = querySnap.docs[0].data() as StudyGroup;
          }
        }
      }

      if (foundGroup) {
        setScannedResult({
          type: 'group',
          rawText: trimmed,
          groupId: foundGroup.id,
          groupData: foundGroup
        });
      } else {
        // Unknown or raw string group ID
        setScannedResult({
          type: 'group',
          rawText: trimmed,
          groupId: extractedGroupIdOrCode || trimmed,
          groupData: null
        });
      }
    } catch (err) {
      console.error('Error resolving group from QR:', err);
      setScannedResult({
        type: 'group',
        rawText: trimmed,
        groupId: extractedGroupIdOrCode || trimmed,
        groupData: null
      });
    } finally {
      setLoadingGroup(false);
    }
  };

  // Camera Scanner Lifecycle
  useEffect(() => {
    if (activeTab === 'camera' && !scannedResult) {
      const scanner = new Html5QrcodeScanner(
        'group-qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          scanner.clear().catch(() => {});
          processDecodedText(decodedText);
        },
        () => {
          // failure callback
        }
      );

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(() => {});
        }
      };
    }
  }, [activeTab, scannedResult]);

  // Handle File Upload Scan ("Put Group QR Code Image")
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    setScanError(null);

    try {
      const html5QrCode = new Html5Qrcode('group-qr-temp-element');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      await processDecodedText(decodedText);
    } catch (err: any) {
      console.error('QR File Scan Error:', err);
      setScanError('No QR code detected in this image. Please select a clear Group QR Code image.');
    } finally {
      setIsScanningFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleJoinClick = async () => {
    if (!scannedResult?.groupId) return;
    setJoining(true);
    try {
      await onJoinGroup(scannedResult.groupId);
      onClose();
    } catch (err) {
      console.error('Join group error:', err);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      {/* Hidden element required for html5-qrcode file scanner */}
      <div id="group-qr-temp-element" className="hidden" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-md w-full relative border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Join Group via QR Code
            </h3>
            <p className="text-xs text-slate-500">Scan camera or put/upload a Group QR code image</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        {!scannedResult && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <button
              onClick={() => {
                setActiveTab('camera');
                setScanError(null);
              }}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'camera'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              Scan with Camera
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                setScanError(null);
              }}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              Put / Upload QR Image
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Loading Group State */}
            {loadingGroup ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center space-y-3"
              >
                <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Decoding Group QR Code...</p>
                <p className="text-xs text-slate-400">Fetching group details from server</p>
              </motion.div>
            ) : !scannedResult ? (
              activeTab === 'camera' ? (
                /* CAMERA TAB */
                <motion.div
                  key="camera"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div
                    id="group-qr-reader"
                    className="overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 bg-slate-50 dark:bg-slate-800/50"
                  />
                  {scanError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{scanError}</span>
                    </div>
                  )}
                  <p className="text-center text-xs text-slate-400">
                    Align the Group QR Code inside the scanner frame
                  </p>
                </motion.div>
              ) : (
                /* UPLOAD FILE TAB */
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-8 text-center cursor-pointer transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      {isScanningFile ? (
                        <RefreshCw className="w-8 h-8 animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8" />
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                      {isScanningFile ? 'Scanning Image...' : 'Click or Drag & Drop Group QR Image'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Select any saved QR Code image or screenshot from your device gallery or files
                    </p>
                  </div>

                  {scanError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{scanError}</span>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700 dark:text-slate-300">💡 Tip:</p>
                    <p>Ask group admins or friends to share their Group QR Code screenshot to join in one click!</p>
                  </div>
                </motion.div>
              )
            ) : (
              /* SCANNED RESULT VIEW */
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {scannedResult.type === 'group' ? (
                  <>
                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-extrabold uppercase tracking-wider text-indigo-100 mb-3 border border-white/20">
                        <Sparkles className="w-3 h-3" />
                        <span>Group QR Detected</span>
                      </div>

                      <h4 className="text-xl font-black mb-1 leading-tight">
                        {scannedResult.groupData?.name || 'Study Group'}
                      </h4>

                      <div className="space-y-1.5 text-xs text-indigo-100 font-medium">
                        {scannedResult.groupData?.subject && (
                          <p className="flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Subject: {scannedResult.groupData.subject}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {scannedResult.groupData?.memberCount || 1} Member{(scannedResult.groupData?.memberCount || 1) !== 1 ? 's' : ''}
                          </span>
                        </p>
                        {scannedResult.groupData?.creatorName && (
                          <p className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>Admin: {scannedResult.groupData.creatorName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Group Code / ID:</span>
                      <code className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[180px]">
                        {scannedResult.groupId}
                      </code>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setScannedResult(null);
                          setScanError(null);
                        }}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        Scan Another
                      </button>
                      <button
                        onClick={handleJoinClick}
                        disabled={joining}
                        className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {joining ? (
                          <span>Joining...</span>
                        ) : (
                          <>
                            <span>Join Group Now</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  /* USER ID SCANNED FALLBACK */
                  <>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-center space-y-2">
                      <ShieldCheck className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
                      <h4 className="text-base font-bold text-slate-800 dark:text-white">
                        Student ID Card Scanned
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        This is a Student ID for <strong>{scannedResult.userData?.name || 'Student'}</strong> rather than a Group QR code.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setScannedResult(null);
                        setScanError(null);
                      }}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md transition"
                    >
                      Scan Group QR Code Instead
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default GroupQRScannerModal;
