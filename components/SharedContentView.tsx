import React, { useState, useEffect } from "react";
import { 
  Link as LinkIcon, 
  Trash2, 
  Copy, 
  Eye, 
  Calendar, 
  Share2, 
  ExternalLink, 
  FileText, 
  BrainCircuit, 
  BookOpen, 
  MessageSquare, 
  Check,
  AlertCircle,
  Clock
} from "lucide-react";
import { getUserSharedContent, deleteSharedContent } from "../utils/firebaseUtils";

interface SharedContentViewProps {
  userId: string | null;
  onSelectSharedItem?: (shareId: string) => void;
}

export const SharedContentView: React.FC<SharedContentViewProps> = ({ 
  userId,
  onSelectSharedItem
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fetchSharedItems = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUserSharedContent(userId);
      setItems(data);
    } catch (e: any) {
      console.error(e);
      setErrorCode("Could not load your shared items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedItems();
  }, [userId]);

  const handleCopyLink = async (shareId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/share/${shareId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert("Failed to copy link.");
    }
  };

  const handleDelete = async (shareId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this shared link? Anyone using this link will immediately lose access.")) {
      return;
    }
    try {
      const success = await deleteSharedContent(shareId);
      if (success) {
        setItems((prev) => prev.filter((item) => item.shareId !== shareId));
      } else {
        alert("Failed to delete link.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting item.");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "quiz":
        return <BrainCircuit className="w-4 h-4 text-orange-500" />;
      case "summary":
        return <FileText className="w-4 h-4 text-amber-500" />;
      case "homework":
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case "tutor":
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case "quiz":
        return "AI Quiz";
      case "summary":
        return "AI Summary";
      case "homework":
        return "AI Homework";
      case "tutor":
        return "Tutor Session";
      default:
        return "Study Material";
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatLastActive = (timestamp: any) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "Just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return formatDate(timestamp);
  };

  if (!userId || userId === "guest") {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 shadow-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-center">
        <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sign in required</h2>
        <p className="text-slate-500 dark:text-slate-400">
          You must be signed in to generate and manage shared teaching materials.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Share2 className="w-7 h-7 text-primary-500" />
            Shared Public Content
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track views, engagement, and manage links for materials shared with Google Classroom, Quizizz or directly.
          </p>
        </div>
        <button
          onClick={fetchSharedItems}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          Refresh List
        </button>
      </div>

      {errorCode && (
        <div className="bg-red-50 dark:bg-rose-950/20 border border-red-200 dark:border-rose-900 text-red-600 dark:text-rose-400 p-4 rounded-xl mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{errorCode}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 mt-4">Loading your shared links...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800/80 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 shadow-sm">
          <div className="w-16 h-16 bg-primary-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-100 dark:border-slate-600">
            <LinkIcon className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">No Shared Links Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm mb-6">
            Generate your first public share link from any generated summary, quiz, homework solution, or notes page!
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="px-6 py-4">Title & Type</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Last Viewed</th>
                  <th className="px-6 py-4 text-center">Views</th>
                  <th className="px-6 py-4 text-center">Shares</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr 
                    key={item.shareId}
                    onClick={() => onSelectSharedItem && onSelectSharedItem(item.shareId)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                          {getTypeIcon(item.type)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white text-sm line-clamp-1 max-w-[280px]">
                            {item.title}
                          </p>
                          <span className="text-[10px] font-bold uppercase tracking-wider inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded mt-0.5">
                            {getTypeLabel(item.type)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatLastActive(item.lastViewedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <div className="inline-flex items-center gap-1 font-mono">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        {item.views || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <div className="inline-flex items-center gap-1 font-mono">
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                        {item.sharesCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleCopyLink(item.shareId, e)}
                          title="Copy Link"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1 text-xs font-semibold"
                        >
                          {copiedId === item.shareId ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy URL</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`${window.location.origin}/share/${item.shareId}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Public Page"
                          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={(e) => handleDelete(item.shareId, e)}
                          title="Delete Link"
                          className="p-2 rounded-lg border border-red-200 hover:border-red-300 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-based List */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <div 
                key={item.shareId}
                onClick={() => onSelectSharedItem && onSelectSharedItem(item.shareId)}
                className="p-5 hover:bg-slate-50/30 dark:hover:bg-slate-800/40 cursor-pointer transition active:bg-slate-100 dark:active:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 flex-shrink-0">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white text-sm line-clamp-1">
                        {item.title}
                      </p>
                      <span className="text-[9px] font-bold uppercase tracking-wider inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-300 rounded mt-0.5">
                        {getTypeLabel(item.type)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleCopyLink(item.shareId, e)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300"
                    >
                      {copiedId === item.shareId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => handleDelete(item.shareId, e)}
                      className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-850 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Created</span>
                    {formatDate(item.createdAt)}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Views</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{item.views || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Last Viewed</span>
                    {formatLastActive(item.lastViewedAt)}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Shares</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{item.sharesCount || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
