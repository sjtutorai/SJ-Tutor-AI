import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { Users, Filter } from 'lucide-react';
import { GroupModel } from './types';

interface DiscoverGroupsProps {
  user: User;
  searchQuery: string;
  onJoinGroup: (group: GroupModel) => void;
  onCreateGroupClick: () => void;
}

export const DiscoverGroups: React.FC<DiscoverGroupsProps> = ({
  user,
  searchQuery,
  onJoinGroup,
  onCreateGroupClick,
}) => {
  const [groups, setGroups] = useState<GroupModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(6);
  const [sortBy, setSortBy] = useState<'newest' | 'members'>('newest');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  useEffect(() => {
    // Query public, active groups using real-time listener
    const q = query(
      collection(db, 'groups'),
      where('visibility', '==', 'public'),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const fetched = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            subject: data.subject || data.description || 'No subject',
          };
        }) as GroupModel[];

        setGroups(fetched);
        setLoading(false);

        // Perform transparent migration of required fields safely for owned groups
        for (const d of snapshot.docs) {
          const data = d.data();
          if (data.ownerId !== user.uid) continue; // Only owners can migrate their own groups to avoid security rule blocking
          
          let needsUpdate = false;
          let updates: any = {};
          if (!data.subject && data.description) {
            updates.subject = data.description;
            needsUpdate = true;
          }
          if (data.privacy !== undefined && !data.visibility) {
            updates.visibility = data.privacy;
            needsUpdate = true;
          }
          if (data.isActive !== undefined && !data.status) {
            updates.status = data.isActive ? 'active' : 'inactive';
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            try {
              await updateDoc(doc(db, 'groups', d.id), updates);
            } catch (e) {
              console.warn("Could not auto-migrate group doc", e);
            }
          }
        }
      },
      (error) => {
        console.error('Error fetching discover groups:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Filter out groups the current user has already joined
  const unjoinedGroups = useMemo(() => {
    return groups.filter(
      (g) => !g.members?.includes(user.uid) && g.ownerId !== user.uid
    );
  }, [groups, user.uid]);

  // Apply search query, category filtering, and sorting client-side
  const filteredAndSortedGroups = useMemo(() => {
    let result = [...unjoinedGroups];

    // Search query
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      result = result.filter(
        (g) =>
          g.name?.toLowerCase().includes(qLower) ||
          g.subject?.toLowerCase().includes(qLower)
      );
    }

    // Category filter
    if (categoryFilter !== 'All') {
      result = result.filter(
        (g) => g.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.createdAt || 0;
        const timeB = b.createdAt?.seconds || b.createdAt || 0;
        return timeB - timeA;
      });
    } else if (sortBy === 'members') {
      result.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    }

    return result;
  }, [unjoinedGroups, searchQuery, categoryFilter, sortBy]);

  // Paginated groups
  const paginatedGroups = useMemo(() => {
    return filteredAndSortedGroups.slice(0, pageSize);
  }, [filteredAndSortedGroups, pageSize]);

  const hasMore = filteredAndSortedGroups.length > pageSize;

  const handleJoin = async (group: GroupModel, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid),
        memberCount: increment(1),
      });
      // Invoke callback
      onJoinGroup({
        ...group,
        members: [...(group.members || []), user.uid],
        memberCount: (group.memberCount || 0) + 1,
      });
    } catch (err) {
      console.error('Error joining group:', err);
      alert('Failed to join group. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse text-left"
          >
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
              <div className="w-16 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-5/6 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80">
              <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-14 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Search, Sort, Filter Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80">
        <div className="flex flex-wrap gap-2">
          {['All', 'Study', 'Exam Prep', 'Homework Help', 'General'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategoryFilter(cat);
                setPageSize(6);
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                categoryFilter === cat
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/10'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto self-stretch md:self-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'members')}
            className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
          >
            <option value="newest">📅 Newest First</option>
            <option value="members">🔥 Most Active</option>
          </select>
        </div>
      </div>

      {paginatedGroups.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Visual Card Accent */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary-500/20 to-indigo-500/20 group-hover:from-primary-500 group-hover:to-indigo-500 transition-all duration-500" />

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary-500/10">
                      {group.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {group.category || 'Study'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {group.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 h-10 leading-relaxed">
                    {group.subject || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center text-xs font-bold text-slate-400">
                    <Users className="w-4 h-4 mr-1.5 text-slate-300 dark:text-slate-600" />
                    {group.memberCount || 1} members
                  </div>
                  <button
                    onClick={(e) => handleJoin(group, e)}
                    className="text-xs font-bold bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-400 dark:hover:bg-primary-950/80 px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Join Group
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => setPageSize((prev) => prev + 6)}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-all shadow-sm border border-slate-200/50 dark:border-slate-700/50"
              >
                Load More Groups
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <Users className="w-14 h-14 text-slate-400 mx-auto mb-4 opacity-40 animate-pulse" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Public Groups Found
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
            {searchQuery
              ? 'No groups match your search criteria. Try a different query!'
              : 'There are no active public groups at the moment. Be the pioneer and launch one now!'}
          </p>
          {!searchQuery && (
            <button
              onClick={onCreateGroupClick}
              className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm shadow-md shadow-primary-600/20"
            >
              Create a Group
            </button>
          )}
        </div>
      )}
    </div>
  );
};
