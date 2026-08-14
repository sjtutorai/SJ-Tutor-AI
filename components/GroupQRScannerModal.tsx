import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  X, 
  Camera, 
  Upload, 
  QrCode, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { StudyGroup, GroupMember, UserProfile } from '../types';
import { joinGroupInFirestore } from '../utils/firebaseUtils';
import { useNotifications } from './NotificationContext';

interface GroupQRScannerModalProps {
  currentUserId: string;
  userProfile: UserProfile | null;
  onJoinedGroup: (group: StudyGroup) => void;
  onClose: () => void;
}

export const GroupQRScannerModal: React.FC<GroupQRScannerModalProps> = ({
  currentUserId,
  userProfile,
  onJoinedGroup,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [scannedGroup, setScannedGroup] = useState<StudyGroup | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerToast, sendNotification } = useNotifications();

  const currentUserName = userProfile?.displayName || 'Student';

  // Process decoded QR text
  const handleDecodedQR = async (decodedText: string) => {
    if (!decodedText || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let targetIdOrCode = decodedText.trim();

      // Check if it's a full URL e.g. https://.../?groupId=xyz or ?invite=xyz
      if (targetIdOrCode.includes('http://') || targetIdOrCode.includes('https://') || targetIdOrCode.includes('?')) {
        try {
          const parsedUrl = new URL(targetIdOrCode.startsWith('http') ? targetIdOrCode : `https://${targetIdOrCode}`);
          const gid = parsedUrl.searchParams.get('groupId') || 
                      parsedUrl.searchParams.get('groupInvite') || 
                      parsedUrl.searchParams.get('invite');
          if (gid) {
            targetIdOrCode = gid;
          }
        } catch {
          const match = targetIdOrCode.match(/(?:groupId|groupInvite|invite)=([^&]+)/);
          if (match && match[1]) {
            targetIdOrCode = match[1];
          }
        }
      }

      // Check if it's JSON encoded
      if (targetIdOrCode.startsWith('{') && targetIdOrCode.endsWith('}')) {
        try {
          const parsed = JSON.parse(targetIdOrCode);
          if (parsed.groupId) targetIdOrCode = parsed.groupId;
          else if (parsed.inviteCode) targetIdOrCode = parsed.inviteCode;
          else if (parsed.id) targetIdOrCode = parsed.id;
        } catch (e) {
          console.warn("JSON parse fallback", e);
        }
      }

      // Stop camera if running
      if (scannerInstanceRef.current && cameraActive) {
        try {
          await scannerInstanceRef.current.stop();
          setCameraActive(false);
        } catch (e) {
          console.warn("Scanner stop notice:", e);
        }
      }

      // 1. Try Direct Doc ID Lookup
      let foundGroup: StudyGroup | null = null;
      try {
        const groupRef = doc(db, 'groups', targetIdOrCode);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          foundGroup = { id: groupSnap.id, ...(groupSnap.data() as any) } as StudyGroup;
        }
      } catch (e) {
        console.warn("Doc lookup attempt", e);
      }

      // 2. Try Invite Code Query Lookup
      if (!foundGroup) {
        try {
          const q = query(collection(db, 'groups'), where('inviteCode', '==', targetIdOrCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const firstDoc = snap.docs[0];
            foundGroup = { id: firstDoc.id, ...(firstDoc.data() as any) } as StudyGroup;
          }
        } catch (e) {
          console.warn("Code lookup attempt", e);
        }
      }

      if (foundGroup) {
        setScannedGroup(foundGroup);
      } else {
        setErrorMessage(`No study group found matching "${targetIdOrCode}". Please check the QR code or invite code.`);
      }
    } catch (err: any) {
      console.error("Error processing QR code:", err);
      setErrorMessage("Could not parse this QR code. Please ensure it is an SJ Tutor AI Group QR Code.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Start Camera Scanner
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      if (!scannerInstanceRef.current) {
        scannerInstanceRef.current = new Html5Qrcode("group-qr-reader-container");
      }
      
      const config = { fps: 15, qrbox: { width: 240, height: 240 } };
      await scannerInstanceRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleDecodedQR(decodedText);
        },
        () => {
          // scanning frames
        }
      );
      setCameraActive(true);
    } catch (err: any) {
      console.error("Camera start failed:", err);
      setCameraActive(false);
      setErrorMessage(err?.message || "Could not access device camera. Please check camera permissions or upload an image instead.");
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    if (scannerInstanceRef.current && cameraActive) {
      try {
        await scannerInstanceRef.current.stop();
      } catch (e) {
        console.warn("Camera stop notice:", e);
      } finally {
        setCameraActive(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'camera' && !scannedGroup) {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [activeTab, scannedGroup]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle File Upload QR scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (!scannerInstanceRef.current) {
        scannerInstanceRef.current = new Html5Qrcode("group-qr-reader-container");
      }

      // Stop camera if it was on
      await stopCamera();

      const decodedText = await scannerInstanceRef.current.scanFile(file, true);
      if (decodedText) {
        handleDecodedQR(decodedText);
      }
    } catch (err: any) {
      console.error("File QR scan error:", err);
      setErrorMessage("No QR code found in the selected image. Please upload a clear photo or screenshot.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Joining Group
  const handleConfirmJoin = async () => {
    if (!scannedGroup || isJoining) return;
    setIsJoining(true);
    try {
      const alreadyMember = scannedGroup.members && scannedGroup.members[currentUserId];
      if (alreadyMember) {
        triggerToast('Already a Member!', `You are already part of "${scannedGroup.name}".`, 'Important Alerts');
        onJoinedGroup(scannedGroup);
        onClose();
        return;
      }

      const newMember: GroupMember = {
        uid: currentUserId,
        displayName: currentUserName,
        photoURL: userProfile?.photoURL || '',
        role: 'member',
        joinedAt: Date.now(),
        canMessage: true,
      };

      const success = await joinGroupInFirestore(scannedGroup.id, newMember);
      if (success) {
        // Send notification to group creator
        if (scannedGroup.createdBy && scannedGroup.createdBy !== currentUserId) {
          await sendNotification(
            'New Member Joined via QR! 🎉',
            `${currentUserName} scanned the QR code and joined your group "${scannedGroup.name}".`,
            'Important Alerts',
            scannedGroup.createdBy
          );
        }

        triggerToast('Joined Group Successfully! 🎉', `You are now a member of ${scannedGroup.name}!`, 'Important Alerts');
        
        const updatedGroup = {
          ...scannedGroup,
          members: {
            ...(scannedGroup.members || {}),
            [currentUserId]: newMember,
          },
          memberCount: (scannedGroup.memberCount || 1) + 1,
        };

        onJoinedGroup(updatedGroup);
        onClose();
      } else {
        throw new Error('Failed to update group membership.');
      }
    } catch (e: any) {
      console.error('Join error:', e);
      setErrorMessage(e?.message || 'Could not join group. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleResetScanner = () => {
    setScannedGroup(null);
    setErrorMessage(null);
    setManualInput('');
    if (activeTab === 'camera') {
      setTimeout(() => startCamera(), 200);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-md w-full flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-transparent to-purple-50/60 dark:from-indigo-950/30 dark:to-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Scan Group QR Code
              </h3>
              <p className="text-xs text-slate-500">
                Join study groups instantly with camera or screenshot
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (if no group scanned yet) */}
        {!scannedGroup && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 p-2 gap-1.5 bg-slate-50 dark:bg-slate-800/40">
            <button
              onClick={() => { setActiveTab('camera'); setErrorMessage(null); }}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              Live Camera
            </button>
            <button
              onClick={() => { setActiveTab('upload'); setErrorMessage(null); stopCamera(); }}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
            <button
              onClick={() => { setActiveTab('manual'); setErrorMessage(null); stopCamera(); }}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                activeTab === 'manual'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Enter Code
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 flex-1 flex flex-col items-center justify-center">
          {/* 1. SCANNED GROUP PREVIEW CARD */}
          {scannedGroup ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full space-y-5 text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/10">
                {scannedGroup.iconEmoji || "📚"}
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Group QR Verified
                </span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  {scannedGroup.name}
                </h4>
                {scannedGroup.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto line-clamp-2">
                    {scannedGroup.description}
                  </p>
                )}
              </div>

              {/* Info Stats */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Subject</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {scannedGroup.subject || 'General Study'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Members</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    {scannedGroup.memberCount || Object.keys(scannedGroup.members || {}).length || 1} active
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Admin</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {scannedGroup.creatorName || 'Instructor/Admin'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Access Mode</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Instant Join
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleResetScanner}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Scan Another
                </button>
                <button
                  type="button"
                  onClick={handleConfirmJoin}
                  disabled={isJoining}
                  className="flex-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Group Now
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* 2. CAMERA SCANNER MODE */}
              {activeTab === 'camera' && (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full max-w-[280px] aspect-square rounded-3xl overflow-hidden bg-slate-950 border-2 border-indigo-500 shadow-2xl flex items-center justify-center">
                    <div id="group-qr-reader-container" className="w-full h-full overflow-hidden" />
                    
                    {/* Visual Target Reticle */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-indigo-400/80 rounded-2xl relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1 rounded-tl" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1 rounded-tr" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1 rounded-bl" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1 rounded-br" />
                        <div className="w-full h-0.5 bg-indigo-400/90 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                      </div>
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-2">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        <span className="text-xs font-bold">Decoding Group QR...</span>
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
                    Align the group QR code inside the frame to scan automatically
                  </p>
                </div>
              )}

              {/* 3. UPLOAD IMAGE MODE */}
              {activeTab === 'upload' && (
                <div className="w-full flex flex-col items-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-[280px] aspect-square rounded-3xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                      <Upload className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Upload QR Image
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Click to browse or drop a screenshot of the group QR code
                    </p>
                  </div>
                </div>
              )}

              {/* 4. MANUAL ENTER CODE MODE */}
              {activeTab === 'manual' && (
                <div className="w-full space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Group Invite Code, ID, or Link
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. STUDY100 or group_1752... or link"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleDecodedQR(manualInput);
                        }
                      }}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDecodedQR(manualInput)}
                    disabled={isProcessing || !manualInput.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Look Up Group
                  </button>
                </div>
              )}

              {/* Error Message Notice */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2 text-left w-full"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{errorMessage}</span>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
