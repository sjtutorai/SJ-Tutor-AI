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
  Bookmark,
  Filter,
  Sparkles,
  Mail,
  RefreshCw
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

  // Sorting & Hub states
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-active'>('newest');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [mySentRequests, setMySentRequests] = useState<Record<string, boolean>>({});
  const [receivedPendingRequests, setReceivedPendingRequests] = useState<any[]>([]);

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

  // Sync incoming group invitations matched to logged-in user's email
  useEffect(() => {
    if (!currentUid || currentUid === 'guest') return;
    const userEmail = auth.currentUser?.email || '';
    if (!userEmail) return;

    const q = query(collection(db, 'invitations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.receiverEmail && data.receiverEmail.toLowerCase() === userEmail.toLowerCase()) {
          list.push({ id: doc.id, ...data });
        }
      });
      setInvitations(list);
    }, (err) => {
      console.warn("Invitations sync failed:", err);
    });

    return () => unsubscribe();
  }, [currentUid]);

  // Sync pending join requests sent by current user across all groups
  useEffect(() => {
    if (groups.length === 0 || !currentUid || currentUid === 'guest') return;

    const fetchSentRequests = async () => {
      const statuses: Record<string, boolean> = {};
      for (const group of groups) {
        if (myGroupIds.includes(group.id)) continue;
        try {
          const docRef = doc(db, 'groups', group.id, 'join_requests', currentUid);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data()?.status === 'pending') {
            statuses[group.id] = true;
          }
        } catch {
          // ignore
         }
      }
      setMySentRequests(statuses);
    };

    fetchSentRequests();
  }, [groups, myGroupIds, currentUid]);

  // Sync pending join requests waitlist received across managed groups in real-time
  useEffect(() => {
    if (groups.length === 0 || !currentUid || currentUid === 'guest') return;

    const myManagedGroups = groups.filter(g => g.ownerId === currentUid || g.admins.includes(currentUid));
    if (myManagedGroups.length === 0) {
      setReceivedPendingRequests([]);
      return;
    }

    const unsubscribes = myManagedGroups.map(group => {
      const q = collection(db, 'groups', group.id, 'join_requests');
      return onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.status === 'pending') {
            list.push({ groupId: group.id, groupName: group.name, ...data });
          }
        });
        setReceivedPendingRequests(prev => {
          const filtered = prev.filter(item => item.groupId !== group.id);
          return [...filtered, ...list];
        });
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());
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

  // Deliver secure in-app targeted alert/notification to global notifications collection
  const sendTargetNotification = async (targetUserId: string, title: string, body: string, category: string = 'Important Alerts') => {
    try {
      const notificationId = `group_notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(db, 'notifications', notificationId), {
        id: notificationId,
        userId: targetUserId,
        title,
        body,
        category,
        timestamp: Date.now(),
        read: false
      });
    } catch (e) {
      console.warn("Target notification suppressed/failed:", e);
    }
  };

  // Deliver notification triggers when role alterations, requests status change, or mentions happen
  const triggerNotificationEvents = async (type: string, payload: any) => {
    if (isOffline) return;

    try {
      if (type === 'GROUP_CREATED') {
        const { groupName, creatorId } = payload;
        await sendTargetNotification(
          creatorId,
          `Group Created! 👥`,
          `✅ Group Generated Successfully! Your advanced study group "${groupName}" is now active.`
        );
      } else if (type === 'NEW_REQUEST') {
        const { groupName, senderName, ownerId, admins } = payload;
        // Notify owner and admins about the request
        const targets = Array.from(new Set([ownerId, ...(admins || [])]));
        for (const t of targets) {
          if (t !== currentUid) {
            await sendTargetNotification(
              t,
              `New Join Request 👥`,
              `${senderName} is requesting to join "${groupName}".`
            );
          }
        }
      } else if (type === 'REQUEST_APPROVED') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Request Approved! 🎉`,
          `Your join request for the study group "${groupName}" was accepted.`
        );
      } else if (type === 'REQUEST_REJECTED') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Request Status Update`,
          `Your request to join "${groupName}" was declined.`
        );
      } else if (type === 'MEMBER_ADDED') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Member Added 👥`,
          `You have successfully joined the group "${groupName}".`
        );
      } else if (type === 'MEMBER_REMOVED') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Member Removed 👥`,
          `You have been removed from the study group "${groupName}".`
        );
      } else if (type === 'ADMIN_ASSIGNED' || type === 'PROMOTED_ADMIN') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Promoted to Admin! 👑`,
          `You have been appointed as an Admin in "${groupName}".`
        );
      } else if (type === 'ADMIN_REMOVED' || type === 'DEMOTED_MEMBER') {
        const { targetUserId, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Role Update in "${groupName}"`,
          `Your role has been updated to regular Member in "${groupName}".`
        );
      } else if (type === 'ANNOUNCEMENT_POSTED') {
        const { groupName, senderName, text } = payload;
        // Notify every member of the group
        for (const member of groupMembers) {
          if (member.userId !== currentUid) {
            await sendTargetNotification(
              member.userId,
              `📢 Announcement in "${groupName}"`,
              `${senderName}: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`
            );
          }
        }
      } else if (type === 'GROUP_DELETED') {
        const { groupName, members } = payload;
        for (const mId of members) {
          if (mId !== currentUid) {
            await sendTargetNotification(
              mId,
              `Group Deleted ⚠️`,
              `The study group "${groupName}" was deleted and disbanded by the owner.`
            );
          }
        }
      } else if (type === 'MENTION') {
        const { targetUserId, senderName, groupName } = payload;
        await sendTargetNotification(
          targetUserId,
          `Mentioned in "${groupName}" 💬`,
          `${senderName} tagged you in the active discussion.`
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

      // Trigger notification event for Group Created
      await triggerNotificationEvents('GROUP_CREATED', {
        groupName: newGroupName.trim(),
        creatorId: currentUid
      });

      // Show success alert
      setSuccessToast("✅ Group Generated Successfully!");
      setTimeout(() => setSuccessToast(null), 6000);

      // Clean modals
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupCategory('General Study');
      setNewGroupAvatar(PRESET_AVATARS[0]);
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

  // --- Accept and Decline invitations received ---
  const handleAcceptInvitation = async (invite: any) => {
    if (isOffline) return;
    try {
      // Add to members subcollection for that group
      const newMember: GroupMember = {
        userId: currentUid,
        displayName: currentDisplayName,
        photoURL: currentPhotoURL,
        role: 'member',
        joinedAt: Date.now()
      };
      await setDoc(doc(db, 'groups', invite.groupId, 'members', currentUid), newMember);

      // Update membersCount on group doc
      const groupRef = doc(db, 'groups', invite.groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const gData = groupSnap.data();
        await updateDoc(groupRef, {
          membersCount: (gData.membersCount || 0) + 1,
          updatedAt: Date.now()
        });

        // Trigger notification events for joining
        await triggerNotificationEvents('MEMBER_ADDED', {
          targetUserId: currentUid,
          groupName: invite.groupName
        });

        // Post notice in discussion thread
        const joinMsg: GroupMessage = {
          id: `msg_join_invite_${Date.now()}`,
          senderId: 'system',
          senderName: 'SJ Tutor Bot',
          senderAvatar: 'https://res.cloudinary.com/dbliqm48v/image/upload/v1765344874/gemini-2.5-flash-image_remove_all_the_elemts_around_the_tutor-0_lvlyl0.jpg',
          text: `Scholar "${currentDisplayName}" joined the group via direct invitation!`,
          type: 'text',
          timestamp: Date.now()
        };
        await setDoc(doc(db, 'groups', invite.groupId, 'messages', joinMsg.id), joinMsg);
      }

      // Delete the invitation document after success
      await deleteDoc(doc(db, 'invitations', invite.id));

      // Show success toast
      setSuccessToast(`🎉 Successfully joined "${invite.groupName}" study group!`);
      setTimeout(() => setSuccessToast(null), 5000);

      // Enter group workspace
      setSelectedGroupId(invite.groupId);
    } catch (err) {
      console.error("Failed to accept invitation:", err);
    }
  };

  const handleDeclineInvitation = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, 'invitations', inviteId));
    } catch (err) {
      console.error("Failed to decline invitation:", err);
    }
  };

  const handleInviteFriend = async (email: string, message: string) => {
    if (!selectedGroupId || !selectedGroupData) return;
    const emailLower = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      const inviteId = `invite_${Date.now()}`;
      await setDoc(doc(db, 'invitations', inviteId), {
        id: inviteId,
        groupId: selectedGroupId,
        groupName: selectedGroupData.name,
        groupDescription: selectedGroupData.description,
        senderId: currentUid,
        senderName: currentDisplayName,
        receiverEmail: emailLower,
        message: message.trim() || `Hey! Join my advanced study group "${selectedGroupData.name}" on SJ Tutor AI!`,
        status: 'pending',
        timestamp: Date.now()
      });

      console.log(`\n=================== SIMULATED INVITATION EMAIL ===================\n` +
                  `TO: ${emailLower}\n` +
                  `SUBJECT: Study Group Invitation on SJ Tutor AI\n` +
                  `MESSAGE: ${message.trim() || 'Join my study group!'}\n` +
                  `LINK: ${window.location.origin}/groups?inviteId=${inviteId}\n` +
                  `===================================================================\n`);

      alert(`📧 Group invitation simulated & sent successfully to ${emailLower}!`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteMessage('');
    } catch (err) {
      console.error("Failed to compile invitation draft:", err);
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
      // Trigger notification event for Member Removed
      await triggerNotificationEvents('MEMBER_REMOVED', {
        targetUserId,
        groupName: selectedGroupData.name
      });

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
      // Gather active member IDs to notify
      const membersToNotify = groupMembers.map(m => m.userId);

      // Trigger disbanded notification events
      await triggerNotificationEvents('GROUP_DELETED', {
        groupName: selectedGroupData.name,
        members: membersToNotify
      });

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

  // Filter and sort groups list according to Category, Query, and sorting preference
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
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return b.createdAt - a.createdAt;
    } else if (sortBy === 'oldest') {
      return a.createdAt - b.createdAt;
    } else if (sortBy === 'most-active') {
      return (b.membersCount * 1000 + b.updatedAt) - (a.membersCount * 1000 + a.updatedAt);
    }
    return 0;
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

        {/* Dynamic Sort Option Control */}
        <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold select-none">
          <span className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Sort By
          </span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent outline-none border-none text-slate-800 font-extrabold cursor-pointer text-[10px]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most-active">Most Active</option>
          </select>
        </div>

        {/* Dynamic Groups list feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/30">
          {filteredGroups.length === 0 ? (
            activeTab === 'discover' ? (
              <div className="text-center py-12 px-4 select-none">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="text-slate-700 text-xs font-black">No Groups Available Yet. Be the first to create a group!</p>
                <p className="text-slate-450 text-[10px] mt-1.5">Tap the &quot;Create&quot; button above and establish a new study subject instantly.</p>
              </div>
            ) : (
              <div className="text-center py-12 px-4 select-none">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-xs font-bold">No groups found</p>
                <p className="text-slate-400 text-[10px] mt-1">Try checking another subject category or query.</p>
              </div>
            )
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
                
                <button
                  onClick={() => setShowInviteModal(true)}
                  title="Invite friends to join"
                  className="p-2 text-indigo-600 hover:bg-slate-100 rounded-lg border border-indigo-100 transition-colors flex items-center gap-1.5 text-[10px] font-bold"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Invite</span>
                </button>

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
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 flex flex-col gap-6" id="dashboard-tab-panel">
            {/* Real-time Success Toast Banner */}
            {successToast && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🎉</span>
                  <span>{successToast}</span>
                </div>
                <button onClick={() => setSuccessToast(null)} className="text-emerald-500 hover:text-emerald-700">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {activeTab === 'my-groups' ? (
              <div className="space-y-6">
                {/* Dashboard Welcome Header Card */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden select-none">
                  <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10">
                    <Users className="w-48 h-48" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black flex items-center gap-2">
                        Welcome to My Hub, {currentDisplayName}! 👋
                      </h2>
                      <p className="text-[11px] text-slate-300 mt-1 max-w-xl">
                        Monitor active study registrations, invite colleagues, review admissions request queues, or launch collaboration sessions.
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/10 self-start md:self-auto">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">Learning Credits</span>
                      <span className="text-xl font-extrabold block text-amber-300">{userProfile.credits} Credits</span>
                    </div>
                  </div>
                </div>

                {/* 1. Invitations Received Section */}
                {invitations.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-indigo-600">
                      <Mail className="w-4 h-4" />
                      Received Study Invitations ({invitations.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {invitations.map((invite) => (
                        <div key={invite.id} className="p-4 bg-amber-50/70 border border-amber-100 rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded-full">Invitation</span>
                              <span className="text-[9px] font-semibold text-slate-400">{new Date(invite.timestamp).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-black text-slate-900 text-xs">{invite.groupName}</h4>
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{invite.groupDescription}</p>
                            <div className="mt-2.5 p-2 bg-white rounded-xl border border-amber-50">
                              <p className="text-[10px] text-slate-600 italic">
                                <strong className="font-bold text-slate-800">{invite.senderName}</strong>: &quot;{invite.message}&quot;
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleAcceptInvitation(invite)}
                              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineInvitation(invite.id)}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Received Pending Admissions (Owner/Admin View) */}
                {receivedPendingRequests.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-rose-500">
                      <UserPlus className="w-4 h-4" />
                      Pending Admissions Management ({receivedPendingRequests.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {receivedPendingRequests.map((req) => (
                        <div key={`${req.groupId}_${req.userId}`} className="p-4 bg-rose-50/40 border border-rose-100 rounded-3xl flex flex-col justify-between shadow-sm">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black rounded-full block self-start">Request to Join</span>
                              <span className="text-[9px] font-extrabold text-indigo-600">{req.groupName}</span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-2">
                              <img src={req.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256'} alt={req.displayName} className="w-6.5 h-6.5 rounded-full object-cover border border-indigo-100" />
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs">{req.displayName}</h4>
                                <span className="text-[9px] text-slate-400">Applied {new Date(req.requestedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4 select-none">
                            <button
                              onClick={async () => {
                                // Approving a request from My Hub
                                try {
                                  await setDoc(doc(db, 'groups', req.groupId, 'members', req.userId), {
                                    userId: req.userId,
                                    displayName: req.displayName,
                                    photoURL: req.photoURL || '',
                                    role: 'member',
                                    joinedAt: Date.now()
                                  });
                                  const gRef = doc(db, 'groups', req.groupId);
                                  const snap = await getDoc(gRef);
                                  if (snap.exists()) {
                                    await updateDoc(gRef, {
                                      membersCount: (snap.data().membersCount || 0) + 1,
                                      updatedAt: Date.now()
                                    });
                                  }
                                  await deleteDoc(doc(db, 'groups', req.groupId, 'join_requests', req.userId));
                                  await sendTargetNotification(req.userId, `Join Request Approved! 🎉`, `Your join request for "${req.groupName}" has been accepted.`);
                                  setReceivedPendingRequests(prev => prev.filter(p => !(p.groupId === req.groupId && p.userId === req.userId)));
                                  alert(`Scholar Approved successfully!`);
                                } catch (e) {
                                  console.error("Admissions review failed:", e);
                                }
                              }}
                              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                            >
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await deleteDoc(doc(db, 'groups', req.groupId, 'join_requests', req.userId));
                                  await sendTargetNotification(req.userId, `Request Status Update`, `Your request to join "${req.groupName}" was declined.`);
                                  setReceivedPendingRequests(prev => prev.filter(p => !(p.groupId === req.groupId && p.userId === req.userId)));
                                  alert(`Application declined.`);
                                } catch (e) {
                                  console.error("Admissions review failed:", e);
                                }
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Groups Created by User */}
                <div className="space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-500">
                    <Crown className="w-4 h-4 text-amber-500" />
                    My Created Study Groups ({groups.filter(g => g.ownerId === currentUid).length})
                  </h3>
                  {groups.filter(g => g.ownerId === currentUid).length === 0 ? (
                    <div className="p-6 bg-white border border-slate-100 rounded-3xl text-center select-none">
                      <p className="text-[11px] text-slate-500 font-bold">You haven&apos;t generated any study groups yet.</p>
                      <button onClick={() => setShowCreateModal(true)} className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-150 text-indigo-600 rounded-xl text-[10px] font-black transition-all">
                        Create Group
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {groups.filter(g => g.ownerId === currentUid).map((group) => (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className="p-4 bg-white border border-slate-100 hover:border-indigo-200 rounded-3xl flex gap-3 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                        >
                          <img src={group.photoURL || PRESET_AVATARS[0]} alt={group.name} className="w-12 h-12 rounded-2xl object-cover shadow-inner bg-slate-100" />
                          <div className="flex-1 min-w-0">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[8.5px] font-extrabold uppercase tracking-wide">{group.category}</span>
                            <h4 className="font-extrabold text-slate-900 text-xs mt-1.5 truncate group-hover:text-indigo-600 transition-colors">{group.name}</h4>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{group.description}</p>
                            <span className="text-[9px] font-bold text-slate-400 mt-2 block flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {group.membersCount} active scholars
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Groups Joined by User */}
                <div className="space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    Joined Study Groups ({groups.filter(g => myGroupIds.includes(g.id) && g.ownerId !== currentUid).length})
                  </h3>
                  {groups.filter(g => myGroupIds.includes(g.id) && g.ownerId !== currentUid).length === 0 ? (
                    <div className="p-6 bg-white border border-slate-100 rounded-3xl text-center select-none">
                      <p className="text-[11px] text-slate-500 font-bold">You aren&apos;t a member of any other study groups yet.</p>
                      <button onClick={() => setActiveTab('discover')} className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-155 text-indigo-600 rounded-xl text-[10px] font-black transition-all">
                        Discover Subjects
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {groups.filter(g => myGroupIds.includes(g.id) && g.ownerId !== currentUid).map((group) => (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className="p-4 bg-white border border-slate-100 hover:border-indigo-200 rounded-3xl flex gap-3 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                        >
                          <img src={group.photoURL || PRESET_AVATARS[0]} alt={group.name} className="w-12 h-12 rounded-2xl object-cover shadow-inner bg-slate-100" />
                          <div className="flex-1 min-w-0">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[8.5px] font-extrabold uppercase tracking-wide">{group.category}</span>
                            <h4 className="font-extrabold text-slate-900 text-xs mt-1.5 truncate group-hover:text-indigo-600 transition-colors">{group.name}</h4>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{group.description}</p>
                            <span className="text-[9px] font-bold text-slate-400 mt-2 block flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-400" />
                              {group.membersCount} active scholars
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Pending Applications Sent */}
                {Object.keys(mySentRequests).length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      Applications Sent Waiting Approval
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {groups.filter(g => mySentRequests[g.id]).map((group) => (
                        <div key={group.id} className="p-3 bg-indigo-50/20 border border-indigo-100 rounded-2xl flex items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate">{group.name}</h4>
                            <span className="text-[9px] font-medium text-indigo-600 block mt-0.5">Application Pending</span>
                          </div>
                          <button
                            onClick={() => handleCancelJoinRequest(group.id)}
                            className="p-1 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-extrabold text-slate-500 hover:text-slate-800 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Discover Header Card */}
                <div className="p-6 bg-slate-900 rounded-3xl text-white select-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-10">
                    <Sparkles className="w-48 h-48" />
                  </div>
                  <h2 className="text-base font-black flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" />
                    Discover Subject Groups
                  </h2>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-lg">
                    Browse dynamic collaborative groups created by educators and students. Exchange lessons notes, chat together, and post structured materials.
                  </p>
                </div>

                {/* Discover Items Grid display */}
                {groups.filter(g => !myGroupIds.includes(g.id)).length === 0 ? (
                  <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl select-none p-6">
                    <span className="text-4xl block mb-2">🔍</span>
                    <h3 className="font-extrabold text-slate-800 text-sm">No Groups Available Yet. Be the first to create a group!</h3>
                    <p className="text-slate-400 text-xs mt-1.5 max-w-sm mx-auto">
                      There are currently no public learning communities active on the board. Dedicate 10 credits to configure one instantly.
                    </p>
                    <button onClick={() => setShowCreateModal(true)} className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95">
                      Create Group
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.filter(g => !myGroupIds.includes(g.id)).map((group) => {
                      const hasApplied = mySentRequests[group.id];

                      return (
                        <div key={group.id} className="p-4 bg-white border border-slate-100 hover:border-indigo-150 rounded-3xl flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow group relative overflow-hidden">
                          <div>
                            <div className="relative h-28 rounded-2xl overflow-hidden mb-3.5 shadow-inner">
                              <img src={group.photoURL || PRESET_AVATARS[0]} alt={group.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-slate-900/75 backdrop-blur-md rounded-full text-white text-[8.5px] font-black tracking-wide uppercase">
                                {group.category}
                              </div>
                            </div>
                            <h4 className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{group.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{group.description}</p>
                            <span className="text-[9.5px] font-bold text-slate-400 mt-3 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {group.membersCount} educators / students
                            </span>
                          </div>
                          <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between select-none">
                            <span className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider">
                              Owner: {group.ownerName}
                            </span>
                            {hasApplied ? (
                              <button
                                onClick={() => handleCancelJoinRequest(group.id)}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl transition-colors hover:bg-indigo-100"
                              >
                                Request Pending
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSendJoinRequest(group.id)}
                                className="px-3 py-1.5 bg-slate-900 text-white hover:bg-indigo-600 text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
                              >
                                Request to Join
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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

                {/* Preset Avatars picker & File upload */}
                <div className="space-y-3">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block mb-1">Local Image File Upload</span>
                      <label className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer text-center block shadow-sm border border-slate-700">
                        Upload Picture
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1024 * 1024 * 2) {
                                setCreateError("Cover photo size must be under 2MB.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setNewGroupAvatar(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block mb-1">Or Paste Custom Image URL</span>
                      <input
                        type="text"
                        placeholder="https://example.com/image.png"
                        value={newGroupAvatar.startsWith('data:') ? '' : newGroupAvatar}
                        onChange={(e) => setNewGroupAvatar(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
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

      {/* MODAL 3: Invite Friends Dialog */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md relative z-10"
            >
              <button 
                onClick={() => setShowInviteModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Mail className="text-indigo-600 w-5 h-5" />
                  Invite Friend to Study Group
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Sends an invitation instantly via email notification</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Friend&apos;s Email Address</label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block">Personal Message (Optional)</label>
                  <textarea
                    rows={4}
                    placeholder={`Hey! Join our advanced study group "${selectedGroupData?.name || 'Study Group'}" on SJ Tutor AI!`}
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleInviteFriend(inviteEmail, inviteMessage)}
                    disabled={!inviteEmail.trim()}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
                  >
                    Send Invitation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
