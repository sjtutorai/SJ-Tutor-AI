import React, { useState, useEffect } from "react";
import { 
  X, 
  Copy, 
  Check, 
  Globe, 
  Link2, 
  Lock, 
  Calendar, 
  Download, 
  MessageSquare, 
  User, 
  CreditCard, 
  RefreshCw, 
  QrCode, 
  Code,
  Share2
} from "lucide-react";
import { createSharedContent } from "../utils/firebaseUtils";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: string; // 'summary' | 'quiz' | 'flashcards' | 'note' | 'mindmap' | 'project' | 'presentation' | 'question-paper'
  contentId: string;
  title: string;
  content: any;
  ownerUid: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  title,
  content,
  ownerUid
}) => {
  const [visibility, setVisibility] = useState<'private' | 'link' | 'public'>('link');
  const [allowCopy, setAllowCopy] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [showAuthor, setShowAuthor] = useState(true);
  const [showStudentId, setShowStudentId] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [isLinkDisabled, setIsLinkDisabled] = useState(false);
  const [shareId, setShareId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  // Generate unique ID on component load if not already generated
  useEffect(() => {
    if (isOpen) {
      const generatedId = contentId || (Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8));
      setShareId(generatedId);
    }
  }, [isOpen, contentId]);

  if (!isOpen) return null;

  // Build the sharing URL based on content type
  const shareBaseUrl = `${window.location.origin}/share/${contentType}`;
  const shareUrl = `${shareBaseUrl}/${shareId}`;
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  const handleCreateShare = async () => {
    setGenerating(true);
    try {
      // Save sharing configuration to Firestore
      const customId = shareId;
      const finalData = {
        ownerUid,
        contentType,
        contentId,
        visibility,
        shareId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expiresAt: expirationDate ? new Date(expirationDate).getTime() : null,
        isPublic: visibility === 'public',
        allowDownload,
        allowCopy,
        allowComments,
        showAuthor,
        showStudentId,
        isDisabled: isLinkDisabled,
        views: 0,
        likes: 0,
        bookmarks: 0,
        sharesCount: 0
      };

      await createSharedContent(
        contentType,
        title,
        content,
        ownerUid,
        customId
      );

      // Save additional configuration details
      // Since createSharedContent is already defined, we can save/merge advanced config or update directly.
      const docRef = await createSharedContent(contentType, title, {
        ...content,
        _shareConfig: finalData
      }, ownerUid, customId);
      
      setShareId(docRef);
    } catch (e) {
      console.error("Failed to save share options:", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateLink = () => {
    const newId = Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
    setShareId(newId);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Failed to copy link.");
    }
  };

  const copyEmbedToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      alert("Failed to copy embed code.");
    }
  };

  // Social sharing handlers
  const shareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this ${contentType} on SJ Tutor AI: ` + shareUrl)}`, "_blank");
  };

  const shareTelegram = () => {
    window.open(`https://t.telegram.org/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this ${contentType} on SJ Tutor AI!`)}`, "_blank");
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this ${contentType} on SJ Tutor AI!`)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(`SJ Tutor AI shared ${contentType}`)}&body=${encodeURIComponent(`Check out this shared ${contentType} here: ${shareUrl}`)}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SJ Tutor AI - Shared ${contentType}`,
          text: `Check out this educational resource: ${title}`,
          url: shareUrl
        });
      } catch (e) {
        console.warn("Share cancelled or failed", e);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-500">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Share Academic Content</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Create a public sharing link with custom controls</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-300">
          {/* Section 1: Visibility Settings */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Visibility Settings</h4>
            <div className="grid grid-cols-3 gap-3">
              <button 
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 ${
                  visibility === 'private' 
                    ? 'border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400' 
                    : 'border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span className="text-xs font-semibold">Private</span>
              </button>
              <button 
                type="button"
                onClick={() => setVisibility('link')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 ${
                  visibility === 'link' 
                    ? 'border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400' 
                    : 'border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span className="text-xs font-semibold">Anyone with link</span>
              </button>
              <button 
                type="button"
                onClick={() => setVisibility('public')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 ${
                  visibility === 'public' 
                    ? 'border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400' 
                    : 'border-slate-200 dark:border-slate-800 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-semibold">Public platform</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {visibility === 'private' && "Only you can see this content in your dashboard."}
              {visibility === 'link' && "Anyone who has the specific link can view the content directly."}
              {visibility === 'public' && "Your content will be public and featured on the discover index."}
            </p>
          </div>

          {/* Section 2: Advanced Interaction Controls */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Additional Controls & Permissions</h4>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold">Allow Copying Content</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={allowCopy} 
                  onChange={(e) => setAllowCopy(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold">Allow Downloads</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={allowDownload} 
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold">Enable Comments</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={allowComments} 
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold">Show Author Identity</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showAuthor} 
                  onChange={(e) => setShowAuthor(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold">Show Student ID Card</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showStudentId} 
                  onChange={(e) => setShowStudentId(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                <div className="flex items-center gap-3 text-red-500">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-semibold">Disable Public Link</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isLinkDisabled} 
                  onChange={(e) => setIsLinkDisabled(e.target.checked)}
                  className="w-4 h-4 accent-red-500 cursor-pointer rounded"
                />
              </label>
            </div>

            {/* Expiration Date picker */}
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-xs font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" /> Expiration Date (Optional)
              </span>
              <input 
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-white focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Section 3: Link & Action Center */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Action Center</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleRegenerateLink}
                  title="Regenerate Share ID"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                </button>
              </div>
            </div>

            {/* Generated Share Link Box */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-sm">
              <input 
                type="text" 
                readOnly 
                value={shareUrl}
                className="bg-transparent text-xs text-slate-600 dark:text-slate-300 font-mono flex-1 border-none outline-none select-all"
              />
              <button 
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  copied 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Share action buttons */}
            <div className="flex flex-wrap gap-2.5 justify-center">
              <button 
                onClick={shareWhatsApp}
                className="flex items-center justify-center p-2.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                title="Share via WhatsApp"
              >
                <span className="text-xs font-bold px-1">WhatsApp</span>
              </button>
              <button 
                onClick={shareTelegram}
                className="flex items-center justify-center p-2.5 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                title="Share via Telegram"
              >
                <span className="text-xs font-bold px-1">Telegram</span>
              </button>
              <button 
                onClick={shareTwitter}
                className="flex items-center justify-center p-2.5 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-850 dark:text-white hover:bg-slate-200 transition-colors"
                title="Share via X"
              >
                <span className="text-xs font-bold px-1">X</span>
              </button>
              <button 
                onClick={shareFacebook}
                className="flex items-center justify-center p-2.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="Share via Facebook"
              >
                <span className="text-xs font-bold px-1">Facebook</span>
              </button>
              <button 
                onClick={shareEmail}
                className="flex items-center justify-center p-2.5 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                title="Share via Email"
              >
                <span className="text-xs font-bold px-1">Email</span>
              </button>
              <button 
                onClick={() => setShowQr(!showQr)}
                className="flex items-center justify-center p-2.5 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                title="Generate QR Code"
              >
                <QrCode className="w-4 h-4 mr-1" />
                <span className="text-xs font-bold">QR Code</span>
              </button>
              <button 
                onClick={() => setShowEmbed(!showEmbed)}
                className="flex items-center justify-center p-2.5 rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
                title="Get Embed Code"
              >
                <Code className="w-4 h-4 mr-1" />
                <span className="text-xs font-bold">Embed</span>
              </button>
              <button 
                onClick={handleNativeShare}
                className="flex items-center justify-center p-2.5 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                title="More Share Options"
              >
                <Share2 className="w-4 h-4 mr-1" />
                <span className="text-xs font-bold">Share API</span>
              </button>
            </div>

            {/* Conditional Sub-panels: QR or Embed */}
            {showQr && (
              <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 animate-slide-up">
                <h5 className="text-xs font-bold text-slate-500">QR Code for Sharing</h5>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareUrl)}`} 
                  alt="Sharing QR Code" 
                  className="w-40 h-40 border p-2 rounded bg-white shadow-inner"
                  referrerPolicy="no-referrer"
                />
                <p className="text-[10px] text-slate-400">Scan using mobile camera or QR reader</p>
              </div>
            )}

            {showEmbed && (
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 animate-slide-up">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-500 font-mono">Embed HTML Code</h5>
                  <button 
                    onClick={copyEmbedToClipboard}
                    className="text-[10px] flex items-center gap-1 font-semibold text-amber-500 hover:underline"
                  >
                    {copiedEmbed ? "Copied!" : "Copy Embed Code"}
                  </button>
                </div>
                <textarea 
                  readOnly
                  value={embedCode}
                  className="w-full h-16 p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-500 resize-none outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors text-slate-600 dark:text-slate-400"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreateShare}
            disabled={generating}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50 shadow-md shadow-amber-500/10 transition-colors"
          >
            {generating ? "Saving Settings..." : "Save & Activate Link"}
          </button>
        </div>
      </div>
    </div>
  );
};
