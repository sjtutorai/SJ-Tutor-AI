import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { GroupModel } from './types';
import { 
  Download, 
  Share2, 
  Copy, 
  RefreshCw, 
  Calendar, 
  Shield, 
  Users, 
  Globe, 
  Lock, 
  Check, 
  X
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface GroupQRCardProps {
  user: User;
  group: GroupModel;
  onClose: () => void;
  onUpdateGroup: (updated: GroupModel) => void;
}

export const GroupQRCard: React.FC<GroupQRCardProps> = ({
  user,
  group,
  onClose,
  onUpdateGroup,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isOwner = group.ownerId === user.uid;
  const isAdmin = group.admins?.includes(user.uid) || isOwner;

  const joinUrl = group.groupJoinLink || `${window.location.origin}/?joinGroup=${group.id}`;
  const qrValue = group.qrData || JSON.stringify({
    type: 'group_join',
    groupId: group.id,
    version: group.qrVersion || 1,
    link: joinUrl
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Copy link failed:', err);
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(group.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error('Copy ID failed:', err);
    }
  };

  const handleShare = async () => {
    const shareTitle = `Join my Study Group: ${group.name}`;
    const shareText = `Scan the QR code or click this link to join our study group "${group.name}" on SJ Tutor AI! 📚✨`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: joinUrl,
        });
      } catch (err) {
        console.warn('Share canceled or failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // Use html2canvas to capture the card node
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High resolution
        useCORS: true, // Bypass cross-origin restrictions for images
        backgroundColor: null, // Transparent background or transparent rounded corners
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `SJ_Tutor_Group_QR_${group.name.replace(/\s+/g, '_')}.png`;
      link.href = imgData;
      link.click();
    } catch (err) {
      console.error('Failed to download QR Card:', err);
      alert('Could not download QR Card. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRegenerateQR = async () => {
    if (!isAdmin) return;
    const confirmRegen = window.confirm(
      'Are you sure you want to regenerate this QR code? All older printed or shared QR codes for this group will be invalidated immediately for security.'
    );
    if (!confirmRegen) return;

    setRegenerating(true);
    try {
      const newVersion = (group.qrVersion || 1) + 1;
      const newQrData = JSON.stringify({
        type: 'group_join',
        groupId: group.id,
        version: newVersion,
        link: joinUrl,
      });

      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        qrVersion: newVersion,
        qrData: newQrData,
        qrGeneratedAt: Date.now(),
      });

      onUpdateGroup({
        ...group,
        qrVersion: newVersion,
        qrData: newQrData,
        qrGeneratedAt: Date.now(),
      });

      alert('QR Code regenerated successfully! Previous QR versions are now invalidated.');
    } catch (err) {
      console.error('Error regenerating QR Code:', err);
      alert('Failed to regenerate QR Code. Please check permissions.');
    } finally {
      setRegenerating(false);
    }
  };

  const formattedDate = group.createdAt 
    ? (group.createdAt.toDate ? group.createdAt.toDate() : new Date(group.createdAt)).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-w-lg w-full relative overflow-y-auto max-h-[90vh]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full border border-slate-200/50 dark:border-slate-800 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1 text-left">
          Group QR Card
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-left mb-6">
          Share or print this unique card to invite participants to join your study group.
        </p>

        {/* The Capturable Group Card */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 overflow-hidden">
          <div 
            ref={cardRef} 
            className="bg-gradient-to-b from-primary-600 via-primary-700 to-slate-900 p-6 rounded-2xl text-white flex flex-col items-center select-none"
            style={{ width: '100%', maxWidth: '380px', margin: '0 auto' }}
          >
            {/* SJ Tutor Logo Accent */}
            <div className="w-full flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-wider text-white">SJ TUTOR <span className="text-primary-300">AI</span></span>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                group.privacy === 'private' 
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
              }`}>
                {group.privacy === 'private' ? (
                  <><Lock className="w-2.5 h-2.5" /> Private</>
                ) : (
                  <><Globe className="w-2.5 h-2.5" /> Public</>
                )}
              </span>
            </div>

            {/* Group Core Metadata */}
            <h4 className="text-xl font-black text-center tracking-tight truncate w-full mb-1">
              {group.name}
            </h4>
            <p className="text-[11px] text-primary-200 font-bold mb-3 uppercase tracking-wider">
              Category: {group.category || 'Study'}
            </p>

            <p className="text-[11px] text-slate-300 text-center line-clamp-2 max-w-xs px-2 mb-5 leading-normal">
              {group.description || 'Join this study group to collaborate, share documents, and solve academic challenges together!'}
            </p>

            {/* QR Code Canvas */}
            <div className="bg-white p-4 rounded-2xl shadow-xl border border-white/10 mb-5 relative flex items-center justify-center">
              <QRCodeCanvas 
                value={qrValue} 
                size={160} 
                level="H" 
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>

            <p className="text-[10px] text-slate-400 font-semibold mb-5 uppercase tracking-widest">
              Scan to Join Group
            </p>

            {/* Bottom Details Row */}
            <div className="w-full grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-left">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Users className="w-3.5 h-3.5 text-primary-300 shrink-0" />
                <span className="truncate"><b>{group.memberCount || 1}</b> members</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Shield className="w-3.5 h-3.5 text-primary-300 shrink-0" />
                <span className="truncate">Admin: <b>{group.ownerName || 'Student'}</b></span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-primary-300 shrink-0" />
                <span className="truncate">Created: {formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="text-[9px] font-mono text-slate-400 shrink-0 uppercase">QR v{group.qrVersion || 1}</span>
                <span className="truncate text-[9px] font-mono text-slate-400">ID: {group.id.substring(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md shadow-primary-600/10"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Downloading...' : 'Download PNG Card'}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold py-3 px-4 rounded-xl text-xs transition-all"
          >
            <Share2 className="w-4 h-4 text-primary-500" />
            Share Join Link
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold py-3 px-4 rounded-xl text-xs transition-all"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                Copied Link!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Share URL
              </>
            )}
          </button>

          <button
            onClick={handleCopyId}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold py-3 px-4 rounded-xl text-xs transition-all"
          >
            {copiedId ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                Copied ID!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Group ID
              </>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={handleRegenerateQR}
              disabled={regenerating}
              className="col-span-2 flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20 font-bold py-3 px-4 rounded-xl text-xs transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerating...' : 'Regenerate QR (Invalidate Old)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
