import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  Send,
  Paperclip,
  Image as ImageIcon,
  BarChart2,
  Mic,
  Check,
  CheckCheck,
  ChevronLeft,
  Copy,
  LogOut,
  Pin,
  MessageSquare,
  X,
  Play,
  Info,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  StudyGroup,
  GroupMessage,
  GroupMember,
  GroupPoll,
  UserProfile,
  SJTUTOR_AVATAR
} from '../types';
import {
  createGroupInFirestore,
  subscribeToAllGroups,
  subscribeToGroupMessages,
  sendGroupMessageInFirestore,
  joinGroupInFirestore,
  leaveGroupInFirestore,
  toggleGroupMessageReactionInFirestore,
  voteGroupPollInFirestore,
  deleteGroupInFirestore
} from '../utils/firebaseUtils';
import { useNotifications } from './NotificationContext';

interface GroupsViewProps {
  userProfile: UserProfile;
  userUid?: string | null;
  onNavigateToNotes?: () => void;
}

// Demo groups removed

const DEFAULT_MESSAGES: Record<string, GroupMessage[]> = {};

export const GroupsView: React.FC<GroupsViewProps> = ({
  userProfile,
  userUid
}) => {
  const { triggerToast, sendNotification } = useNotifications();
  const currentUid = userUid || 'guest_user_' + (userProfile.displayName || 'scholar').toLowerCase().replace(/\s+/g, '_');
  const currentName = userProfile.displayName || 'Scholar User';

  // Group States
  const [groups, setGroups] = useState<StudyGroup[]>(() => {
    try {
      const saved = localStorage.getItem('sjtutor_groups_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeGroupId, setActiveGroupId] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'explore'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteRegId, setInviteRegId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Message States
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Attachment Modal Forms
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Audio simulation state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active group object
  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  // 1. Subscribe to Firestore Groups
  useEffect(() => {
    const unsubscribe = subscribeToAllGroups((firestoreGroups) => {
      if (firestoreGroups) {
        const groupMap = new Map<string, StudyGroup>();
        firestoreGroups.forEach((fg) => groupMap.set(fg.id, fg));
        const merged = Array.from(groupMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        setGroups(merged);
        try {
          localStorage.setItem('sjtutor_groups_cache', JSON.stringify(merged));
        } catch (e) { console.warn('Cache error', e); }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firestore Messages for active group or use local state
  useEffect(() => {
    if (!activeGroupId) return;

    // First load default local fallback messages for seeded group if empty
    const cachedLocal = localStorage.getItem(`group_msgs_${activeGroupId}`);
    if (cachedLocal) {
      try {
        setMessages(JSON.parse(cachedLocal));
      } catch {
        setMessages(DEFAULT_MESSAGES[activeGroupId] || []);
      }
    } else {
      setMessages(DEFAULT_MESSAGES[activeGroupId] || []);
    }

    const unsubscribe = subscribeToGroupMessages(activeGroupId, (realtimeMsgs) => {
      if (realtimeMsgs && realtimeMsgs.length > 0) {
        setMessages(realtimeMsgs);
        try {
          localStorage.setItem(`group_msgs_${activeGroupId}`, JSON.stringify(realtimeMsgs));
        } catch (e) { console.warn('Msg cache error', e); }
      }
    });

    return () => unsubscribe();
  }, [activeGroupId]);

  // Auto scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Send Text Message
  const handleSendMessage = async (textToSend?: string, typeOverride?: 'text' | 'image' | 'poll' | 'voice', extraData?: any) => {
    const finalText = textToSend || inputText;
    if (!finalText.trim() && typeOverride !== 'image' && typeOverride !== 'poll' && typeOverride !== 'voice') return;

    const messageType = typeOverride || 'text';
    const newMsg: GroupMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      groupId: activeGroupId,
      senderId: currentUid,
      senderName: currentName,
      senderAvatar: userProfile.photoURL || undefined,
      text: finalText,
      timestamp: Date.now(),
      type: messageType,
      replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text } : undefined,
      reactions: {},
      status: 'delivered',
      ...extraData
    };

    // Optimistically update local message list
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputText('');
    setReplyingTo(null);
    setShowAttachmentMenu(false);

    try {
      localStorage.setItem(`group_msgs_${activeGroupId}`, JSON.stringify(updatedMessages));
    } catch (e) { console.warn('Storage warn', e); }

    // Sync to Firestore
    await sendGroupMessageInFirestore(activeGroupId, newMsg);

    // Update group last message snippet
    setGroups((prev) =>
      prev.map((g) =>
        g.id === activeGroupId
          ? {
              ...g,
              updatedAt: Date.now(),
              lastMessage: {
                text: finalText || (messageType === 'poll' ? '📊 New Poll' : messageType === 'image' ? '📷 Image Attachment' : '🎤 Voice Note'),
                senderName: currentName,
                timestamp: Date.now()
              }
            }
          : g
      )
    );
  };

  // Delete Group (Admin only)
  const handleDeleteGroup = async (group: StudyGroup) => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    
    // Switch active group if the deleted one is currently active
    if (activeGroupId === group.id) {
      const remainingGroups = groups.filter((g) => g.id !== group.id);
      setActiveGroupId(remainingGroups.length > 0 ? remainingGroups[0].id : '');
      setShowGroupInfo(false);
    }
    
    // Remove locally
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
    
    // Remove from Firestore
    await deleteGroupInFirestore(group.id);
    triggerToast('Group Deleted', 'The group was successfully deleted.', 'Important Alerts');
  };

  // Join or Leave Group
  const handleToggleJoinGroup = async (group: StudyGroup) => {
    const isMember = group.members && !!group.members[currentUid];
    if (isMember) {
      // Leave group
      await leaveGroupInFirestore(group.id, currentUid);
      const updatedMembers = { ...group.members };
      delete updatedMembers[currentUid];
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, members: updatedMembers, memberCount: Math.max(1, g.memberCount - 1) } : g))
      );
      triggerToast('Left Group', `You have left ${group.name}`, 'Important Alerts');
    } else {
      // Join group
      const newMember: GroupMember = {
        uid: currentUid,
        displayName: currentName,
        photoURL: userProfile.photoURL,
        role: 'member',
        joinedAt: Date.now()
      };
      await joinGroupInFirestore(group.id, newMember);
      const updatedMembers = { ...group.members, [currentUid]: newMember };
      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, members: updatedMembers, memberCount: Object.keys(updatedMembers).length } : g))
      );
      triggerToast('Joined Group! 🎉', `Welcome to ${group.name}!`, 'Important Alerts');
    }
  };

  // Toggle Message Reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = msg.reactions || {};
        const users = reactions[emoji] || [];
        const hasReacted = users.includes(currentUid);
        const newUsers = hasReacted ? users.filter((u) => u !== currentUid) : [...users, currentUid];

        const nextReactions = { ...reactions };
        if (newUsers.length === 0) delete nextReactions[emoji];
        else nextReactions[emoji] = newUsers;

        return { ...msg, reactions: nextReactions };
      })
    );

    await toggleGroupMessageReactionInFirestore(activeGroupId, messageId, emoji, currentUid);
  };

  // Poll Vote Handling
  const handleVotePoll = async (messageId: string, optionId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.pollData) return msg;
        const poll = { ...msg.pollData };
        poll.options = poll.options.map((opt) => {
          if (opt.id === optionId) {
            const hasVoted = opt.votes.includes(currentUid);
            return {
              ...opt,
              votes: hasVoted ? opt.votes.filter((u) => u !== currentUid) : [...opt.votes, currentUid]
            };
          } else if (!poll.allowMultiple) {
            return { ...opt, votes: opt.votes.filter((u) => u !== currentUid) };
          }
          return opt;
        });
        return { ...msg, pollData: poll };
      })
    );

    await voteGroupPollInFirestore(activeGroupId, messageId, optionId, currentUid);
  };

  // Create New Poll Submit
  const handleCreatePollSubmit = () => {
    if (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) {
      alert('Please enter a poll question and at least two valid options.');
      return;
    }

    const newPoll: GroupPoll = {
      question: pollQuestion.trim(),
      options: pollOptions
        .filter((o) => o.trim())
        .map((text, idx) => ({ id: 'opt_' + idx + '_' + Date.now(), text: text.trim(), votes: [] })),
      createdBy: currentUid
    };

    handleSendMessage(`📊 Poll: ${pollQuestion}`, 'poll', { pollData: newPoll });

    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollCreator(false);
  };

  // Image Attachment Submit
  const handleCreateImageSubmit = () => {
    if (!imageUrlInput.trim()) return;
    handleSendMessage(`📷 Image Attachment`, 'image', { mediaUrl: imageUrlInput.trim() });
    setImageUrlInput('');
    setShowImageModal(false);
  };

  // Voice Note Recording Simulator
  const startVoiceRecording = () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopVoiceRecordingAndSend = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    handleSendMessage(`🎤 Voice Note (${recordingSeconds}s)`, 'voice');
    setRecordingSeconds(0);
  };

  // Create New Group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('📚');
  const [newGroupColor] = useState('from-primary-500 to-amber-600');
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(true);

  const handleInviteUser = async () => {
    if (!inviteRegId.trim() || !activeGroup) return;
    setInviting(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('registrationNumber', '==', inviteRegId.trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        triggerToast('User Not Found', 'No user found with that Registration ID.', 'Important Alerts');
      } else {
        const targetUserDoc = snap.docs[0];
        const targetUserId = targetUserDoc.id;
        
        if (activeGroup.members[targetUserId]) {
           triggerToast('Already a Member', 'This user is already in the group.', 'Important Alerts');
        } else {
           const inviteUrl = `/?group_invite=${activeGroup.id}&inviterName=${encodeURIComponent(userProfile.displayName || 'A user')}&groupName=${encodeURIComponent(activeGroup.name)}`;
           await sendNotification(
             'Group Invitation',
             `${userProfile.displayName || 'A user'} has invited you to join ${activeGroup.name}.`,
             'Important Alerts',
             targetUserId,
             inviteUrl,
             {
               type: 'group_invite',
               groupId: activeGroup.id,
               inviterName: userProfile.displayName || 'A user',
               groupName: activeGroup.name
             }
           );
           triggerToast('Invite Sent', 'Invitation sent successfully!', 'Important Alerts');
           setInviteRegId('');
        }
      }
    } catch (err) {
      console.error('Invite failed', err);
      triggerToast('Invite Failed', 'Could not send invite.', 'Important Alerts');
    } finally {
      setInviting(false);
    }
  };

  const handleCreateGroupSubmit = async () => {
    if (!newGroupName.trim() || !newGroupSubject.trim()) {
      alert('Please provide group name and subject.');
      return;
    }

    const groupId = 'group_' + Date.now();
    const newGroup: StudyGroup = {
      id: groupId,
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || `Official study group for ${newGroupSubject}`,
      subject: newGroupSubject.trim(),
      gradeClass: userProfile.grade || 'General',
      iconEmoji: newGroupEmoji,
      bgColor: newGroupColor,
      createdBy: currentUid,
      creatorName: currentName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      members: {
        [currentUid]: { uid: currentUid, displayName: currentName, role: 'admin', photoURL: userProfile.photoURL, joinedAt: Date.now() },
      },
      memberCount: 1,
      isPublic: newGroupIsPublic,
      inviteCode: 'JOIN' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      lastMessage: { text: 'Group created! Welcome members!', senderName: currentName, timestamp: Date.now() }
    };

    setGroups((prev) => [newGroup, ...prev]);
    setActiveGroupId(groupId);

    await createGroupInFirestore(newGroup);

    triggerToast('Group Created! 🚀', `Successfully created "${newGroup.name}"!`, 'Important Alerts');

    // Reset Form
    setNewGroupName('');
    setNewGroupSubject('');
    setNewGroupDescription('');
    setShowCreateModal(false);
  };

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const isMember = g.members && !!g.members[currentUid];
    const matchesTab = activeTab === 'my' 
      ? isMember 
      : !isMember && (g.isPublic || (g.inviteCode && searchQuery && g.inviteCode.toLowerCase() === searchQuery.toLowerCase()));
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.inviteCode && g.inviteCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  // Handle Invite Code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite && groups.length > 0) {
      const targetGroup = groups.find(g => g.inviteCode?.toUpperCase() === invite.toUpperCase());
      if (targetGroup) {
        setActiveGroupId(targetGroup.id);
        const isMember = targetGroup.members && !!targetGroup.members[currentUid];
        setActiveTab(isMember ? 'my' : 'explore');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setSearchQuery(invite);
        setActiveTab('explore');
      }
    }
  }, [groups, currentUid]);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] min-h-[600px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex overflow-hidden">
      {/* LEFT SIDEBAR: GROUP LIST */}
      <div
        className={`${
          showMobileChat ? 'hidden lg:flex' : 'flex'
        } w-full lg:w-96 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Study Groups
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  WhatsApp-style study rooms
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold"
              title="Create New Study Group"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Group</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search groups or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'my'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Groups ({groups.filter((g) => g.members && !!g.members[currentUid]).length})
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'explore'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Explore Hubs
            </button>
          </div>
        </div>

        {/* Group Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {activeTab === 'my' ? 'No Joined Groups Yet' : 'No Public Groups Found'}
              </p>
              <p className="text-xs text-slate-400 mb-4 max-w-xs mx-auto">
                {activeTab === 'my'
                  ? 'Join an existing study hub or create your own study group!'
                  : 'Try adjusting your search query or create a new group.'}
              </p>
              <button
                onClick={() => {
                  if (activeTab === 'my') setActiveTab('explore');
                  else setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition"
              >
                {activeTab === 'my' ? 'Explore Public Groups' : 'Create Group'}
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isActive = group.id === activeGroupId;
              const isMember = group.members && !!group.members[currentUid];

              return (
                <div
                  key={group.id}
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setShowMobileChat(true);
                  }}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-primary-50 dark:bg-slate-800 border-primary-300/50 dark:border-slate-700 shadow-sm'
                      : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Group Avatar / Emoji */}
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                        group.bgColor || 'from-primary-500 to-amber-600'
                      } flex items-center justify-center text-xl text-white shadow-md flex-shrink-0 relative`}
                    >
                      <span>{group.iconEmoji || '📚'}</span>
                      {isMember && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {group.name}
                        </h3>
                        {group.lastMessage?.timestamp && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(group.lastMessage.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-md truncate">
                          {group.subject}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {group.memberCount} members
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {group.lastMessage ? (
                          <span>
                            <strong className="text-slate-700 dark:text-slate-300">
                              {group.lastMessage.senderName}:{' '}
                            </strong>
                            {group.lastMessage.text}
                          </span>
                        ) : (
                          group.description
                        )}
                      </p>
                    </div>

                    {!isMember && activeTab === 'explore' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleJoinGroup(group);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 shadow-sm active:scale-95"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR / MAIN CHAT AREA */}
      <div
        className={`${
          !showMobileChat ? 'hidden lg:flex' : 'flex'
        } flex-1 flex-col bg-slate-100/60 dark:bg-slate-950 relative overflow-hidden`}
      >
        {activeGroup ? (
          <>
            {/* Top Group Chat Header Bar */}
            <div className="px-4 py-3 sm:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="lg:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Back to Groups"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => setShowGroupInfo(true)}
                  className="flex items-center gap-3 cursor-pointer group min-w-0"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${
                      activeGroup.bgColor || 'from-primary-500 to-amber-600'
                    } flex items-center justify-center text-xl text-white shadow-md flex-shrink-0`}
                  >
                    <span>{activeGroup.iconEmoji || '📚'}</span>
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 dark:text-white text-base truncate group-hover:text-primary-600 transition">
                      {activeGroup.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {activeGroup.memberCount} members
                      </span>
                      <span>•</span>
                      <span>{activeGroup.subject}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions Header */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowPollCreator(true)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Create Group Poll"
                >
                  <BarChart2 className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowGroupInfo(true)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Group Info & Settings"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pinned Message Banner */}
            {activeGroup.pinnedMessageText && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200 z-10">
                <Pin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <p className="truncate flex-1">{activeGroup.pinnedMessageText}</p>
              </div>
            )}

            {/* Messages Scroll View */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              {activeGroup && !(activeGroup.members && !!activeGroup.members[currentUid]) ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full opacity-60">
                   <div className="w-16 h-16 rounded-3xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
                     <Info className="w-8 h-8" />
                   </div>
                   <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">
                     Chat is hidden
                   </h3>
                   <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
                     Join the group to view the messages and participate in the conversation.
                   </p>
                </div>
              ) : messages.map((msg) => {
                const isMe = msg.senderId === currentUid;
                const isAi = msg.isAi || msg.senderId === 'ai_tutor';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                  >
                    <div
                      className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                        isMe ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {/* Avatar */}
                      {!isMe && (
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 bg-white flex-shrink-0 mt-1">
                          {isAi ? (
                            <img src={SJTUTOR_AVATAR} alt="AI Tutor" className="w-full h-full object-cover" />
                          ) : msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-primary-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                              {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bubble Container */}
                      <div className="flex flex-col">
                        {/* Sender Name */}
                        {!isMe && (
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1 flex items-center gap-1.5">
                            {msg.senderName}
                            {isAi && (
                              <span className="px-1.5 py-0.2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-extrabold rounded-md shadow-xs">
                                AI TUTOR
                              </span>
                            )}
                          </span>
                        )}

                        {/* Message Box */}
                        <div
                          className={`p-3.5 rounded-2xl shadow-sm text-sm relative ${
                            isMe
                              ? 'bg-primary-600 text-white rounded-tr-xs'
                              : isAi
                              ? 'bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-purple-950/40 text-slate-900 dark:text-white border border-purple-200 dark:border-purple-800/50 rounded-tl-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                          }`}
                        >
                          {/* Quoted Reply Preview */}
                          {msg.replyTo && (
                            <div
                              className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${
                                isMe
                                  ? 'bg-primary-700/50 border-white text-primary-100'
                                  : 'bg-slate-100 dark:bg-slate-700/50 border-primary-500 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <p className="font-bold text-[10px] opacity-80">{msg.replyTo.senderName}</p>
                              <p className="truncate">{msg.replyTo.text}</p>
                            </div>
                          )}

                          {/* Message Text Content */}
                          {msg.type === 'text' && (
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </div>
                          )}

                          {/* Image Attachment */}
                          {msg.type === 'image' && msg.mediaUrl && (
                            <div className="space-y-2">
                              <img
                                src={msg.mediaUrl}
                                alt="SharedAttachment"
                                className="rounded-xl max-h-60 object-cover w-full border border-black/10"
                              />
                              {msg.text && <p className="text-xs">{msg.text}</p>}
                            </div>
                          )}

                          {/* Interactive Poll Card */}
                          {msg.type === 'poll' && msg.pollData && (
                            <div className="space-y-3 min-w-[240px]">
                              <p className="font-bold text-sm flex items-center gap-1.5">
                                <BarChart2 className="w-4 h-4 text-primary-500" />
                                {msg.pollData.question}
                              </p>

                              {(() => {
                                const totalVotes = msg.pollData.options.reduce(
                                  (sum, opt) => sum + opt.votes.length,
                                  0
                                );

                                return (
                                  <div className="space-y-2">
                                    {msg.pollData.options.map((option) => {
                                      const hasVoted = option.votes.includes(currentUid);
                                      const pct = totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0;

                                      return (
                                        <button
                                          key={option.id}
                                          onClick={() => handleVotePoll(msg.id, option.id)}
                                          className={`w-full p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex items-center justify-between ${
                                            hasVoted
                                              ? 'border-primary-500 bg-primary-500/10 dark:bg-primary-500/20 font-bold'
                                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50'
                                          }`}
                                        >
                                          {/* Fill progress bar */}
                                          <div
                                            className="absolute top-0 left-0 bottom-0 bg-primary-500/15 dark:bg-primary-500/25 transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                          ></div>

                                          <span className="relative z-10 text-xs truncate mr-2">
                                            {option.text}
                                          </span>

                                          <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0 text-[11px]">
                                            <span className="opacity-70 font-mono">{pct}%</span>
                                            {hasVoted && <Check className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />}
                                          </div>
                                        </button>
                                      );
                                    })}
                                    <p className="text-[10px] opacity-70 text-right">
                                      {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Voice Note Simulation Card */}
                          {msg.type === 'voice' && (
                            <div className="flex items-center gap-3 p-1">
                              <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center">
                                <Play className="w-4 h-4 ml-0.5 fill-current" />
                              </div>
                              <div className="flex-1">
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary-500 w-2/3"></div>
                                </div>
                                <span className="text-[10px] opacity-70 mt-1 block">Voice Message</span>
                              </div>
                            </div>
                          )}

                          {/* Footer Timestamp & Status */}
                          <div
                            className={`flex items-center justify-end gap-1 text-[10px] mt-1.5 ${
                              isMe ? 'text-primary-100' : 'text-slate-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isMe && <CheckCheck className="w-3 h-3 text-primary-200" />}
                          </div>
                        </div>

                        {/* Reaction Bar */}
                        <div className="flex items-center gap-1 mt-1 ml-1 flex-wrap">
                          {msg.reactions &&
                            Object.entries(msg.reactions).map(([emoji, uids]) => {
                              if (uids.length === 0) return null;
                              const userReacted = uids.includes(currentUid);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className={`px-1.5 py-0.5 rounded-full text-[11px] border flex items-center gap-1 transition ${
                                    userReacted
                                      ? 'bg-primary-50 dark:bg-primary-900/40 border-primary-300 text-primary-700 dark:text-primary-300'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold text-[10px]">{uids.length}</span>
                                </button>
                              );
                            })}

                          {/* Quick React & Reply Menu On Hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            {['👍', '❤️', '💡', '🔥'].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-xs transition"
                              >
                                {emoji}
                              </button>
                            ))}

                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-700 rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* AI Typing Indicator */}

              <div ref={messagesEndRef} />
            </div>

            {/* Replying Banner */}
            {replyingTo && (
              <div className="px-4 py-2 bg-slate-200 dark:bg-slate-800 border-t border-slate-300 dark:border-slate-700 flex items-center justify-between text-xs">
                <div className="min-w-0 pr-2">
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    Replying to {replyingTo.senderName}:
                  </span>
                  <p className="truncate text-slate-600 dark:text-slate-300">{replyingTo.text}</p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Bottom Attachment Popover Menu */}
            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-20 left-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-2 gap-2 z-30 min-w-[240px]"
                >
                  <button
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      setShowImageModal(true);
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Share Image</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      setShowPollCreator(true);
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
                  >
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    <span>Create Poll</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input Bar */}
            <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20">
              {activeGroup && !(activeGroup.members && !!activeGroup.members[currentUid]) ? (
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                    You must join this group to view all messages and participate in the chat.
                  </p>
                  <button
                    onClick={() => handleToggleJoinGroup(activeGroup)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition active:scale-95 flex items-center gap-2"
                  >
                    Join Group to Chat
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex-shrink-0"
                  title="Attach Media or Poll"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Type a message or @Tutor to ask AI..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
                  />

                  {/* Mention @Tutor quick button */}
                  {!inputText.includes('@Tutor') && (
                    <button
                      type="button"
                      onClick={() => setInputText((prev) => (prev ? prev + ' @Tutor ' : '@Tutor '))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-lg hover:bg-purple-200 transition"
                    >
                      @Tutor
                    </button>
                  )}
                </div>

                {/* Voice Note or Send Button */}
                {isRecordingVoice ? (
                  <button
                    type="button"
                    onClick={stopVoiceRecordingAndSend}
                    className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg transition animate-pulse flex items-center gap-1 text-xs font-bold"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{recordingSeconds}s</span>
                  </button>
                ) : inputText.trim() ? (
                  <button
                    type="submit"
                    className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg transition active:scale-95 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="p-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition flex-shrink-0"
                    title="Hold/Click to record voice note"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4 shadow-lg">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              Select a Study Group
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              Choose a group from the list on the left or create your own study squad to start collaborating in real-time!
            </p>
          </div>
        )}
      </div>

      {/* CREATE GROUP MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Create Study Group
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CBSE 10th Math Solvers"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Topic *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics, Physics, Chemistry"
                    value={newGroupSubject}
                    onChange={(e) => setNewGroupSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Group Description
                  </label>
                  <textarea
                    placeholder="What is this group about?"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 h-20"
                  />
                </div>

                {/* Emoji Avatar Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Choose Group Icon Emoji
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {['🏆', '⚡', '🚀', '💻', '🧬', '📐', '📚', '🎯', '💡'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewGroupEmoji(emoji)}
                        className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition ${
                          newGroupEmoji === emoji
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Public / Private Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">
                      Public Group
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Allow other students in SJ Tutor AI to discover & join
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newGroupIsPublic}
                    onChange={(e) => setNewGroupIsPublic(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroupSubmit}
                  className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95"
                >
                  Create Squad
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE POLL MODAL */}
      <AnimatePresence>
        {showPollCreator && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-blue-500" />
                  Create Group Poll
                </h3>
                <button
                  onClick={() => setShowPollCreator(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Poll Question *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Which date is best for mock exam?"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Options *
                  </label>
                  <div className="space-y-2">
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...pollOptions];
                            newOpts[idx] = e.target.value;
                            setPollOptions(newOpts);
                          }}
                          className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            onClick={() =>
                              setPollOptions(pollOptions.filter((_, i) => i !== idx))
                            }
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="mt-2 text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Option
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setShowPollCreator(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePollSubmit}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95"
                >
                  Post Poll
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE IMAGE MODAL */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-emerald-500" />
                  Share Image URL
                </h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Image Direct URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/study-diagram.jpg"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateImageSubmit}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95"
                >
                  Send Image
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GROUP INFO DRAWER */}
      <AnimatePresence>
        {showGroupInfo && activeGroup && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto"
            >
              {/* Header Banner */}
              <div
                className={`p-6 bg-gradient-to-br ${
                  activeGroup.bgColor || 'from-primary-500 to-amber-600'
                } text-white relative`}
              >
                <button
                  onClick={() => setShowGroupInfo(false)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl mb-3 shadow-lg border border-white/30">
                  {activeGroup.iconEmoji || '📚'}
                </div>

                <h3 className="text-xl font-black">{activeGroup.name}</h3>
                <p className="text-xs opacity-90">{activeGroup.subject}</p>
              </div>

              {/* Details Body */}
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Description
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {activeGroup.description}
                  </p>
                </div>

                {/* Invite Link Generator */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Invite Code
                  </h4>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-white flex-1 truncate">
                      {activeGroup.inviteCode || 'STUDY100'}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}?invite=${activeGroup.inviteCode || 'STUDY100'}`
                        );
                        triggerToast('Copied Invite Link!', 'Link copied to clipboard', 'Important Alerts');
                      }}
                      className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                </div>

                {/* Invite by Registration ID */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Invite by Registration ID
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter Registration ID"
                      value={inviteRegId}
                      onChange={(e) => setInviteRegId(e.target.value)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs px-3 py-2.5 focus:ring-2 focus:ring-primary-500 outline-none placeholder:text-slate-400 text-slate-800 dark:text-white"
                    />
                    <button
                      onClick={handleInviteUser}
                      disabled={inviting || !inviteRegId.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviting ? 'Sending...' : 'Invite'}
                    </button>
                  </div>
                </div>

                {/* Members List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Group Members ({activeGroup.memberCount})
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {activeGroup.members &&
                      Object.values(activeGroup.members).map((m) => (
                        <div
                          key={m.uid}
                          className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                            {m.photoURL ? (
                              <img src={m.photoURL} alt={m.displayName} className="w-full h-full object-cover" />
                            ) : (
                              m.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {m.displayName}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Joined {new Date(m.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {m.role === 'admin' && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-md">
                              Admin
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Delete / Leave Group Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      handleToggleJoinGroup(activeGroup);
                      setShowGroupInfo(false);
                    }}
                    className="w-full py-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Group
                  </button>

                  {activeGroup.createdBy === currentUid && (
                    <button
                      onClick={() => handleDeleteGroup(activeGroup)}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Group
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupsView;
