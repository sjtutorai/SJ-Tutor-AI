import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User } from 'firebase/auth';
import { Plus, Search } from 'lucide-react';
import { MyGroups } from './groups/MyGroups';
import { DiscoverGroups } from './groups/DiscoverGroups';
import { InviteList } from './groups/InviteList';
import { CreateGroupModal } from './groups/CreateGroupModal';
import { GroupChat } from './groups/GroupChat';
import { GroupSettings } from './groups/GroupSettings';
import { GroupModel } from './groups/types';

export const GroupsView: React.FC<{ user: User | null }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'my_groups' | 'discover' | 'invites'>('my_groups');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupModel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invitesCount, setInvitesCount] = useState(0);

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
    </div>
  );
};
