import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookMarked, 
  BrainCircuit, 
  FileText, 
  BookOpen, 
  MessageCircle, 
  Search, 
  Trash2, 
  Share2, 
  RefreshCw, 
  Calendar, 
  CheckCircle, 
  ArrowRight,
  FolderX,
  X,
  Check
} from 'lucide-react';
import { AppMode, HistoryItem, UserProfile } from '../types';
import { 
  ProfileSavedItem, 
  getProfileSavedItems, 
  deleteProfileSavedItem, 
  resolveUserAccountId,
  subscribeToProfileSavedItems
} from '../services/profileSavedItemsService';
import { createSharedContent } from '../utils/firebaseUtils';

interface ProfileSavedItemsSectionProps {
  userUid?: string | null;
  profile: UserProfile;
  email?: string | null;
  onLoadItem?: (item: HistoryItem) => void;
  onItemsCountChange?: (count: number) => void;
}

type FilterCategory = 'ALL' | 'QUIZ' | 'SUMMARY' | 'TUTOR' | 'HOMEWORK';
type SortOption = 'newest' | 'oldest' | 'score' | 'alphabetical';

export const ProfileSavedItemsSection: React.FC<ProfileSavedItemsSectionProps> = ({
  userUid,
  profile,
  email,
  onLoadItem,
  onItemsCountChange
}) => {
  const [items, setItems] = useState<ProfileSavedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [resolvedAccountId, setResolvedAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Fetch logic with strict account resolution
  const fetchItems = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      // 1. Resolve Account ID using identical logic to Summaries & Quizzes
      const providedCandidate = userUid || profile?.uid || profile?.sjTutorId || profile?.registrationNumber;
      const accountId = await resolveUserAccountId(providedCandidate, email || profile?.email);

      if (!accountId) {
        console.log('[ProfileSavedItems] Account ID not yet available; waiting for session restoration...');
        // Do NOT set empty items or error; keep loading indicator active until auth resolves
        return;
      }

      setResolvedAccountId(accountId);

      // 2. Fetch all saved documents from Firestore (both history and savedItems)
      const fetched = await getProfileSavedItems(accountId);
      setItems(fetched);
      if (onItemsCountChange) {
        onItemsCountChange(fetched.length);
      }
    } catch (err: any) {
      console.error('[ProfileSavedItems] Failed to fetch items from Firestore:', err);
      setError(err?.message || 'Failed to retrieve saved items from Firestore.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial and reactive fetch when credentials or props change
  useEffect(() => {
    fetchItems();
  }, [userUid, profile?.uid, profile?.sjTutorId, profile?.registrationNumber, email]);

  // Real-time Firestore sync when account ID is established
  useEffect(() => {
    if (!resolvedAccountId) return;

    const unsubscribe = subscribeToProfileSavedItems(
      resolvedAccountId,
      (updatedItems) => {
        setItems(updatedItems);
        setIsLoading(false);
        if (onItemsCountChange) {
          onItemsCountChange(updatedItems.length);
        }
      },
      (err) => {
        console.warn('[ProfileSavedItems] Real-time listener non-fatal error:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [resolvedAccountId]);

  // Category counts for filter tabs
  const counts = useMemo(() => {
    return {
      all: items.length,
      quiz: items.filter(i => i.type === AppMode.QUIZ).length,
      summary: items.filter(i => i.type === AppMode.SUMMARY).length,
      tutor: items.filter(i => i.type === AppMode.TUTOR).length,
      homework: items.filter(i => i.type === AppMode.HOMEWORK || i.type === AppMode.ESSAY).length,
    };
  }, [items]);

  // Filtered and sorted items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Category filter
    if (filterCategory === 'QUIZ') {
      result = result.filter(i => i.type === AppMode.QUIZ);
    } else if (filterCategory === 'SUMMARY') {
      result = result.filter(i => i.type === AppMode.SUMMARY);
    } else if (filterCategory === 'TUTOR') {
      result = result.filter(i => i.type === AppMode.TUTOR);
    } else if (filterCategory === 'HOMEWORK') {
      result = result.filter(i => i.type === AppMode.HOMEWORK || i.type === AppMode.ESSAY);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(i => 
        i.title.toLowerCase().includes(q) ||
        i.subtitle.toLowerCase().includes(q) ||
        (i.subject && i.subject.toLowerCase().includes(q)) ||
        (i.chapterName && i.chapterName.toLowerCase().includes(q))
      );
    }

    // Sort option
    if (sortOption === 'newest') {
      result.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortOption === 'oldest') {
      result.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortOption === 'score') {
      result.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    } else if (sortOption === 'alphabetical') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [items, filterCategory, searchQuery, sortOption]);

  // Convert ProfileSavedItem to HistoryItem format for seamless loading
  const handleOpenItem = (savedItem: ProfileSavedItem) => {
    if (!onLoadItem) return;
    const historyItem: HistoryItem = {
      id: savedItem.id,
      type: savedItem.type as any,
      title: savedItem.title,
      subtitle: savedItem.subtitle,
      timestamp: savedItem.timestamp,
      content: savedItem.content,
      formData: savedItem.formData,
      score: savedItem.score,
    };
    onLoadItem(historyItem);
  };

  // Delete item handler
  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    if (!resolvedAccountId) return;
    setDeletingItemId(itemId);
    try {
      const ok = await deleteProfileSavedItem(resolvedAccountId, itemId);
      if (ok) {
        setItems(prev => prev.filter(i => i.id !== itemId));
      }
    } catch (err) {
      console.error('[ProfileSavedItems] Failed to delete item:', err);
    } finally {
      setDeletingItemId(null);
    }
  };

  // Share item handler
  const handleShareItem = async (e: React.MouseEvent, item: ProfileSavedItem) => {
    e.stopPropagation();
    try {
      const uid = resolvedAccountId || 'guest';
      let contentToShare = item.content;
      if (item.type?.toLowerCase().includes('quiz') && item.score !== undefined) {
        if (Array.isArray(item.content)) {
          contentToShare = {
            questions: item.content,
            userScore: item.score,
            totalQuestions: item.content.length,
            percentage: item.content.length > 0 ? Math.round((item.score / item.content.length) * 100) : 0,
            submitterName: 'Student'
          };
        } else if (item.content && typeof item.content === 'object') {
          contentToShare = {
            ...item.content,
            userScore: item.score
          };
        }
      }
      const shareId = await createSharedContent(item.type, item.title, contentToShare, uid);
      const shareUrl = `${window.location.origin}/share/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedItemId(item.id);
      setTimeout(() => setCopiedItemId(null), 3000);
    } catch (err) {
      console.warn('[ProfileSavedItems] Share copy failed, using fallback title copy:', err);
      navigator.clipboard.writeText(`${item.title} - ${item.subtitle}`);
      setCopiedItemId(item.id);
      setTimeout(() => setCopiedItemId(null), 3000);
    }
  };

  return (
    <div id="profile-saved-items" className="bg-white dark:bg-slate-850 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/60 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 mt-0.5">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                Saved Items & Study Materials
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-100 dark:border-primary-800">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your synced summaries, quizzes, homework solutions, and tutor notes retrieved from Firebase Firestore.
            </p>
          </div>
        </div>

        {/* Sync Status & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Firestore Synced</span>
          </div>

          <button
            onClick={() => fetchItems(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh from Firebase Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary-600' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Account ID resolution banner (for transparency and verification) */}
      {resolvedAccountId && (
        <div className="mt-4 px-3 py-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Account ID:</span>
            <code className="font-mono text-primary-600 dark:text-primary-400 font-bold truncate">
              {resolvedAccountId}
            </code>
          </div>
          <span className="shrink-0 text-[11px] bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-medium">
            Realtime Active
          </span>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved summaries, quizzes, topics..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="py-2.5 px-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="score">Highest Quiz Score</option>
              <option value="alphabetical">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              filterCategory === 'ALL'
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Items ({counts.all})
          </button>

          <button
            onClick={() => setFilterCategory('QUIZ')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterCategory === 'QUIZ'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Quizzes ({counts.quiz})
          </button>

          <button
            onClick={() => setFilterCategory('SUMMARY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterCategory === 'SUMMARY'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Summaries ({counts.summary})
          </button>

          <button
            onClick={() => setFilterCategory('TUTOR')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterCategory === 'TUTOR'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            AI Tutor ({counts.tutor})
          </button>

          <button
            onClick={() => setFilterCategory('HOMEWORK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              filterCategory === 'HOMEWORK'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Homework ({counts.homework})
          </button>
        </div>
      </div>

      {/* Main Body States */}
      <div className="mt-6">
        {/* Loading Skeleton State */}
        {isLoading && items.length === 0 ? (
          <div className="space-y-4">
            <div className="p-4 bg-primary-50/50 dark:bg-primary-950/20 rounded-xl border border-primary-100 dark:border-primary-900/40 flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-spin" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Retrieving saved items from Firebase Firestore...
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Resolving account credentials and loading saved summaries, quizzes, and notes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 animate-pulse space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-20 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="pt-2 flex justify-end gap-2">
                    <div className="w-16 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          /* Error State */
          <div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center space-y-3">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
              {error}
            </p>
            <button
              onClick={() => fetchItems()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : items.length === 0 ? (
          /* Empty State (When no documents exist in Firestore) */
          <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <FolderX className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Saved Items in This Account Yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              When you generate study summaries, complete quizzes, solve homework, or ask the AI Tutor for help, your saved materials will automatically appear here.
            </p>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          /* Empty Search Match State */
          <div className="py-10 px-6 text-center border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 space-y-2">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No items match &quot;{searchQuery}&quot;
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search terms or filter category.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('ALL');
              }}
              className="mt-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Populated Items Grid */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAndSortedItems.slice(0, visibleCount).map((item) => {
                const isQuiz = item.type === AppMode.QUIZ;
                const isSummary = item.type === AppMode.SUMMARY;
                const isHomework = item.type === AppMode.HOMEWORK || item.type === AppMode.ESSAY;

                const badgeBg = isQuiz 
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                  : isSummary
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                  : isHomework
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                  : 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900/50';

                const IconComponent = isQuiz 
                  ? BrainCircuit 
                  : isSummary 
                  ? FileText 
                  : isHomework 
                  ? BookOpen 
                  : MessageCircle;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenItem(item)}
                    className="group relative p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-primary-300 dark:hover:border-primary-700/60 hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      {/* Top Bar: Type Badge & Date */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${badgeBg}`}>
                            <IconComponent className="w-3 h-3" />
                            <span>{item.type}</span>
                          </span>

                          {isQuiz && item.score !== undefined && (
                            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                              Score: {item.score}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                        {item.title}
                      </h4>

                      {/* Subtitle / Metadata */}
                      {item.subtitle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-primary-600 dark:text-primary-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Open & Study
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Share Button */}
                        <button
                          onClick={(e) => handleShareItem(e, item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title={copiedItemId === item.id ? "Link Copied!" : "Share saved item"}
                        >
                          {copiedItemId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteItem(e, item.id)}
                          disabled={deletingItemId === item.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete from Firestore"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button if items exceed visibleCount */}
            {filteredAndSortedItems.length > visibleCount && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Show More Saved Items ({filteredAndSortedItems.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSavedItemsSection;
