import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User } from 'firebase/auth';
import { Plus, Search, Users, RefreshCw } from 'lucide-react';
import { MyGroups } from './groups/MyGroups';
import { DiscoverGroups } from './groups/DiscoverGroups';
import { InviteList } from './groups/InviteList';
import { CreateGroupModal } from './groups/CreateGroupModal';
import { GroupChat } from './groups/GroupChat';
import { GroupSettings } from './groups/GroupSettings';
import { GroupModel } from './groups/types';
import { useNotifications } from './NotificationContext';

export const GroupsView: React.FC<{ 
  user: User | null;
  initialGroupId?: string | null;
  onClearInitialGroupId?: () => void;
}> = ({ user, initialGroupId, onClearInitialGroupId }) => {
  const [activeTab, setActiveTab] = useState<'my_groups' | 'discover' | 'invites'>('my_groups');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupModel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitesCount, setInvitesCount] = useState(0);

  // Join Link Flow States
  const [joiningGroup, setJoiningGroup] = useState<GroupModel | null>(null);
  const [checkingJoinGroup, setCheckingJoinGroup] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const { triggerToast } = useNotifications();

  // Listen to pending invites count for localized tab badge
  useEffect(() => {
    if (!user || !user.email) return;

    const q = query(
      collection(db, 'user_invites'),
      where('email', '==', user.email.trim().toLowerCase()),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setInvitesCount(snapshot.size);
      },
      (error) => {
        console.error('Error listening to invites count:', error);
      }
    );

    return unsubscribe;
  }, [user]);

  const [joinLinkError, setJoinLinkError] = useState<string | null>(null);

  // Handle checking and loading the initialGroupId share link
  useEffect(() => {
    if (!initialGroupId || !user) return;

    let isMounted = true;
    let timeoutId: any;

    const checkAndJoinGroup = async () => {
      setCheckingJoinGroup(true);
      setJoinLinkError(null);
      
      try {
        // Implement 10-second timeout
        const groupRef = doc(db, 'groups', initialGroupId);
        
        const fetchPromise = getDoc(groupRef);
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), 10000);
        });
        
        const groupSnap = (await Promise.race([fetchPromise, timeoutPromise])) as any;

        if (!isMounted) return;

        if (!groupSnap.exists() || (groupSnap.data().status !== 'active' && !groupSnap.data().isActive)) {
          setJoinLinkError('This study group does not exist, has been deleted, or is currently inactive.');
          return;
        }

        const groupData = {
          id: groupSnap.id,
          ...groupSnap.data()
        } as GroupModel;

        const isMember = groupData.members?.includes(user.uid);
        if (isMember) {
          setSelectedGroup(groupData);
          if (onClearInitialGroupId) onClearInitialGroupId();
        } else {
          setJoiningGroup(groupData);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error checking join group link:', err);
        if (err.message === 'TIMEOUT') {
           setJoinLinkError('Request timed out. Please check your connection and try again.');
        } else {
           setJoinLinkError('Failed to load group information. Please try again.');
        }
      } finally {
        if (isMounted) {
          setCheckingJoinGroup(false);
        }
      }
    };

    checkAndJoinGroup();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [initialGroupId, user]);

  const handleConfirmJoin = async () => {
    if (!joiningGroup || !user) return;

    setJoiningLoading(true);
    try {
      const groupRef = doc(db, 'groups', joiningGroup.id);
      
      const { arrayUnion, increment, updateDoc } = await import('firebase/firestore');
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid),
        memberCount: increment(1)
      });

      triggerToast("Welcome to the Group! 🎉", `You successfully joined ${joiningGroup.name}`, "New Features");

      setSelectedGroup({
        ...joiningGroup,
        members: [...(joiningGroup.members || []), user.uid],
        memberCount: (joiningGroup.memberCount || 0) + 1
      });

      setJoiningGroup(null);
      if (onClearInitialGroupId) onClearInitialGroupId();
    } catch (err) {
      console.error('Error joining group from share link:', err);
      alert('Failed to join group. Please try again.');
    } finally {
      setJoiningLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="py-20 text-center text-slate-500 font-medium">
        Please sign in to use Groups.
      </div>
    );
  }

  // Router-like state navigation for the Active Chat & Settings
  if (selectedGroup) {
    if (showSettings) {
      return (
        <div className="p-4 md:p-6 animate-in slide-in-from-right duration-350">
          <GroupSettings
            user={user}
            group={selectedGroup}
            onBack={() => setShowSettings(false)}
            onUpdateGroup={(updatedGroup) => setSelectedGroup(updatedGroup)}
            onLeaveGroupSuccess={() => {
              setSelectedGroup(null);
              setShowSettings(false);
            }}
          />
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6 animate-in slide-in-from-right duration-350">
        <GroupChat
          user={user}
          group={selectedGroup}
          onBack={() => setSelectedGroup(null)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Title & Create Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Study Groups</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Connect, study, and chat with peers.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20 flex items-center gap-2 shrink-0"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit shrink-0">
          <button
            onClick={() => {
              setActiveTab('my_groups');
              setSearchQuery('');
            }}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'my_groups'
                ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            My Groups
          </button>
          <button
            onClick={() => {
              setActiveTab('discover');
              setSearchQuery('');
            }}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'discover'
                ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => {
              setActiveTab('invites');
              setSearchQuery('');
            }}
            className={`flex-1 sm:flex-none px-5 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'invites'
                ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Invites
            {invitesCount > 0 && (
              <span className="bg-red-500 text-white rounded-full text-[9px] px-1.5 py-0.5 font-bold shrink-0">
                {invitesCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar - Hide on Invites Tab */}
        {activeTab !== 'invites' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Render Selected View */}
      <div className="flex-1">
        {activeTab === 'my_groups' && (
          <MyGroups
            user={user}
            searchQuery={searchQuery}
            onSelectGroup={(group) => setSelectedGroup(group)}
            onExploreClick={() => setActiveTab('discover')}
          />
        )}

        {activeTab === 'discover' && (
          <DiscoverGroups
            user={user}
            searchQuery={searchQuery}
            onJoinGroup={(group) => setSelectedGroup(group)}
            onCreateGroupClick={() => setShowCreateModal(true)}
          />
        )}

        {activeTab === 'invites' && (
          <InviteList
            user={user}
            onAcceptSuccess={(groupId) => {
              // Direct navigation to the joined group's chat on accept!
              const mockGroupObj = { id: groupId } as GroupModel;
              setSelectedGroup(mockGroupObj);
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal
          user={user}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(groupId) => {
            // Direct navigation to the newly created group's chat!
            const mockGroupObj = { id: groupId } as GroupModel;
            setSelectedGroup(mockGroupObj);
          }}
        />
      )}

      {/* Join Group Modal from Share Link */}
      {joiningGroup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 animate-in zoom-in-95 duration-300 text-left p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 rounded-2xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  Join Study Group?
                </h3>
                <span className="bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider mt-1 inline-block">
                  {joiningGroup.category || 'Study'}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{joiningGroup.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {joiningGroup.description || "No description provided for this group."}
                </p>
              </div>

              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Members</span>
                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate-400" />
                  {joiningGroup.memberCount || 1} members
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setJoiningGroup(null);
                  if (onClearInitialGroupId) onClearInitialGroupId();
                }}
                disabled={joiningLoading}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmJoin}
                disabled={joiningLoading}
                className="px-5 py-2.5 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-all text-sm shadow-md shadow-primary-600/20 flex items-center gap-2"
              >
                {joiningLoading ? 'Joining...' : 'Join Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checking join link spinner or error */}
      {(checkingJoinGroup || joinLinkError) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 max-w-sm text-center">
            {checkingJoinGroup ? (
              <>
                <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Loading group invite details...</span>
              </>
            ) : (
              <>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Invite Error</h3>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{joinLinkError}</span>
                <div className="flex gap-3 mt-2 w-full">
                  <button
                    onClick={() => {
                      setJoinLinkError(null);
                      if (onClearInitialGroupId) onClearInitialGroupId();
                    }}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      // Trigger a retry by clearing error and re-running the effect?
                      // Actually just clearing it and manually calling logic would be better,
                      // but changing initialGroupId slightly or just unsetting/setting it works.
                      // Or we can just let them close it and try the link again.
                      // For a true retry button, we need the fetch function outside or retrigger state.
                      setJoinLinkError(null);
                      setCheckingJoinGroup(true);
                      // Since we can't easily re-trigger useEffect without changing deps, we'll just reload page as a simple retry
                      window.location.reload();
                    }}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs hover:bg-primary-700 transition-all"
                  >
                    Retry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
