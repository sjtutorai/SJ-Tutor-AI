import React, { useState, useEffect } from 'react';
import { getUsersSharedContent, deleteSharedContent, SharedContentData } from '../utils/firebaseUtils';
import { 
  Share2, Trash2, Link, ExternalLink, Calendar, Eye, Heart, Search, 
  FileText, BrainCircuit, BookOpen, MessageCircle, RefreshCw, Filter 
} from 'lucide-react';

interface SharedContentViewProps {
  userId: string;
}

const SharedContentView: React.FC<SharedContentViewProps> = ({ userId }) => {
  const [items, setItems] = useState<SharedContentData[]>([]);
  const [filteredItems, setFilteredItems] = useState<SharedContentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getUsersSharedContent(userId);
      setItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error("Error retrieving shared materials", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchItems();
    }
  }, [userId]);

  // Handle Search and Filters
  useEffect(() => {
    let result = items;

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.type.toLowerCase().includes(query)
      );
    }

    if (selectedType !== "all") {
      result = result.filter(item => item.type === selectedType);
    }

    setFilteredItems(result);
  }, [searchQuery, selectedType, items]);

  const handleCopyLink = async (shareId: string) => {
    const shareUrl = `${window.location.origin}/share/${shareId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("🔗 Public shareable link copied to clipboard!");
    } catch (err) {
      console.error("Could not copy link", err);
      alert("Copy failed, please highlight and copy the link manually.");
    }
  };

  const handleDelete = async (shareId: string) => {
    if (!window.confirm("Are you sure you want to delete this shared link? Public users will no longer be able to view this content.")) {
      return;
    }

    setActionLoading(shareId);
    try {
      const ok = await deleteSharedContent(shareId);
      if (ok) {
        setItems(prev => prev.filter(item => item.shareId !== shareId));
      } else {
        alert("Failed to delete shared content item. Check backend logs.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'quiz':
        return <BrainCircuit className="w-5 h-5 text-indigo-500" />;
      case 'summary':
        return <FileText className="w-5 h-5 text-amber-500" />;
      case 'homework':
      case 'essay':
        return <BookOpen className="w-5 h-5 text-emerald-500" />;
      case 'tutor':
        return <MessageCircle className="w-5 h-5 text-sky-500" />;
      default:
        return <Share2 className="w-5 h-5 text-slate-500" />;
    }
  };

  const getFriendlyType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'quiz':
        return 'AI Quiz Challenge';
      case 'summary':
        return 'AI Instant Summary';
      case 'homework':
        return 'Homework Solution';
      case 'essay':
        return 'Essay Helper';
      case 'tutor':
        return 'AI Tutor Chat';
      default:
        return type.toUpperCase();
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Share2 className="w-7 h-7 text-primary-500 animate-pulse" />
            Shared Public Hub
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage, copy, and view analytics of the study materials you shared publicly with anyone.
          </p>
        </div>
        <button 
          onClick={fetchItems}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by title, subject, or content type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
          />
        </div>

        {/* Content Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:inline" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm cursor-pointer"
          >
            <option value="all">All Shared Types</option>
            <option value="quiz">Quizzes only</option>
            <option value="summary">Summaries only</option>
            <option value="homework">Homework Solutions only</option>
            <option value="tutor">Tutor Chats only</option>
          </select>
        </div>
      </div>

      {/* Content List Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-t-primary-500 border-primary-100 animate-spin mb-4"></div>
          <p className="text-sm font-semibold">Loading public shared hub details...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 border-dashed">
          <div className="w-16 h-16 bg-primary-100/50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-white">No shared links found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedType !== "all" 
              ? "No items match your active search filter options. Try resetting them."
              : "Generate a quiz, summary, or homework answer, then click 'Share Public Link' to see it here!"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Name / Title</th>
                  <th className="py-4 px-6 hide-on-mobile">Type</th>
                  <th className="py-4 px-6">Created Date</th>
                  <th className="py-2 px-6 text-center">Views</th>
                  <th className="py-2 px-6 text-center">Likes</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-600 dark:text-slate-300">
                {filteredItems.map((item) => {
                  const viewUrl = `${window.location.origin}/share/${item.shareId}`;
                  return (
                    <tr key={item.shareId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Name / Title */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-lg shadow-sm">
                            {getContentIcon(item.type)}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 dark:text-white line-clamp-1 max-w-[200px] sm:max-w-xs">
                              {item.title}
                            </p>
                            <span className="sm:hidden block text-[10px] uppercase font-bold tracking-wider text-primary-600 mt-0.5">
                              {getFriendlyType(item.type)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Content Type */}
                      <td className="py-4 px-6 hide-on-mobile font-bold text-xs uppercase text-slate-400">
                        {getFriendlyType(item.type)}
                      </td>

                      {/* Creation Date */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Views Count */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-500/10">
                          <Eye className="w-3.5 h-3.5" />
                          {item.views}
                        </div>
                      </td>

                      {/* Likes Count */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/5 text-rose-500 dark:text-rose-400 rounded-full text-xs font-bold border border-rose-500/10">
                          <Heart className="w-3.5 h-3.5 fill-rose-500/10" />
                          {item.likes}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyLink(item.shareId)}
                            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-100 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Copy share link"
                          >
                            <Link className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => window.open(viewUrl, '_blank')}
                            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-primary-600 dark:text-primary-400 border border-slate-100 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Open layout page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(item.shareId)}
                            disabled={actionLoading === item.shareId}
                            className="p-2 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            title="Delete public shared item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedContentView;
