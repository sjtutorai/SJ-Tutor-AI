const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Users, Plus, Search, MessageSquare, Settings, Info, Shield, Hash, Image as ImageIcon, ChevronLeft, MoreVertical, LogOut, UserPlus, Trash2, Edit2, Check, X } from 'lucide-react';
import { User } from 'firebase/auth';
import { useNotifications } from './NotificationContext';

export const GroupsView = ({ user }: { user: User | null }) => {
  const [activeTab, setActiveTab] = useState<'my_groups' | 'discover'>('my_groups');
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allGroups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Discover: Public groups (could filter out user's own if wanted, but fine to show)
      setGroups(allGroups.filter(g => g.privacy === 'public'));
      
      // My Groups: Owner, Admin, or Member
      setMyGroups(allGroups.filter(g => 
        g.ownerId === user.uid || 
        (g.members && g.members.includes(user.uid)) || 
        (g.admins && g.admins.includes(user.uid))
      ));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  if (!user) {
    return <div className="p-8 text-center text-slate-500">Please sign in to use Groups.</div>;
  }

  if (selectedGroup) {
    // Before rendering, we should pass the LATEST group data so settings reflect changes instantly
    const latestGroup = [...groups, ...myGroups].find(g => g.id === selectedGroup.id) || selectedGroup;
    return (
       <GroupChat
          group={latestGroup}
          user={user}
          onBack={() => setSelectedGroup(null)}
        />
    );
  }

  const handleJoin = async (group: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(user.uid),
        memberCount: (group.memberCount || 1) + 1
      });
      setSelectedGroup(group);
    } catch (err) {
      console.error(err);
      alert("Failed to join group.");
    }
  };

  const displayedGroups = (activeTab === 'my_groups' ? myGroups : groups).filter(g => 
    g.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Groups</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Connect, study, and chat with peers.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('my_groups')}
            className={\`flex-1 sm:flex-none px-5 py-2 rounded-lg font-semibold text-sm transition-all \${activeTab === 'my_groups' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}\`}
          >
            My Groups
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={\`flex-1 sm:flex-none px-5 py-2 rounded-lg font-semibold text-sm transition-all \${activeTab === 'discover' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}\`}
          >
            Discover
          </button>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search groups..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedGroups.map(group => {
            const isMember = group.ownerId === user.uid || (group.members && group.members.includes(user.uid)) || (group.admins && group.admins.includes(user.uid));
            return (
              <div 
                key={group.id} 
                onClick={() => isMember ? setSelectedGroup(group) : undefined}
                className={\`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all duration-300 relative overflow-hidden group \${isMember ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''}\`}
              >
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md text-xs font-semibold">
                    {group.privacy === 'public' ? <Users className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {group.privacy === 'public' ? 'Public' : 'Private'}
                  </span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-primary-600/20">
                  {group.name?.charAt(0).toUpperCase()}
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 line-clamp-1 pr-16">{group.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-10">{group.description || 'No description provided.'}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Users className="w-4 h-4 mr-1.5" />
                    {group.memberCount || 1} Members
                  </div>
                  {!isMember && (
                    <button 
                      onClick={(e) => handleJoin(group, e)}
                      className="text-xs font-bold bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {displayedGroups.length === 0 && (
            <div className="col-span-full py-16 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Groups Found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                {searchQuery ? "No groups match your search." : activeTab === 'my_groups' ? "You haven't joined any groups yet. Explore the Discover tab!" : "There are no public groups yet. Be the first to create one!"}
              </p>
              {!searchQuery && activeTab === 'discover' && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-slate-700 px-5 py-2.5 rounded-xl font-bold transition-all"
                >
                  Create a Group
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {showCreateModal && <CreateGroupModal user={user} onClose={() => setShowCreateModal(false)} />}
    </div>
  );
};

const CreateGroupModal = ({ user, onClose }: { user: User, onClose: () => void }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [category, setCategory] = useState('study');

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        description: description.trim(),
        privacy,
        category,
        ownerId: user.uid,
        ownerName: user.displayName || 'User',
        memberCount: 1,
        members: [user.uid],
        admins: [],
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error creating group");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Create New Group</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Group Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Grade 10 Science Squad"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this group about?"
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Privacy</label>
                <select 
                  value={privacy}
                  onChange={e => setPrivacy(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                >
                  <option value="study">Study</option>
                  <option value="exam_prep">Exam Prep</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-5 py-2.5 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-all shadow-md shadow-primary-600/20"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

const GroupChat = ({ group, user, onBack }: { group: any, user: User, onBack: () => void }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  useEffect(() => {
    if (!group.id) return;
    const q = query(collection(db, 'groups', group.id, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [group.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const msg = input.trim();
    setInput('');
    
    try {
      await addDoc(collection(db, 'groups', group.id, 'messages'), {
        text: msg,
        senderId: user.uid,
        senderName: user.displayName || 'User',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      alert("Failed to send message");
    }
  };

  if (showSettings) {
    return <GroupSettings group={group} user={user} onBack={() => setShowSettings(false)} onExitGroup={onBack} />;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">
            {group.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white line-clamp-1">{group.name}</h2>
            <p className="text-xs text-slate-500">{group.memberCount || 1} members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 flex flex-col">
        {messages.map((msg, i) => {
          const isMine = msg.senderId === user.uid;
          const showName = !isMine && (i === 0 || messages[i-1].senderId !== msg.senderId);
          return (
            <div key={msg.id} className={\`flex flex-col \${isMine ? 'items-end' : 'items-start'}\`}>
              {showName && <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">{msg.senderName}</span>}
              <div className={\`max-w-[75%] rounded-2xl px-4 py-2 \${isMine ? 'bg-primary-600 text-white rounded-br-sm shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm'}\`}>
                <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="m-auto text-center text-slate-500 opacity-50 flex flex-col items-center">
            <MessageSquare className="w-12 h-12 mb-3" />
            <p>No messages yet.<br/>Say hello!</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" className="p-3 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800 rounded-xl transition-all">
            <Plus className="w-6 h-6" />
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
          <button type="submit" disabled={!input.trim()} className="p-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-2xl transition-all shadow-md shadow-primary-600/20 disabled:shadow-none">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

const GroupSettings = ({ group, user, onBack, onExitGroup }: { group: any, user: User, onBack: () => void, onExitGroup: () => void }) => {
  const isOwner = group.ownerId === user.uid;
  const isAdmin = isOwner || (group.admins && group.admins.includes(user.uid));
  
  const [name, setName] = useState(group.name || '');
  const [description, setDescription] = useState(group.description || '');
  const [privacy, setPrivacy] = useState(group.privacy || 'public');
  const [saving, setSaving] = useState(false);
  
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        name,
        description,
        privacy
      });
      // Will auto update through snapshot, but we can provide feedback
    } catch (e) {
      console.error(e);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isOwner) {
      alert("You must transfer ownership or delete the group first.");
      return;
    }
    if (confirm("Are you sure you want to leave this group?")) {
      try {
        const groupRef = doc(db, 'groups', group.id);
        await updateDoc(groupRef, {
          members: arrayRemove(user.uid),
          memberCount: Math.max(0, (group.memberCount || 1) - 1)
        });
        onExitGroup();
      } catch (e) {
        console.error(e);
        alert("Failed to leave group.");
      }
    }
  };

  const handleDeleteGroup = async () => {
    if (!isOwner) return;
    if (confirm("Are you sure you want to permanently delete this group? This cannot be undone.")) {
      try {
        const groupRef = doc(db, 'groups', group.id);
        await deleteDoc(groupRef);
        onExitGroup();
      } catch (e) {
        console.error(e);
        alert("Failed to delete group.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-slate-900 dark:text-white">Group Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* General Info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-500" />
              General Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Group Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all disabled:opacity-70"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={!isAdmin}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none disabled:opacity-70"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Privacy</label>
                <select 
                  value={privacy}
                  onChange={e => setPrivacy(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all disabled:opacity-70"
                >
                  <option value="public">Public - Anyone can find and join</option>
                  <option value="private">Private - Invite only</option>
                </select>
              </div>

              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Members ({group.memberCount || 1})
              </h3>
              {isAdmin && (
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {group.members?.map((memberId: string) => (
                <div key={memberId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                      U
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">
                        {memberId === user.uid ? 'You' : 'User'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {memberId === group.ownerId ? 'Owner' : (group.admins?.includes(memberId) ? 'Admin' : 'Member')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 border border-red-100 dark:border-red-900/20">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
            <div className="space-y-3">
              <button 
                onClick={handleLeaveGroup}
                className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="w-5 h-5" />
                  Leave Group
                </span>
              </button>
              
              {isOwner && (
                <button 
                  onClick={handleDeleteGroup}
                  className="w-full flex items-center justify-between px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Delete Group
                  </span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {showInviteModal && (
        <InviteModal 
          group={group} 
          user={user} 
          onClose={() => setShowInviteModal(false)} 
        />
      )}
    </div>
  );
};

const InviteModal = ({ group, user, onClose }: { group: any, user: User, onClose: () => void }) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const { sendNotification } = useNotifications();

  const handleInvite = async () => {
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email.');
      return;
    }
    
    setSending(true);
    try {
      // Create an invite in the group's invites subcollection
      await addDoc(collection(db, 'groups', group.id, 'invites'), {
        email: email.trim(),
        invitedBy: user.uid,
        invitedByName: user.displayName || 'Someone',
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      
      alert(\`Invitation sent to \${email}\`);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to send invite.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Invite Members</h2>
        <p className="text-sm text-slate-500 mb-6">Invite someone to join {group.name}</p>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleInvite}
            disabled={sending || !email.trim()}
            className="px-5 py-2.5 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white transition-all shadow-md"
          >
            {sending ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
};
`

fs.writeFileSync('components/GroupsView.tsx', code);
