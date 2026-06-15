import React, { useState, useEffect, useRef } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { UserProfile } from "../types";
import { saveProfileToFirestore } from "../utils/firebaseUtils";
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  ClipboardList, 
  Megaphone, 
  LogOut, 
  ArrowLeft, 
  Globe, 
  Lock, 
  UserPlus, 
  User, 
  Check, 
  Copy, 
  PlusCircle, 
  AlertCircle,
  Sparkles,
  Send,
  Paperclip,
  Star,
  Share2,
  CheckCheck,
  Pin,
  Trash2,
  Reply,
  FileText,
  Volume2,
  VolumeX,
  X,
  ShieldAlert,
  AtSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

interface GroupsDashboardProps {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  currentTabOverride?: string;
  onSelectGroup?: (groupId: string) => void;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerName: string;
  isPublic: boolean;
  memberCount: number;
  createdAt: number;
  updatedAt: number;
  photoURL?: string;
  announcementOnly?: boolean; // Only admins can message
  typingUsers?: Record<string, { name: string; timestamp: number }>;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  inviteeEmail: string;
  senderId: string;
  senderName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: number;
}

export interface GroupRequest {
  id: string;
  groupId: string;
  groupName: string;
  groupOwnerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

export interface GroupAnnouncement {
  id: string;
  groupId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  mediaUrl?: string;
  mediaType?: "image" | "pdf" | "link" | "material";
  mediaName?: string;
  createdAt: number;
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
  reactions?: Record<string, string[]>; // emoji -> array of UIDs
  isPinned?: boolean;
  starredBy?: string[]; // array of UIDs who starred
  readBy?: string[]; // array of UIDs who read
}

export const GroupsDashboard: React.FC<GroupsDashboardProps> = ({ 
  userProfile, 
  setUserProfile,
  currentTabOverride
}) => {
  const user = auth.currentUser;
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<string>("my_hub");
  
  // Real-time collections state
  const [groups, setGroups] = useState<Group[]>([]);
  const [invitedGroups, setInvitedGroups] = useState<GroupInvitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupRequest[]>([]);
  const [memberships, setMemberships] = useState<Set<string>>(new Set()); // Set of groupIds where user is a member
  
  // Local Search & Form state
  const [searchQuery, setSearchQuery] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupPublic, setNewGroupPublic] = useState(true);
  const [newGroupPhoto, setNewGroupPhoto] = useState("https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=60");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Selected active Group view Details
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [activeGroupMembers, setActiveGroupMembers] = useState<{userId: string; name: string; role: string; joinedAt: number}[]>([]);
  
  // Group details sidebar collapsible toggle
  const [showGroupSidebar, setShowGroupSidebar] = useState(false);

  // General modals/notifs
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Direct Join by ID Quick Action box
  const [directGroupId, setDirectGroupId] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // Group Notification Toast Alerts
  const [toasts, setToasts] = useState<{ id: string; text: string; type: "message" | "info" | "file" | "join" }[]>([]);

  // Mutelist
  const [mutedGroups, setMutedGroups] = useState<Set<string>>(new Set());

  // Chat parameters
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [replyTarget, setReplyTarget] = useState<GroupMessage | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<GroupMessage | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);

  // Drag and Drop files
  const [isDragging, setIsDragging] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; dataUrl: string; type: "image" | "pdf" | "link" | "material" } | null>(null);

  // Mentions dropdown
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch muted list from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sjtutor_muted_groups");
      if (saved) {
        setMutedGroups(new Set(JSON.parse(saved)));
      }
    } catch (e) {
      console.warn("Muted fail read", e);
    }
  }, []);

  // Sync tab override if passed down (e.g. from mobile navigation dropdown clicks)
  useEffect(() => {
    if (currentTabOverride) {
      setActiveTab(currentTabOverride);
      setActiveGroupId(null); // Go back from detail view
    }
  }, [currentTabOverride]);

  // Toast adder helper
  const addToast = (text: string, type: "message" | "info" | "file" | "join", groupIdForMuteCheck?: string) => {
    if (groupIdForMuteCheck && mutedGroups.has(groupIdForMuteCheck)) {
      return; // Suppress notifications for muted study group
    }
    const id = "toast_" + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // 1. Fetch user memberships, groups list, invitations, join requests, announcements
  useEffect(() => {
    if (!user) return;

    // A. Listen to all groups
    const unsubscribeGroups = onSnapshot(collection(db, "groups"), (snapshot) => {
      const groupsList: Group[] = [];
      snapshot.forEach((docSnap) => {
        groupsList.push(docSnap.data() as Group);
      });
      setGroups(groupsList);
    });

    // B. Manage user memberships
    const unsubscribeMemberships = onSnapshot(collection(db, "groups"), async (snapshot) => {
      const joined: string[] = [];
      for (const groupDoc of snapshot.docs) {
        const group = groupDoc.data() as Group;
        try {
          const memberSnap = await getDoc(doc(db, "groups", group.id, "members", user.uid));
          if (memberSnap.exists() || group.ownerId === user.uid) {
            joined.push(group.id);
          }
        } catch {
          // safe boundary
        }
      }
      setMemberships(new Set(joined));
    });

    // C. Listen to invitations sent to user's email
    const emailToQuery = user.email || "";
    const invitationQuery = query(
      collection(db, "group_invitations"),
      where("inviteeEmail", "==", emailToQuery.toLowerCase())
    );
    const unsubscribeInvitations = onSnapshot(invitationQuery, (snapshot) => {
      const inviteList: GroupInvitation[] = [];
      snapshot.forEach((docSnap) => {
        inviteList.push(docSnap.data() as GroupInvitation);
      });
      setInvitedGroups(inviteList);
    });

    // D. Listen to user requests or requests received as group admin
    const requestQuery = query(
      collection(db, "group_requests"),
      where("groupOwnerId", "==", user.uid)
    );
    const unsubscribeRequests = onSnapshot(requestQuery, (snapshot) => {
      const requestsList: GroupRequest[] = [];
      snapshot.forEach((docSnap) => {
        requestsList.push(docSnap.data() as GroupRequest);
      });
      setJoinRequests(requestsList);
    });

    return () => {
      unsubscribeGroups();
      unsubscribeMemberships();
      unsubscribeInvitations();
      unsubscribeRequests();
    };
  }, [user]);

  // Handle active group snapshot (member list, announcements, and messages)
  useEffect(() => {
    if (!activeGroupId) {
      setActiveGroup(null);
      setActiveGroupMembers([]);
      setMessages([]);
      return;
    }

    const gDoc = groups.find(g => g.id === activeGroupId);
    if (gDoc) {
      setActiveGroup(gDoc);
    }

    // Subscribe to group members subcollection
    const mCol = collection(db, "groups", activeGroupId, "members");
    const unsubMembers = onSnapshot(mCol, (snapshot) => {
      const membersList: any[] = [];
      snapshot.forEach((memberDoc) => {
        membersList.push({
          userId: memberDoc.id,
          ...memberDoc.data()
        });
      });
      setActiveGroupMembers(membersList);
    });

    // Subscribe to Group Messages subcollection
    const msgCol = query(collection(db, "groups", activeGroupId, "messages"), orderBy("createdAt", "asc"));
    const unsubMessages = onSnapshot(msgCol, (snapshot) => {
      const msgs: GroupMessage[] = [];
      snapshot.forEach((mDoc) => {
        msgs.push(mDoc.data() as GroupMessage);
      });
      setMessages(msgs);
      
      // Auto mark as read
      if (msgs.length > 0) {
        markMessagesAsRead(msgs);
      }
    });

    return () => {
      unsubMembers();
      unsubMessages();
    };
  }, [activeGroupId, groups]);

  // Auto Scroll Chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeGroupId]);

  // Handle active group typing simulation or real indicators
  const updateTypingStatusInFirebase = async (isTyping: boolean) => {
    if (!user || !activeGroupId) return;
    try {
      const grpRef = doc(db, "groups", activeGroupId);
      await updateDoc(grpRef, {
        [`typingUsers.${user.uid}`]: isTyping ? {
          name: userProfile.displayName || user.email || "Student",
          timestamp: Date.now()
        } : null
      });
    } catch {
      // ignore
    }
  };

  // Keyboard handler triggers mentions or typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatInput(val);

    // Typing activity trigger
    updateTypingStatusInFirebase(true);
    const timeout = setTimeout(() => {
      updateTypingStatusInFirebase(false);
    }, 4000);

    // Mention trigger detection
    const lastCharIndex = val.lastIndexOf("@");
    if (lastCharIndex !== -1 && lastCharIndex >= val.length - 20) {
      const queryStr = val.substring(lastCharIndex + 1);
      if (!queryStr.includes(" ")) {
        setMentionFilter(queryStr.toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    return () => clearTimeout(timeout);
  };

  // Apply Mention helper
  const handleMentionSelect = (memberName: string) => {
    const lastCharIndex = chatInput.lastIndexOf("@");
    if (lastCharIndex !== -1) {
      const prefix = chatInput.substring(0, lastCharIndex);
      const cleanedName = memberName.replace(/\s+/g, "");
      setChatInput(`${prefix}@${cleanedName} `);
    }
    setShowMentions(false);
  };

  // Mark all incoming messages as read by our user
  const markMessagesAsRead = async (msgs: GroupMessage[]) => {
    if (!user || !activeGroupId) return;
    const unreadOnes = msgs.filter((m) => {
      const readList = m.readBy || [];
      return m.senderId !== user.uid && !readList.includes(user.uid);
    });

    for (const msg of unreadOnes) {
      try {
        const msgRef = doc(db, "groups", activeGroupId, "messages", msg.id);
        await updateDoc(msgRef, {
          readBy: [...(msg.readBy || []), user.uid]
        });
      } catch {
        // safe pass
      }
    }
  };

  // Toggle Mute Group
  const toggleMuteGroup = (groupId: string) => {
    const newMuted = new Set(mutedGroups);
    if (newMuted.has(groupId)) {
      newMuted.delete(groupId);
      addToast("🔊 Unmuted Group Notifications", "info");
    } else {
      newMuted.add(groupId);
      addToast("🔕 Muted Group Notifications", "info");
    }
    setMutedGroups(newMuted);
    localStorage.setItem("sjtutor_muted_groups", JSON.stringify(Array.from(newMuted)));
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFileAttachment(file);
    }
  };

  // File manual click handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileAttachment(e.target.files[0]);
    }
  };

  // Feed file reader
  const processFileAttachment = (file: File) => {
    const isImg = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        dataUrl: reader.result as string,
        type: isImg ? "image" : "pdf"
      });
      addToast(`📎 File attached: ${file.name}`, "info");
    };
    reader.readAsDataURL(file);
  };

  // Create group action
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreateError(null);

    if (!newGroupName.trim()) {
      setCreateError("Group name is required.");
      return;
    }

    if (userProfile.credits < 10) {
      setCreateError("❌ Insufficient credits! Making a new group costs 10 credits.");
      return;
    }

    setIsCreating(true);
    try {
      const newId = "grp_" + Math.random().toString(36).substr(2, 9);
      const groupData: Group = {
        id: newId,
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        ownerId: user.uid,
        ownerName: userProfile.displayName || user.email || "Anonymous",
        isPublic: newGroupPublic,
        memberCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        photoURL: newGroupPhoto
      };

      // 1. Deduct 10 credits
      const nextCredits = Math.max(0, userProfile.credits - 10);
      setUserProfile(prev => ({ ...prev, credits: nextCredits }));
      await saveProfileToFirestore(user.uid, { credits: nextCredits });

      // 2. Set doc inside /groups/{newId}
      await setDoc(doc(db, "groups", newId), groupData);

      // 3. Add owner to membership subcollection
      await setDoc(doc(db, "groups", newId, "members", user.uid), {
        userId: user.uid,
        name: userProfile.displayName || user.email || "Owner",
        role: "owner",
        joinedAt: Date.now()
      });

      // Show success alert
      addToast("✅ Group Created Successfully!", "join");

      // Show confetti!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Clear forms
      setNewGroupName("");
      setNewGroupDesc("");
      setNewGroupPublic(true);

      // Redirect instantly to the new group detail screen & open the chat!
      setActiveGroupId(newId);
      setMemberships(prev => {
        const next = new Set(prev);
        next.add(newId);
        return next;
      });

    } catch (err: any) {
      setCreateError("Failed to create group: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Direct Join Group using ID Code / Link Quick Action
  const handleJoinById = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);

    let targetId = directGroupId.trim();
    if (!targetId) {
      setJoinError("Please enter a Group ID or Invite Link.");
      return;
    }

    // Parse if they paste full link like "sjtutorai.com/groups/invite/xyz"
    if (targetId.includes("/groups/invite/")) {
      const parts = targetId.split("/groups/invite/");
      targetId = parts[1] || targetId;
    }

    try {
      const groupRef = doc(db, "groups", targetId);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        setJoinError("No group found with this ID.");
        return;
      }

      const grp = groupSnap.data() as Group;
      if (memberships.has(targetId) || grp.ownerId === user?.uid) {
        setJoinSuccess("You are already a member of this group!");
        setDirectGroupId("");
        return;
      }

      if (grp.isPublic) {
        await joinGroupInstantly(grp);
        setJoinSuccess(`Successfully joined group: ${grp.name}!`);
      } else {
        await requestToJoinGroup(grp);
        setJoinSuccess(`Join request submitted to group ${grp.name}.`);
      }
      setDirectGroupId("");
    } catch (err: any) {
      setJoinError(err.message || "Failed to join group.");
    }
  };

  // Join instantly helper
  const joinGroupInstantly = async (group: Group) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "groups", group.id, "members", user.uid), {
        userId: user.uid,
        name: userProfile.displayName || user.email || "Member",
        role: "member",
        joinedAt: Date.now()
      });

      await updateDoc(doc(db, "groups", group.id), {
        memberCount: (group.memberCount || 1) + 1,
        updatedAt: Date.now()
      });

      // System notification
      await sendSystemMessage(group.id, `👋 ${userProfile.displayName || user.email || "New student"} joined the study group!`);

      addToast("🎉 Joined Group Successfully!", "join", group.id);

      setMemberships(prev => {
        const next = new Set(prev);
        next.add(group.id);
        return next;
      });

      confetti({
        particleCount: 50,
        spread: 30,
        colors: ["#3b82f6", "#10b981"]
      });

    } catch {
      throw new Error("Unable to save membership.");
    }
  };

  // Request to join private group private helper
  const requestToJoinGroup = async (group: Group) => {
    if (!user) return;
    try {
      const rqId = `rq_${user.uid}_${group.id}`;
      const rqDoc: GroupRequest = {
        id: rqId,
        groupId: group.id,
        groupName: group.name,
        groupOwnerId: group.ownerId,
        userId: user.uid,
        userName: userProfile.displayName || user.email || "Student",
        userEmail: user.email || "",
        status: "pending",
        createdAt: Date.now()
      };

      await setDoc(doc(db, "group_requests", rqId), rqDoc);
      addToast("🕒 Access Request Submitted", "info");
    } catch {
      throw new Error("Unable to submit request.");
    }
  };

  // Process Invite Friend
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError("Please enter an email address.");
      return;
    }

    if (!activeGroupId || !activeGroup) {
      setInviteError("No active group selected.");
      return;
    }

    try {
      const inviteId = `inv_${Math.random().toString(36).substr(2, 9)}`;
      const invitation: GroupInvitation = {
        id: inviteId,
        groupId: activeGroupId,
        groupName: activeGroup.name,
        inviteeEmail: email,
        senderId: user?.uid || "",
        senderName: userProfile.displayName || user?.email || "Academic Friend",
        status: "pending",
        createdAt: Date.now()
      };

      await setDoc(doc(db, "group_invitations", inviteId), invitation);
      setInviteSuccess(`Invitation successfully sent to ${email}!`);
      setInviteEmail("");
    } catch (err: any) {
      setInviteError("Error sending invitation: " + err.message);
    }
  };

  // Accept group invitation
  const handleAcceptInvite = async (invite: GroupInvitation) => {
    if (!user) return;
    try {
      const groupRef = doc(db, "groups", invite.groupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const group = groupSnap.data() as Group;
        await joinGroupInstantly(group);
      }

      await deleteDoc(doc(db, "group_invitations", invite.id));
      setInvitedGroups(prev => prev.filter(inv => inv.id !== invite.id));
    } catch (err) {
      console.error(err);
    }
  };

  // Decline group invitation
  const handleDeclineInvite = async (invite: GroupInvitation) => {
    try {
      await deleteDoc(doc(db, "group_invitations", invite.id));
      setInvitedGroups(prev => prev.filter(inv => inv.id !== invite.id));
    } catch (err) {
      console.error(err);
    }
  };

  // Rule admin request approve
  const handleApproveRequest = async (rq: GroupRequest) => {
    try {
      const groupRef = doc(db, "groups", rq.groupId);
      const groupSnap = await getDoc(groupRef);

      if (groupSnap.exists()) {
        const group = groupSnap.data() as Group;
        
        await setDoc(doc(db, "groups", rq.groupId, "members", rq.userId), {
          userId: rq.userId,
          name: rq.userName || rq.userEmail || "Approved Student",
          role: "member",
          joinedAt: Date.now()
        });

        await updateDoc(groupRef, {
          memberCount: (group.memberCount || 1) + 1,
          updatedAt: Date.now()
        });

        await sendSystemMessage(rq.groupId, `🎉 Admin approved join request for ${rq.userName}!`);
      }

      await deleteDoc(doc(db, "group_requests", rq.id));
      setJoinRequests(prev => prev.filter(req => req.id !== rq.id));
      confetti({ particleCount: 40 });
    } catch (err) {
      console.error(err);
    }
  };

  // Reject join request
  const handleRejectRequest = async (rq: GroupRequest) => {
    try {
      await deleteDoc(doc(db, "group_requests", rq.id));
      setJoinRequests(prev => prev.filter(req => req.id !== rq.id));
    } catch (err) {
      console.error(err);
    }
  };

  // System status feedback sender
  const sendSystemMessage = async (groupId: string, text: string) => {
    try {
      const msgId = "sys_" + Math.random().toString(36).substr(2, 9);
      const sysMsg: GroupMessage = {
        id: msgId,
        senderId: "system",
        senderName: "🔔 SJ GROUP ASSISTANT",
        text,
        createdAt: Date.now()
      };
      await setDoc(doc(db, "groups", groupId, "messages", msgId), sysMsg);
    } catch {
      // safe bypass
    }
  };

  // Live real-time active typing list filters
  const getTypingText = () => {
    if (!activeGroup || !activeGroup.typingUsers || !user) return "";
    const activeTypists = Object.entries(activeGroup.typingUsers)
      .filter(([id, data]) => id !== user.uid && data && Date.now() - data.timestamp < 3500)
      .map(([, data]) => data.name);

    if (activeTypists.length === 0) return "";
    if (activeTypists.length === 1) return `${activeTypists[0]} is typing...`;
    if (activeTypists.length === 2) return `${activeTypists[0]} and ${activeTypists[1]} are typing...`;
    return "Several people are typing...";
  };

  // Send message action inside Group Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeGroupId || !activeGroup) return;

    // Check announcement mode blocks
    const myRole = getMyRole();
    const canMessage = !activeGroup.announcementOnly || myRole === "owner" || myRole === "admin";
    if (!canMessage) {
      alert("Only group administrators can send messages. Announcement Mode is currently enabled.");
      return;
    }

    if (!chatInput.trim() && !attachedFile) return;

    try {
      const msgId = "msg_" + Math.random().toString(36).substr(2, 9);
      const textToSend = chatInput.trim();

      const messageObj: GroupMessage = {
        id: msgId,
        senderId: user.uid,
        senderName: userProfile.displayName || user.email || "Student",
        text: textToSend,
        createdAt: Date.now(),
        readBy: [user.uid] // Starts with sender
      };

      // Add reply parameters if set
      if (replyTarget) {
        messageObj.replyToId = replyTarget.id;
        messageObj.replyToText = replyTarget.text;
        messageObj.replyToSender = replyTarget.senderName;
      }

      // Add file payload if attached
      if (attachedFile) {
        messageObj.mediaUrl = attachedFile.dataUrl;
        messageObj.mediaType = attachedFile.type;
        messageObj.mediaName = attachedFile.name;
        
        // Custom system announcement log
        await sendSystemMessage(activeGroupId, `📎 ${userProfile.displayName || "A member"} shared file: "${attachedFile.name}"`);
      }

      await setDoc(doc(db, "groups", activeGroupId, "messages", msgId), messageObj);

      // Reset
      setChatInput("");
      setReplyTarget(null);
      setAttachedFile(null);
      updateTypingStatusInFirebase(false);

    } catch (e: any) {
      alert("Error sending message: " + e.message);
    }
  };

  // Forward custom message
  const handleForwardMessage = async (targetGrpId: string) => {
    if (!forwardingMessage || !user) return;
    try {
      const msgId = "fwd_" + Math.random().toString(36).substr(2, 9);
      const fwdObj: GroupMessage = {
        id: msgId,
        senderId: user.uid,
        senderName: userProfile.displayName || user.email || "Student",
        text: `[Forwarded] ${forwardingMessage.text}`,
        createdAt: Date.now(),
        readBy: [user.uid]
      };

      if (forwardingMessage.mediaUrl) {
        fwdObj.mediaUrl = forwardingMessage.mediaUrl;
        fwdObj.mediaType = forwardingMessage.mediaType;
        fwdObj.mediaName = forwardingMessage.mediaName;
      }

      await setDoc(doc(db, "groups", targetGrpId, "messages", msgId), fwdObj);
      await sendSystemMessage(targetGrpId, `➡️ ${userProfile.displayName || "Someone"} forwarded a message into this chat!`);

      addToast("✅ Message Forwarded Successfully!", "info");
      setShowForwardModal(false);
      setForwardingMessage(null);
    } catch {
      alert("Forward failed.");
    }
  };

  // Toggle Star message
  const handleToggleStar = async (msg: GroupMessage) => {
    if (!user || !activeGroupId) return;
    const isStarred = msg.starredBy?.includes(user.uid);
    const newStars = isStarred 
      ? (msg.starredBy || []).filter(uid => uid !== user.uid)
      : [...(msg.starredBy || []), user.uid];

    try {
      await updateDoc(doc(db, "groups", activeGroupId, "messages", msg.id), {
        starredBy: newStars
      });
      addToast(isStarred ? "⭐ Message unstarred" : "⭐ Message starred", "info");
    } catch {
      console.error(e);
    }
  };

  // Toggle Pinned message
  const handleTogglePin = async (msg: GroupMessage) => {
    if (!activeGroupId) return;
    const nextPinState = !msg.isPinned;

    try {
      await updateDoc(doc(db, "groups", activeGroupId, "messages", msg.id), {
        isPinned: nextPinState
      });
      
      if (nextPinState) {
        await sendSystemMessage(activeGroupId, `📌 ${userProfile.displayName || "Admin"} pinned a message: "${msg.text.substring(0, 30)}..."`);
        addToast("📌 Message pinned to header", "info");
      } else {
        addToast("📌 Message unpinned", "info");
      }
    } catch {
      console.error(e);
    }
  };

  // Reaction Click handler
  const handleAddReaction = async (msg: GroupMessage, emoji: string) => {
    if (!user || !activeGroupId) return;
    const curReactions = msg.reactions || {};
    const hasReacted = curReactions[emoji]?.includes(user.uid);

    const nextUsers = hasReacted 
      ? curReactions[emoji].filter(uid => uid !== user.uid)
      : [...(curReactions[emoji] || []), user.uid];

    const nextReactionsObj = {
      ...curReactions,
      [emoji]: nextUsers
    };

    try {
      await updateDoc(doc(db, "groups", activeGroupId, "messages", msg.id), {
        reactions: nextReactionsObj
      });
    } catch {
      console.error(e);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeGroupId) return;
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, "groups", activeGroupId, "messages", msgId));
      addToast("🗑️ Message deleted", "info");
    } catch {
      alert("Fail deleting.");
    }
  };

  // Leave active group
  const handleLeaveGroup = async () => {
    if (!user || !activeGroupId || !activeGroup) return;
    if (activeGroup.ownerId === user.uid) {
      alert("As the owner, you cannot leave your own group. Delete the group if needed.");
      return;
    }

    if (!confirm(`Are you sure you want to leave ${activeGroup.name}?`)) return;

    try {
      // Log leave
      await sendSystemMessage(activeGroupId, `🏃 ${userProfile.displayName || "A student"} has exited the group.`);

      await deleteDoc(doc(db, "groups", activeGroupId, "members", user.uid));
      await updateDoc(doc(db, "groups", activeGroupId), {
        memberCount: Math.max(1, (activeGroup.memberCount || 2) - 1),
        updatedAt: Date.now()
      });

      setMemberships(prev => {
        const next = new Set(prev);
        next.delete(activeGroupId);
        return next;
      });

      setActiveGroupId(null);
      addToast("🏠 Left Group successfully.", "info");
    } catch (e: any) {
      alert("Error leaving group: " + e.message);
    }
  };

  // Promoter / demoter role escalations
  const handleUpdateMemberRole = async (targetUserId: string, nextRole: "admin" | "member") => {
    if (!activeGroupId) return;
    try {
      await updateDoc(doc(db, "groups", activeGroupId, "members", targetUserId), {
        role: nextRole
      });
      await sendSystemMessage(activeGroupId, `🛡️ Member status updated: ${activeGroupMembers.find(m => m.userId === targetUserId)?.name || "User"} is now promoted/demoted to: ${nextRole}`);
      addToast("🛡️ Member role updated successfully!", "info");
    } catch {
      alert("Role operation failed.");
    }
  };

  // Remove member from group
  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeGroupId || !activeGroup) return;
    if (!confirm("Are you sure you want to eject this student?")) return;

    try {
      const removedName = activeGroupMembers.find(m => m.userId === targetUserId)?.name || "Student";
      await deleteDoc(doc(db, "groups", activeGroupId, "members", targetUserId));
      
      await updateDoc(doc(db, "groups", activeGroupId), {
        memberCount: Math.max(1, (activeGroup.memberCount || 2) - 1),
        updatedAt: Date.now()
      });

      await sendSystemMessage(activeGroupId, `🚪 Admin removed ${removedName} from this study group.`);
      addToast("🚪 Student removed", "info");
    } catch {
      alert("Remove operation failed.");
    }
  };

  // Delete whole group
  const handleDeleteGroup = async () => {
    if (!activeGroupId || !activeGroup) return;
    if (!confirm("⚠️ CRITICAL: Are you absolutely sure you want to delete this study group? Clean deletes everything forever!")) return;

    try {
      await deleteDoc(doc(db, "groups", activeGroupId));
      setActiveGroupId(null);
      addToast("🗑️ Group deleted successfully.", "info");
    } catch {
      alert("Delete operation failed.");
    }
  };

  // Get current user role in active group
  const getMyRole = (): "owner" | "admin" | "member" | null => {
    if (!user || !activeGroupId) return null;
    if (activeGroup?.ownerId === user.uid) return "owner";
    const record = activeGroupMembers.find(m => m.userId === user.uid);
    return (record?.role as "owner" | "admin" | "member") || null;
  };

  // Filter messages based on search query & star filtration
  const filteredMessages = messages.filter((m) => {
    // Starred filter
    if (showStarredOnly && (!m.starredBy || !m.starredBy.includes(user?.uid || ""))) {
      return false;
    }
    // Search filter
    if (chatSearch.trim()) {
      return (m.text || "").toLowerCase().includes(chatSearch.toLowerCase()) || 
             (m.senderName || "").toLowerCase().includes(chatSearch.toLowerCase());
    }
    return true;
  });

  // Extract shared media files link list
  const getMediaCollection = () => {
    return messages.filter((m) => m.mediaUrl);
  };

  // Filter standard Hub list
  const myHubGroups = groups.filter((g) => memberships.has(g.id) || g.ownerId === user?.uid);
  const discoverGroups = groups.filter((g) => {
    const isMember = memberships.has(g.id) || g.ownerId === user?.uid;
    return g.isPublic && !isMember;
  }).filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="school-study-dashboard" className="space-y-6 relative">
      
      {/* Toast Alert Banner Feeds */}
      <div className="fixed top-24 right-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-3 backdrop-blur-md max-w-sm pointer-events-auto ${
                t.type === "join" 
                  ? "bg-emerald-500/90 text-white border-emerald-400"
                  : t.type === "file"
                  ? "bg-amber-500/90 text-white border-amber-400"
                  : "bg-slate-900/90 text-white border-slate-800"
              }`}
            >
              <BellIcon className="w-4 h-4" />
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side Pane: Tabs selector & Quick utilities */}
        <div className="lg:col-span-1 space-y-5">
          
          {/* Main Navigation box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-3">
              Study Hub Navigation
            </h3>
            <nav className="space-y-1">
              {[
                { id: "my_hub", label: "👥 My Hub", count: myHubGroups.length, icon: Users },
                { id: "discover", label: "🔍 Discover", count: 0, icon: Search },
                { id: "invitations", label: "✉️ Invitations", count: invitedGroups.length, icon: Mail, pulse: true },
                { id: "requests", label: "🕒 Requests", count: joinRequests.length, icon: ClipboardList, bounce: true },
                { id: "create", label: "➕ Create", count: 0, icon: Plus, credit: "10 Cr" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setActiveGroupId(null); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </span>
                  
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                      activeTab === tab.id 
                        ? "bg-white/25 text-white" 
                        : tab.pulse
                        ? "bg-rose-500 text-white animate-pulse"
                        : tab.bounce
                        ? "bg-amber-500 text-white animate-bounce"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      {tab.count}
                    </span>
                  )}

                  {tab.credit && (
                    <span className={`px-1.5 py-0.5 text-[9px] rounded font-black ${
                      activeTab === tab.id ? "bg-white text-primary-600" : "bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400"
                    }`}>
                      {tab.credit}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Access panel (supporting direct ID / Invite link input) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary-500" />
              Quick Join Box
            </h4>
            <p className="text-[10px] text-slate-400">Join instantly using invite link or 9-character code.</p>
            <form onSubmit={handleJoinById} className="space-y-2">
              <input
                type="text"
                placeholder="Paste code or invite URL..."
                value={directGroupId}
                onChange={(e) => setDirectGroupId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-850 dark:text-white placeholder-slate-400"
              />
              {joinError && (
                <p className="text-[10px] text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-1 rounded-lg">
                  {joinError}
                </p>
              )}
              {joinSuccess && (
                <p className="text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-lg">
                  {joinSuccess}
                </p>
              )}
              <button
                type="submit"
                className="w-full py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl hover:opacity-90 transition-opacity"
              >
                Join Study Hub
              </button>
            </form>
          </div>

          {/* User Credits status */}
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-white p-5 rounded-3xl shadow-md text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full transform translate-x-8 -translate-y-8" />
            <p className="text-xs text-amber-100">Credit Balance</p>
            <div className="text-2xl font-black mt-1 flex items-center justify-center gap-1.5">
              <Sparkles className="w-5 h-5 fill-white animate-pulse" />
              {userProfile.credits} Credits
            </div>
            <p className="text-[9px] text-amber-200 mt-1.5">Making custom classrooms costs 10 credits</p>
          </div>

        </div>

        {/* Right Side Contents: Tab segments OR high-fidelity active group workspace */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            
            {/* ACTIVE STUDY GROUP DETAIL BOARD & REAL-TIME CHAT */}
            {activeGroupId && activeGroup ? (
              <motion.div
                key="chat_room"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm min-h-[580px] h-[680px]"
              >
                {/* Chat Column */}
                <div className={`col-span-1 lg:col-span-2 flex flex-col h-full border-r border-slate-100 dark:border-slate-800`}>
                  
                  {/* Chat Top Bar / Header */}
                  <div className="p-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button 
                        onClick={() => { setActiveGroupId(null); setReplyTarget(null); }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                        title="Back to Hub"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      
                      <img 
                        src={activeGroup.photoURL || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=60"} 
                        alt="Group Avatar" 
                        onClick={() => setShowGroupSidebar(!showGroupSidebar)}
                        className="w-10 h-10 rounded-2xl object-cover cursor-pointer border border-slate-200 dark:border-slate-750 flex-shrink-0"
                      />

                      <div className="min-w-0">
                        <h3 
                          onClick={() => setShowGroupSidebar(!showGroupSidebar)}
                          className="font-black text-slate-900 dark:text-white text-sm truncate hover:underline cursor-pointer flex items-center gap-1.5"
                        >
                          {activeGroup.name}
                          {mutedGroups.has(activeGroup.id) && (
                            <VolumeX className="w-3 h-3 text-slate-400" />
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate flex items-center gap-1">
                          {getTypingText() ? (
                            <span className="text-emerald-500 font-bold animate-pulse">{getTypingText()}</span>
                          ) : (
                            <span>{activeGroupMembers.length} active members • {activeGroup.isPublic ? "🌐 Public" : "🔒 Private"}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Search messages toggle */}
                      <div className="relative hidden sm:block">
                        <input
                          type="text"
                          placeholder="Search chat..."
                          value={chatSearch}
                          onChange={(e) => setChatSearch(e.target.value)}
                          className="w-28 focus:w-40 px-2 py-1 text-[10px] pl-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg transition-all text-slate-850 dark:text-white"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-450 absolute left-2 top-2" />
                      </div>

                      {/* Filter starred */}
                      <button
                        onClick={() => {
                          setShowStarredOnly(!showStarredOnly);
                          addToast(showStarredOnly ? "Showing all messages" : "🔍 Filtering starred messages", "info");
                        }}
                        className={`p-1.5 rounded-lg border transition-all ${
                          showStarredOnly 
                            ? "bg-amber-500 text-white border-amber-400"
                            : "bg-white dark:bg-slate-950 text-slate-400 hover:text-amber-500 border-slate-200 dark:border-slate-800"
                        }`}
                        title="Star Filters"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {/* Info Panel toggle */}
                      <button
                        onClick={() => setShowGroupSidebar(!showGroupSidebar)}
                        className={`p-1.5 rounded-lg border text-xs font-bold ${
                          showGroupSidebar 
                            ? "bg-primary-500 text-white border-primary-400"
                            : "bg-white dark:bg-slate-950 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800"
                        }`}
                        title="Group Info Panel"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Active Pin announcement Header (if pinned) */}
                  {filteredMessages.some(m => m.isPinned) && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30 px-4 py-2 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold truncate">
                        <Pin className="w-3.5 h-3.5 flex-shrink-0 animate-bounce" />
                        <span className="truncate">
                          📌 Pinned: {filteredMessages.find(m => m.isPinned)?.text || "Files shared"}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          const pinnedMsg = filteredMessages.find(m => m.isPinned);
                          if (pinnedMsg) handleTogglePin(pinnedMsg);
                        }}
                        className="text-[10px] text-amber-600 dark:text-amber-400 underline hover:no-underline font-extrabold"
                      >
                        Unpin
                      </button>
                    </div>
                  )}

                  {/* Group Announcement Mode indicator banner (Non-Admin blockers) */}
                  {activeGroup.announcementOnly && (
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-b border-indigo-100/50 dark:border-indigo-900/20 px-4 py-2 text-[10px] font-bold text-center flex items-center justify-center gap-1.5">
                      <Megaphone className="w-3 h-3" />
                      <span>Only Admins and the Group Owner can send messages in this group.</span>
                    </div>
                  )}

                  {/* Messaging Scroll Thread area */}
                  <div 
                    ref={scrollRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/40 relative ${
                      isDragging ? "bg-primary-50/30 dark:bg-primary-950/10 border-2 border-dashed border-primary-500" : ""
                    }`}
                  >
                    
                    {isDragging && (
                      <div className="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/5 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none text-slate-700 dark:text-white space-y-2">
                        <Paperclip className="w-12 h-12 text-primary-500 animate-bounce" />
                        <p className="font-extrabold text-sm">Drag and drop file to attach!</p>
                        <p className="text-xs text-slate-400">Release payload anywhere inside the chat workspace</p>
                      </div>
                    )}

                    {filteredMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 dark:text-slate-500 py-10 space-y-2">
                        <span className="text-3xl block">💬</span>
                        <p className="text-xs font-bold">No messages here yet.</p>
                        <p className="text-[10px] max-w-xs leading-relaxed">
                          Say Hello! Start a real-time thread, drag in notes, study materials, or query members.
                        </p>
                      </div>
                    ) : (
                      filteredMessages.map((msg) => {
                        const isMe = msg.senderId === user?.uid;
                        const isSys = msg.senderId === "system";
                        const isStarred = msg.starredBy?.includes(user?.uid || "");
                        const isMessagePinned = msg.isPinned;

                        return (
                          <div 
                            key={msg.id}
                            className={`flex flex-col ${
                              isMe ? "items-end" : "items-start"
                            } ${isSys ? "items-center text-center my-3 w-full" : "w-full"}`}
                          >
                            
                            {/* System Status bubble log */}
                            {isSys ? (
                              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-[9px] text-slate-500 dark:text-slate-400 max-w-lg shadow-2xs italic font-medium">
                                {msg.text}
                              </div>
                            ) : (
                              /* Standard user bubble */
                              <div className="max-w-[85%] md:max-w-[70%] space-y-1 group/msg relative">
                                
                                {/* Sender Label */}
                                {!isMe && (
                                  <span className="text-[10px] font-black tracking-wide text-slate-400 dark:text-slate-500 pl-1 block">
                                    {msg.senderName}
                                  </span>
                                )}

                                {/* Pinned Badge indicator */}
                                {isMessagePinned && (
                                  <span className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-250/20 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <Pin className="w-2.5 h-2.5" /> Pinned
                                  </span>
                                )}

                                {/* Message bubble card */}
                                <div 
                                  className={`p-3 rounded-2xl relative ${
                                    isMe 
                                      ? "bg-primary-500 text-white rounded-tr-xs" 
                                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-tl-xs"
                                  } shadow-2xs`}
                                >
                                  
                                  {/* Threaded reply metadata reference context */}
                                  {msg.replyToId && (
                                    <div className={`p-2 rounded-xl text-[10px] mb-2 border-l-4 truncate ${
                                      isMe 
                                        ? "bg-primary-600/50 text-primary-50 border-white/40" 
                                        : "bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-primary-500"
                                    }`}>
                                      <span className="font-bold block text-[9px]">Replying to {msg.replyToSender}</span>
                                      <span className="italic">{msg.replyToText}</span>
                                    </div>
                                  )}

                                  {/* Media Image file payload */}
                                  {msg.mediaUrl && msg.mediaType === "image" && (
                                    <div className="mb-2 rounded-xl overflow-hidden border border-slate-100/10 select-none">
                                      <img 
                                        src={msg.mediaUrl} 
                                        alt={msg.mediaName || "Shared Assets"} 
                                        referrerPolicy="no-referrer"
                                        className="w-full max-h-[160px] object-cover hover:scale-105 transition-transform" 
                                      />
                                      <div className={`p-1.5 text-[9px] flex items-center justify-between font-bold ${isMe ? "bg-primary-600/30" : "bg-slate-50 dark:bg-slate-800/80 text-slate-500"}`}>
                                        <span className="truncate max-w-[120px]">{msg.mediaName || "Photo attachment"}</span>
                                        <a href={msg.mediaUrl} download={msg.mediaName || "img.jpeg"} className="underline">Download</a>
                                      </div>
                                    </div>
                                  )}

                                  {/* Media Document file attachment */}
                                  {msg.mediaUrl && msg.mediaType !== "image" && (
                                    <div className={`p-2.5 rounded-xl mb-2 text-xs flex items-center justify-between gap-3 ${
                                      isMe ? "bg-primary-600/40 text-white" : "bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white border border-slate-200/40"
                                    }`}>
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <FileText className="w-5 h-5 flex-shrink-0" />
                                        <span className="truncate font-black text-[11px] block">{msg.mediaName || "shared_document.pdf"}</span>
                                      </div>
                                      <a href={msg.mediaUrl} download={msg.mediaName || "document.pdf"} className="text-[10px] underline font-bold whitespace-nowrap">
                                        Save File
                                      </a>
                                    </div>
                                  )}

                                  {/* Main Message Text content with @mention highlights */}
                                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                                    {(msg.text || "").split(/(@\w+)/).map((part, idx) => {
                                      if (part.startsWith("@")) {
                                        return <span key={idx} className="font-extrabold text-yellow-300 dark:text-primary-400 bg-yellow-500/10 dark:bg-primary-500/20 px-1 rounded">{part}</span>;
                                      }
                                      return part;
                                    })}
                                  </p>

                                  {/* Bubble margins footer: timestamp & ticks status */}
                                  <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[9px] opacity-75">
                                    {isStarred && (
                                      <Star className="w-2.5 h-2.5 fill-current text-yellow-400" />
                                    )}
                                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isMe && (
                                      <span className="flex items-center">
                                        {(msg.readBy || []).length > 1 ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                                        ) : (
                                          <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {/* Interactive message utility hover buttons ribbon */}
                                  <div className="absolute hidden group-hover/msg:flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md p-1 rounded-xl -top-8 right-2 z-30 transition-all scale-95 duration-100">
                                    {/* Reaction shortcut triggers */}
                                    {["👍", "❤️", "😂", "📌"].map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleAddReaction(msg, emoji)}
                                        className="hover:scale-125 px-1 py-0.5 text-xs transition-transform"
                                      >
                                        {emoji}
                                      </button>
                                    ))}

                                    <button
                                      onClick={() => setReplyTarget(msg)}
                                      className="p-1 text-slate-400 hover:text-primary-500 rounded hover:bg-slate-100 dark:hover:bg-slate-750"
                                      title="Reply"
                                    >
                                      <Reply className="w-3 h-3" />
                                    </button>

                                    <button
                                      onClick={() => handleToggleStar(msg)}
                                      className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-750 ${isStarred ? "text-amber-500" : "text-slate-400"}`}
                                      title="Star"
                                    >
                                      <Star className="w-3 h-3 fill-current" />
                                    </button>

                                    {(getMyRole() === "owner" || getMyRole() === "admin") && (
                                      <button
                                        onClick={() => handleTogglePin(msg)}
                                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-750 ${isMessagePinned ? "text-amber-600" : "text-slate-400"}`}
                                        title="Pin Message"
                                      >
                                        <Pin className="w-3 h-3" />
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        setForwardingMessage(msg);
                                        setShowForwardModal(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-slate-100 dark:hover:bg-slate-750"
                                      title="Forward to..."
                                    >
                                      <Share2 className="w-3 h-3" />
                                    </button>

                                    {(isMe || getMyRole() === "owner" || getMyRole() === "admin") && (
                                      <button
                                        onClick={() => handleDeleteMessage(msg.id)}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-750"
                                        title="Delete Message"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Render Reaction chips below bubble */}
                                  {msg.reactions && Object.keys(msg.reactions).some(k => msg.reactions![k].length > 0) && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {Object.entries(msg.reactions).map(([emoji, list]) => {
                                        if (list.length === 0) return null;
                                        const userReacted = list.includes(user?.uid || "");
                                        return (
                                          <button
                                            key={emoji}
                                            onClick={() => handleAddReaction(msg, emoji)}
                                            className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-2xs border transition-all ${
                                              userReacted 
                                                ? "bg-primary-50 dark:bg-primary-950/40 border-primary-300 text-primary-700"
                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                                            }`}
                                          >
                                            <span>{emoji}</span>
                                            <span>{list.length}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                </div>

                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Active Mention completes popover dropdown panel */}
                  {showMentions && activeGroupMembers.length > 0 && (
                    <div className="mx-4 mb-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl shadow-xl z-40 max-h-40 overflow-y-auto space-y-1">
                      <p className="text-[10px] font-black text-slate-400 px-2 pb-1 border-b">📣 Mention Members</p>
                      {activeGroupMembers
                        .filter(m => m.name.toLowerCase().includes(mentionFilter))
                        .map(m => (
                          <button
                            key={m.userId}
                            onClick={() => handleMentionSelect(m.name)}
                            className="w-full text-left px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1.5"
                          >
                            <AtSign className="w-3 h-3 text-slate-400" />
                            <span>{m.name}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  {/* Active Reply attachment Bar Indicator */}
                  {replyTarget && (
                    <div className="mx-4 mt-2 p-2 px-3 bg-slate-50 dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-350 shadow-2xs">
                      <div className="flex items-center gap-2 truncate">
                        <Reply className="w-4 h-4 text-primary-500 flex-shrink-0 animate-pulse" />
                        <span className="truncate">
                          Replying to <span className="font-bold">{replyTarget.senderName}</span>: &ldquo;{replyTarget.text}&rdquo;
                        </span>
                      </div>
                      <button 
                        onClick={() => setReplyTarget(null)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-750 rounded text-slate-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Drag and Drop selected file metadata review indicator */}
                  {attachedFile && (
                    <div className="mx-4 mt-2 p-2 px-3 bg-amber-500/20 dark:bg-amber-950/20 border border-amber-400/50 rounded-2xl flex items-center justify-between text-xs text-slate-700 dark:text-amber-400 font-bold shadow-2xs">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">Ready: &ldquo;{attachedFile.name}&rdquo;</span>
                      </div>
                      <button 
                        onClick={() => setAttachedFile(null)}
                        className="p-1 hover:bg-amber-500/20 rounded text-slate-450"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Chat Message Input form */}
                  <form 
                    onSubmit={handleSendMessage} 
                    className="p-4 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 relative"
                  >
                    
                    <div className="relative">
                      {/* Paperclip manual file selector */}
                      <label 
                        className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center justify-center cursor-pointer text-slate-500"
                        title="Attach PDF, Study notes, or Quiz media file"
                      >
                        <Paperclip className="w-4 h-4" />
                        <input 
                          type="file" 
                          onChange={handleFileChange} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    <input
                      type="text"
                      placeholder={activeGroup.announcementOnly && getMyRole() === "member" 
                        ? "Only administrators are permitted to post." 
                        : "Type message... Type @ to mention members, or drag & drop files"}
                      value={chatInput}
                      onChange={handleInputChange}
                      disabled={activeGroup.announcementOnly && getMyRole() === "member"}
                      className="flex-1 px-4 py-2.5 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-400 font-medium"
                    />

                    <button
                      type="submit"
                      disabled={(activeGroup.announcementOnly && getMyRole() === "member") || (!chatInput.trim() && !attachedFile)}
                      className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl flex items-center justify-center transition-colors disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                </div>

                {/* Right Collapsible Panel: Group Information Drawer */}
                <div className={`${showGroupSidebar ? "block" : "hidden"} col-span-1 border-t lg:border-t-0 p-4 space-y-6 overflow-y-auto h-full bg-slate-50/70 dark:bg-slate-900/40`}>
                  
                  {/* Info Top */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Group Information</h4>
                    <button 
                      onClick={() => setShowGroupSidebar(false)} 
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Header summary statistics */}
                  <div className="text-center space-y-2">
                    <img 
                      src={activeGroup.photoURL || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=60"} 
                      alt="Group Profile" 
                      className="w-16 h-16 rounded-3xl mx-auto object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                    />
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{activeGroup.name}</h3>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500">Created: {new Date(activeGroup.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    {/* Share invite copy triggers */}
                    <div className="flex justify-center gap-1.5">
                      <button
                        onClick={() => {
                          const link = `sjtutorai.com/groups/invite/${activeGroup.id}`;
                          navigator.clipboard.writeText(link);
                          addToast("📋 Unique Invite link copied!", "info");
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-850 text-slate-600 dark:text-slate-350 text-[10px] font-bold rounded-lg hover:bg-slate-50 flex items-center gap-1"
                        title="Copy Invitation Link"
                      >
                        <Copy className="w-3 h-3" /> Link
                      </button>

                      <button
                        onClick={() => toggleMuteGroup(activeGroup.id)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all ${
                          mutedGroups.has(activeGroup.id)
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white border-transparent"
                            : "bg-white dark:bg-slate-950 border-slate-250 dark:border-slate-850 text-slate-650"
                        }`}
                      >
                        {mutedGroups.has(activeGroup.id) ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />} Mute
                      </button>
                    </div>
                  </div>

                  {/* Group description */}
                  <div className="space-y-1 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-3.5 rounded-2xl">
                    <span className="text-[9px] font-black uppercase text-slate-400">Description</span>
                    <p className="text-xs text-slate-600 dark:text-slate-350 italic leading-relaxed">
                      &ldquo;{activeGroup.description || "No description provided."}&rdquo;
                    </p>
                  </div>

                  {/* GROUP SETTINGS (Owners / Admins exclusive) */}
                  {(getMyRole() === "owner" || getMyRole() === "admin") && (
                    <div className="bg-slate-100/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Group Control Center
                      </h5>
                      
                      {/* Announcement Only Toggle */}
                      <label className="flex items-center justify-between gap-2 text-xs cursor-pointer select-none">
                        <span className="text-slate-700 dark:text-slate-300 font-bold">Only Admins Can Message</span>
                        <input
                          type="checkbox"
                          checked={activeGroup.announcementOnly || false}
                          onChange={async (e) => {
                            try {
                              await updateDoc(doc(db, "groups", activeGroup.id), {
                                announcementOnly: e.target.checked
                              });
                              addToast(e.target.checked ? "📢 Announcement Mode Enabled" : "📢 Anyone can message now", "info");
                            } catch {
                              alert("Config update failed.");
                            }
                          }}
                          className="w-4 h-4 text-indigo-500 rounded border-slate-300 focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                        />
                      </label>

                      {/* Delete option for Owner */}
                      {getMyRole() === "owner" && (
                        <button
                          onClick={handleDeleteGroup}
                          className="w-full mt-2 py-1.5 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          Delete Study Group
                        </button>
                      )}
                    </div>
                  )}

                  {/* Shared Media Section File list */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">📁 shared media & files ({getMediaCollection().length})</h5>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {getMediaCollection().length === 0 ? (
                        <p className="text-[10px] text-slate-450 italic">No notes or images shared yet.</p>
                      ) : (
                        getMediaCollection().map((media) => (
                          <div key={media.id} className="p-2 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between text-[10px] gap-2">
                            <span className="truncate font-black text-slate-700 dark:text-slate-350 max-w-[140px]">{media.mediaName || "asset_file"}</span>
                            <a href={media.mediaUrl} download className="text-primary-500 underline whitespace-nowrap hover:no-underline">Download</a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ACTIVE MEMBER MANAGEMENT SCREEN */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">🎓 group members ({activeGroupMembers.length})</h5>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeGroupMembers.map((member) => {
                        const isOwnerUser = member.userId === activeGroup.ownerId;
                        const isAdminUser = member.role === "admin";
                        const canManageMember = getMyRole() === "owner" || (getMyRole() === "admin" && member.role === "member");

                        return (
                          <div 
                            key={member.userId} 
                            className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-2.5 rounded-2xl flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-700 dark:text-white truncate block max-w-[120px]" title={member.name}>
                                {member.name}
                              </span>
                              {/* Display Badge Roles */}
                              {isOwnerUser ? (
                                <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded uppercase">Owner</span>
                              ) : isAdminUser ? (
                                <span className="text-[8px] font-black text-indigo-500 bg-indigo-500/10 px-1 py-0.5 rounded uppercase">Admin</span>
                              ) : (
                                <span className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded uppercase">Member</span>
                              )}
                            </div>

                            {/* Options popup/tools if permitted */}
                            {canManageMember && member.userId !== user?.uid && !isOwnerUser && (
                              <div className="flex items-center gap-1">
                                {getMyRole() === "owner" && (
                                  <button
                                    onClick={() => handleUpdateMemberRole(member.userId, isAdminUser ? "member" : "admin")}
                                    className="px-1.5 py-0.5 text-[8px] font-black bg-indigo-50 dark:bg-indigo-950 hover:bg-primary-500 hover:text-white rounded text-indigo-600 transition-colors"
                                    title="Toggle Admin elevation Status"
                                  >
                                    {isAdminUser ? "Demote" : "Promote"}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  className="px-1.5 py-0.5 text-[8px] font-black bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-500 hover:text-white rounded text-rose-500 transition-colors"
                                  title="Eject Member"
                                >
                                  Remove
                                </button>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Active members invite toolbox */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-3.5 rounded-2xl space-y-2.5">
                    <h6 className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5" /> Direct Member Invitation
                    </h6>
                    <form onSubmit={handleSendInvite} className="space-y-1.5">
                      <input
                        type="email"
                        placeholder="Friend's email address..."
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-855 rounded-xl text-xs text-slate-850 dark:text-white placeholder-slate-400"
                      />
                      {inviteError && <p className="text-[9px] text-red-500">{inviteError}</p>}
                      {inviteSuccess && <p className="text-[9px] text-emerald-500">{inviteSuccess}</p>}
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-primary-500 hover:bg-primary-600 font-bold text-[10px] rounded-lg text-white"
                      >
                        Submit Invite
                      </button>
                    </form>
                  </div>

                  {/* Leave Group trigger */}
                  {activeGroup.ownerId !== user?.uid && (
                    <button
                      onClick={handleLeaveGroup}
                      className="w-full py-2 border border-red-200 dark:border-red-900/30 text-rose-500 dark:text-rose-450 text-xs font-extrabold rounded-2xl hover:bg-rose-500/5 transition-all flex items-center justify-center gap-1"
                    >
                      <LogOut className="w-4 h-4" /> Exit Study Group
                    </button>
                  )}

                </div>

              </motion.div>
            ) : (
              /* DASHBOARD TAB SEGMENTS */
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                
                {/* 1. MY HUB TAB */}
                {activeTab === "my_hub" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">Active Classes & Peer Hubs</h2>
                    </div>

                    {myHubGroups.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center">
                        <span className="text-4xl block mb-2">👥</span>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                          You have not joined any study groups yet. Create a custom group or discover public peer learning clubs.
                        </p>
                        <button
                          onClick={() => setActiveTab("discover")}
                          className="mt-4 px-4 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-xs"
                        >
                          Discover Public Groups
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {myHubGroups.map((group) => (
                          <div 
                            key={group.id} 
                            onClick={() => {
                              setActiveGroupId(group.id);
                              setShowGroupSidebar(false);
                            }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-800/85 p-5 rounded-3xl shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-4 group relative"
                          >
                            <div className="flex gap-3">
                              <img 
                                src={group.photoURL || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=60"} 
                                alt={group.name} 
                                className="w-12 h-12 rounded-2xl object-cover border"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start gap-1">
                                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate group-hover:text-primary-500 transition-colors">
                                    {group.name}
                                  </h3>
                                  {group.isPublic ? (
                                    <span className="px-2 py-0.5 text-[8px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1">
                                      <Globe className="w-2.5 h-2.5" /> Public
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[8px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" /> Private
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 h-8 mt-1 italic">
                                  &ldquo;{group.description || "No description provided."}&rdquo;
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-850/50 text-slate-405">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-primary-500" />
                                {group.memberCount || 1} Members
                              </span>
                              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-350 rounded-xl text-[10px] font-black group-hover:bg-primary-500 group-hover:text-white transition-all">
                                Open chat room →
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. DISCOVER TAB */}
                {activeTab === "discover" && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">Discover Peer Groups</h2>
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-405 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search public groups..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs rounded-xl focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-white w-full sm:w-[260px]"
                        />
                      </div>
                    </div>

                    {discoverGroups.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                        🔍 No public study groups match your search criteria.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {discoverGroups.map((group) => (
                          <div 
                            key={group.id} 
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-4 flex flex-col justify-between"
                          >
                            <div className="flex gap-3">
                              <img 
                                src={group.photoURL || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=60"} 
                                alt={group.name} 
                                className="w-12 h-12 rounded-2xl object-cover border"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-start gap-1">
                                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate">
                                    {group.name}
                                  </h3>
                                  <span className="px-2 py-0.5 text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full flex items-center gap-1 flex-shrink-0">
                                    <Globe className="w-2.5 h-2.5" /> Public
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mt-1 italic">
                                  &ldquo;{group.description || "No description provided."}&rdquo;
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-850 mt-2">
                              <span className="text-slate-400 font-extrabold flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-primary-500" />
                                {group.memberCount || 1} Members
                              </span>
                              
                              <button
                                onClick={() => joinGroupInstantly(group)}
                                className="px-3.5 py-1.5 bg-primary-500 text-white font-bold text-xs rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Join Group
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. INVITATIONS TAB */}
                {activeTab === "invitations" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Invitations Received</h2>
                    
                    {invitedGroups.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                        ✉️ No pending study group invites.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {invitedGroups.map((inv) => (
                          <div key={inv.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-slate-400 font-bold">
                                Received from: <span className="font-bold text-primary-550">{inv.senderName}</span>
                              </p>
                              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                                {inv.groupName}
                              </h3>
                              <p className="text-[9px] text-slate-400">Received on {new Date(inv.createdAt).toLocaleString()}</p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <button
                                onClick={() => handleAcceptInvite(inv)}
                                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Accept
                              </button>
                              <button
                                onClick={() => handleDeclineInvite(inv)}
                                className="px-3.5 py-1.5 border border-slate-250 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. REQUESTS TAB */}
                {activeTab === "requests" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">Direct Access Requests received</h2>
                    <p className="text-xs text-slate-400">Authorize students requesting to join restricted private classrooms that you own.</p>
                    
                    {joinRequests.length === 0 ? (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-500 dark:text-slate-400 text-xs text-center">
                        🕒 No pending requests under review.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {joinRequests.map((rq) => (
                          <div key={rq.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-slate-405 font-bold">
                                Target Restricted Group: <span className="font-extrabold text-primary-500">{rq.groupName}</span>
                              </p>
                              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                                {rq.userName}
                              </h3>
                              <p className="text-xs text-slate-500">{rq.userEmail}</p>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <button
                                onClick={() => handleApproveRequest(rq)}
                                className="px-3.5 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectRequest(rq)}
                                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                Ignore
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. CREATE GROUP TAB */}
                {activeTab === "create" && (
                  <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">Establish custom classroom Study Group</h2>
                    <p className="text-xs text-slate-400 mb-6">
                      A peer study group is excellent for hosting files, broadcasting pin notes, and coordinating quizzes. Creating a group incurs a deduction of <span className="font-bold text-amber-500">10 credits</span>.
                    </p>

                    <form onSubmit={handleCreateGroup} className="space-y-5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Group Photo / Logo Preset</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {[
                            "https://images.unsplash.com/photo-15222071820081-009f0129c71c?w=150&auto=format&fit=crop&q=60",
                            "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=150&auto=format&fit=crop&q=60",
                            "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=150&auto=format&fit=crop&q=60",
                            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=60",
                            "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=150&auto=format&fit=crop&q=60",
                            "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=150&auto=format&fit=crop&q=60"
                          ].map((url) => (
                            <img 
                              key={url}
                              src={url}
                              alt="Avatar option"
                              onClick={() => setNewGroupPhoto(url)}
                              className={`w-12 h-12 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-all border-2 ${
                                newGroupPhoto === url ? "border-primary-500 scale-105" : "border-slate-205 dark:border-slate-750"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Group Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Grade 10 AP Astrophysics Club"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-white font-medium"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Group Statement Description</label>
                        <textarea
                          placeholder="What is the group's curriculum focus..."
                          rows={3}
                          value={newGroupDesc}
                          onChange={(e) => setNewGroupDesc(e.target.value)}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-white"
                        ></textarea>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Privacy setting</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div 
                            onClick={() => setNewGroupPublic(true)}
                            className={`p-3 border rounded-2xl cursor-pointer flex gap-3 transition-all ${
                              newGroupPublic
                                ? "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-400 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
                                : "border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            <Globe className="w-5 h-5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-black">🌐 Public Hub</p>
                              <p className="text-[10px] opacity-80 mt-0.5">Discoverable. Anyone can find and join instantly.</p>
                            </div>
                          </div>

                          <div 
                            onClick={() => setNewGroupPublic(false)}
                            className={`p-3 border rounded-2xl cursor-pointer flex gap-3 transition-all ${
                              !newGroupPublic
                                ? "bg-indigo-50/50 dark:bg-indigo-950/15 border-indigo-400 dark:border-indigo-800 text-indigo-800 dark:text-indigo-400"
                                : "border-slate-200 dark:border-slate-750 text-slate-500 dark:text-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            <Lock className="w-5 h-5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-black">🔒 Invite-Only</p>
                              <p className="text-[10px] opacity-80 mt-0.5">Restricted permissions. Accessible only via invitations or custom ID code.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {createError && (
                        <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200/50 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-xs">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{createError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-750 hover:from-primary-600 hover:to-primary-800 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        {isCreating ? "Booting Class Database..." : "Create Custom Group (Costs 10 Credits)"}
                      </button>
                    </form>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* WhatsApp Message Forwarding popup list of groups */}
      {showForwardModal && forwardingMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">➡️ Forward Message</h4>
              <button 
                onClick={() => { setShowForwardModal(false); setForwardingMessage(null); }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl italic limit-rows leading-relaxed">
              &ldquo;{forwardingMessage.text}&rdquo;
            </p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              <p className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Forward to Joined Group:</p>
              {myHubGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleForwardMessage(g.id)}
                  className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors font-bold text-xs"
                >
                  <span className="truncate pr-2">{g.name}</span>
                  <span className="text-[10px] text-primary-500 underline">Send</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

// Simple visual components helpers
const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);
