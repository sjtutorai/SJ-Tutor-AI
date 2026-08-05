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
  Trash2,
  Link as LinkIcon,
  Share2,
  UserPlus,
  UserX,
  Globe,
  ExternalLink,
  Lock,
  Clock,
  Settings,
  Shield,
  Mail,
  Key,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
  StudyGroup,
  GroupMessage,
  GroupMember,
  GroupPoll,
  UserProfile,
  SJTUTOR_AVATAR,
  DirectChat,
  DirectMessage,
  DirectChatParticipant,
  MemberPermissions
} from '../types';
import {
  createGroupInFirestore,
  updateGroupInFirestore,
  requestJoinGroupInFirestore,
  handleJoinRequestInFirestore,
  subscribeToAllGroups,
  subscribeToGroupMessages,
  sendGroupMessageInFirestore,
  joinGroupInFirestore,
  leaveGroupInFirestore,
  toggleGroupMessageReactionInFirestore,
  voteGroupPollInFirestore,
  deleteGroupInFirestore,
  updateGroupMemberPermissionsInFirestore,
  searchUsersByEmailOrRegistration,
  getOrCreateDirectChat,
  subscribeToUserDirectChats,
  subscribeToDirectMessages,
  sendDirectMessageInFirestore
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
  const { triggerToast, sendNotification, triggerSystemNotification } = useNotifications();
  const currentUid = userUid || 'guest_user_' + (userProfile.displayName || 'scholar').toLowerCase().replace(/\s+/g, '_');
  const currentName = userProfile.displayName || 'Scholar User';

  const seenDirectMessageIdsRef = useRef<Set<string>>(new Set());
  const seenGroupMessageIdsRef = useRef<Set<string>>(new Set());

  // Group States
  const [groups, setGroups] = useState<StudyGroup[]>(() => {
    try {
      const saved = localStorage.getItem('sjtutor_groups_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    return localStorage.getItem('sjtutor_active_group_id') || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'explore' | 'direct'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinByIdModal, setShowJoinByIdModal] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [joiningById, setJoiningById] = useState(false);
  const [inviteRegId, setInviteRegId] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Direct Chat States (User-to-User Chat)
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [activeDirectChatId, setActiveDirectChatId] = useState<string>('');
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [directInputText, setDirectInputText] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<DirectChatParticipant[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Member Permission Management States
  const [editingMemberUid, setEditingMemberUid] = useState<string | null>(null);

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

  // Helper check for membership
  const isMemberOf = (g: StudyGroup) =>
    Boolean(g.members && (!!g.members[currentUid] || (userUid && !!g.members[userUid])));

  // Active group object
  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;
  const isMemberOfActive = activeGroup ? isMemberOf(activeGroup) : false;

  // Helper check for admin permissions
  const canUserAddTeammates = (group: StudyGroup | null, uid: string) => {
    if (!group) return false;
    const isOwner = group.createdBy === uid || (userUid && group.createdBy === userUid);
    const memberRole = group.members?.[uid]?.role;
    if (isOwner || memberRole === 'admin') return true;
    const memberPerm = group.members?.[uid]?.permissions?.canAddTeammates;
    if (memberPerm !== undefined) return memberPerm;
    return group.defaultMemberPermissions?.canAddTeammates !== false;
  };

  const canUserChangeGroupIcon = (group: StudyGroup | null, uid: string) => {
    if (!group) return false;
    const isOwner = group.createdBy === uid || (userUid && group.createdBy === userUid);
    const memberRole = group.members?.[uid]?.role;
    if (isOwner || memberRole === 'admin') return true;
    const memberPerm = group.members?.[uid]?.permissions?.canChangeGroupIcon;
    if (memberPerm !== undefined) return memberPerm;
    return group.defaultMemberPermissions?.canChangeGroupIcon === true;
  };

  const canUserChat = (group: StudyGroup | null, uid: string) => {
    if (!group) return false;
    const isOwner = group.createdBy === uid || (userUid && group.createdBy === userUid);
    const memberRole = group.members?.[uid]?.role;
    if (isOwner || memberRole === 'admin') return true;
    const memberPerm = group.members?.[uid]?.permissions?.canChat;
    if (memberPerm !== undefined) return memberPerm;
    return group.defaultMemberPermissions?.canChat !== false;
  };

  // Subscribe to user direct chats
  useEffect(() => {
    if (!currentUid) return;
    const unsubscribe = subscribeToUserDirectChats(currentUid, (chats) => {
      setDirectChats(chats);
      if (chats.length > 0 && !activeDirectChatId) {
        setActiveDirectChatId(chats[0].id);
      }
    });
    return () => unsubscribe();
  }, [currentUid, activeDirectChatId]);

  // Subscribe to active direct chat messages
  useEffect(() => {
    if (!activeDirectChatId) {
      setDirectMessages([]);
      return;
    }
    const unsubscribe = subscribeToDirectMessages(activeDirectChatId, (msgs) => {
      setDirectMessages(msgs);

      msgs.forEach((msg) => {
        if (msg.senderId !== currentUid && !seenDirectMessageIdsRef.current.has(msg.id)) {
          seenDirectMessageIdsRef.current.add(msg.id);
          if (Date.now() - (msg.timestamp || Date.now()) < 30000) {
            triggerSystemNotification(
              `💬 ${msg.senderName}`,
              msg.text,
              '/',
              `dm_device_${msg.id}`
            );
          }
        } else {
          seenDirectMessageIdsRef.current.add(msg.id);
        }
      });
    });
    return () => unsubscribe();
  }, [activeDirectChatId, currentUid, triggerSystemNotification]);

  // Handle User Search for Direct Chat
  useEffect(() => {
    if (activeTab !== 'direct') return;

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);
    const timer = setTimeout(async () => {
      const results = await searchUsersByEmailOrRegistration(searchQuery, currentUid);
      setUserSearchResults(results);
      setIsSearchingUsers(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, currentUid]);

  // Start Direct Chat with Friend
  const handleStartDirectChat = async (friend: DirectChatParticipant) => {
    const chat = await getOrCreateDirectChat(
      currentUid,
      {
        displayName: currentName,
        photoURL: userProfile.photoURL,
        email: userProfile.phoneNumber ? `${currentUid}@sjtutor.ai` : '',
        registrationNumber: userProfile.registrationNumber
      },
      friend.uid,
      {
        displayName: friend.displayName,
        photoURL: friend.photoURL,
        email: friend.email,
        registrationNumber: friend.registrationNumber
      }
    );

    setActiveDirectChatId(chat.id);
    setShowMobileChat(true);
    triggerToast('Direct Chat Opened 💬', `Chat room ready with ${friend.displayName}.`, 'Important Alerts');
  };

  // Send Direct Message
  const handleSendDirectMessage = async () => {
    if (!directInputText.trim() || !activeDirectChatId) return;

    const newMsg: DirectMessage = {
      id: 'dm_msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      chatId: activeDirectChatId,
      senderId: currentUid,
      senderName: currentName,
      senderAvatar: userProfile.photoURL || '',
      text: directInputText.trim(),
      timestamp: Date.now()
    };

    setDirectMessages((prev) => [...prev, newMsg]);
    setDirectInputText('');

    await sendDirectMessageInFirestore(activeDirectChatId, newMsg);

    // Notify recipient of direct message
    const activeChat = directChats.find((c) => c.id === activeDirectChatId);
    if (activeChat) {
      const recipientUid = activeChat.participants.find((uid) => uid !== currentUid);
      if (recipientUid) {
        await sendNotification(
          `💬 Message from ${currentName}`,
          newMsg.text,
          'Important Alerts',
          recipientUid,
          undefined,
          {
            type: 'direct_chat',
            chatId: activeDirectChatId,
            senderId: currentUid,
            senderName: currentName,
            messageId: newMsg.id
          }
        );
      }
    }
  };

  // Admin Toggle Member Permission
  const handleToggleMemberPermission = async (
    groupId: string,
    memberUid: string,
    permissionKey: keyof MemberPermissions
  ) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const currentMember = group.members?.[memberUid];
    if (!currentMember) return;

    const currentPerms: MemberPermissions = currentMember.permissions || {
      canAddTeammates: group.defaultMemberPermissions?.canAddTeammates !== false,
      canChangeGroupIcon: group.defaultMemberPermissions?.canChangeGroupIcon === true,
      canChat: group.defaultMemberPermissions?.canChat !== false
    };

    const updatedPerms: MemberPermissions = {
      ...currentPerms,
      [permissionKey]: !currentPerms[permissionKey]
    };

    const updatedMembers = {
      ...group.members,
      [memberUid]: {
        ...currentMember,
        permissions: updatedPerms
      }
    };

    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, members: updatedMembers } : g))
    );

    await updateGroupMemberPermissionsInFirestore(groupId, memberUid, updatedPerms);
    triggerToast('Permissions Updated 🛡️', `Updated permissions for ${currentMember.displayName}.`, 'Important Alerts');
  };

  // Request Permission From Admin
  const handleRequestPermissionFromAdmin = async (groupId: string, permissionName: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    triggerToast('Permission Requested 📩', `Requested ${permissionName} permission from group admin.`, 'Important Alerts');

    if (group.createdBy) {
      await sendNotification(
        'Permission Request 🛡️',
        `${currentName} requested permission to ${permissionName} in group "${group.name}".`,
        'Important Alerts',
        group.createdBy,
        undefined,
        {
          type: 'group_permission_request',
          groupId: group.id,
          requesterUid: currentUid,
          permissionName
        }
      );
    }
  };

  // Persist active group selection
  useEffect(() => {
    if (activeGroupId) {
      try {
        localStorage.setItem('sjtutor_active_group_id', activeGroupId);
      } catch (e) {
        console.warn('Cache active group warn', e);
      }
    }
  }, [activeGroupId]);

  // Auto-select active group based on membership
  useEffect(() => {
    if (groups.length === 0) return;

    const myJoined = groups.filter(isMemberOf);

    setActiveGroupId((prev) => {
      // If prev is set and valid in groups, keep it
      if (prev && groups.some((g) => g.id === prev)) {
        return prev;
      }

      // Check cached active group if user is a member
      const cached = localStorage.getItem('sjtutor_active_group_id');
      if (cached && myJoined.some((g) => g.id === cached)) {
        return cached;
      }

      // Default to first joined group if available
      if (myJoined.length > 0) {
        return myJoined[0].id;
      }

      // If user has not joined any group, clear activeGroupId so unjoined group is not auto-selected
      return '';
    });
  }, [groups, currentUid, userUid]);

  // 1. Subscribe to Firestore Groups
  useEffect(() => {
    const unsubscribe = subscribeToAllGroups((firestoreGroups) => {
      if (Array.isArray(firestoreGroups)) {
        setGroups(firestoreGroups);
        try {
          localStorage.setItem('sjtutor_groups_cache', JSON.stringify(firestoreGroups));
        } catch (e) { console.warn('Cache error', e); }

        // Sync activeGroupId based on availability across all devices
        setActiveGroupId((prev) => {
          if (prev && firestoreGroups.some((g) => g.id === prev)) return prev;
          const myJoined = firestoreGroups.filter((g) => g.members && (!!g.members[currentUid] || (userUid && !!g.members[userUid])));
          if (myJoined.length > 0) return myJoined[0].id;
          return '';
        });
      }
    });

    return () => unsubscribe();
  }, [currentUid, userUid]);

  // 2. Subscribe to Firestore Messages for active group or use local state
  useEffect(() => {
    if (!activeGroupId) return;

    // First load default local fallback messages for group if cached
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
      if (realtimeMsgs) {
        setMessages(realtimeMsgs);

        realtimeMsgs.forEach((msg) => {
          if (msg.senderId !== currentUid && !seenGroupMessageIdsRef.current.has(msg.id)) {
            seenGroupMessageIdsRef.current.add(msg.id);
            if (Date.now() - (msg.timestamp || Date.now()) < 30000) {
              const grpName = activeGroup?.name || 'Study Group';
              triggerSystemNotification(
                `📚 ${grpName}: ${msg.senderName}`,
                msg.text || (msg.type === 'poll' ? '📊 New Poll' : msg.type === 'image' ? '📷 Image Attachment' : '🎤 Voice Note'),
                '/',
                `grp_device_${msg.id}`
              );
            }
          } else {
            seenGroupMessageIdsRef.current.add(msg.id);
          }
        });

        try {
          localStorage.setItem(`group_msgs_${activeGroupId}`, JSON.stringify(realtimeMsgs));
        } catch (e) { console.warn('Msg cache error', e); }
      }
    });

    return () => unsubscribe();
  }, [activeGroupId]);

  // Join Group by ID or Link or Code
  const handleJoinGroupById = async (groupIdOrCode?: string) => {
    const rawInput = (groupIdOrCode || joinInput).trim();
    if (!rawInput) return;

    let targetId = rawInput;
    if (rawInput.includes('groupId=')) {
      try {
        const url = new URL(rawInput);
        const params = new URLSearchParams(url.search);
        targetId = params.get('groupId') || params.get('groupInvite') || params.get('invite') || rawInput;
      } catch {
        const match = rawInput.match(/(?:groupId|groupInvite|invite)=([^&]+)/);
        if (match) targetId = match[1];
      }
    }

    setJoiningById(true);
    try {
      // Fetch direct doc by ID first
      const groupRef = doc(db, 'groups', targetId);
      const groupSnap = await getDoc(groupRef);
      let targetGroupData: StudyGroup | null = null;

      if (groupSnap.exists()) {
        targetGroupData = groupSnap.data() as StudyGroup;
      } else {
        // Query by invite code
        const q = query(collection(db, 'groups'), where('inviteCode', '==', targetId));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          targetGroupData = querySnap.docs[0].data() as StudyGroup;
        }
      }

      if (!targetGroupData) {
        triggerToast('Group Not Found', `No group found with ID or Invite Code "${targetId}".`, 'Important Alerts');
        return;
      }

      const groupToJoin = targetGroupData;
      const isMember = groupToJoin.members && !!groupToJoin.members[currentUid];

      if (isMember) {
        setActiveGroupId(groupToJoin.id);
        setActiveTab('my');
        setShowMobileChat(true);
        triggerToast('Already Joined! 🎉', `You are already a member of "${groupToJoin.name}". Opened chat.`, 'Important Alerts');
      } else {
        const newMember: GroupMember = {
          uid: currentUid,
          displayName: currentName,
          photoURL: userProfile.photoURL,
          role: 'member',
          joinedAt: Date.now()
        };

        await joinGroupInFirestore(groupToJoin.id, newMember);

        const updatedMembers = { ...(groupToJoin.members || {}), [currentUid]: newMember };
        const updatedGroup = {
          ...groupToJoin,
          members: updatedMembers,
          memberCount: Object.keys(updatedMembers).length,
        };

        setGroups((prev) => {
          const exists = prev.some((g) => g.id === groupToJoin.id);
          if (exists) {
            return prev.map((g) => (g.id === groupToJoin.id ? updatedGroup : g));
          }
          return [updatedGroup, ...prev];
        });

        setActiveGroupId(groupToJoin.id);
        setActiveTab('my');
        setShowMobileChat(true);
        triggerToast('Joined Group! 🎉', `Welcome to "${groupToJoin.name}"!`, 'Important Alerts');
      }

      setJoinInput('');
      setShowJoinByIdModal(false);
    } catch (err: any) {
      console.error('Error joining group by ID:', err);
      triggerToast('Join Error', 'Failed to join group. Please check ID and try again.', 'Important Alerts');
    } finally {
      setJoiningById(false);
    }
  };

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
      text: finalText.trim(),
      timestamp: Date.now(),
      type: messageType,
      reactions: {},
      status: 'delivered'
    };

    if (userProfile.photoURL) {
      newMsg.senderAvatar = userProfile.photoURL;
    }
    if (replyingTo) {
      newMsg.replyTo = { id: replyingTo.id, senderName: replyingTo.senderName, text: replyingTo.text };
    }
    if (extraData && typeof extraData === 'object') {
      Object.assign(newMsg, extraData);
    }

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
    const sentOk = await sendGroupMessageInFirestore(activeGroupId, newMsg);
    if (!sentOk) {
      triggerToast('Sync Issue ⚠️', 'Failed to deliver message to group server. Retrying...', 'Important Alerts');
    }

    // Notify other group members
    if (activeGroup && activeGroup.members) {
      const otherMembers = Object.values(activeGroup.members).filter((m) => m.uid !== currentUid);
      otherMembers.forEach((m) => {
        sendNotification(
          `📚 ${activeGroup.name}: ${currentName}`,
          finalText || (messageType === 'poll' ? '📊 New Poll' : messageType === 'image' ? '📷 Image Attachment' : '🎤 Voice Note'),
          'Important Alerts',
          m.uid,
          undefined,
          {
            type: 'group_chat',
            groupId: activeGroupId,
            senderId: currentUid,
            senderName: currentName,
            messageId: newMsg.id
          }
        );
      });
    }

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

  // Helper to render text with clickable URLs (like https://sjtutorai.vercel.app/)
  const renderMessageWithClickableLinks = (text: string, isMe: boolean) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 font-bold underline break-all transition-opacity hover:opacity-80 ${
              isMe ? 'text-amber-200 hover:text-white' : 'text-indigo-600 dark:text-indigo-400'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part}</span>
            <ExternalLink className="w-3 h-3 shrink-0 inline" />
          </a>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  // Delete Group (Admin / Creator only)
  const handleDeleteGroup = async (group: StudyGroup) => {
    if (!window.confirm(`Are you sure you want to delete "${group.name}"? This action will permanently remove this group for all members on all devices and cannot be undone.`)) return;
    
    setShowGroupInfo(false);

    // Immediate local cleanup on deleting device
    setGroups((prev) => {
      const remaining = prev.filter((g) => g.id !== group.id);
      try {
        localStorage.setItem('sjtutor_groups_cache', JSON.stringify(remaining));
      } catch (e) { console.warn('Cache error', e); }
      return remaining;
    });

    if (activeGroupId === group.id) {
      localStorage.removeItem('sjtutor_active_group_id');
      const remainingJoined = groups.filter((g) => g.id !== group.id && isMemberOf(g));
      setActiveGroupId(remainingJoined.length > 0 ? remainingJoined[0].id : '');
      setShowMobileChat(false);
    }

    // Delete doc and subcollection in Firestore (triggers real-time snapshot on all connected devices)
    const success = await deleteGroupInFirestore(group.id);
    if (success) {
      triggerToast('Group Deleted 🗑️', `"${group.name}" was permanently deleted from all devices.`, 'Important Alerts');
    } else {
      triggerToast('Delete Failed', 'Failed to delete group from server. Please try again.', 'Important Alerts');
    }
  };

  // Owner/Admin: Remove a member from the group
  const handleRemoveMember = async (group: StudyGroup, memberUid: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from "${group.name}"?`)) return;

    // 1. Remove in Firestore
    const success = await leaveGroupInFirestore(group.id, memberUid);

    // 2. Update local state
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== group.id) return g;
        const updatedMembers = { ...g.members };
        Object.keys(updatedMembers).forEach((key) => {
          if (key === memberUid || updatedMembers[key]?.uid === memberUid) {
            delete updatedMembers[key];
          }
        });
        const newCount = Object.keys(updatedMembers).length;
        return {
          ...g,
          members: updatedMembers,
          memberCount: newCount,
        };
      })
    );

    if (success) {
      triggerToast('Member Removed 👤', `${memberName} was removed from "${group.name}".`, 'Important Alerts');
    } else {
      triggerToast('Removal Failed', 'Could not remove member. Please try again.', 'Important Alerts');
    }
  };

  // Join or Leave Group
  const handleToggleJoinGroup = async (group: StudyGroup) => {
    const isMember = group.members && Object.values(group.members).some((m) => m.uid === currentUid || (userUid && m.uid === userUid) || group.members?.[currentUid] !== undefined);
    
    if (isMember) {
      // Leave group
      await leaveGroupInFirestore(group.id, currentUid);
      if (userUid && userUid !== currentUid) {
        await leaveGroupInFirestore(group.id, userUid);
      }

      const updatedMembers = { ...group.members };
      Object.keys(updatedMembers).forEach((key) => {
        if (key === currentUid || key === userUid || updatedMembers[key]?.uid === currentUid || (userUid && updatedMembers[key]?.uid === userUid)) {
          delete updatedMembers[key];
        }
      });

      const newMemberCount = Object.keys(updatedMembers).length;

      setGroups((prev) =>
        prev.map((g) => (g.id === group.id ? { ...g, members: updatedMembers, memberCount: newMemberCount } : g))
      );

      // If leaving current active group, switch active group to another remaining joined group or reset
      if (activeGroupId === group.id) {
        const remainingJoined = groups.filter((g) => g.id !== group.id && g.members && Object.values(g.members).some((m) => m.uid === currentUid || (userUid && m.uid === userUid)));
        if (remainingJoined.length > 0) {
          setActiveGroupId(remainingJoined[0].id);
        } else {
          const remainingAny = groups.filter((g) => g.id !== group.id);
          setActiveGroupId(remainingAny.length > 0 ? remainingAny[0].id : '');
        }
        setShowMobileChat(false);
      }

      setShowGroupInfo(false);
      triggerToast('Left Group', `You have left "${group.name}".`, 'Important Alerts');
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
      setActiveGroupId(group.id);
      triggerToast('Joined Group! 🎉', `Welcome to "${group.name}"!`, 'Important Alerts');
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

  // Render group avatar icon helper
  const renderGroupIcon = (group: Partial<StudyGroup>, sizeClass = "w-11 h-11 text-xl") => {
    if (group.iconUrl) {
      return (
        <img
          src={group.iconUrl}
          alt={group.name || 'Group'}
          className={`${sizeClass} rounded-2xl object-cover border border-slate-200/50 dark:border-slate-700 shadow-sm flex-shrink-0`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-2xl bg-gradient-to-br ${
          group.bgColor || 'from-primary-500 to-amber-600'
        } flex items-center justify-center text-white shadow-md flex-shrink-0`}
      >
        <span>{group.iconEmoji || '📚'}</span>
      </div>
    );
  };

  // Create New Group States
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('📚');
  const [newGroupIconType, setNewGroupIconType] = useState<'emoji' | 'url' | 'file'>('emoji');
  const [newGroupIconUrl, setNewGroupIconUrl] = useState('');
  const [newGroupColor] = useState('from-primary-500 to-amber-600');
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(true);

  // Edit Group Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupSubject, setEditGroupSubject] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupIsPublic, setEditGroupIsPublic] = useState(true);
  const [editGroupIconType, setEditGroupIconType] = useState<'emoji' | 'url' | 'file'>('emoji');
  const [editGroupIconEmoji, setEditGroupIconEmoji] = useState('📚');
  const [editGroupIconUrl, setEditGroupIconUrl] = useState('');

  // Custom Image File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('File size exceeds 3MB limit. Please select a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (isEdit) {
        setEditGroupIconUrl(dataUrl);
        setEditGroupIconType('file');
      } else {
        setNewGroupIconUrl(dataUrl);
        setNewGroupIconType('file');
      }
    };
    reader.readAsDataURL(file);
  };

  // Request to Join Public Group
  const handleRequestToJoinGroup = async (group: StudyGroup) => {
    const userReq = {
      uid: currentUid,
      displayName: currentName,
      photoURL: userProfile.photoURL || ''
    };

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== group.id) return g;
        const currentReqs = g.joinRequests || {};
        return {
          ...g,
          joinRequests: {
            ...currentReqs,
            [currentUid]: {
              uid: currentUid,
              displayName: currentName,
              photoURL: userProfile.photoURL || '',
              requestedAt: Date.now()
            }
          }
        };
      })
    );

    triggerToast('Join Request Sent! 📩', `Your request to join "${group.name}" was sent to the owner.`, 'Important Alerts');

    await requestJoinGroupInFirestore(group.id, userReq);

    if (group.createdBy) {
      await sendNotification(
        'New Join Request 📩',
        `${currentName} requested to join your group "${group.name}".`,
        'Important Alerts',
        group.createdBy,
        undefined,
        {
          type: 'group_join_request',
          groupId: group.id,
          requesterUid: currentUid,
          requesterName: currentName
        }
      );
    }
  };

  // Group Owner/Admin: Approve Join Request
  const handleApproveJoinRequest = async (groupId: string, req: { uid: string; displayName: string; photoURL?: string }) => {
    const newMember: GroupMember = {
      uid: req.uid,
      displayName: req.displayName,
      photoURL: req.photoURL,
      role: 'member',
      joinedAt: Date.now()
    };

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const updatedMembers = { ...(g.members || {}), [req.uid]: newMember };
        const updatedReqs = { ...(g.joinRequests || {}) };
        delete updatedReqs[req.uid];
        return {
          ...g,
          members: updatedMembers,
          memberCount: Object.keys(updatedMembers).length,
          joinRequests: updatedReqs
        };
      })
    );

    triggerToast('Member Approved! 🎉', `${req.displayName} is now a member of the group.`, 'Important Alerts');

    await handleJoinRequestInFirestore(groupId, req.uid, true, newMember);

    await sendNotification(
      'Join Request Approved! 🎉',
      `Your request to join "${activeGroup?.name}" was approved by the owner!`,
      'Important Alerts',
      req.uid
    );
  };

  // Group Owner/Admin: Decline Join Request
  const handleDeclineJoinRequest = async (groupId: string, reqUid: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const updatedReqs = { ...(g.joinRequests || {}) };
        delete updatedReqs[reqUid];
        return {
          ...g,
          joinRequests: updatedReqs
        };
      })
    );

    triggerToast('Request Declined', 'Join request was removed.', 'Important Alerts');
    await handleJoinRequestInFirestore(groupId, reqUid, false);
  };

  // Open Edit Group Settings Modal
  const handleOpenEditModal = () => {
    if (!activeGroup) return;
    setEditGroupName(activeGroup.name || '');
    setEditGroupSubject(activeGroup.subject || '');
    setEditGroupDescription(activeGroup.description || '');
    setEditGroupIsPublic(activeGroup.isPublic !== false);
    setEditGroupIconEmoji(activeGroup.iconEmoji || '📚');
    setEditGroupIconUrl(activeGroup.iconUrl || '');
    setEditGroupIconType(activeGroup.iconUrl ? 'url' : 'emoji');
    setShowEditModal(true);
  };

  // Save Group Settings (Privacy, Icon, Info)
  const handleSaveGroupSettings = async () => {
    if (!activeGroup || !editGroupName.trim() || !editGroupSubject.trim()) {
      alert('Please fill in group name and subject.');
      return;
    }

    const finalIconUrl = editGroupIconType !== 'emoji' && editGroupIconUrl.trim() ? editGroupIconUrl.trim() : '';

    if (finalIconUrl !== (activeGroup.iconUrl || '') && !canUserChangeGroupIcon(activeGroup, currentUid)) {
      triggerToast('Permission Denied', 'Only group admins or members approved by admin can change the group icon.', 'Important Alerts');
      return;
    }

    const updates: Partial<StudyGroup> = {
      name: editGroupName.trim(),
      subject: editGroupSubject.trim(),
      description: editGroupDescription.trim(),
      isPublic: editGroupIsPublic,
      iconEmoji: editGroupIconEmoji,
      iconUrl: finalIconUrl
    };

    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroup.id ? { ...g, ...updates, updatedAt: Date.now() } : g))
    );

    setShowEditModal(false);
    triggerToast('Settings Saved ⚙️', 'Group privacy and settings updated successfully!', 'Important Alerts');

    await updateGroupInFirestore(activeGroup.id, updates);
  };

  const handleInviteUser = async () => {
    if (!inviteRegId.trim() || !activeGroup) return;

    if (!canUserAddTeammates(activeGroup, currentUid)) {
      triggerToast('Permission Denied', 'Only group admins or members approved by admin can add teammates.', 'Important Alerts');
      return;
    }

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
           await sendNotification(
             'Group Invitation',
             `${userProfile.displayName || 'A user'} has invited you to join ${activeGroup.name}.`,
             'Important Alerts',
             targetUserId,
             undefined,
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
    const finalIconUrl = newGroupIconType !== 'emoji' && newGroupIconUrl.trim() ? newGroupIconUrl.trim() : undefined;

    const newGroup: StudyGroup = {
      id: groupId,
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || `Official study group for ${newGroupSubject}`,
      subject: newGroupSubject.trim(),
      gradeClass: userProfile.grade || 'General',
      iconEmoji: newGroupEmoji,
      iconUrl: finalIconUrl,
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

    triggerToast('Group Created! 🚀', `Successfully created ${newGroupIsPublic ? 'public' : 'private'} group "${newGroup.name}"!`, 'Important Alerts');

    // Reset Form
    setNewGroupName('');
    setNewGroupSubject('');
    setNewGroupDescription('');
    setNewGroupIconUrl('');
    setNewGroupIconType('emoji');
    setShowCreateModal(false);
  };

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const isMember = isMemberOf(g);
    const matchesTab = activeTab === 'my' ? isMember : !isMember && g.isPublic;
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

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

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowJoinByIdModal(true)}
                className="p-2 sm:px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold shrink-0"
                title="Join Group by ID, Invite Code, or Link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Paste ID</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold shrink-0"
                title="Create New Study Group"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Group</span>
              </button>
            </div>
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
          <div className="flex p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl text-xs font-bold gap-1">
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'my'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Groups ({groups.filter(isMemberOf).length})
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
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === 'direct'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Direct Chat
            </button>
          </div>
        </div>

        {/* Group or Direct Chat Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {activeTab === 'direct' ? (
            <div className="space-y-4">
              {/* User Search Results */}
              {searchQuery.trim() && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1 flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" />
                    Found Students ({userSearchResults.length})
                  </h4>

                  {isSearchingUsers ? (
                    <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                      Searching students by Email or Registration ID...
                    </div>
                  ) : userSearchResults.length === 0 ? (
                    <div className="p-4 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      No user found with Email or Reg ID matching &quot;{searchQuery}&quot;.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userSearchResults.map((user) => (
                        <div
                          key={user.uid}
                          className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                              ) : (
                                user.displayName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.displayName}</p>
                              {user.email && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                  <Mail className="w-2.5 h-2.5 text-indigo-500" />
                                  {user.email}
                                </p>
                              )}
                              {user.registrationNumber && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                                  <Key className="w-2.5 h-2.5 text-amber-500" />
                                  ID: {user.registrationNumber}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleStartDirectChat(user)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0 flex items-center gap-1 active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chat
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Direct Chats List */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Direct Messages ({directChats.length})
                </h4>

                {directChats.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <MessageCircle className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Direct Chats Yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Type a friend&apos;s Email ID or Registration ID above to start chatting!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {directChats.map((chat) => {
                      const friendUid = Object.keys(chat.participants || {}).find((id) => id !== currentUid) || '';
                      const friend = chat.participants?.[friendUid] || { displayName: 'Student Friend', photoURL: '' };
                      const isActive = chat.id === activeDirectChatId;

                      return (
                        <div
                          key={chat.id}
                          onClick={() => {
                            setActiveDirectChatId(chat.id);
                            setShowMobileChat(true);
                          }}
                          className={`p-3 rounded-2xl cursor-pointer transition-all border flex items-center gap-3 ${
                            isActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                              : 'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {friend.photoURL ? (
                              <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                            ) : (
                              friend.displayName.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                {friend.displayName}
                              </h3>
                              {chat.lastMessageTimestamp && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(chat.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {chat.lastMessageText || (friend.email ? `Email: ${friend.email}` : `ID: ${friend.registrationNumber || 'Student'}`)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : filteredGroups.length === 0 ? (
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
              const isMember = isMemberOf(group);

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
                    {/* Group Avatar / Icon */}
                    <div className="relative shrink-0">
                      {renderGroupIcon(group, "w-12 h-12 text-xl")}
                      {isMember && (
                        <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center shadow-sm">
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

                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-md truncate">
                          {group.subject}
                        </span>
                        {group.isPublic ? (
                          <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-md flex items-center gap-0.5">
                            <Globe className="w-2.5 h-2.5" /> Public
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-md flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        )}
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
                      group.joinRequests?.[currentUid] ? (
                        <span className="px-2.5 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" /> Requested
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestToJoinGroup(group);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 shadow-sm active:scale-95"
                        >
                          Ask to Join
                        </button>
                      )
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
        {activeTab === 'direct' ? (
          (() => {
            const activeChat = directChats.find((c) => c.id === activeDirectChatId);
            const friendUid = activeChat
              ? Object.keys(activeChat.participants || {}).find((id) => id !== currentUid) || ''
              : '';
            const friend = activeChat?.participants?.[friendUid];

            return activeChat && friend ? (
              <div className="flex-1 flex flex-col h-full bg-slate-100/60 dark:bg-slate-950 overflow-hidden relative">
                {/* Direct Chat Top Bar */}
                <div className="px-4 py-3 sm:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setShowMobileChat(false)}
                      className="lg:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Back to Chats"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                      ) : (
                        friend.displayName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="font-bold text-slate-900 dark:text-white text-base truncate flex items-center gap-2">
                        {friend.displayName}
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-600" />
                          Equal Rights 1-on-1 Chat
                        </span>
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {friend.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-indigo-500" />
                            {friend.email}
                          </span>
                        )}
                        {friend.registrationNumber && (
                          <span className="flex items-center gap-1">
                            <Key className="w-3 h-3 text-amber-500" />
                            ID: {friend.registrationNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Messages List Stream */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
                  {directMessages.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <MessageSquare className="w-10 h-10 text-indigo-400 mx-auto mb-2 opacity-80" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Start your 1-on-1 conversation with {friend.displayName}!
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Both students have equal rights and authorities in 1-on-1 direct chats. Messages are real-time, private, and secure.
                      </p>
                    </div>
                  ) : (
                    directMessages.map((msg) => {
                      const isMe = msg.senderId === currentUid;
                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center overflow-hidden shrink-0">
                              {msg.senderAvatar ? (
                                <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                              ) : (
                                msg.senderName.charAt(0).toUpperCase()
                              )}
                            </div>
                          )}

                          <div
                            className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl shadow-sm ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-bl-none'
                            }`}
                          >
                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </p>
                            <div
                              className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                                isMe ? 'text-indigo-200' : 'text-slate-400'
                              }`}
                            >
                              <span>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isMe && <CheckCheck className="w-3 h-3 text-indigo-200" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Direct Message Input Bar */}
                <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendDirectMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Message ${friend.displayName}...`}
                      value={directInputText}
                      onChange={(e) => setDirectInputText(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
                    />
                    <button
                      type="submit"
                      disabled={!directInputText.trim()}
                      className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                  Direct Friend Chat
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
                  Type a friend&apos;s Email ID (e.g. friend@gmail.com) or Registration ID in the search bar on the left to start direct 1-on-1 chatting!
                </p>
              </div>
            );
          })()
        ) : activeGroup && isMemberOfActive ? (
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
                  {renderGroupIcon(activeGroup, "w-11 h-11 text-xl")}

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
                <a
                  href="https://sjtutorai.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl transition flex items-center gap-1.5 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/40"
                  title="Visit SJ Tutor Website (https://sjtutorai.vercel.app/)"
                >
                  <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="hidden sm:inline">Website</span>
                </a>

                <button
                  onClick={() => setShowPollCreator(true)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  title="Create Group Poll"
                >
                  <BarChart2 className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/?groupId=${activeGroup.id}&inviter=${encodeURIComponent(currentName)}`;
                    navigator.clipboard.writeText(shareUrl);
                    triggerToast('Copied Group Link! 🔗', 'Share this link with any student. When opened, they can Accept or Decline your invitation.', 'Important Alerts');
                  }}
                  className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition"
                  title="Share Group Link"
                >
                  <Share2 className="w-5 h-5" />
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
              {messages.map((msg) => {
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
                              {renderMessageWithClickableLinks(msg.text, isMe)}
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

                  <button
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      setInputText((prev) => (prev ? `${prev} https://sjtutorai.vercel.app/` : 'https://sjtutorai.vercel.app/'));
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 transition col-span-2 border-t border-slate-100 dark:border-slate-700/60 pt-2"
                  >
                    <Globe className="w-4 h-4 text-indigo-500" />
                    <span>Share Website (sjtutorai.vercel.app)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input Bar */}
            <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20">
              {!canUserChat(activeGroup, currentUid) ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                    <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold">Chatting Restricted by Group Admin</p>
                      <p className="text-[11px] opacity-80">You need approval from the admin to send messages in this group.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRequestPermissionFromAdmin(activeGroup.id, 'Chatting')}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shrink-0 shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Request Permission
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
                    title="Attach Media, Poll, or Link"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Type a message or @Tutor to ask AI..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full pl-4 pr-32 py-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
                    />

                    {/* Quick Action Chips inside Input Bar */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {!inputText.includes('https://sjtutorai.vercel.app/') && (
                        <button
                          type="button"
                          onClick={() => setInputText((prev) => (prev ? `${prev} https://sjtutorai.vercel.app/` : 'https://sjtutorai.vercel.app/'))}
                          className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-lg hover:bg-indigo-200 transition flex items-center gap-1"
                          title="Insert website link"
                        >
                          <Globe className="w-3 h-3" />
                          <span className="hidden sm:inline">Web</span>
                        </button>
                      )}
                      {!inputText.includes('@Tutor') && (
                        <button
                          type="button"
                          onClick={() => setInputText((prev) => (prev ? prev + ' @Tutor ' : '@Tutor '))}
                          className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-lg hover:bg-purple-200 transition"
                        >
                          @Tutor
                        </button>
                      )}
                    </div>
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
        ) : activeGroup ? (
          <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Top Header Bar for Preview */}
            <div className="px-4 py-3 sm:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="lg:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Back to Groups"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 min-w-0">
                  {renderGroupIcon(activeGroup, "w-10 h-10 text-xl")}

                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 dark:text-white text-base truncate">
                      {activeGroup.name}
                    </h2>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                      <span>Preview — Not Joined</span>
                      <span>•</span>
                      <span>{activeGroup.subject}</span>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/?groupId=${activeGroup.id}&inviter=${encodeURIComponent(currentName)}`;
                  navigator.clipboard.writeText(shareUrl);
                  triggerToast('Copied Group Link! 🔗', 'Share link copied to clipboard.', 'Important Alerts');
                }}
                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition"
                title="Share Group Link"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center custom-scrollbar">
              <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200/80 dark:border-slate-800 space-y-6">
                <div className="flex justify-center">
                  {renderGroupIcon(activeGroup, "w-20 h-20 text-4xl")}
                </div>

                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                    {activeGroup.name}
                  </h3>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-3">
                    Subject: {activeGroup.subject} • {activeGroup.memberCount} {activeGroup.memberCount === 1 ? 'member' : 'members'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {activeGroup.description || 'Join this study group to connect with peers and solve problems together.'}
                  </p>
                </div>

                {activeGroup.joinRequests?.[currentUid] ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-xs font-medium text-left flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Your request to join <strong>&quot;{activeGroup.name}&quot;</strong> has been sent to the group owner. You will be able to enter as soon as the owner approves your request!
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 text-xs font-medium text-left flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      To join this group, click <strong>Ask Owner to Join</strong> below. Once approved by the owner, you can participate in chats!
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  {activeGroup.joinRequests?.[currentUid] ? (
                    <button
                      disabled
                      className="w-full py-3 px-6 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-sm rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      Request Pending Approval ⏳
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRequestToJoinGroup(activeGroup)}
                      className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Ask Owner to Join Group 📩
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/?groupId=${activeGroup.id}&inviter=${encodeURIComponent(currentName)}`;
                      navigator.clipboard.writeText(shareUrl);
                      triggerToast('Copied Group Link! 🔗', 'Share link copied to clipboard.', 'Important Alerts');
                    }}
                    className="w-full sm:w-auto py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              Select or Join a Study Group
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              You are not currently viewing any joined study group. Select a group from the left, explore public hubs, or paste a Group ID to get started!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab('explore')}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition active:scale-95 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Explore Public Groups
              </button>
              <button
                onClick={() => setShowJoinByIdModal(true)}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                Paste ID
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JOIN GROUP BY ID / LINK MODAL */}
      <AnimatePresence>
        {showJoinByIdModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Join Group by ID or Link
                </h3>
                <button
                  onClick={() => setShowJoinByIdModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Paste the <strong className="text-slate-800 dark:text-white">Group ID</strong>, <strong className="text-slate-800 dark:text-white">Invite Code</strong>, or paste the entire <strong className="text-slate-800 dark:text-white">Group Invite Link</strong> to join directly.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Group ID, Code, or Link *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. group_1752... or STUDY100 or https://..."
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleJoinGroupById();
                        }
                      }}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinByIdModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJoinGroupById()}
                    disabled={joiningById || !joinInput.trim()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {joiningById ? 'Joining...' : 'Join Group'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

                {/* Group Icon Selector (Emoji / Custom PNG/JPG / URL) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Group Icon
                  </label>
                  <div className="flex gap-2 mb-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setNewGroupIconType('emoji')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        newGroupIconType === 'emoji'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Emoji
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGroupIconType('file')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        newGroupIconType === 'file'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Upload PNG/JPG
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewGroupIconType('url')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        newGroupIconType === 'url'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>

                  {newGroupIconType === 'emoji' && (
                    <div className="flex gap-2 flex-wrap">
                      {['🏆', '⚡', '🚀', '💻', '🧬', '📐', '📚', '🎯', '💡', '🎓', '🔬', '🎨'].map((emoji) => (
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
                  )}

                  {newGroupIconType === 'file' && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={(e) => handleFileUpload(e, false)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 dark:file:bg-slate-800 dark:file:text-primary-400 hover:file:bg-primary-100"
                      />
                      {newGroupIconUrl && (
                        <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                          <img src={newGroupIconUrl} alt="Preview" className="w-10 h-10 rounded-xl object-cover" />
                          <span className="text-xs text-emerald-600 font-bold">Custom Icon Loaded!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {newGroupIconType === 'url' && (
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={newGroupIconUrl}
                      onChange={(e) => setNewGroupIconUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                </div>

                {/* Public / Private Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Group Privacy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewGroupIsPublic(true)}
                      className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                        newGroupIsPublic
                          ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Globe className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold">Public Group</span>
                        <span className="text-[10px] opacity-80 block leading-tight">Displayed in Explore Hubs.</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewGroupIsPublic(false)}
                      className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                        !newGroupIsPublic
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold">Private Group</span>
                        <span className="text-[10px] opacity-80 block leading-tight">Hidden from Explore. Join via ID / Link.</span>
                      </div>
                    </button>
                  </div>
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

      {/* EDIT GROUP SETTINGS MODAL */}
      <AnimatePresence>
        {showEditModal && activeGroup && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-500" />
                  Edit Group Settings
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject / Topic *
                  </label>
                  <input
                    type="text"
                    value={editGroupSubject}
                    onChange={(e) => setEditGroupSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Group Description
                  </label>
                  <textarea
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 h-20"
                  />
                </div>

                {/* Edit Group Icon */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Group Icon
                  </label>
                  <div className="flex gap-2 mb-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setEditGroupIconType('emoji')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        editGroupIconType === 'emoji'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Emoji
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditGroupIconType('file')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        editGroupIconType === 'file'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Upload PNG/JPG
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditGroupIconType('url')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        editGroupIconType === 'url'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>

                  {editGroupIconType === 'emoji' && (
                    <div className="flex gap-2 flex-wrap">
                      {['🏆', '⚡', '🚀', '💻', '🧬', '📐', '📚', '🎯', '💡', '🎓', '🔬', '🎨'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditGroupIconEmoji(emoji)}
                          className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border transition ${
                            editGroupIconEmoji === emoji
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {editGroupIconType === 'file' && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={(e) => handleFileUpload(e, true)}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 dark:file:bg-slate-800 dark:file:text-primary-400 hover:file:bg-primary-100"
                      />
                      {editGroupIconUrl && (
                        <div className="flex items-center gap-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                          <img src={editGroupIconUrl} alt="Preview" className="w-10 h-10 rounded-xl object-cover" />
                          <span className="text-xs text-emerald-600 font-bold">Image loaded!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {editGroupIconType === 'url' && (
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={editGroupIconUrl}
                      onChange={(e) => setEditGroupIconUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  )}
                </div>

                {/* Edit Privacy */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Privacy Setting
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditGroupIsPublic(true)}
                      className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                        editGroupIsPublic
                          ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Globe className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold">Public Group</span>
                        <span className="text-[10px] opacity-80 block leading-tight">Show in Explore Hubs.</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditGroupIsPublic(false)}
                      className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                        !editGroupIsPublic
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-xs font-bold">Private Group</span>
                        <span className="text-[10px] opacity-80 block leading-tight">Hide from Explore Hubs.</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGroupSettings}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
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

                <div className="mb-3">
                  {renderGroupIcon(activeGroup, "w-16 h-16 text-3xl")}
                </div>

                <h3 className="text-xl font-black">{activeGroup.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs opacity-90">{activeGroup.subject}</p>
                  <span>•</span>
                  {activeGroup.isPublic ? (
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-md text-[10px] font-bold flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Public
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-md text-[10px] font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                </div>
              </div>

              {/* Details Body */}
              <div className="p-6 space-y-6 flex-1">
                {/* Admin/Owner Settings Button */}
                {(activeGroup.createdBy === currentUid || (userUid && activeGroup.createdBy === userUid) || activeGroup.members?.[currentUid]?.role === 'admin' || (userUid && activeGroup.members?.[userUid]?.role === 'admin')) && (
                  <button
                    onClick={handleOpenEditModal}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                  >
                    <Settings className="w-4 h-4 text-indigo-500" />
                    Edit Group Settings & Privacy
                  </button>
                )}

                {/* Pending Join Requests (For Owner/Admin) */}
                {(activeGroup.createdBy === currentUid || (userUid && activeGroup.createdBy === userUid) || activeGroup.members?.[currentUid]?.role === 'admin' || (userUid && activeGroup.members?.[userUid]?.role === 'admin')) && activeGroup.joinRequests && Object.keys(activeGroup.joinRequests).length > 0 && (
                  <div className="p-4 bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Pending Join Requests ({Object.keys(activeGroup.joinRequests).length})
                    </h4>
                    <div className="space-y-2">
                      {Object.values(activeGroup.joinRequests).map((req) => (
                        <div key={req.uid} className="flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-100 dark:border-amber-900/30">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                              {req.photoURL ? <img src={req.photoURL} alt={req.displayName} className="w-full h-full object-cover" /> : req.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{req.displayName}</p>
                              <span className="text-[10px] text-slate-400 block">{new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleApproveJoinRequest(activeGroup.id, req)}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm"
                              title="Approve Request"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeclineJoinRequest(activeGroup.id, req.uid)}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition shadow-sm"
                              title="Decline Request"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Description
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {activeGroup.description}
                  </p>
                </div>

                {/* Share Group Link & Group ID */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Group Share & Invite Link
                  </h4>

                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/?groupId=${activeGroup.id}&inviter=${encodeURIComponent(currentName)}`;
                      navigator.clipboard.writeText(shareUrl);
                      triggerToast('Copied Group Link! 🔗', 'Share this link with any student. When opened, they can Accept or Decline your invitation.', 'Important Alerts');
                    }}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    Copy Group Invite Link
                  </button>

                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Group ID:</span>
                      <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200 font-bold">
                        <span className="max-w-[140px] truncate">{activeGroup.id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeGroup.id);
                            triggerToast('Group ID Copied!', 'Group ID copied to clipboard.', 'Important Alerts');
                          }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-indigo-600 dark:text-indigo-400"
                          title="Copy Group ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {activeGroup.inviteCode && (
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Invite Code:</span>
                        <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-200 font-bold">
                          <span>{activeGroup.inviteCode}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeGroup.inviteCode || '');
                              triggerToast('Invite Code Copied!', 'Invite code copied to clipboard.', 'Important Alerts');
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-indigo-600 dark:text-indigo-400"
                            title="Copy Invite Code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
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
                      Object.values(activeGroup.members).map((m) => {
                        const isSelf = m.uid === currentUid || (userUid && m.uid === userUid);
                        const isOwner = m.uid === activeGroup.createdBy;
                        const isOwnerOrAdmin =
                          activeGroup.createdBy === currentUid ||
                          (userUid && activeGroup.createdBy === userUid) ||
                          activeGroup.members?.[currentUid]?.role === 'admin' ||
                          (userUid && activeGroup.members?.[userUid]?.role === 'admin');

                        const canRemove = isOwnerOrAdmin && !isSelf && !isOwner;
                        const isExpandedPerms = editingMemberUid === m.uid;

                        const memberPerms: MemberPermissions = m.permissions || {
                          canAddTeammates: activeGroup.defaultMemberPermissions?.canAddTeammates !== false,
                          canChangeGroupIcon: activeGroup.defaultMemberPermissions?.canChangeGroupIcon === true,
                          canChat: activeGroup.defaultMemberPermissions?.canChat !== false
                        };

                        return (
                          <div
                            key={m.uid}
                            className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                                {m.photoURL ? (
                                  <img src={m.photoURL} alt={m.displayName} className="w-full h-full object-cover" />
                                ) : (
                                  m.displayName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                                  <span className="truncate">{m.displayName}</span>
                                  {isSelf && <span className="text-[10px] text-slate-400 font-normal shrink-0">(You)</span>}
                                </p>
                                <span className="text-[10px] text-slate-400 block">
                                  Joined {new Date(m.joinedAt).toLocaleDateString()}
                                </span>
                              </div>

                              {isOwner ? (
                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-md shrink-0">
                                  Owner
                                </span>
                              ) : m.role === 'admin' ? (
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-md shrink-0">
                                  Admin
                                </span>
                              ) : null}

                              {isOwnerOrAdmin && !isOwner && (
                                <button
                                  onClick={() => setEditingMemberUid(isExpandedPerms ? null : m.uid)}
                                  className={`p-1.5 rounded-xl transition shrink-0 ${
                                    isExpandedPerms
                                      ? 'bg-indigo-600 text-white'
                                      : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                                  }`}
                                  title="Manage Admin Permissions for Member"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              )}

                              {canRemove && (
                                <button
                                  onClick={() => handleRemoveMember(activeGroup, m.uid, m.displayName)}
                                  className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition shrink-0"
                                  title={`Remove ${m.displayName} from group`}
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {/* Admin Permissions Controls Panel */}
                            {isExpandedPerms && isOwnerOrAdmin && !isOwner && (
                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                  <span>Admin Permissions</span>
                                  <button
                                    onClick={() => {
                                      handleToggleMemberPermission(activeGroup.id, m.uid, 'canAddTeammates');
                                      handleToggleMemberPermission(activeGroup.id, m.uid, 'canChangeGroupIcon');
                                      handleToggleMemberPermission(activeGroup.id, m.uid, 'canChat');
                                    }}
                                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                                  >
                                    Approve All
                                  </button>
                                </p>

                                <div className="grid grid-cols-1 gap-1 text-xs">
                                  <button
                                    onClick={() => handleToggleMemberPermission(activeGroup.id, m.uid, 'canAddTeammates')}
                                    className={`p-1.5 rounded-lg border flex items-center justify-between transition ${
                                      memberPerms.canAddTeammates
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                                      <UserPlus className="w-3.5 h-3.5" />
                                      Adding Teammates
                                    </span>
                                    <span className="text-[10px] font-bold">{memberPerms.canAddTeammates ? 'Approved ✅' : 'Restricted ❌'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleToggleMemberPermission(activeGroup.id, m.uid, 'canChangeGroupIcon')}
                                    className={`p-1.5 rounded-lg border flex items-center justify-between transition ${
                                      memberPerms.canChangeGroupIcon
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/40 text-indigo-800 dark:text-indigo-300'
                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                                      <ImageIcon className="w-3.5 h-3.5" />
                                      Changing Group Icon
                                    </span>
                                    <span className="text-[10px] font-bold">{memberPerms.canChangeGroupIcon ? 'Approved ✅' : 'Restricted ❌'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleToggleMemberPermission(activeGroup.id, m.uid, 'canChat')}
                                    className={`p-1.5 rounded-lg border flex items-center justify-between transition ${
                                      memberPerms.canChat
                                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/40 text-blue-800 dark:text-blue-300'
                                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
                                    }`}
                                  >
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      Group Chatting
                                    </span>
                                    <span className="text-[10px] font-bold">{memberPerms.canChat ? 'Approved ✅' : 'Restricted ❌'}</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

                  {(activeGroup.createdBy === currentUid || (userUid && activeGroup.createdBy === userUid) || activeGroup.members?.[currentUid]?.role === 'admin' || (userUid && activeGroup.members?.[userUid]?.role === 'admin')) && (
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
