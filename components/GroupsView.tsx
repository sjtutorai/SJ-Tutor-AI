import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Users, Plus, Search, MessageSquare, Settings, Info, Shield, Hash, Image as ImageIcon } from 'lucide-react';
import { User } from 'firebase/auth';

export const GroupsView = ({ user }: { user: User | null }) => {
  const [activeTab, setActiveTab] = useState<'my_groups' | 'discover'>('my_groups');
  const [groups, setGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allGroups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(allGroups);
      // For now, let's just say myGroups = groups user is owner of or public
      setMyGroups(allGroups.filter(g => g.ownerId === user.uid || g.members?.includes(user.uid)));
    });
    return unsub;
  }, [user]);

  if (!user) {
    return <div className="p-8 text-center">Please sign in to use Groups.</div>;
  }

  if (selectedGroup) {
    return (
       <GroupChat 
         group={selectedGroup} 
         user={user} 
         onBack={() => setSelectedGroup(null)} 
       />
    );
  }

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

      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('my_groups')}
          className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'my_groups' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          My Groups
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all ${activeTab === 'discover' ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Discover
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === 'my_groups' ? myGroups : groups).map(group => (
          <div 
            key={group.id} 
            onClick={() => setSelectedGroup(group)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-primary-600/20">
              {group.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{group.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{group.description || 'No description provided.'}</p>
            
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                <Users className="w-3 h-3" />
                {group.memberCount || 1} Members
              </span>
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                {group.privacy === 'public' ? <Users className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                {group.privacy === 'public' ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
        ))}
        {(activeTab === 'my_groups' ? myGroups : groups).length === 0 && (
          <div className="col-span-full py-12 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Groups Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first group to start studying together.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-slate-700 px-5 py-2.5 rounded-xl font-bold transition-all"
            >
              Create a Group
            </button>
          </div>
        )}
      </div>

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
      const docRef = await addDoc(collection(db, 'groups'), {
        name,
        description,
        privacy,
        category,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        memberCount: 1,
        members: [user.uid]
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to create group.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Create New Group</h2>
          
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold shadow-md">
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white line-clamp-1">{group.name}</h2>
            <p className="text-xs text-slate-500">{group.memberCount} members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Search className="w-5 h-5" /></button>
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><Settings className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
        {messages.map((msg, i) => {
          const isMine = msg.senderId === user.uid;
          const showName = !isMine && (i === 0 || messages[i-1].senderId !== msg.senderId);
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {showName && <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1">{msg.senderName}</span>}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMine ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-sm shadow-sm'}`}>
                <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
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
