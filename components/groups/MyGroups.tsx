import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { User } from 'firebase/auth';
import { Users, Shield, Award, MessageSquare } from 'lucide-react';
import { GroupModel } from './types';

interface MyGroupsProps {
  user: User;
  searchQuery: string;
  onSelectGroup: (group: GroupModel) => void;
  onExploreClick: () => void;
}

export const MyGroups: React.FC<MyGroupsProps> = ({
  user,
  searchQuery,
  onSelectGroup,
  onExploreClick,
}) => {
  const [joinedGroups, setJoinedGroups] = useState<GroupModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Relational secure query: Fetch all groups where the user is in the members array
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const fetched = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            subject: data.subject || data.description || 'No subject'
          };
        }) as GroupModel[];

        // Sort by newest created
        fetched.sort((a, b) => {
          const timeA = a.createdAt?.seconds || a.createdAt || 0;
          const timeB = b.createdAt?.seconds || b.createdAt || 0;
          return timeB - timeA;
        });

        setJoinedGroups(fetched);
        setLoading(false);

        // Transparent migration for owned groups
        for (const d of snapshot.docs) {
          const data = d.data();
          if (data.ownerId !== user.uid) continue; // Only owners migrate
          
          let needsUpdate = false;
          let updates: any = {};
          if (!data.subject && data.description) {
            updates.subject = data.description;
            needsUpdate = true;
          }
          if (data.privacy !== undefined && data.privacy !== 'public' && data.privacy !== 'private') {
            updates.privacy = 'private'; 
          }
          if (!data.visibility && data.privacy) {
            updates.visibility = data.privacy;
            needsUpdate = true;
          }
          if (data.isActive !== undefined && !data.status) {
            updates.status = data.isActive ? 'active' : 'inactive';
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            try {
              // use updateDoc dynamically to avoid circular dependencies if needed
              // doc, updateDoc are imported above
              const { updateDoc: update, doc: getDocRef } = await import('firebase/firestore');
              await update(getDocRef(db, 'groups', d.id), updates);
            } catch (e) {
              console.warn("Could not auto-migrate owned group doc", e);
            }
          }
        }
      },
      (error) => {
        console.error('Error fetching joined groups:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user.uid]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return joinedGroups;
    const qLower = searchQuery.toLowerCase();
    return joinedGroups.filter(
      (g) =>
        g.name?.toLowerCase().includes(qLower) ||
        g.subject?.toLowerCase().includes(qLower)
    );
  }, [joinedGroups, searchQuery]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((idx) => (
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
    <div className="text-left">
      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const isOwner = group.ownerId === user.uid;
            const isAdmin = group.admins?.includes(user.uid);

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary-500/10 to-indigo-500/10 group-hover:from-primary-500 group-hover:to-indigo-500 transition-all duration-500" />

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary-500/10">
                      {group.name?.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {isOwner ? (
                        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Award className="w-3 h-3" /> Owner
                        </span>
                      ) : isAdmin ? (
                        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                          {group.category || 'Study'}
                        </span>
                      )}
                    </div>
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

                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open Chat &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <MessageSquare className="w-14 h-14 text-slate-400 mx-auto mb-4 opacity-40 animate-pulse" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No Study Groups Joined
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
            {searchQuery
              ? "You haven't joined any groups matching your search."
              : 'You are not a member of any study groups yet. Study groups allow you to learn collectively, coordinate, and chat with peers!'}
          </p>
          {!searchQuery && (
            <button
              onClick={onExploreClick}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all text-sm shadow-md shadow-primary-600/20"
            >
              Explore Public Groups
            </button>
          )}
        </div>
      )}
    </div>
  );
};
