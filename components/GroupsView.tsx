import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { UserProfile, NoteItem } from '../types';
import { 
  Users, 
  Check, 
  X, 
  Crown, 
  ShieldAlert, 
  Plus, 
  Search, 
  MessageSquare, 
  Megaphone, 
  BookOpen, 
  MoreVertical, 
  ArrowLeft, 
  Lock, 
  FileText, 
  Send, 
  LogOut, 
  ShieldCheck, 
  UserPlus, 
  Trash2,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Specific types for Groups Feature
export interface GroupItem {
  id: string;
  name: string;
  description: string;
  photoURL: string;
  category: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string;
  admins: string[]; // List of admin uids
  membersCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface GroupMember {
  userId: string;
  displayName: string;
  photoURL: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
}

export interface GroupJoinRequest {
  userId: string;
  displayName: string;
  photoURL: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: number;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: 'text' | 'announcement' | 'material';
  fileUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'pdf' | 'note';
  timestamp: number;
}

interface GroupsViewProps {
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  isOffline?: boolean;
}

const CATEGORIES = [
  "All Subjects",
  "Mathematics",
  "Science",
  "Social Science",
  "Languages",
  "Exam Prep",
  "General Study"
];

// Preset Group Avatars
const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=150&auto=format&fit=crop&q=60"
];

export const GroupsView: React.FC<GroupsViewProps> = ({ 
  userProfile, 
  onProfileUpdate, 
  isOffline = false 
}) => {
  const currentUid = auth.currentUser?.uid || 'guest';
  const currentDisplayName = auth.currentUser?.displayName || userProfile.displayName || 'Anonymous Scholar';
  const currentPhotoURL = auth.currentUser?.photoURL || userProfile.photoURL || '';

  // App Layout State
  const [activeTab, setActiveTab] = useState<'my-groups' | 'discover'>('my-groups');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Subjects');

  // Groups and Real-time data lists
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  const [selectedGroupData, setSelectedGroupData] = useState<GroupItem | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [discussionMessages, setDiscussionMessages] = useState<GroupMessage[]>([]);

  // Sub-features inside selected Group
  const [groupPaneTab, setGroupPaneTab] = useState<'chat' | 'announcements' | 'materials' | 'members' | 'requests'>('chat');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Effect to check if user has sent a pending join request for selected discovered group
  useEffect(() => {
    if (!selectedGroupId || !currentUid || currentUid === 'guest' || myGroupIds.includes(selectedGroupId)) {
      setHasPendingRequest(false);
      return;
    }

    const checkPendingRequest = async () => {
      try {
        const docRef = doc(db, 'groups', selectedGroupId, 'join_requests', currentUid);
        const snap = await getDoc(docRef);
        setHasPendingRequest(snap.exists() && snap.data()?.status === 'pending');
      } catch {
        setHasPendingRequest(false);
      }
    };

    checkPendingRequest();
  }, [selectedGroupId, currentUid, myGroupIds]);

  // Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('General Study');
  const [newGroupAvatar, setNewGroupAvatar] = useState(PRESET_AVATARS[0]);
  const [createError, setCreateError] = useState('');

  // Sharing Note attachment state
  const [showAttachNoteModal, setShowAttachNoteModal] = useState(false);
  const [myNotes, setMyNotes] = useState<NoteItem[]>([]);

  // Message Sending
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'announcement' | 'material'>('text');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Group Details dropdown / ownership transition
  const [showMembersMenuUserId, setShowMembersMenuUserId] = useState<string | null>(null);

  // Firestore Error Logger standard helper
  const logFirestoreError = (err: any, op: string, path: string) => {
    console.error(`Firestore groups error [${op}] at [${path}]:`, err);
  };

  // 1. Hook to Fetch and Sync All Groups
  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GroupItem[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as GroupItem);
      });
      setGroups(list);
    }, (err) => {
      logFirestoreError(err, 'list', 'groups');
    });

    return () => unsubscribe();
  }, []);

  // 2. Sync My Personal Group Membership IDs
  useEffect(() => {
    if (!currentUid || currentUid === 'guest') return;

    // To prevent infinite fetching or expensive query scoping, we watch the list of groups
    // and query if current user exists in their subcollection "/groups/{groupId}/members/{userId}"
    // Or we can query dynamically.
    // Let's listen on member document triggers individually or query standard member docs
    // Since firestore doesn't support recursive listener joins easily, we'll maintain a state of myGroupIds by querying memberships
    const checkGroupMemberships = async () => {
      const matchedIds: string[] = [];
      for (const group of groups) {
        try {
          const mRef = doc(db, 'groups', group.id, 'members', currentUid);
          const snap = await getDoc(mRef);
          if (snap.exists()) {
            matchedIds.push(group.id);
          }
        } catch {
          // It's possible we haven't joined yet, permission denied is normal
        }
      }
      setMyGroupIds(matchedIds);
    };

    checkGroupMemberships();
  }, [groups, currentUid]);

  // 3. Listen to Active Group Metadata, Members, Join Requests & Messages
  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedGroupData(null);
      setGroupMembers([]);
      setJoinRequests([]);
      setDiscussionMessages([]);
      return;
    }

    // 3a. Watch Active Group Meta details (e.g. description or owner actions updates in realtime)
    const unsubscribeMeta = onSnapshot(doc(db, 'groups', selectedGroupId), (snapshot) => {
      if (snapshot.exists()) {
        setSelectedGroupData({ id: snapshot.id, ...snapshot.data() } as GroupItem);
      }
    }, (err) => {
      logFirestoreError(err, 'get', `groups/${selectedGroupId}`);
    });

    // 3b. Sync Class Members List
    const unsubscribeMembers = onSnapshot(collection(db, 'groups', selectedGroupId, 'members'), (snapshot) => {
      const list: GroupMember[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as GroupMember);
      });
      setGroupMembers(list);
    }, (err) => {
      logFirestoreError(err, 'list', `groups/${selectedGroupId}/members`);
    });

    // 3c. Sync Active Join Requests Queue (Owner/Admins permission dependent)
    const unsubscribeRequests = onSnapshot(collection(db, 'groups', selectedGroupId, 'join_requests'), (snapshot) => {
      const list: GroupJoinRequest[] = [];
      snapshot.forEach((doc) => {
        const item = doc.data() as GroupJoinRequest;
        if (item.status === 'pending') {
          list.push(item);
        }
      });
      setJoinRequests(list);
    }, (err) => {
      logFirestoreError(err, 'list', `groups/${selectedGroupId}/join_requests`);
    });

    // 3d. Sync Chat Message Logs (ordered by timestamp)
    const qMessages = query(collection(db, 'groups', selectedGroupId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const list: GroupMessage[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as GroupMessage);
      });
      setDiscussionMessages(list);
    }, (err) => {
      logFirestoreError(err, 'list', `groups/${selectedGroupId}/messages`);
    });

    return () => {
      unsubscribeMeta();
      unsubscribeMembers();
      unsubscribeRequests();
      unsubscribeMessages();
    };
  }, [selectedGroupId]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [discussionMessages, groupPaneTab]);

  // Load local school notes for material attachment
  useEffect(() => {
    const list: NoteItem[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sjtutor_note_')) {
        try {
          const val = localStorage.getItem(key);
          if (val) list.push(JSON.parse(val));
        } catch {
          // ignore
        }
      }
    }
    setMyNotes(list);
  }, [showAttachNoteModal]);

  // Deliver secure in-app targeted alert/notification to members subcollection
  const sendTargetNotification = async (targetUserId: string, title: string, body: string, category: string) => {
    try {
      const notificationId = `group_${Date.now()}`;
      await setDoc(doc(db, 'users', targetUserId, 'notifications', notificationId), {
        title,
        body,
        category,
        timestamp: Date.now(),
        read: false,
        targetUserId
      });
    } catch (e) {
      console.warn("Target notification suppressed/failed:", e);
    }
  };

  // Deliver notification triggers when role alterations, requests status change, or mentions happen
  const triggerNotificationEvents = async (type: string, payload: any) => {
    if (isOffline) return;

    try {
      if (type === 'NEW_REQUEST') {
        const { groupName, senderName, ownerId, admins } = payload;
        // Notify owner and admins about the request
        const targets = Array.from(new Set([ownerId, ...(admins || [])]));
        for (const t of targets) {
          if (t !== currentUid) {
            await sendTargetNotification(
              t,
              `New Join Request 👥`,
              `${senderName} is requesting to join "${groupName}".`,
              'groups'
            );
          }
        }
      } else if (type === 'REQUEST_APPROVED') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Request Approved! 🎉`,
          `Your join request for the study group "${groupName}" was accepted.`,
          'groups'
        );
      } else if (type === 'REQUEST_REJECTED') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Request Status Update`,
          `Your request to join "${groupName}" was declined.`,
          'groups'
        );
      } else if (type === 'ANNOUNCEMENT_POSTED') {
        const { groupName, senderName, text } = payload;
        // Notify every member of the group
        for (const member of groupMembers) {
          if (member.userId !== currentUid) {
            await sendTargetNotification(
              member.userId,
              `📢 Announcement in "${groupName}"`,
              `${senderName}: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`,
              'announcements'
            );
          }
        }
      } else if (type === 'PROMOTED_ADMIN') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Promoted to Admin! 👑`,
          `You have been appointed as an Admin in "${groupName}".`,
          'groups'
        );
      } else if (type === 'DEMOTED_MEMBER') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Role Update in "${groupName}"`,
          `An owner has adjusted your credentials to Member.`,
          'groups'
        );
      } else if (type === 'MENTION') {
        const { targetUserId, senderName, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Mentioned in "${groupName}" 💬`,
          `${senderName} tagged you in the active discussion.`,
          'messages'
        );
      }
    } catch (e) {
      console.warn("Event notification delivery skipped:", e);
    }
  };

  // --- Core Group Creation with Credit Verification ---
  const handleCreateGroup = async () => {
    setCreateError('');
    if (isOffline) {
      setCreateError('You cannot create study groups while offline.');
      return;
    }
    if (!currentUid || currentUid === 'guest') {
      setCreateError('You must register/authenticate to create study groups.');
      return;
    }
    if (!newGroupName.trim()) {
      setCreateError('Please enter a valid Group Name.');
      return;
    }

    // Creating a group costs exactly 10 credits. Check first!
    if (userProfile.credits < 10) {
      setCreateError(`Insufficient learning credits. Creating an advanced study group requires 10 Credits, but you currently have ${userProfile.credits} Credits. Upgrade or complete tasks!`);
      return;
    }

    try {
      const newGroupId = `group_${Date.now()}`;
      
      // Deduct Credits Automatically first
      const updatedProfile = {
        ...userProfile,
        credits: userProfile.credits - 10
      };

      // Create Group Doc
      const groupData: GroupItem = {
        id: newGroupId,
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || 'A collaborative study workspace for academic scholars on SJ Tutor AI.',
        photoURL: newGroupAvatar,
        category: newGroupCategory,
        ownerId: currentUid,
        ownerName: currentDisplayName,
        ownerAvatar: currentPhotoURL,
        admins: [],
        membersCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Create Owner Membership Document
      const ownerMember: GroupMember = {
        userId: currentUid,
        displayName: currentDisplayName,
        photoURL: currentPhotoURL,
        role: 'owner',
        joinedAt: Date.now()
      };

      // Firestore Batch updates
      await setDoc(doc(db, 'groups', newGroupId), groupData);
      await setDoc(doc(db, 'groups', newGroupId, 'members', currentUid), ownerMember);

      // Log automated system welcome message in chats
      const welcomeMsg: GroupMessage = {
        id: `msg_welcome_${Date.now()}`,
        senderId: 'system',
        senderName: 'SJ Tutor Bot',
        senderAvatar: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
        text: `Welcome to "${newGroupName.trim()}"! This advanced study group is now active. Owner and appointed Admins can post urgent announcements, share structured formulas/notes, approve join requests, or moderate study sessions.`,
        type: 'text',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'groups', newGroupId, 'messages', welcomeMsg.id), welcomeMsg);

      // Sync and deduct user profiles
      await onProfileUpdate(updatedProfile);

      // Clean modals
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupCategory('General Study');
      setShowCreateModal(false);
      setSelectedGroupId(newGroupId);
      setGroupPaneTab('chat');
    } catch (err: any) {
      console.error("Failed to create study group:", err);
      setCreateError(`Create group operation failed: ${err.message || err}`);
    }
  };

  // --- Handle Join Request Submission ---
  const handleSendJoinRequest = async (groupId: string) => {
    if (isOffline) return;
    try {
      const requestDocRef = doc(db, 'groups', groupId, 'join_requests', currentUid);
      const reqData: GroupJoinRequest = {
        userId: currentUid,
        displayName: currentDisplayName,
        photoURL: currentPhotoURL,
        status: 'pending',
        requestedAt: Date.now()
      };
      await setDoc(requestDocRef, reqData);

      // Notify Group Bosses
      const group = groups.find(g => g.id === groupId);
      if (group) {
        await triggerNotificationEvents('NEW_REQUEST', {
          groupId: group.id,
          groupName: group.name,
          senderName: currentDisplayName,
          ownerId: group.ownerId,
          admins: group.admins
        });
      }
    } catch (err) {
      console.error("Failed to send join request:", err);
    }
  };

  // --- Rescind join request ---
  const handleCancelJoinRequest = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'join_requests', currentUid));
    } catch (err) {
      console.error("Failed to cancel join request:", err);
    }
  };

  // --- Approve / Reject Join Request (Admins & Owners only) ---
  const handleReviewRequest = async (userId: string, status: 'accepted' | 'rejected') => {
    if (!selectedGroupId || !selectedGroupData) return;

    try {
      const reqRef = doc(db, 'groups', selectedGroupId, 'join_requests', userId);
      
      if (status === 'accepted') {
        // Fetch target profile details if needed or use previous request fields
        const reqSnap = await getDoc(reqRef);
        if (!reqSnap.exists()) return;
        const reqData = reqSnap.data() as GroupJoinRequest;

        // Add to members subcollection
        const newMember: GroupMember = {
          userId: reqData.userId,
          displayName: reqData.displayName,
          photoURL: reqData.photoURL,
          role: 'member',
          joinedAt: Date.now()
        };
        await setDoc(doc(db, 'groups', selectedGroupId, 'members', userId), newMember);

        // Update membersCount on group doc
        const newCount = (selectedGroupData.membersCount || 0) + 1;
        await updateDoc(doc(db, 'groups', selectedGroupId), {
          membersCount: newCount,
          updatedAt: Date.now()
        });

        // Delete successful request
        await deleteDoc(reqRef);

        // Send confirmation notification
        await triggerNotificationEvents('REQUEST_APPROVED', {
          targetUserId: userId,
          groupName: selectedGroupData.name
        });

        // Post notice in main discussion
        const joinMsg: GroupMessage = {
          id: `msg_join_${Date.now()}`,
          senderId: 'system',
          senderName: 'SJ Tutor Bot',
          senderAvatar: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
          text: `Scholarly user "${reqData.displayName}" joined the group! Welcome aboard.`,
          type: 'text',
          timestamp: Date.now()
        };
        await setDoc(doc(db, 'groups', selectedGroupId, 'messages', joinMsg.id), joinMsg);

      } else {
        // Declined
        await deleteDoc(reqRef);
        await triggerNotificationEvents('REQUEST_REJECTED', {
          targetUserId: userId,
          groupName: selectedGroupData.name
        });
      }
    } catch (err) {
      console.error("Failed to review join request:", err);
    }
  };

  // --- Leave Group / Eject Member ---
  const handleLeaveOrRemoveMember = async (targetUserId: string) => {
    if (!selectedGroupId || !selectedGroupData) return;

    // Check permissions
    const isSelf = targetUserId === currentUid;
    const isOwner = selectedGroupData.ownerId === currentUid;
    const isAdmin = selectedGroupData.admins.includes(currentUid);

    if (!isSelf && !isOwner && !isAdmin) {
      alert("Unauthorized permissions to remove this member.");
      return;
    }

    if (!isSelf && targetUserId === selectedGroupData.ownerId) {
      alert("The Creator/Owner cannot be removed from the group.");
      return;
    }

    try {
      // Delete document
      await deleteDoc(doc(db, 'groups', selectedGroupId, 'members', targetUserId));

      // Decrement membersCount on group doc
      const newCount = Math.max(1, (selectedGroupData.membersCount || 1) - 1);
      
      // If removed user was also on the admins list, pull them out
      const updatedAdmins = selectedGroupData.admins.filter(uid => uid !== targetUserId);

      await updateDoc(doc(db, 'groups', selectedGroupId), {
        membersCount: newCount,
        admins: updatedAdmins,
        updatedAt: Date.now()
      });

      // Post notice in discussions
      const isEjected = !isSelf;
      const noticeMsg: GroupMessage = {
        id: `msg_leave_${Date.now()}`,
        senderId: 'system',
        senderName: 'SJ Tutor Bot',
        senderAvatar: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
        text: isEjected 
          ? `Member was removed from the study group by an administrator.`
          : `Scholar left the group.`,
        type: 'text',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'groups', selectedGroupId, 'messages', noticeMsg.id), noticeMsg);

      // If user left themselves, unselect active workspace
      if (isSelf) {
        setSelectedGroupId(null);
        setActiveTab('my-groups');
      }
    } catch (err) {
      console.error("Failed to alter membership roster:", err);
    }
  };

  // --- Promote Member to Admin ---
  const handlePromoteToAdmin = async (targetUserId: string) => {
    if (!selectedGroupId || !selectedGroupData) return;
    if (selectedGroupData.ownerId !== currentUid) {
      alert("Only the Group Owner is permitted to appoint Admins.");
      return;
    }

    try {
      const updatedAdmins = Array.from(new Set([...selectedGroupData.admins, targetUserId]));
      await updateDoc(doc(db, 'groups', selectedGroupId), {
        admins: updatedAdmins,
        updatedAt: Date.now()
      });

      // Update their member role doc
      await updateDoc(doc(db, 'groups', selectedGroupId, 'members', targetUserId), {
        role: 'admin'
      });

      await triggerNotificationEvents('PROMOTED_ADMIN', {
        targetUserId,
        groupName: selectedGroupData.name
      });

      setShowMembersMenuUserId(null);
    } catch (err) {
      console.error("Promotion failed:", err);
    }
  };

  // --- Dismiss Admin back to normal Member ---
  const handleDismissAdmin = async (targetUserId: string) => {
    if (!selectedGroupId || !selectedGroupData) return;
    if (selectedGroupData.ownerId !== currentUid) {
      alert("Only the Group Owner can dismiss Admins.");
      return;
    }

    try {
      const updatedAdmins = selectedGroupData.admins.filter(uid => uid !== targetUserId);
      await updateDoc(doc(db, 'groups', selectedGroupId), {
        admins: updatedAdmins,
        updatedAt: Date.now()
      });

      // Update roster role doc
      await updateDoc(doc(db, 'groups', selectedGroupId, 'members', targetUserId), {
        role: 'member'
      });

      await triggerNotificationEvents('DEMOTED_MEMBER', {
        targetUserId,
        groupName: selectedGroupData.name
      });

      setShowMembersMenuUserId(null);
    } catch (err) {
      console.error("Dismissal failed:", err);
    }
  };

  // --- Transfer Group Ownership ---
  const handleTransferOwnership = async (newOwnerId: string, newOwnerName: string, newOwnerAvatar: string) => {
    if (!selectedGroupId || !selectedGroupData) return;
    if (selectedGroupData.ownerId !== currentUid) return;

    const confirm = window.confirm(`Are you absolutely sure you want to transfer ownership of the study group to ${newOwnerName}? You will lose owner controls.`);
    if (!confirm) return;

    try {
      // Step 1: Promote new owner doc
      await updateDoc(doc(db, 'groups', selectedGroupId, 'members', newOwnerId), {
        role: 'owner'
      });

      // Step 2: Demote self to Admin or Member
      await updateDoc(doc(db, 'groups', selectedGroupId, 'members', currentUid), {
        role: 'admin'
      });

      // Update groups doc fields
      const updatedAdmins = [
        ...selectedGroupData.admins.filter(uid => uid !== newOwnerId),
        currentUid // add old owner as admin so they can still assist
      ];

      await updateDoc(doc(db, 'groups', selectedGroupId), {
        ownerId: newOwnerId,
        ownerName: newOwnerName,
        ownerAvatar: newOwnerAvatar,
        admins: updatedAdmins,
        updatedAt: Date.now()
      });

      setShowMembersMenuUserId(null);
      alert(`Ownership successfully transferred to ${newOwnerName}.`);
    } catch (err) {
      console.error("Ownership transition failed:", err);
    }
  };

  // --- Delete Group Roster & Metadata ---
  const handleDeleteGroup = async () => {
    if (!selectedGroupId || !selectedGroupData) return;
    if (selectedGroupData.ownerId !== currentUid) return;

    const confirm = window.confirm(`WARNING: Are you absolutely sure you want to delete and disband "${selectedGroupData.name}"? This action is permanent and will delete all threads and shared content.`);
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'groups', selectedGroupId));
      setSelectedGroupId(null);
      setActiveTab('my-groups');
      alert("Group disbanded successfully.");
    } catch (err) {
      console.error("Erase operation failed:", err);
    }
  };

  // --- Post Message (Support tags and mentions) ---
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !messageText.trim()) return;

    // Detect user role in active group to confirm authorization for announcements
    const isOwner = selectedGroupData?.ownerId === currentUid;
    const isAdmin = selectedGroupData?.admins.includes(currentUid) || isOwner;

    if (messageType === 'announcement' && !isAdmin) {
      alert("Only Admins or the Group Owner can post Announcements.");
      return;
    }

    try {
      const cleanText = messageText.trim();
      const messageId = `msg_${Date.now()}`;

      const msgData: GroupMessage = {
        id: messageId,
        senderId: currentUid,
        senderName: currentDisplayName,
        senderAvatar: currentPhotoURL,
        text: cleanText,
        type: messageType,
        timestamp: Date.now()
      };

      // Create doc
      await setDoc(doc(db, 'groups', selectedGroupId, 'messages', messageId), msgData);
      setMessageText('');

      // If statement is announcement, notify all group colleagues
      if (messageType === 'announcement') {
        await triggerNotificationEvents('ANNOUNCEMENT_POSTED', {
          groupId: selectedGroupId,
          groupName: selectedGroupData?.name,
          senderName: currentDisplayName,
          text: cleanText
        });
        // reset chat selection back to normal
        setMessageType('text');
      }

      // Detect Mentions (e.g. `@Username`) and dispatch alerts
      const tagRegex = /@([a-zA-Z0-9_\s]{2,20})/g;
      let match;
      while ((match = tagRegex.exec(cleanText)) !== null) {
        const matchedName = match[1].toLowerCase().replace(/\s/g, '');
        // Find member with corresponding matches
        const taggedMember = groupMembers.find(
          m => m.displayName.toLowerCase().replace(/\s/g, '') === matchedName && m.userId !== currentUid
        );

        if (taggedMember) {
          await triggerNotificationEvents('MENTION', {
            targetUserId: taggedMember.userId,
            senderName: currentDisplayName,
            groupName: selectedGroupData?.name
          });
        }
      }

    } catch (err) {
      console.error("Message dispatch error:", err);
    }
  };

  // --- Attach local note to Materials Thread ---
  const handleAttachNote = async (note: NoteItem) => {
    if (!selectedGroupId) return;

    try {
      const messageId = `msg_note_${Date.now()}`;
      const textNotice = `Shared a Note: "${note.title}" (${note.subject} • ${note.chapter})`;

      const msgData: GroupMessage = {
        id: messageId,
        senderId: currentUid,
        senderName: currentDisplayName,
        senderAvatar: currentPhotoURL,
        text: textNotice,
        type: 'material',
        fileUrl: note.content,
        fileName: note.title,
        fileType: 'note',
        timestamp: Date.now()
      };

      await setDoc(doc(db, 'groups', selectedGroupId, 'messages', messageId), msgData);
      setShowAttachNoteModal(false);

      // Add a friendly toast or scroll
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error("Failed to attach note material:", err);
    }
  };

  // Filter groups list according to Category and Query
  const filteredGroups = groups.filter((g) => {
    const matchesCategory = selectedCategory === 'All Subjects' || g.category === selectedCategory;
    const matchesQuery = g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const isMemberOf = myGroupIds.includes(g.id);

    if (activeTab === 'my-groups') {
      return matchesCategory && matchesQuery && isMemberOf;
    } else {
      return matchesCategory && matchesQuery && !isMemberOf;
    }
  });

  // Check current user credentials
  const userRole = selectedGroupData 
    ? (selectedGroupData.ownerId === currentUid 
        ? 'owner' 
        : (selectedGroupData.admins.includes(currentUid) ? 'admin' : 'member'))
    : null;

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 text-slate-800" id="groups-feature-root">
      
      {/* 1. Left List Pane: Side Discover Panel */}
      <div className={`w-full md:w-80 flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm ${selectedGroupId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Dynamic header listing credits and tabs */}
        <div className="p-4 bg-slate-50 border-b border-indigo-50/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">Study Groups</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collaborative Hub</span>
              </div>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>

          {/* Search bar input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search study groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 shadow-inner"
            />
          </div>

          {/* Simple Tab Control */}
          <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                activeTab === 'my-groups' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              My Hub ({myGroupIds.length})
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                activeTab === 'discover' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Discover
            </button>
          </div>
        </div>

        {/* Category Filter Horizontal Rails */}
        <div className="flex gap-1.5 p-2 bg-slate-50/50 overflow-x-auto scrollbar-none border-b border-slate-100">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-[10px] font-black rounded-full whitespace-nowrap border transition-all ${
                selectedCategory === cat 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dynamic Groups list feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/30">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-xs font-bold">No groups found</p>
              <p className="text-slate-400 text-[10px] mt-1">Try checking another subject category or query.</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = selectedGroupId === group.id;

              return (
                <div 
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center group relative ${
                    isSelected 
                      ? 'bg-indigo-50/75 border-indigo-300 ring-2 ring-indigo-200' 
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <img 
                    src={group.photoURL || PRESET_AVATARS[0]}
                    alt={group.name}
                    className="w-11 h-11 rounded-xl object-cover shadow-inner bg-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                        {group.category}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                        <Users className="w-3 h-3" />
                        <span>{group.membersCount || 1}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs truncate mt-1 group-hover:text-indigo-600 transition-colors">
                      {group.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                      {group.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Main Right WorkSpace Pane - Real-time Messaging and Discussions */}
      <div className={`flex-1 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm flex flex-col ${!selectedGroupId ? 'hidden md:flex justify-center items-center p-8 text-center' : 'flex'}`}>
        {selectedGroupId && selectedGroupData ? (
          <>
            {/* Header: Title details, Member count, and category rails */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedGroupId(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <img 
                  src={selectedGroupData.photoURL}
                  alt={selectedGroupData.name}
                  className="w-10 h-10 rounded-xl object-cover bg-slate-100"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">{selectedGroupData.name}</h3>
                    <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                      {selectedGroupData.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                    <span>Created on {new Date(selectedGroupData.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Owner: {selectedGroupData.ownerName}</span>
                  </p>
                </div>
              </div>

              {/* Group Workspace sub-tabs controls */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setGroupPaneTab('chat')}
                    className={`px-3 py-1 text-[10px] font-black rounded-md flex items-center gap-1 transition-all ${
                      groupPaneTab === 'chat' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Discussions</span>
                  </button>
                  <button
                    onClick={() => setGroupPaneTab('announcements')}
                    className={`px-3 py-1 text-[10px] font-black rounded-md flex items-center gap-1 transition-all ${
                      groupPaneTab === 'announcements' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Announcements</span>
                  </button>
                  <button
                    onClick={() => setGroupPaneTab('materials')}
                    className={`px-3 py-1 text-[10px] font-black rounded-md flex items-center gap-1 transition-all ${
                      groupPaneTab === 'materials' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Materials</span>
                  </button>
                  <button
                    onClick={() => setGroupPaneTab('members')}
                    className={`px-3 py-1 text-[10px] font-black rounded-md flex items-center gap-1 transition-all ${
                      groupPaneTab === 'members' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Roster ({groupMembers.length})</span>
                  </button>
                  {(userRole === 'owner' || userRole === 'admin') && (
                    <button
                      onClick={() => setGroupPaneTab('requests')}
                      className={`px-3 py-1 text-[10px] font-black rounded-md flex items-center gap-1 transition-all relative ${
                        groupPaneTab === 'requests' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Requests</span>
                      {joinRequests.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center animate-bounce">
                          {joinRequests.length}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {userRole === 'owner' && (
                  <button 
                    onClick={handleDeleteGroup}
                    title="Disband this study group"
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* If user is NOT yet an approved member of this discovered group */}
            {!myGroupIds.includes(selectedGroupId) ? (
              <div className="flex-grow flex flex-col justify-center items-center p-8 text-center bg-slate-50/20">
                <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-lg">{selectedGroupData.name}</h3>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mt-1.5 uppercase">
                  {selectedGroupData.category}
                </span>

                <p className="text-slate-500 text-xs mt-3 max-w-sm">
                  {selectedGroupData.description}
                </p>

                {/* Send join request panel */}
                <div className="mt-6 border-t border-slate-100 pt-6 w-full max-w-xs">
                  {groups.length > 0 && (
                    <div className="space-y-3">
                      {hasPendingRequest ? (
                        <>
                          <div className="p-3 bg-amber-50 text-amber-800 text-[11px] font-bold rounded-2xl border border-amber-200 text-center leading-relaxed">
                            Your request to join this study group is currently pending administrator review.
                          </div>
                          <button
                            onClick={async () => {
                              await handleCancelJoinRequest(selectedGroupData.id);
                              setHasPendingRequest(false);
                            }}
                            className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-705 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancel Join Request</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Join Request Required</p>
                          
                          <button
                            onClick={async () => {
                              await handleSendJoinRequest(selectedGroupData.id);
                              setHasPendingRequest(true);
                            }}
                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-transform shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>Submit Request to Join</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If joined: active workspace content depending on selections */
              <div className="flex-grow flex flex-col min-h-0 bg-slate-50/10">
                {/* A. Dynamic Inner Views */}
                <div className="flex-grow min-h-0 overflow-y-auto p-4">
                  
                  {/* TAB 1: Chat Pane */}
                  {groupPaneTab === 'chat' && (
                    <div className="space-y-4">
                      {discussionMessages.length === 0 ? (
                        <div className="text-center py-16">
                          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-slate-600 text-xs text-center">No discussion threads yet</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">Write a message, tag members, or attach study materials to begin discussing.</p>
                        </div>
                      ) : (
                        discussionMessages.map((msg) => {
                          const isMe = msg.senderId === currentUid;
                          const isSystem = msg.senderId === 'system';

                          if (isSystem) {
                            return (
                              <div key={msg.id} className="flex justify-center my-3">
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-[11px] text-indigo-900 max-w-lg leading-relaxed text-center font-bold">
                                  {msg.text}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={msg.id} className={`flex gap-3 max-w-xl ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                              <img 
                                src={msg.senderAvatar || PRESET_AVATARS[0]}
                                alt={msg.senderName}
                                className="w-8 h-8 rounded-full object-cover shrink-0 select-none bg-slate-100"
                              />
                              <div>
                                <div className={`flex items-baseline gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                  <span className="font-black text-[11px] text-slate-900">{msg.senderName}</span>
                                  <span className="text-[9px] text-slate-400 font-bold">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                  isMe 
                                    ? 'bg-slate-900 text-white rounded-tr-none shadow-sm' 
                                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'
                                }`}>
                                  
                                  {/* Render file attachments if materials */}
                                  {msg.type === 'material' && msg.fileType === 'note' && (
                                    <div className="mb-2 p-2 bg-indigo-50 text-indigo-900 rounded-xl border border-indigo-100 flex items-start gap-2 max-w-xs">
                                      <FileText className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="font-extrabold text-[11px] truncate">{msg.fileName}</p>
                                        <p className="text-[9px] text-indigo-600/70 font-black tracking-wider uppercase">SJ Academic Note</p>
                                      </div>
                                    </div>
                                  )}

                                  <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}

                  {/* TAB 2: Announcements Feed Only */}
                  {groupPaneTab === 'announcements' && (
                    <div className="space-y-3.5 max-w-xl mx-auto">
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 text-indigo-900 text-xs font-bold leading-relaxed flex gap-3">
                        <Megaphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-extrabold">Notice & Announcements Feed</p>
                          <p className="text-[10px] text-indigo-600 font-bold mt-1">Appointed administrators post vital study timelines and schedules here to notify everyone in real-time.</p>
                        </div>
                      </div>

                      {discussionMessages.filter(m => m.type === 'announcement').length === 0 ? (
                        <div className="text-center py-16">
                          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-slate-600 text-xs">No active announcements</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Check back later or ask administrators in the main thread.</p>
                        </div>
                      ) : (
                        discussionMessages.filter(m => m.type === 'announcement').map((ann) => (
                          <div key={ann.id} className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <img src={ann.senderAvatar} className="w-6 h-6 rounded-full object-cover bg-slate-100" />
                                <span className="font-black text-rose-900 text-xs">{ann.senderName}</span>
                                <span className="text-[9px] font-bold text-slate-300">Admin</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-bold">
                                {new Date(ann.timestamp).toLocaleDateString()} at {new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-bold">
                              {ann.text}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: Materials Panel */}
                  {groupPaneTab === 'materials' && (
                    <div className="max-w-xl mx-auto space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Shared Resource Bank</h4>
                        <button 
                          onClick={() => setShowAttachNoteModal(true)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black flex items-center gap-1 transition-all shadow"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Attach study Note</span>
                        </button>
                      </div>

                      {discussionMessages.filter(m => m.type === 'material').length === 0 ? (
                        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-slate-600 text-xs">Resource Bank is empty</h4>
                          <p className="text-[10px] text-slate-400 mt-1 shrink-0 max-w-xs mx-auto">Attach saved revision notes, formula decks, or class templates to help group members prepare better.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {discussionMessages.filter(m => m.type === 'material').map((mat) => (
                            <div key={mat.id} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-3">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-extrabold text-slate-800 text-xs truncate leading-snug">{mat.fileName || 'Untitled Material'}</h5>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate uppercase tracking-wide font-black">Shared by {mat.senderName}</p>
                                
                                {/* Dynamic Content Preview */}
                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-[9px] text-indigo-600 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase">Academic Note</span>
                                  <button
                                    onClick={() => {
                                      // Render note contents in a reader or standard alert
                                      if (mat.fileUrl) {
                                        alert(`--- NOTE CONTENTS PREVIEW ---\n\n${mat.fileUrl}`);
                                      }
                                    }}
                                    className="text-[10px] text-slate-600 hover:text-indigo-600 font-black"
                                  >
                                    View Note
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: Roster & Members list pane */}
                  {groupPaneTab === 'members' && (
                    <div className="max-w-xl mx-auto space-y-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2">Class Roster ({groupMembers.length})</h4>
                        <p className="text-[10px] text-slate-500 font-semibold mb-3">Group Owner and Admins have extra privileges to manage study content and members.</p>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 overflow-hidden shadow-sm">
                        {groupMembers.map((member) => {
                          const isCurrent = member.userId === currentUid;
                          const showMenu = showMembersMenuUserId === member.userId;

                          return (
                            <div key={member.userId} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <img src={member.photoURL} className="w-8 h-8 rounded-full object-cover bg-slate-100" />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900 text-xs">{member.displayName}</span>
                                    {isCurrent && (
                                      <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">You</span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Joined on {new Date(member.joinedAt).toLocaleDateString()}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Role Labels */}
                                {member.role === 'owner' && (
                                  <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 border border-amber-200">
                                    <Crown className="w-2.5 h-2.5 text-amber-600" />
                                    <span>Owner</span>
                                  </span>
                                )}
                                {member.role === 'admin' && (
                                  <span className="text-[9px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 border border-rose-200">
                                    <ShieldCheck className="w-2.5 h-2.5 text-rose-600" />
                                    <span>Admin</span>
                                  </span>
                                )}
                                {member.role === 'member' && (
                                  <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                    Member
                                  </span>
                                )}

                                {/* Admin Promotion Demotion Interactive actions popup */}
                                {userRole === 'owner' && !isCurrent && (
                                  <div className="relative">
                                    <button 
                                      onClick={() => setShowMembersMenuUserId(showMenu ? null : member.userId)}
                                      className="p-1 hover:bg-slate-100 rounded-lg"
                                    >
                                      <MoreVertical className="w-4 h-4 text-slate-400" />
                                    </button>

                                    {showMenu && (
                                      <div className="absolute right-0 top-7 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-xl z-20 w-44 space-y-1 text-slate-700">
                                        {member.role === 'member' && (
                                          <button
                                            onClick={() => handlePromoteToAdmin(member.userId)}
                                            className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-slate-50 font-bold flex items-center gap-1.5 rounded-xl text-rose-600"
                                          >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>Promote to Admin</span>
                                          </button>
                                        )}
                                        {member.role === 'admin' && (
                                          <button
                                            onClick={() => handleDismissAdmin(member.userId)}
                                            className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-slate-50 font-bold flex items-center gap-1.5 rounded-xl text-slate-600"
                                          >
                                            <ShieldAlert className="w-3.5 h-3.5" />
                                            <span>Dismiss Admin</span>
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleTransferOwnership(member.userId, member.displayName, member.photoURL)}
                                          className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-slate-50 font-bold flex items-center gap-1.5 rounded-xl text-amber-600"
                                        >
                                          <Crown className="w-3.5 h-3.5" />
                                          <span>Transfer Ownership</span>
                                        </button>
                                        <button
                                          onClick={() => handleLeaveOrRemoveMember(member.userId)}
                                          className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-slate-50 text-red-500 font-bold flex items-center gap-1.5 rounded-xl"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>Eject Member</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Admin removing normal members options */}
                                {userRole === 'admin' && member.role === 'member' && !isCurrent && (
                                  <button 
                                    onClick={() => handleLeaveOrRemoveMember(member.userId)}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    title="Eject Member"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Member leaving option */}
                                {isCurrent && member.role !== 'owner' && (
                                  <button 
                                    onClick={() => handleLeaveOrRemoveMember(member.userId)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-500 text-[10px] font-black rounded-lg flex items-center gap-0.5"
                                  >
                                    <LogOut className="w-3.5 h-3.5" />
                                    <span>Leave</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: Join Request approvals */}
                  {groupPaneTab === 'requests' && (userRole === 'owner' || userRole === 'admin') && (
                    <div className="max-w-xl mx-auto space-y-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2">Pending Admissions ({joinRequests.length})</h4>
                        <p className="text-[10px] text-slate-500 font-semibold mb-3">Accept or reject student applications seeking entrance to this secure group.</p>
                      </div>

                      {joinRequests.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl">
                          <UserPlus className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-slate-600 text-xs">No pending requests</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Excellent! All registration queues have been processed.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {joinRequests.map((req) => (
                            <div key={req.userId} className="p-3.5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                              <div className="flex items-center gap-3">
                                <img src={req.photoURL} className="w-9 h-9 rounded-full object-cover bg-slate-100" />
                                <div>
                                  <h5 className="font-extrabold text-slate-800 text-xs">{req.displayName}</h5>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Applied on {new Date(req.requestedAt).toLocaleDateString()}</p>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReviewRequest(req.userId, 'accepted')}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black flex items-center gap-0.5"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  onClick={() => handleReviewRequest(req.userId, 'rejected')}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold"
                                >
                                  <span>Reject</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* B. Chat Input Composer Pane (Sticky on bottom only when chat/announcements tags is selected) */}
                {(groupPaneTab === 'chat' || groupPaneTab === 'announcements') && (
                  <form onSubmit={handlePostMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center">
                    
                    {/* Announcement toggle tag */}
                    {(userRole === 'owner' || userRole === 'admin') && (
                      <button
                        type="button"
                        onClick={() => {
                          setMessageType(messageType === 'announcement' ? 'text' : 'announcement');
                        }}
                        className={`p-2.5 border rounded-xl shrink-0 transition-all ${
                          messageType === 'announcement' 
                            ? 'bg-rose-50 border-rose-200 text-rose-600 font-extrabold' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                        title={messageType === 'announcement' ? 'Writing Announcement' : 'Post normal message'}
                      >
                        <Megaphone className="w-4 h-4" />
                      </button>
                    )}

                    {/* Rich text inputs */}
                    <div className="flex-1 relative flex items-center">
                      <input 
                        type="text"
                        placeholder={messageType === 'announcement' 
                          ? 'Broadcast an announcement to all members...' 
                          : 'Type a message... Use @name to tag group members.'}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 text-slate-900"
                        maxLength={1000}
                      />
                      
                      {/* Attach note trigger */}
                      <button
                        type="button"
                        onClick={() => setShowAttachNoteModal(true)}
                        className="absolute right-2 text-slate-400 hover:text-indigo-600 p-1.5 transition-colors"
                        title="Share academic note to group"
                      >
                        <Bookmark className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!messageText.trim()}
                      className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-md active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center bg-slate-50/10 min-h-0 flex-grow flex flex-col justify-center items-center">
            <Users className="w-16 h-16 text-indigo-500/20 mb-4 animate-bounce" />
            <h3 className="font-extrabold text-slate-900 text-lg">No Group Selected</h3>
            <p className="text-slate-500 text-xs mt-2 max-w-sm">
              Select one of your existing study groups from the left workspace sidebar, or explore the Discover tab to find new collaborative subjects.
            </p>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Study Group Dialog */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md relative z-10"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4 text-center">
                <Users className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
                <h3 className="font-extrabold text-slate-900 text-base">New Study Group</h3>
                <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                  Requires 10 Credits
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Physics Revision & Doubt Solvers"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 text-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400">Description</label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="Brief objective of this study group..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 h-20 text-slate-950 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400">Category</label>
                    <select
                      value={newGroupCategory}
                      onChange={(e) => setNewGroupCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 font-bold"
                    >
                      {CATEGORIES.slice(1).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-400">Your Credits Balance</label>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center font-bold">
                      <span className="text-slate-500">Balance:</span>
                      <span className={userProfile.credits >= 10 ? 'text-emerald-600' : 'text-red-500'}>
                        {userProfile.credits} CR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preset Avatars picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Select Group Cover Photo</label>
                  <div className="flex gap-2 items-center overflow-x-auto pb-1">
                    {PRESET_AVATARS.map((url) => (
                      <img
                        key={url}
                        src={url}
                        onClick={() => setNewGroupAvatar(url)}
                        className={`w-10 h-10 rounded-lg object-cover cursor-pointer hover:opacity-100 transition-all ${
                          newGroupAvatar === url ? 'ring-2 ring-indigo-600 scale-105 opacity-100' : 'opacity-65'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {createError && (
                  <div className="p-3 bg-red-50 text-red-500 text-xs font-semibold rounded-xl border border-red-100">
                    {createError}
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-250 text-slate-600 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={userProfile.credits < 10}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-transform shadow-md disabled:opacity-55"
                  >
                    Create Group (-10 CR)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Attach Personal Study Notes to materials queue */}
      <AnimatePresence>
        {showAttachNoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAttachNoteModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md relative z-10"
            >
              <button 
                onClick={() => setShowAttachNoteModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="font-extrabold text-slate-900 text-base">Attach Personal Study Note</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Select a revision helper note from your local bank</p>
              </div>

              <div className="overflow-y-auto max-h-64 space-y-2">
                {myNotes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-35" />
                    <p className="text-xs font-bold">No saved notes available</p>
                    <p className="text-[10px] opacity-75 mt-0.5">Create a note first in the AI Notes pane.</p>
                  </div>
                ) : (
                  myNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => handleAttachNote(note)}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-slate-200 rounded-2xl cursor-pointer transition-all flex items-start gap-3 group"
                    >
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-extrabold text-slate-800 text-xs truncate group-hover:text-indigo-600">{note.title}</h5>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate">{note.subject} • {note.chapter}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowAttachNoteModal(false)}
                className="w-full py-3 mt-4 bg-slate-105 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
