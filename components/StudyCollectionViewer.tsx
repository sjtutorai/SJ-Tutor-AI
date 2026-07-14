import React, { useState, useEffect } from "react";
import { 
  getDocs, 
  collection, 
  query, 
  where,
  setDoc,
  doc,
  increment
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { 
  FolderOpen, 
  BookOpen, 
  FileText, 
  BrainCircuit, 
  Calendar, 
  User, 
  Share2, 
  Heart, 
  QrCode, 
  ShieldAlert, 
  ChevronRight,
  Layers
} from "lucide-react";

interface StudyCollectionViewerProps {
  slug: string;
  onGoToApp?: () => void;
}

export const StudyCollectionViewer: React.FC<StudyCollectionViewerProps> = ({
  slug,
  onGoToApp
}) => {
  const [colData, setColData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "collections"), 
          where("slug", "==", slug.trim().toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const id = docSnap.id;
          const data = { id, ...docSnap.data() };
          setColData(data);
          setLikesCount(data.likes || 0);

          // Increment view counter
          try {
            const colDocRef = doc(db, "collections", id);
            await setDoc(colDocRef, { views: increment(1) }, { merge: true });
          } catch (viewErr) {
            console.warn("Could not increment collection views:", viewErr);
          }
        }
      } catch (err) {
        console.error("Error fetching collection:", err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCollection();
    }
  }, [slug]);

  const handleLike = async () => {
    if (hasLiked) return;
    setHasLiked(true);
    setLikesCount(prev => prev + 1);
    try {
      const colDocRef = doc(db, "collections", colData.id);
      await setDoc(colDocRef, { likes: increment(1) }, { merge: true });
    } catch (e) {
      console.warn("Failed to increment likes:", e);
    }
  };

  const handleShare = async () => {
    const link = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Study Collection: ${colData?.title || "Educational Material"}`,
          text: `Check out this revision collection: "${colData?.title}" on SJ Tutor AI!`,
          url: link
        });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.warn("Share cancelled or failed", e);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "quiz":
        return <BrainCircuit className="w-5 h-5 text-orange-500 animate-pulse" />;
      case "summary":
        return <FileText className="w-5 h-5 text-amber-500" />;
      case "note":
      case "notes":
        return <BookOpen className="w-5 h-5 text-indigo-500" />;
      default:
        return <FileText className="w-5 h-5 text-emerald-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="space-y-4 text-center max-w-sm">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading Study Collection...</p>
        </div>
      </div>
    );
  }

  if (!colData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="text-center max-w-md p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-5 animate-scale-up">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-950 dark:text-white">Collection Not Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The study collection slug <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-300">/{slug}</span> does not exist or has been deleted.
            </p>
          </div>
          <div className="pt-3 flex gap-3">
            {onGoToApp && (
              <button 
                onClick={onGoToApp}
                className="w-full py-3 rounded-2xl text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-md shadow-amber-500/10 transition-colors"
              >
                Go to SJ Tutor AI
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Layers className="w-6 h-6 text-amber-500" />
            <span className="font-bold tracking-tight text-lg">SJ Tutor AI</span>
            <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">Study Collections</span>
          </div>
          {onGoToApp && (
            <button 
              onClick={onGoToApp}
              className="text-xs font-bold text-amber-500 hover:text-amber-600 hover:underline flex items-center gap-1"
            >
              Open Workspace <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collection Header Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          {/* Subtle colored mesh background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" /> Study Pack
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleLike}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                    hasLiked 
                      ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                  <span>{likesCount} Likes</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copied ? "Copied!" : "Share Pack"}</span>
                </button>
                <button 
                  onClick={() => setShowQr(!showQr)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                  title="Toggle Collection QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                {colData.title}
              </h1>
              {colData.description && (
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {colData.description}
                </p>
              )}
            </div>

            {/* Author and Metadata Bar */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-400 font-semibold">
              {colData.ownerName && (
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <User className="w-4 h-4 text-slate-400" /> Compiled by <span className="font-bold text-amber-500">@{colData.ownerName}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Updated {new Date(colData.createdAt || Date.now()).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}
              </span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400">
                {colData.items?.length || 0} Learning Item{(colData.items?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code Container if enabled */}
        {showQr && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center space-y-3 animate-scale-up">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pack QR Access Key</h4>
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.href)}`} 
              alt="Collection QR Code" 
              className="w-40 h-40 border p-2.5 bg-white rounded-xl shadow-md"
              referrerPolicy="no-referrer"
            />
            <p className="text-[10px] text-slate-400">Scan code to load study collection on any phone or tablet</p>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-2">Included Resources</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(!colData.items || colData.items.length === 0) ? (
              <div className="col-span-2 text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">This collection is currently empty.</p>
              </div>
            ) : (
              colData.items.map((item: any, i: number) => {
                // Determine item link path
                const itemType = item.type?.toLowerCase() || "summary";
                const itemUrl = `/share/${itemType}/${item.id || item.shareId || "demo"}`;
                return (
                  <div 
                    key={i}
                    onClick={() => window.location.href = itemUrl}
                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-amber-500 hover:shadow-lg cursor-pointer flex flex-col justify-between transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                          {getItemIcon(item.type)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {item.type || "Summary"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 dark:text-white leading-snug group-hover:text-amber-500 transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        {item.subtitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold line-clamp-1">
                            {item.subtitle}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-3 mt-4 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1 text-amber-500">
                        Launch Study Module <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
