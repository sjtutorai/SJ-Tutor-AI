import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  QrCode, 
  Maximize2, 
  Minimize2,
  ShieldCheck, 
  Users, 
  BookOpen,
  Link as LinkIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { StudyGroup } from '../types';
import { useNotifications } from './NotificationContext';

interface GroupQRModalProps {
  group: StudyGroup;
  currentUserName: string;
  onClose: () => void;
}

export const GroupQRModal: React.FC<GroupQRModalProps> = ({
  group,
  currentUserName,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const { triggerToast } = useNotifications();

  // Primary share link
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sjtutorai.vercel.app';
  const groupInviteUrl = `${origin}/?groupId=${group.id}&inviter=${encodeURIComponent(currentUserName)}`;

  // Structured QR payload (can be decoded as URL or direct ID)
  const qrPayload = groupInviteUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(groupInviteUrl);
    setCopiedLink(true);
    triggerToast('Invite Link Copied! 🔗', 'Share this link with classmates or friends.', 'Important Alerts');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    const code = group.inviteCode || group.id;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    triggerToast('Invite Code Copied! 📋', `Invite Code "${code}" copied to clipboard.`, 'Important Alerts');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadQR = () => {
    try {
      const svg = qrRef.current?.querySelector('svg');
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      // High-resolution canvas for crisp export
      const size = 1000;
      canvas.width = size;
      canvas.height = size + 200; // room for branding & group name

      img.onload = () => {
        if (!ctx) return;
        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Title
        ctx.fillStyle = '#4f46e5';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SJ TUTOR AI • STUDY GROUP', size / 2, 80);

        // Group Name
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 52px sans-serif';
        const truncatedName = group.name.length > 25 ? group.name.slice(0, 24) + '...' : group.name;
        ctx.fillText(truncatedName, size / 2, 140);

        // Draw QR Code
        ctx.drawImage(img, (size - 700) / 2, 180, 700, 700);

        // Footer Code
        ctx.fillStyle = '#64748b';
        ctx.font = '34px sans-serif';
        ctx.fillText(`Scan or enter code: ${group.inviteCode || group.id.slice(0, 10)}`, size / 2, 940);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '28px sans-serif';
        ctx.fillText('Join at sjtutorai.vercel.app', size / 2, 990);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${group.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_group_qr.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        triggerToast('QR Code Downloaded! 📥', 'Saved high-res group QR poster.', 'Important Alerts');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (e) {
      console.error('Error downloading QR code:', e);
      triggerToast('Download Error', 'Could not export QR code image.', 'Important Alerts');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on SJ Tutor AI`,
          text: `Hey! Join our "${group.name}" study group on SJ Tutor AI to practice quizzes, ask AI questions, and collaborate!`,
          url: groupInviteUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        className={`bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-all ${
          isFullscreen ? 'w-full h-full max-w-4xl max-h-[90vh]' : 'max-w-md w-full'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-transparent to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 font-bold text-lg">
              {group.iconEmoji || <QrCode className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  Group QR Pass
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  Scan to Join
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">
                {group.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center text-center space-y-5">
          {/* Group Badge Details */}
          <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl">
                {group.iconEmoji || "📚"}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                  {group.name}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-medium">
                    <BookOpen className="w-3 h-3 text-indigo-500" />
                    {group.subject || 'General Studies'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-500" />
                    {group.memberCount || Object.keys(group.members || {}).length || 1} members
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Access
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                <ShieldCheck className="w-3.5 h-3.5" />
                {group.isPublic ? 'Public' : 'Approval'}
              </span>
            </div>
          </div>

          {/* QR Code Container */}
          <div 
            ref={qrRef}
            className={`relative p-5 bg-white rounded-3xl border-2 border-indigo-200 dark:border-indigo-900 shadow-xl shadow-indigo-500/10 flex flex-col items-center justify-center transition-all ${
              isFullscreen ? 'scale-125 my-8' : ''
            }`}
          >
            <div className="absolute -top-3 px-3 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-md">
              SJ Tutor AI Group Pass
            </div>

            <div className="p-2 rounded-2xl bg-white">
              <QRCodeSVG
                value={qrPayload}
                size={isFullscreen ? 280 : 210}
                level="H"
                marginSize={2}
                fgColor="#0f172a"
                imageSettings={{
                  src: "https://i.ibb.co/qFknfdny/IMG-20260810-WA0018.jpg",
                  x: undefined,
                  y: undefined,
                  height: 38,
                  width: 38,
                  excavate: true,
                }}
              />
            </div>

            <p className="mt-3 text-[11px] font-semibold text-slate-500">
              Hold any mobile camera or SJ Tutor Scanner to join
            </p>
          </div>

          {/* Invite Code Quick Box */}
          {group.inviteCode && (
            <div className="w-full flex items-center justify-between p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
              <div className="text-left">
                <div className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-600 dark:text-indigo-400">
                  Invite Code
                </div>
                <div className="text-base font-black font-mono tracking-widest text-slate-900 dark:text-white">
                  {group.inviteCode}
                </div>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition active:scale-95"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={handleCopyLink}
              className="py-3 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 border border-slate-200 dark:border-slate-700"
              title="Copy Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <LinkIcon className="w-4 h-4 text-indigo-500" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              onClick={handleDownloadQR}
              className="py-3 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 active:scale-95 border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Poster</span>
            </button>

            <button
              onClick={handleNativeShare}
              className="py-3 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
