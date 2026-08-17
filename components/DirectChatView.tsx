import React, { useState, useEffect, useRef } from "react";
import {
  UserProfile,
  Friendship,
  DirectChat,
  DirectMessage,
  DirectCall,
} from "../types";
import {
  searchUsersInFirestore,
  sendFriendRequestInFirestore,
  acceptFriendRequestInFirestore,
  declineOrRemoveFriendInFirestore,
  subscribeToUserFriendships,
  getOrCreateDirectChatInFirestore,
  subscribeToUserDirectChats,
  subscribeToDirectMessages,
  sendDirectMessageInFirestore,
  clearDirectChatUnreadInFirestore,
  clearDirectChatForUserInFirestore,
  deleteDirectMessageInFirestore,
  toggleDirectMessageReactionInFirestore,
  getDirectChatId
} from "../utils/firebaseUtils";
import { initiateDirectCall } from "../services/webrtcService";
import { useNotifications } from "./NotificationContext";
import { executeRecaptcha } from "../firebaseConfig";
import {
  MessageSquare,
  UserPlus,
  Users,
  Search,
  Send,
  Mic,
  Check,
  X,
  ArrowLeft,
  UserCheck,
  Clock,
  Sparkles,
  Image as ImageIcon,
  CheckCheck,
  Info,
  ShieldCheck,
  ArrowDown,
  Download,
  Maximize2,
  Minimize2,
  BookOpen,
  Trash2,
  Palette,
  Brush,
  Phone,
  Video,
} from "lucide-react";
import { compressImage } from "../utils/imageUtils";
import { motion, AnimatePresence } from "motion/react";
import { ChatBackgroundModal, ChatBgSettings } from "./ChatBackgroundModal";

interface DirectChatViewProps {
  user: any;
  userProfile: UserProfile;
  onOpenAuthModal: () => void;
  initialTargetUser?: { uid: string; displayName: string; photoURL?: string } | null;
  onStartDirectCall?: (call: DirectCall) => void;
}

export const DirectChatView: React.FC<DirectChatViewProps> = ({
  user,
  userProfile,
  onOpenAuthModal,
  initialTargetUser,
  onStartDirectCall,
}) => {
  const { triggerToast, sendNotification } = useNotifications();
  const currentUid = user?.uid || "guest";
  const currentName = userProfile?.displayName || "Scholar User";
  const currentPhoto = userProfile?.photoURL || "";

  // Navigation / Tab state
  const [activeTab, setActiveTab] = useState<"chats" | "friends" | "add_friend" | "requests">("chats");

  // Direct Chats State
  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");

  // Friendships State
  const [friendships, setFriendships] = useState<Friendship[]>([]);

  // User Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active Attachment State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reactions & Friend Info Modal
  const [showFriendInfoModal, setShowFriendInfoModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos'|'links'|'audio'|'documents'>('photos');
  const [isEnlarged, setIsEnlarged] = useState(false);

  // Personal Direct Chat Wallpapers (Personal to this user, not shared with the other friend)
  const [personalDirectBgs, setPersonalDirectBgs] = useState<Record<string, ChatBgSettings>>(() => {
    try {
      const storageKey = `sjtutor_personal_direct_bg_${userProfile?.uid || user?.uid || 'guest'}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const storageKey = `sjtutor_personal_direct_bg_${currentUid}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setPersonalDirectBgs(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load personal direct backgrounds", e);
    }
  }, [currentUid]);

  const currentChatBg = activeChatId ? personalDirectBgs[activeChatId] : undefined;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleSaveChatBgSettings = (settings: ChatBgSettings) => {
    if (!activeChatId) return;
    setPersonalDirectBgs((prev) => {
      const updated = { ...prev, [activeChatId]: settings };
      try {
        const storageKey = `sjtutor_personal_direct_bg_${currentUid}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save personal direct wallpaper", err);
      }
      return updated;
    });
    
    triggerToast('Personal Wallpaper Saved! 🎨', 'Applied personal wallpaper to your screen for this 1-on-1 chat.', 'Important Alerts');
  };

  const handleClearChatBgSettings = () => {
    if (!activeChatId) return;
    setPersonalDirectBgs((prev) => {
      const updated = { ...prev };
      delete updated[activeChatId];
      try {
        const storageKey = `sjtutor_personal_direct_bg_${currentUid}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to clear personal direct wallpaper", err);
      }
      return updated;
    });
    triggerToast('Wallpaper Reset', 'Reset to default theme for your view.', 'Important Alerts');
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollHeight - scrollTop - clientHeight > 150) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Subscribe to Friendships
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserFriendships(user.uid, (data) => {
      setFriendships(data);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Subscribe to Direct Chats
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserDirectChats(user.uid, (data) => {
      setDirectChats(data);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Subscribe to Messages in Active Chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    const unsubscribe = subscribeToDirectMessages(activeChatId, (data) => {
      setMessages(data);
      if (user) {
        clearDirectChatUnreadInFirestore(activeChatId, user.uid);
      }
    });
    return () => unsubscribe();
  }, [activeChatId, user]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Reset scroll and scroll to bottom when switching chats
  useEffect(() => {
    setShowScrollButton(false);
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 60);
    return () => clearTimeout(timer);
  }, [activeChatId]);

  // Handle Initial Target User (e.g. passed from Profile or Leaderboard)
  useEffect(() => {
    if (initialTargetUser && user) {
      handleStartDirectChat(initialTargetUser);
    }
  }, [initialTargetUser, user]);

  // Search Users Handler
  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchUsersInFirestore(searchQuery, user.uid);
      setSearchResults(results);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search on opening Add Friend tab or when search query changes
  useEffect(() => {
    if (activeTab === "add_friend" && user) {
      handleSearchUsers();
    }
  }, [activeTab, searchQuery, user]);

  // Send Friend Request
  const handleSendFriendRequest = async (targetUser: any) => {
    if (!user) {
      onOpenAuthModal();
      return;
    }
    const success = await sendFriendRequestInFirestore(user.uid, userProfile, targetUser);
    if (success) {
      triggerToast("Friend Request Sent! 🎉", `Invitation sent to ${targetUser.displayName}.`, "Important Alerts");
      // Notify recipient via system notification
      sendNotification(
        "New Friend Request 🤝",
        `${userProfile.displayName || "A fellow student"} sent you a friend request on SJ Tutor AI!`,
        "Important Alerts",
        targetUser.uid
      ).catch(() => {});
    } else {
      triggerToast("Request Failed", "Could not send request at this time.", "Important Alerts");
    }
  };

  // Accept Friend Request
  const handleAcceptRequest = async (friendship: Friendship) => {
    if (!user) return;
    const success = await acceptFriendRequestInFirestore(friendship.id, user.uid);
    if (success) {
      const requesterName = friendship.userDetails?.[friendship.requestedBy]?.displayName || "Friend";
      triggerToast("Friend Request Accepted! 🤝", `You are now connected with ${requesterName}.`, "Important Alerts");
      
      // Notify requester
      sendNotification(
        "Friend Request Accepted! 🎉",
        `${userProfile.displayName || "A student"} accepted your friend request! You can now message 1-on-1.`,
        "Important Alerts",
        friendship.requestedBy
      ).catch(() => {});

      setActiveTab("chats");
    }
  };

  // Decline / Remove Friend
  const handleDeclineOrRemove = async (friendshipId: string, name: string) => {
    const success = await declineOrRemoveFriendInFirestore(friendshipId);
    if (success) {
      triggerToast("Connection Removed", `Friend connection with ${name} was updated.`, "Important Alerts");
    }
  };

  // Start 1-on-1 Direct Chat with a Friend
  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading image:", error);
      window.open(url, "_blank"); // Fallback
    }
  };

  const handleStartDirectChat = async (targetUserDetails: { uid: string; displayName: string; photoURL?: string }) => {
    if (!user) {
      onOpenAuthModal();
      return;
    }
    const chatId = await getOrCreateDirectChatInFirestore(
      user.uid,
      { uid: user.uid, displayName: userProfile.displayName, photoURL: userProfile.photoURL },
      targetUserDetails
    );
    setActiveChatId(chatId);
    setActiveTab("chats");
  };

  // Voice Note Recording Simulator
  const toggleVoiceNoteRecording = () => {
    if (isRecordingVoice) {
      // Stop recording
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setIsRecordingVoice(false);
      handleSendMessage("voice");
    } else {
      // Start recording
      setIsRecordingVoice(true);
      setRecordingTimer(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setSelectedImage(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send Direct Message
  const handleSendMessage = async (msgType: 'text' | 'image' | 'voice' = 'text') => {
    if (!user || !activeChatId) return;

    if (msgType === 'text' && !messageInput.trim() && !selectedImage) return;

    await executeRecaptcha('SEND_DIRECT_MESSAGE');

    const activeChat = directChats.find((c) => c.id === activeChatId);
    if (!activeChat) return;

    const recipientUid = activeChat.participants.find((p) => p !== user.uid) || "";

    if (recipientUid && !acceptedFriendUids.has(recipientUid)) {
      triggerToast("Friendship Required 🔒", "You are no longer friends with this user. Chat disabled.", "Important Alerts");
      return;
    }

    const messageText = msgType === 'voice' 
      ? `🎤 Voice Note (${recordingTimer || 3}s)` 
      : messageInput.trim();

    const newMsg: DirectMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      chatId: activeChatId,
      senderId: user.uid,
      senderName: userProfile.displayName || "Student",
      senderAvatar: userProfile.photoURL || "",
      text: messageText,
      timestamp: Date.now(),
      type: selectedImage ? 'image' : msgType,
      mediaUrl: selectedImage || undefined,
      voiceUrl: msgType === 'voice' ? 'simulated_voice_note' : undefined,
      status: 'sent',
    };

    setMessageInput("");
    setSelectedImage(null);
    setRecordingTimer(0);

    const success = await sendDirectMessageInFirestore(activeChatId, newMsg, recipientUid);
    if (success && recipientUid) {
      // Send real-time notification to recipient
      sendNotification(
        `Direct Message from ${userProfile.displayName || "Friend"} 💬`,
        messageText,
        "Important Alerts",
        recipientUid
      ).catch(() => {});
    }
  };

  // Reaction Toggle
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!user || !activeChatId) return;
    await toggleDirectMessageReactionInFirestore(activeChatId, msgId, emoji, user.uid);
  };

  // Delete Friend
  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    if (!user) return;
    
    const friendship = friendships.find(f => f.id === friendshipId);
    const friendUid = friendship?.users.find(u => u !== user.uid);

    const success = await declineOrRemoveFriendInFirestore(friendshipId);
    if (success) {
      if (friendUid) {
        const chatId = getDirectChatId(user.uid, friendUid);
        if (activeChatId === chatId) {
          setActiveChatId(null);
        }
      }
      triggerToast("Friend Removed 🗑️", `${friendName} was removed from your friends list and chat ended.`, "Important Alerts");
      setFriendships(prev => prev.filter(f => f.id !== friendshipId));
    } else {
      triggerToast("Error", "Failed to remove friend. Please try again.", "Important Alerts");
    }
  };

  // Delete Chat History
  const handleDeleteChat = async (chatId: string, friendName: string) => {
    if (!user) return;
    const success = await clearDirectChatForUserInFirestore(chatId, user.uid);
    if (success) {
      triggerToast("Chat Deleted 🗑️", `Chat history with ${friendName} was cleared.`, "Important Alerts");
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    } else {
      triggerToast("Error", "Failed to clear chat history.", "Important Alerts");
    }
  };

  // Initiate 1-on-1 Audio or Video Call
  const handleStartCall = async (type: "audio" | "video") => {
    if (!user || user.isAnonymous) {
      onOpenAuthModal();
      return;
    }
    if (!activeChatId || !activeFriendDetails) return;

    try {
      const callId = await initiateDirectCall({
        chatId: activeChatId,
        callerId: currentUid,
        callerName: currentName,
        callerAvatar: currentPhoto,
        receiverId: activeFriendDetails.uid,
        receiverName: activeFriendDetails.displayName,
        receiverAvatar: activeFriendDetails.photoURL || "",
        type,
      });

      sendNotification(
        `Incoming ${type === "video" ? "Video" : "Audio"} Call 📞`,
        `${currentName} is calling you on SJ Tutor AI. Open the app to answer.`,
        "Important Alerts",
        activeFriendDetails.uid
      );

      if (onStartDirectCall) {
        onStartDirectCall({
          id: callId,
          chatId: activeChatId,
          callerId: currentUid,
          callerName: currentName,
          callerAvatar: currentPhoto,
          receiverId: activeFriendDetails.uid,
          receiverName: activeFriendDetails.displayName,
          receiverAvatar: activeFriendDetails.photoURL || "",
          type,
          status: "ringing",
          startedAt: Date.now(),
        });
      }
      triggerToast(
        `Calling ${activeFriendDetails.displayName}... 📞`,
        `Starting 1-on-1 ${type === "video" ? "Video" : "Audio"} Call...`,
        "Important Alerts"
      );
    } catch (err) {
      console.error("Failed to start direct call:", err);
      triggerToast("Call Error", "Could not start call. Please verify permissions.", "Important Alerts");
    }
  };

  // Delete Individual Message
  const handleDeleteDirectMessage = async (msgId: string) => {
    if (!activeChatId) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    const success = await deleteDirectMessageInFirestore(activeChatId, msgId);
    if (success) {
      triggerToast("Message Deleted 🗑️", "Message was permanently removed.", "Important Alerts");
    } else {
      triggerToast("Error", "Failed to delete message from server.", "Important Alerts");
    }
  };

  // Computed Lists
  const pendingRequests = friendships.filter(
    (f) => f.status === "pending" && f.requestedBy !== user?.uid
  );
  const acceptedFriends = friendships.filter((f) => f.status === "accepted");
  const acceptedFriendUids = new Set(
    acceptedFriends.flatMap((f) => f.users).filter((uid) => uid !== user?.uid)
  );

  const activeDirectChats = directChats.filter((chat) => {
    const friendUid = chat.participants.find((p) => p !== user?.uid) || "";
    return acceptedFriendUids.has(friendUid);
  });

  const activeChat = directChats.find((c) => c.id === activeChatId);
  const activeFriendUid = activeChat?.participants.find((p) => p !== user?.uid);
  const activeFriendDetails = activeChat && activeFriendUid ? activeChat.participantDetails?.[activeFriendUid] : null;
  const isFriendConnected = activeFriendUid ? acceptedFriendUids.has(activeFriendUid) : false;

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-10 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl my-8">
        <div className="w-20 h-20 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">1-on-1 Friend Chat & Messaging</h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          Connect directly with fellow students, exchange study notes, voice recordings, and direct messages in private 1-on-1 chats.
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Sign In to Access Friend Chat
        </button>
      </div>
    );
  }

  const visibleMessages = messages.filter(msg => !activeChat?.clearedAt?.[user?.uid] || msg.timestamp > activeChat.clearedAt[user.uid]);
  
  const chatPhotos = visibleMessages.filter(m => m.type === 'image' && m.mediaUrl);
  const chatLinks = visibleMessages.filter(m => /https?:\/\/[^\s]+/.test(m.text));
  const chatAudio = visibleMessages.filter(m => m.type === 'voice' && m.voiceUrl);
  const chatDocs = visibleMessages.filter(m => m.type === 'note' && m.noteData);

  return (
    <div className="w-full h-full min-h-0 flex-1 flex flex-col space-y-3">
      {/* Top Header & Section Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <MessageSquare className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Direct Friend Chat</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Private 1-on-1 messaging, friend connections, and direct study support
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto shrink-0">
          <button
            onClick={() => { setActiveTab("chats"); }}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === "chats"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Messages</span>
            {directChats.some((c) => (c.unreadCount?.[user.uid] || 0) > 0) && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("friends")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === "friends"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friends ({acceptedFriends.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap relative ${
              activeTab === "requests"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("add_friend")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
              activeTab === "add_friend"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Find Friends</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 min-h-0 w-full bg-white dark:bg-slate-900 shadow-xl flex flex-col md:flex-row overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 transition-all duration-300">
        {/* LEFT SIDEBAR: Conversation List / Friends List */}
        <div className={`w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 min-h-0 h-full ${activeChatId ? "hidden md:flex" : "flex"}`}>
          
          {/* TAB 1: Direct Message Conversations */}
          {activeTab === "chats" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="p-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Direct Messages</h3>
                <span className="text-xs text-slate-500">{activeDirectChats.length} Conversations</span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 custom-scrollbar scroll-smooth overscroll-contain">
                {activeDirectChats.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No Direct Messages Yet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">Connect with friends to start private 1-on-1 study conversations.</p>
                    <button
                      onClick={() => setActiveTab("add_friend")}
                      className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-all"
                    >
                      Find Friends
                    </button>
                  </div>
                ) : (
                  activeDirectChats.map((chat) => {
                    const friendUid = chat.participants.find((p) => p !== user.uid) || "";
                    const friendDetails = chat.participantDetails?.[friendUid] || { displayName: "Friend", photoURL: "" };
                    const unread = chat.unreadCount?.[user.uid] || 0;
                    const isSelected = activeChatId === chat.id;

                    return (
                      <div
                        key={chat.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveChatId(chat.id);
                          clearDirectChatUnreadInFirestore(chat.id, user.uid);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveChatId(chat.id);
                            clearDirectChatUnreadInFirestore(chat.id, user.uid);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 relative cursor-pointer select-none ${
                          isSelected
                            ? "bg-amber-500/10 border border-amber-500/30 text-slate-900 dark:text-white"
                            : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center overflow-hidden border border-amber-500/30">
                            {friendDetails.photoURL ? (
                              <img src={friendDetails.photoURL} alt={friendDetails.displayName} className="w-full h-full object-cover" />
                            ) : (
                              friendDetails.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        </div>

                        {/* Name & Snippet */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                              {friendDetails.displayName}
                            </h4>
                            {chat.lastMessage?.timestamp && (!chat.clearedAt?.[user.uid] || chat.lastMessage.timestamp > chat.clearedAt[user.uid]) && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {(chat.clearedAt?.[user.uid] && chat.lastMessage?.timestamp && chat.lastMessage.timestamp <= chat.clearedAt[user.uid]) 
                              ? "Chat cleared" 
                              : chat.lastMessage?.text || "Started a conversation"}
                          </p>
                        </div>

                        {/* Unread badge & Delete chat action */}
                        <div className="flex items-center gap-1 shrink-0">
                          {unread > 0 && (
                            <span className="w-5 h-5 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChat(chat.id, friendDetails.displayName);
                            }}
                            className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition cursor-pointer"
                            title="Delete Chat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Connected Friends List */}
          {activeTab === "friends" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="p-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connected Friends</h3>
                <span className="text-xs text-slate-500">{acceptedFriends.length} Total</span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 custom-scrollbar scroll-smooth overscroll-contain">
                {acceptedFriends.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No Friends Connected Yet</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">Use the Find Friends tab to search and add fellow students.</p>
                    <button
                      onClick={() => setActiveTab("add_friend")}
                      className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-xl"
                    >
                      Find Friends Now
                    </button>
                  </div>
                ) : (
                  acceptedFriends.map((friendship) => {
                    const friendUid = friendship.users.find((u) => u !== user.uid) || "";
                    const friendInfo = friendship.userDetails?.[friendUid] || { displayName: "Student", photoURL: "" };

                    return (
                      <div
                        key={friendship.id}
                        className="p-3 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center overflow-hidden border border-amber-500/30 shrink-0">
                            {friendInfo.photoURL ? (
                              <img src={friendInfo.photoURL} alt={friendInfo.displayName} className="w-full h-full object-cover" />
                            ) : (
                              friendInfo.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {friendInfo.displayName}
                            </h4>
                            {friendInfo.registrationNumber && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                ID: {friendInfo.registrationNumber}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleStartDirectChat({ uid: friendUid, displayName: friendInfo.displayName, photoURL: friendInfo.photoURL })}
                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                          <button
                            onClick={() => handleRemoveFriend(friendship.id, friendInfo.displayName)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white dark:text-rose-400 text-xs font-semibold rounded-xl transition-all flex items-center justify-center"
                            title="Remove Friend"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Find Friends Search */}
          {activeTab === "add_friend" && (
            <div className="flex-1 min-h-0 flex flex-col p-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Find & Connect Friends</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3 leading-tight">
                Search students by name, email, student ID, or institution to send friend requests.
              </p>
              
              <form onSubmit={handleSearchUsers} className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </form>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 custom-scrollbar scroll-smooth overscroll-contain">
                {isSearching ? (
                  <div className="text-center py-8 text-xs text-slate-500">Searching students...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 px-4 text-xs text-slate-500 dark:text-slate-400">
                    <UserPlus className="w-8 h-8 text-amber-500/40 mx-auto mb-2" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">No students found</p>
                    <p className="mt-1">Try typing a different name, Student ID, or email address.</p>
                  </div>
                ) : (
                  searchResults.map((st) => {
                    const existingFriendship = friendships.find((f) => f.users.includes(st.uid));
                    const isFriend = existingFriendship?.status === "accepted";
                    const isPending = existingFriendship?.status === "pending";

                    return (
                      <div
                        key={st.uid}
                        className="p-3 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center overflow-hidden border border-amber-500/30 shrink-0">
                            {st.photoURL ? (
                              <img src={st.photoURL} alt={st.displayName} className="w-full h-full object-cover" />
                            ) : (
                              st.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{st.displayName}</h4>
                            {st.registrationNumber && (
                              <p className="text-[10px] text-slate-400 font-mono">ID: {st.registrationNumber}</p>
                            )}
                          </div>
                        </div>

                        {isFriend ? (
                          <button
                            onClick={() => handleStartDirectChat(st)}
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Friends</span>
                          </button>
                        ) : isPending ? (
                          <span className="px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold rounded-xl flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendFriendRequest(st)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Incoming & Sent Requests */}
          {activeTab === "requests" && (
            <div className="flex-1 min-h-0 flex flex-col p-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Incoming Friend Requests</h3>
              
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3 custom-scrollbar scroll-smooth overscroll-contain">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">No pending friend requests.</div>
                ) : (
                  pendingRequests.map((req) => {
                    const reqUser = req.userDetails?.[req.requestedBy] || { displayName: "Student", photoURL: "" };

                    return (
                      <div
                        key={req.id}
                        className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center overflow-hidden shrink-0">
                            {reqUser.photoURL ? (
                              <img src={reqUser.photoURL} alt={reqUser.displayName} className="w-full h-full object-cover" />
                            ) : (
                              reqUser.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{reqUser.displayName}</h4>
                            <p className="text-[10px] text-slate-400">Wants to connect with you</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all"
                            title="Accept"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeclineOrRemove(req.id, reqUser.displayName)}
                            className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                            title="Decline"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT MAIN PANEL: Active 1-on-1 Chat Room */}
        {(() => {
          const hasBg = Boolean(currentChatBg?.imageUrl || currentChatBg?.bgColor);

          return (
            <div 
              className={`flex-1 min-h-0 flex flex-col relative ${!activeChatId ? "hidden md:flex items-center justify-center" : "flex"} ${
                hasBg ? "" : "bg-white dark:bg-slate-900"
              } overflow-hidden`}
              style={{
                background: currentChatBg?.bgColor || undefined,
              }}
            >
              {/* Background Image Layer with Blur (Personal Wallpaper) */}
              {currentChatBg?.imageUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center pointer-events-none z-0 transition-all"
                  style={{
                    backgroundImage: `url(${currentChatBg.imageUrl})`,
                    filter: (currentChatBg.blur || 0) > 0 ? `blur(${currentChatBg.blur}px)` : undefined,
                    transform: (currentChatBg.blur || 0) > 0 ? 'scale(1.05)' : undefined,
                  }}
                />
              )}

              {/* Semi-transparent overlay for text readability */}
              {hasBg && (
                <div 
                  className="absolute inset-0 bg-black pointer-events-none z-0 transition-opacity" 
                  style={{ opacity: currentChatBg?.overlayOpacity ?? 0.45 }}
                />
              )}

              {activeChatId && activeFriendDetails ? (
                <>
                  {/* CHAT HEADER */}
                  <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveChatId(null)}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white md:hidden"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>

                      <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center overflow-hidden border border-amber-500/30">
                          {activeFriendDetails.photoURL ? (
                            <img src={activeFriendDetails.photoURL} alt={activeFriendDetails.displayName} className="w-full h-full object-cover" />
                          ) : (
                            activeFriendDetails.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {activeFriendDetails.displayName}
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        </h3>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Online & Direct Connected</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Audio Call Button */}
                      <button
                        onClick={() => handleStartCall("audio")}
                        className="p-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1"
                        title={`Start 1-on-1 Voice Call with ${activeFriendDetails.displayName}`}
                      >
                        <Phone className="w-5 h-5" />
                      </button>

                      {/* Video Call Button */}
                      <button
                        onClick={() => handleStartCall("video")}
                        className="p-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1"
                        title={`Start 1-on-1 HD Video Call with ${activeFriendDetails.displayName}`}
                      >
                        <Video className="w-5 h-5" />
                      </button>

                      {/* Wallpaper Customizer Button */}
                      <button
                        onClick={() => setShowBgModal(true)}
                        className="p-2 text-amber-600 dark:text-amber-400 bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 rounded-xl transition-all cursor-pointer shadow-sm"
                        title="Customize 1-on-1 Chat Wallpaper & Atmosphere"
                      >
                        <Palette className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => setIsEnlarged(!isEnlarged)}
                        className={`p-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                          isEnlarged 
                            ? 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 ring-2 ring-amber-500 font-bold' 
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={isEnlarged ? "Exit Enlarge" : "Enlarge Messages"}
                      >
                        {isEnlarged ? <Minimize2 className="w-5 h-5 text-amber-600 dark:text-amber-400" /> : <Maximize2 className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => {
                          if (activeChatId && activeFriendDetails) {
                            handleDeleteChat(activeChatId, activeFriendDetails.displayName);
                          }
                        }}
                        className="p-2 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all cursor-pointer"
                        title="Delete Chat History"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setShowFriendInfoModal(true)}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Friend Info"
                      >
                        <Info className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

              {/* MESSAGES SCROLL AREA */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20 custom-scrollbar scroll-smooth overscroll-contain relative"
              >
                {visibleMessages.length === 0 ? (
                  <div className="text-center py-16">
                    <Sparkles className="w-10 h-10 text-amber-500/40 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Start Your Direct Conversation</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                      Say hello to {activeFriendDetails.displayName}! Messages are private and synced in real-time.
                    </p>
                  </div>
                ) : (
                  visibleMessages.map((msg) => {
                    const isMe = msg.senderId === user.uid;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 shadow-sm relative ${
                            isMe
                              ? "bg-amber-500 text-slate-950 rounded-br-xs"
                              : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60 rounded-bl-xs"
                          }`}
                        >
                          {/* Image Attachment */}
                          {msg.mediaUrl && (
                            <div className="relative group/image mb-2">
                              <img
                                src={msg.mediaUrl}
                                alt="Attachment"
                                className="rounded-xl max-h-60 w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                <button 
                                  onClick={() => handleDownloadImage(msg.mediaUrl!, `attachment-${msg.id}.jpg`)}
                                  className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm transition-all cursor-pointer"
                                  title="Download Image"
                                >
                                  <Download className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Text Message */}
                          <p className="text-xs leading-relaxed whitespace-pre-wrap break-words font-medium">
                            {msg.text}
                          </p>

                          {/* Timestamp & Status */}
                          <div className={`flex items-center gap-1 justify-end mt-1 text-[9px] ${isMe ? "text-slate-900/70" : "text-slate-400"}`}>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMe && <CheckCheck className="w-3 h-3 text-slate-950" />}
                          </div>

                          {/* Emoji Reactions display */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-slate-950/10 dark:border-white/10">
                              {Object.entries(msg.reactions).map(([emoji, uids]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  className={`px-1.5 py-0.5 text-[10px] rounded-full border transition-all ${
                                    uids.includes(user.uid)
                                      ? "bg-amber-100 border-amber-300 text-amber-900 font-bold"
                                      : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                  }`}
                                >
                                  {emoji} {uids.length}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quick Reaction & Delete Action Bar */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5 shadow-md">
                          {["👍", "❤️", "😂", "🔥", "💡"].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="hover:scale-125 transition-transform text-xs"
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => handleDeleteDirectMessage(msg.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors border-l border-slate-200 dark:border-slate-700 ml-1 pl-1.5"
                            title="Delete Message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* SCROLL TO BOTTOM BUTTON */}
              <AnimatePresence>
                {showScrollButton && (
                  <motion.button
                    initial={{ opacity: 0, y: 15, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    onClick={scrollToBottom}
                    className="absolute bottom-24 right-6 p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-full shadow-xl hover:shadow-2xl transition-all z-20 flex items-center justify-center gap-1.5 group cursor-pointer active:scale-95 border-2 border-white dark:border-slate-800"
                    title="Scroll to latest messages"
                  >
                    <ArrowDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                    <span className="text-xs font-bold pr-1 hidden sm:inline">Latest</span>
                  </motion.button>
                )}
              </AnimatePresence>

              {/* IMAGE PREVIEW BAR */}
              {selectedImage && (
                <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={selectedImage} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-amber-500/30" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Image attached</span>
                  </div>
                  <button onClick={() => setSelectedImage(null)} className="p-1 text-slate-500 hover:text-rose-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* INPUT FORM BAR OR DISCONNECTED BANNER */}
              {!isFriendConnected && activeFriendUid ? (
                <div className="p-4 bg-amber-500/10 border-t border-amber-500/20 text-center">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    🔒 You are no longer connected as friends with {activeFriendDetails?.displayName || "this user"}.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Messaging is disabled. Re-add as a friend to resume chatting.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage("text");
                    }}
                    className="flex items-center gap-2"
                  >
                    <label className="p-2.5 text-slate-400 hover:text-amber-500 cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                      <ImageIcon className="w-5 h-5" />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>

                    <button
                      type="button"
                      onClick={toggleVoiceNoteRecording}
                      className={`p-2.5 rounded-xl transition-all ${
                        isRecordingVoice 
                          ? "bg-rose-500 text-white animate-pulse" 
                          : "text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      title={isRecordingVoice ? "Click to send voice note" : "Record voice note"}
                    >
                      <Mic className="w-5 h-5" />
                    </button>

                    <input
                      type="text"
                      placeholder={isRecordingVoice ? `Recording Voice Note... (${recordingTimer}s)` : "Type a direct message..."}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      disabled={isRecordingVoice}
                      className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white rounded-2xl border border-transparent focus:border-amber-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
                    />

                    <button
                      type="submit"
                      disabled={!messageInput.trim() && !selectedImage && !isRecordingVoice}
                      className="p-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-2xl shadow-md transition-all shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8 max-w-sm">
              <div className="w-16 h-16 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Select a Conversation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose a friend from the left sidebar or click Find Friends to start a private 1-on-1 study chat.
              </p>
            </div>
          )}
        </div>
      );
    })()}
  </div>

      {/* FRIEND INFO MODAL */}
      <AnimatePresence>
        {showFriendInfoModal && activeFriendDetails && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowFriendInfoModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden border border-amber-500/30">
                  {activeFriendDetails.photoURL ? (
                    <img src={activeFriendDetails.photoURL} alt={activeFriendDetails.displayName} className="w-full h-full object-cover" />
                  ) : (
                    activeFriendDetails.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activeFriendDetails.displayName}</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Verified Friend Connection</p>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl text-xs mb-6">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Connected 1-on-1</span>
                </div>
                {activeFriendDetails.registrationNumber && (
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700/60">
                    <span className="text-slate-500">Student ID</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{activeFriendDetails.registrationNumber}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Security</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Direct Encrypted Session
                  </span>
                </div>
              </div>

              {/* Shared Media Section */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                  {(['photos', 'links', 'audio', 'documents'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveMediaTab(tab)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors capitalize ${
                        activeMediaTab === tab
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                <div className="h-48 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {activeMediaTab === 'photos' && (
                    chatPhotos.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {chatPhotos.map(msg => (
                          <div key={msg.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 group">
                            <img src={msg.mediaUrl} alt="Shared Photo" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-center text-slate-400 py-8">No photos shared yet</p>
                    )
                  )}

                  {activeMediaTab === 'links' && (
                    chatLinks.length > 0 ? (
                      <div className="space-y-2">
                        {chatLinks.map(msg => (
                          <div key={msg.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs flex flex-col gap-1">
                            <span className="font-bold text-slate-900 dark:text-white">{msg.senderName}</span>
                            <a href={msg.text.match(/https?:\/\/[^\s]+/)?.[0] || "#"} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 truncate hover:underline">
                              {msg.text.match(/https?:\/\/[^\s]+/)?.[0] || "Link"}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-center text-slate-400 py-8">No links shared yet</p>
                    )
                  )}

                  {activeMediaTab === 'audio' && (
                    chatAudio.length > 0 ? (
                      <div className="space-y-2">
                        {chatAudio.map(msg => (
                          <div key={msg.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{msg.senderName}</span>
                            <audio controls src={msg.voiceUrl} className="h-8 w-40" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-center text-slate-400 py-8">No audio shared yet</p>
                    )
                  )}

                  {activeMediaTab === 'documents' && (
                    chatDocs.length > 0 ? (
                      <div className="space-y-2">
                        {chatDocs.map(msg => (
                          <div key={msg.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs flex flex-col gap-1">
                            <span className="font-bold text-slate-900 dark:text-white">{msg.senderName}</span>
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <span className="p-1.5 bg-white dark:bg-slate-700 rounded-lg"><BookOpen className="w-3.5 h-3.5 text-amber-500" /></span>
                              <span className="font-medium truncate">{msg.noteData?.title || 'Shared Note'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-center text-slate-400 py-8">No documents shared yet</p>
                    )
                  )}
                </div>
              </div>
              
              {/* Personal Chat Background Settings */}
              {(() => {
                const isCustom = Boolean(currentChatBg?.imageUrl || currentChatBg?.bgColor);

                return (
                  <div className="mb-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-amber-500" />
                        Personal Wallpaper
                      </h4>
                      {isCustom && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full">
                          Personal
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Personalize this 1-on-1 chat with AI art, aesthetic wallpapers, or gradients (visible only on your screen).
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowFriendInfoModal(false);
                          setShowBgModal(true);
                        }}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Brush className="w-3.5 h-3.5" />
                        Customize Wallpaper
                      </button>

                      {isCustom && (
                        <button
                          onClick={handleClearChatBgSettings}
                          className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition border border-rose-200 dark:border-rose-800/60"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    if (activeChatId && activeFriendDetails) {
                      handleDeleteChat(activeChatId, activeFriendDetails.displayName);
                      setShowFriendInfoModal(false);
                    }
                  }}
                  className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white dark:text-rose-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Chat
                </button>
                {activeFriendUid && (
                  <button
                    onClick={() => {
                      const fDoc = friendships.find(f => f.users.includes(activeFriendUid));
                      if (fDoc && activeFriendDetails) {
                        handleRemoveFriend(fDoc.id, activeFriendDetails.displayName);
                        setShowFriendInfoModal(false);
                      }
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Friend
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFriendInfoModal(false)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl transition-all"
              >
                Close Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHAT BACKGROUND CUSTOMIZER MODAL */}
      <AnimatePresence>
        {showBgModal && activeChatId && activeFriendDetails && (
          <ChatBackgroundModal
            title={`Personal Wallpaper for "${activeFriendDetails.displayName}"`}
            subtitle="Personal to your account (only visible to you). Generate with Gemini AI, select aesthetic study templates, or upload from your device"
            currentBgImage={currentChatBg?.imageUrl || ''}
            currentBgColor={currentChatBg?.bgColor || ''}
            currentOverlayOpacity={currentChatBg?.overlayOpacity ?? 0.45}
            currentBlur={currentChatBg?.blur ?? 0}
            onSave={(settings) => {
              handleSaveChatBgSettings(settings);
            }}
            onClear={() => {
              handleClearChatBgSettings();
            }}
            onClose={() => setShowBgModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DirectChatView;
